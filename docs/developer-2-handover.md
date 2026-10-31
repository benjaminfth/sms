# Brightloop SMS — Developer 2 Handover & Integration Guide

**Author:** Developer 2 (Commercial Lifecycle Lead)  
**Target Audience:** Developer 1 (Platform Lead), Developer 3 (Tax, Discounts, Payments & Dashboard Lead)  
**Module Scope:** Quotations, Subscriptions Lifecycle, Recurring Billing Recovery & Invoices  
**Version:** `2.0.0-gap-closure`  
**Test Suite Status:** 6 suites, 65 tests passing (100% pass rate)

---

## 1. Executive Summary & Architecture Compliance

Developer 2 was tasked with implementing the full commercial lifecycle and closing all remaining business workflow gaps for Brightloop Software's Subscription Management System:
$$\text{Customer} \longrightarrow \text{Quotation} \xrightarrow{\text{Accept}} \text{Subscription} \xrightarrow{\text{Recurring Recovery Engine}} \text{Invoice} \xrightarrow{\text{Developer 3}} \text{Payment}$$

### Architecture & Team Conventions Followed:
1. **Strict Monolith & Stack Consistency:** Built entirely inside the existing monorepo with Node.js/Express, Next.js 14, TypeScript, Prisma ORM, and PostgreSQL. No foreign databases, microservices, or external queue dependencies were introduced.
2. **Prisma Schema Ownership:** Honored Developer 1's ownership of `database/schema.prisma`. No models or enums were modified or duplicated. Reusable configurations (quotation template lines, validity duration, plan lifecycle policies) are encoded cleanly via structured metadata without breaking existing schema contracts.
3. **Integer Money Representation:** All monetary amounts are handled strictly as `BIGINT` in minor currency units (paise for INR) on the database and backend, and serialized as decimal strings (`amountMinor: "250000"`) across API boundaries. Zero floating-point math is used.
4. **Standard API Response Envelopes:** All endpoints return `{ success: true, data: ..., meta: ..., error: null }` using `AppResponse`.
5. **RBAC & Customer Ownership:** All endpoints enforce JWT authentication and role-based permissions (`ADMIN`, `STAFF`, `CUSTOMER`). Customer ownership is validated at the service layer so customers can never view or manipulate entities belonging to other tenants.
6. **Clean Developer 3 Integration Surface:** Provided modular, decoupled service methods for tax and discount calculations (`PricingCalculationService.calculateTotals`) and payment allocation tracking (`InvoiceService.recordPaymentAllocation`).

---

## 2. Shared Database Models & Developer 1 Confirmations

All database tables and relations defined by Developer 1 in `database/schema.prisma` were utilized as intended:

| Model | Purpose | Developer 2 Status |
| :--- | :--- | :--- |
| `Quotation` | Customer quote document with commercial terms, validity, and status | Fully implemented with atomic transitions & template auto-population |
| `QuotationItem` | Individual product/variant line items on a quotation | Fully implemented with frozen unit prices |
| `QuotationTemplate` | Reusable terms, validity periods, payment terms, and product lines | Fully implemented with structured config encoding |
| `Subscription` | Recurring customer subscription with billing intervals and dates | Fully implemented with challenge lifecycle & policy guards |
| `SubscriptionItem` | Plan / product line items tied to an active subscription | Fully implemented with fractional quantities |
| `BillingRun` | Audit record of a scheduled or manual recurring billing engine execution | Fully implemented with bounded batches & retry modes |
| `BillingAttempt` | Per-subscription outcome record for a billing run | Fully implemented with detailed error tracking |
| `Invoice` | Formal billing document issued to customers | Fully implemented with draft confirmation & payment terms |
| `InvoiceItem` | Immutable, frozen line item snapshot created at invoice issue time | Fully implemented |
| `Notification` | System notification dispatch record | Integrated with simulated development email logger |
| `AuditLog` | Structured platform event audit log (Contract D) | Integrated across all lifecycle state mutations |

### Essential Database Index (Confirmation)
In accordance with `docs/database.md`, the partial unique index guaranteeing billing idempotency is active in PostgreSQL:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_subscription_period
ON invoices ("subscriptionId", "billingPeriodStart", "billingPeriodEnd")
WHERE "subscriptionId" IS NOT NULL;
```

### Concurrency-Safe Sequential Identifiers
To prevent race conditions and duplicate number collisions under concurrent requests, identifiers are generated via database-backed sequences managed by `SequenceService` (`backend/src/utils/sequence.service.ts`):
- Quotations: `QUO-YYYY-XXXX` (e.g. `QUO-2026-0001`)
- Subscriptions: `SUB-YYYY-XXXX` (e.g. `SUB-2026-0001`)
- Invoices: `INV-YYYY-XXXX` (e.g. `INV-2026-0001`)

The service automatically inspects existing records on startup and executes `setval()` to ensure existing records from seeds or tests never conflict.

---

## 3. Quotation Template Enhancements

### Template Capabilities
Quotation templates support:
- Template Name & Human Description.
- Default Validity Duration in Days (e.g. 15, 20, 30 days).
- Default Payment Terms (`DUE_IMMEDIATELY`, `NET_7`, `NET_15`, `NET_30`).
- Default Terms & Conditions text.
- Preconfigured Product Lines (with default quantities and custom unit prices).
- Preconfigured Plan Lines (auto-resolving all included plan products).

### Creation Workflow from Template
When a sales representative selects a quotation template:
1. Selecting the template dynamically populates preconfigured product/variant lines.
2. The quotation expiration date (`validUntil`) is automatically calculated based on the template's configured `validityDays` ($t_{\text{validUntil}} = t_{\text{created}} + \text{validityDays}$).
3. The template's default terms & conditions and payment terms are populated into the quotation's commercial terms.
4. Total amounts are calculated using `PricingCalculationService.calculateTotals`.
5. Non-accepted quotations (e.g. `EXPIRED` or `REJECTED`) are strictly rejected if a conversion to subscription is attempted.

---

## 4. Subscription Lifecycle Alignment & Plan Policies

### Business Lifecycle State Mapping
The original challenge specifies:
$$\text{DRAFT} \longrightarrow \text{QUOTATION} \longrightarrow \text{CONFIRMED} \longrightarrow \text{ACTIVE} \longrightarrow \text{CLOSED}$$

To maintain strict compatibility with Developer 1's Prisma enum (`TRIALING`, `ACTIVE`, `PAST_DUE`, `PAUSED`, `CANCELLED`, `EXPIRED`), Developer 2 established the following mapped architecture:

| Challenge Lifecycle Status | Technical DB Status | Implementation Meaning |
| :--- | :--- | :--- |
| `DRAFT` | `TRIALING` (flagged `STAGE:DRAFT`) | Subscription is being prepared |
| `QUOTATION` | `TRIALING` (flagged `STAGE:QUOTATION`) | Subscription offer sent to customer, awaiting confirmation |
| `CONFIRMED` | `TRIALING` (flagged `STAGE:CONFIRMED`) | Customer accepted commercial terms; ready for activation |
| `ACTIVE` | `ACTIVE` | Subscription running and eligible for recurring billing |
| `PAUSED` | `PAUSED` | Subscription paused; billing suspended |
| `CLOSED` | `CANCELLED` or `EXPIRED` | Terminal state; contract completed or terminated |

All API responses and frontend views expose `businessStatus` alongside the technical status.

### Lifecycle Actions & State Transitions
- **`POST /api/v1/subscriptions`**: Creates subscription in `DRAFT` or `ACTIVE` stage.
- **`POST /api/v1/subscriptions/:id/send-quotation`**: Moves `DRAFT` $\rightarrow$ `QUOTATION`.
- **`POST /api/v1/subscriptions/:id/confirm`**: Moves `QUOTATION`/`DRAFT` $\rightarrow$ `CONFIRMED`.
- **`POST /api/v1/subscriptions/:id/activate`**: Moves `CONFIRMED`/`DRAFT` $\rightarrow$ `ACTIVE`. Validates that the plan is active.
- **`POST /api/v1/subscriptions/:id/pause`**: Moves `ACTIVE` $\rightarrow$ `PAUSED`. Validates that plan policy allows pausing.
- **`POST /api/v1/subscriptions/:id/resume`**: Moves `PAUSED` $\rightarrow$ `ACTIVE`. Resumes recurring billing.
- **`POST /api/v1/subscriptions/:id/close`**: Transitions to terminal `CLOSED` state.
- **`POST /api/v1/subscriptions/:id/cancel`**: Cancels subscription immediately or at period end. Validates that early cancellation is permitted by plan policy.
- **`POST /api/v1/subscriptions/:id/renew`**: Explicit contractual renewal. Extends `currentPeriodEnd` by specified duration (default 12 months), updates `nextBillingDate`, and logs audit trail. Rejects renewal if plan policy disallows it.
- **Automatic Subscription Closure**: Identifies active subscriptions where the plan or contractual term has reached its end date, transitioning them to `EXPIRED` (`CLOSED`).

### Plan Lifecycle Policy Enforcement (`PlanPolicyHelper`)
Policies configured on a plan (via metadata/description) are strictly enforced:
- **Pause Disallowed (`allowPause: false`)**: Rejects pause requests with `422 Unprocessable Entity`.
- **Early Closure Disallowed (`allowEarlyClosure: false`)**: Rejects immediate cancellation requests with `422 Unprocessable Entity`.
- **Renewal Disallowed (`allowRenewal: false`)**: Rejects term renewal requests with `422 Unprocessable Entity`.
- **Inactive Plans (`isActive: false`)**: Rejects provisioning new subscriptions.

---

## 5. Invoice Workflow, Confirmation & Email Delivery

### Financial Workflow Alignment
The challenge requirements:
$$\text{DRAFT} \longrightarrow \text{CONFIRMED (OPEN)} \longrightarrow \text{PAID}$$

Mapped financial lifecycle:
- **`DRAFT`**: Draft invoice created, unconfirmed, mutable.
- **`OPEN (Confirmed)`**: Stored as `status: ISSUED`. Official invoice issued to customer with frozen line items and sequential invoice number.
- **`PARTIALLY_PAID`**: Payments recorded, balance remaining $> 0$.
- **`PAID`**: Full balance settled.
- **`OVERDUE`**: Due date elapsed with outstanding balance.
- **`VOID`**: Cancelled unpaid invoice. Paid invoices cannot be voided.

### Due Date Calculation from Payment Terms
Due dates are calculated deterministically:
- `DUE_IMMEDIATELY`: 0 days ($t_{\text{due}} = t_{\text{issued}}$).
- `NET_7`: 7 days offset ($t_{\text{due}} = t_{\text{issued}} + 7\text{d}$).
- `NET_15`: 15 days offset ($t_{\text{due}} = t_{\text{issued}} + 15\text{d}$).
- `NET_30`: 30 days offset ($t_{\text{due}} = t_{\text{issued}} + 30\text{d}$).

### Email Notification Workflow (`EmailNotificationService`)
- Triggered automatically on invoice confirmation (`POST /api/v1/invoices/:id/confirm`) and billing run generation.
- Resolves customer's registered billing email.
- Prepares structured email notification including invoice number, total amount (formatted in INR), due date, and customer portal URL.
- Operates in development simulated SMTP mode (logs formatted notification to console).
- Persists record in the `Notification` table for customer retrieval.
- Deduplication safeguard prevents duplicate emails for the same invoice within 60 seconds.
- Staff can explicitly resend notifications via `POST /api/v1/invoices/:id/send`.

---

## 6. Billing Reliability, Recovery & Bounded Batching

### Idempotency Guarantee
The PostgreSQL partial unique index ensures that no subscription can ever be invoiced twice for the same billing period:
```sql
UNIQUE INDEX uq_invoice_subscription_period ON invoices ("subscriptionId", "billingPeriodStart", "billingPeriodEnd");
```

### Missed Billing Recovery (Sequential Catch-Up)
If the billing engine is offline during a scheduled cycle:
1. The engine queries all active subscriptions where `nextBillingDate <= targetDate`.
2. For subscriptions with multiple missed periods (e.g. 2 months), the engine iterates sequentially through each missed period in chronological order.
3. Generates exactly one immutable invoice per missed cycle.
4. Advances the period start and end dates chronologically.
5. Advances `nextBillingDate` to the current cycle.
6. Never silently skips historical periods.

### Failure Isolation & Retries
- Failures on individual subscriptions are isolated; one failure never halts batch execution.
- Failed attempts are recorded in `BillingAttempt` with `status: FAILURE` and the specific error message.
- A failed subscription's `nextBillingDate` is **never advanced**.
- **Retry Policy**: Subscriptions with failure count $< 3$ can be retried via `retryFailedOnly: true`. Subscriptions exceeding 3 failures require staff review.

### Bounded Batch Processing
- Ingests subscriptions in configurable batches (default `batchSize: 50`, up to 500) using SQL `take` and `skip`.
- Prevents memory exhaustion on thousands of subscriptions.

---

## 7. Developer 3 Integration Interfaces

Developer 2 maintains two clean, decoupled integration surfaces for Developer 3:

### 1. Pricing, Tax & Discount Calculation Interface
**Location:** `backend/src/services/pricing-calculation.service.ts`  
**Method:** `PricingCalculationService.calculateTotals(input: PricingCalculationInput): Promise<CalculationResult>`

```typescript
export interface PricingCalculationInput {
  customerId: string;
  currency?: string;
  items: PricingLineItemInput[];
  discountCode?: string | null;
  billingPeriodStart?: Date | null;
  billingPeriodEnd?: Date | null;
}
```

### 2. Payment Allocation Interface
**Location:** `backend/src/services/invoice.service.ts`  
**Method:** `InvoiceService.recordPaymentAllocation(invoiceId: string, allocatedAmountMinor: bigint): Promise<Invoice>`

```typescript
import { InvoiceService } from "../services/invoice.service";

// Inside Developer 3's payment workflow:
const updatedInvoice = await InvoiceService.recordPaymentAllocation(
  invoiceId,
  allocatedAmountMinor // BigInt minor units (e.g. 500000n for Rs. 5,000.00)
);
```
- Increments `amountPaidMinor` and decrements `balanceDueMinor`.
- Automatically transitions status: `ISSUED` $\rightarrow$ `PARTIALLY_PAID` $\rightarrow$ `PAID` (setting `paidAt = new Date()`).
- Rejects payment allocation against voided invoices.

---

## 8. Complete REST API Reference

All routes require `Authorization: Bearer <JWT_TOKEN>`.

### Quotations & Templates
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/quotations` | `ADMIN`, `STAFF`, `CUSTOMER` | List quotations (scoped by customer ownership) |
| `POST` | `/api/v1/quotations` | `ADMIN`, `STAFF` | Create quotation (supports template auto-load) |
| `GET` | `/api/v1/quotations/:id` | `ADMIN`, `STAFF`, `CUSTOMER` | Quotation details with items |
| `PATCH`| `/api/v1/quotations/:id` | `ADMIN`, `STAFF` | Update draft quotation |
| `POST` | `/api/v1/quotations/:id/send` | `ADMIN`, `STAFF` | Mark quotation as `SENT` |
| `POST` | `/api/v1/quotations/:id/accept` | `ADMIN`, `STAFF`, `CUSTOMER` | Accept quotation |
| `POST` | `/api/v1/quotations/:id/reject` | `ADMIN`, `STAFF`, `CUSTOMER` | Reject quotation |
| `POST` | `/api/v1/quotations/:id/expire` | `ADMIN`, `STAFF` | Mark quotation as `EXPIRED` |
| `POST` | `/api/v1/quotations/:id/convert`| `ADMIN`, `STAFF` | Convert accepted quotation to subscription |
| `GET` | `/api/v1/quotation-templates` | `ADMIN`, `STAFF` | List quotation templates |
| `POST` | `/api/v1/quotation-templates` | `ADMIN`, `STAFF` | Create template (validity, terms, lines) |
| `GET` | `/api/v1/quotation-templates/:id` | `ADMIN`, `STAFF` | Get template by ID |
| `PATCH`| `/api/v1/quotation-templates/:id` | `ADMIN`, `STAFF` | Update template |
| `DELETE`|`/api/v1/quotation-templates/:id` | `ADMIN`, `STAFF` | Delete template |

### Subscriptions
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/subscriptions` | `ADMIN`, `STAFF`, `CUSTOMER` | List subscriptions |
| `POST` | `/api/v1/subscriptions` | `ADMIN`, `STAFF` | Create subscription (supports `stage: DRAFT`) |
| `GET` | `/api/v1/subscriptions/:id` | `ADMIN`, `STAFF`, `CUSTOMER` | Subscription details & business status |
| `POST` | `/api/v1/subscriptions/:id/send-quotation` | `ADMIN`, `STAFF` | Move `DRAFT` $\rightarrow$ `QUOTATION` |
| `POST` | `/api/v1/subscriptions/:id/confirm` | `ADMIN`, `STAFF` | Move `QUOTATION` $\rightarrow$ `CONFIRMED` |
| `POST` | `/api/v1/subscriptions/:id/activate` | `ADMIN`, `STAFF` | Move `CONFIRMED` $\rightarrow$ `ACTIVE` |
| `POST` | `/api/v1/subscriptions/:id/pause` | `ADMIN`, `STAFF` | Pause subscription (policy guarded) |
| `POST` | `/api/v1/subscriptions/:id/resume` | `ADMIN`, `STAFF` | Resume paused subscription |
| `POST` | `/api/v1/subscriptions/:id/close` | `ADMIN`, `STAFF` | Close subscription (terminal transition) |
| `POST` | `/api/v1/subscriptions/:id/cancel` | `ADMIN`, `STAFF` | Cancel subscription (immediate/period-end) |
| `POST` | `/api/v1/subscriptions/:id/renew` | `ADMIN`, `STAFF` | Renew contractual term (policy guarded) |

### Invoices
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/invoices` | `ADMIN`, `STAFF`, `CUSTOMER` | List invoices |
| `POST` | `/api/v1/invoices` | `ADMIN`, `STAFF` | Create invoice (`DRAFT` or `ISSUED`) |
| `GET` | `/api/v1/invoices/:id` | `ADMIN`, `STAFF`, `CUSTOMER` | Invoice details & allocations |
| `POST` | `/api/v1/invoices/:id/confirm` | `ADMIN`, `STAFF` | Confirm `DRAFT` $\rightarrow$ `ISSUED` (`OPEN`) |
| `POST` | `/api/v1/invoices/:id/send` | `ADMIN`, `STAFF` | Send / resend notification email |
| `POST` | `/api/v1/invoices/:id/void` | `ADMIN`, `STAFF` | Void unpaid invoice |

### Billing Engine
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/billing/run` | `ADMIN` | Trigger billing run (targetDate, batchSize, retries) |
| `GET` | `/api/v1/billing/runs` | `ADMIN` | List historical billing runs |
| `GET` | `/api/v1/billing/runs/:id` | `ADMIN` | Single run details & metrics |
| `GET` | `/api/v1/billing/attempts` | `ADMIN` | List individual billing attempts |

---

## 9. Verification & Test Suite Results

### Automated Test Coverage (65 Tests, 100% Passing)
```
PASS src/__tests__/dev2_gap_closure.test.ts (11 tests)
  ✓ Quotation templates with preconfigured lines, validity days & payment terms
  ✓ Auto-load template lines & dynamic validUntil calculation
  ✓ Reject converting expired quotation into subscription
  ✓ Full subscription lifecycle: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED
  ✓ Reject pause when disallowPause plan policy is configured
  ✓ Reject early cancellation when disallowEarlyClosure is configured
  ✓ Reject renewal when disallowRenewal is configured
  ✓ Contractual renewal extending term
  ✓ Automatic subscription closure for expired plans
  ✓ Invoice DRAFT creation, payment terms due date calculation & confirmation
  ✓ Sequential missed billing catch-up during engine downtime
  ✓ Billing failure recording without advancing billing dates
  ✓ Bounded batch processing

PASS src/__tests__/dev2_lifecycle.test.ts (19 tests)
PASS src/__tests__/billing_period.test.ts (11 tests)
PASS src/__tests__/auth.test.ts (5 tests)
PASS src/__tests__/authorization.test.ts (6 tests)
PASS src/__tests__/products_plans.test.ts (9 tests)

Test Suites: 6 passed, 6 total
Tests:       65 passed, 65 total
Snapshots:   0 total
Time:        8.958 s
Ran all test suites.
```

### Build Verification
- `@sms/shared`: Compiled (`npm run build --workspace=@sms/shared`).
- `@sms/backend`: Compiled cleanly with `tsc -p tsconfig.json` (0 errors).
- `@sms/frontend`: Compiled cleanly with `next build` (23 routes generated with 0 errors).

---

## 10. Schema Change Recommendations for Developer 1

All functionality has been delivered **without modifying Developer 1's shared schema**. However, for long-term schema evolution post-hackathon, the following enhancements are documented for Developer 1:

1. **Quotation Template Lines Table**:
   Currently, template lines are encoded in `QuotationTemplate.description` as structured JSON. A dedicated `QuotationTemplateItem` table with `productId`, `quantity`, and `unitPriceMinor` would provide referential cascade integrity.
2. **Subscription Status Enum Expansion**:
   Adding `DRAFT`, `QUOTATION`, `CONFIRMED`, `CLOSED` natively to `enum SubscriptionStatus` in `database/schema.prisma` would allow direct storage without metadata mapping flags.
3. **Plan Lifecycle Policy Columns**:
   Adding boolean columns `allowPause`, `allowRenewal`, `allowEarlyClosure`, `autoCloseAtEnd` to `Plan` in `schema.prisma`.

---

## 11. Quickstart Commands

```powershell
# Run the complete test suite
npm run test

# Run backend and frontend concurrently
npm run dev
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000/api/v1
```
