# Brightloop SMS — Developer 2 Handover & Commercial Lifecycle Specification

**Author:** Developer 2 (Quotation, Subscription, Recurring Billing & Invoice Lead)  
**Target Audience:** Developer 1 (Platform Lead), Developer 3 (Taxes, Discounts, Payments), and Hackathon Judges  
**Release Version:** `1.0.0-production-ready`  
**Database Schema Target:** `1.0.0-baseline` (Prisma schema unmodified; fully integrated with shared models)  

---

## 1. Modules Implemented

Developer 2 has designed, implemented, tested, and integrated the complete 4-tier commercial engine of the Brightloop Subscription Management System:

1. **Quotation Management & Templates:**
   - Full CRUD for Quotation Templates (`QuotationTemplate`) providing reusable terms, conditions, and default validity presets.
   - Quotation issuance with atomic sequence numbering (`QUO-YYYY-XXXX`), line-item snapshots (products, surcharge variants, quantities, unit prices).
   - Strict lifecycle state transitions (`DRAFT` → `SENT` → `ACCEPTED` / `REJECTED` / `EXPIRED`).
   - Transactional conversion of accepted quotations into active subscriptions with duplicate conversion prevention.
   - Multi-tenant customer scoping preventing unauthorized cross-tenant data leakage.

2. **Subscription Lifecycle Management:**
   - Creation via quotation conversion or direct administrative manual provisioning.
   - Comprehensive status lifecycle (`ACTIVE`, `PAUSED`, `CANCELLED`, `TRIALING`, `EXPIRED`).
   - Lifecycle actions with audit logging: Activation, Pausing, Resuming, and Immediate or Period-End Cancellation.
   - Strict business enforcement: Paused, cancelled, or expired subscriptions never generate billing cycle invoices. Silent reactivation of cancelled contracts is forbidden.

3. **Recurring Billing Engine:**
   - Centralized, standalone backend billing engine (`BillingService.runBillingEngine`).
   - High-precision date calculation utility (`calculateBillingPeriod`) handling start-inclusive, end-exclusive `[periodStart, periodEnd)` intervals (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`).
   - Monthly anchor-day preservation across irregular month lengths and leap years (e.g. Jan 31 → Feb 28/29 → Mar 31).
   - **Critical Idempotency:** Duplicate invoice prevention enforced via database transaction locks and unique period constraints `(subscriptionId, billingPeriodStart, billingPeriodEnd)`.
   - Logging of every run (`BillingRun`) and per-subscription outcome (`BillingAttempt`).
   - Schedulable background worker (`BillingScheduler`) and ADMIN-only manual execution.

4. **Invoice Management & Commercial Snapshots:**
   - Idempotent invoice numbering (`INV-YYYY-XXXX`) generated via atomic PostgreSQL sequences.
   - Historical commercial line-item snapshots preserving product names, variant surcharges, quantities, tax breakdowns, and unit prices.
   - Strict integer minor unit financial arithmetic (paise / BIGINT) with string JSON serialization to guarantee zero IEEE 754 floating-point inaccuracies.
   - Void invoice workflow with strict safeguards preventing voiding of invoices with recorded payments.
   - Print-friendly invoice view with clean corporate branding, GST/Tax breakdown, and remitted payment allocation records.

---

## 2. Backend Routes & API Contracts

All endpoints follow the project's standard response envelope:
`{ "success": true, "data": ..., "meta": ..., "error": null }`

### Quotations & Templates
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/quotation-templates` | ADMIN, STAFF | List quotation templates with pagination |
| `POST` | `/api/v1/quotation-templates` | ADMIN, STAFF | Create a quotation template |
| `GET` | `/api/v1/quotation-templates/:id` | ADMIN, STAFF | Retrieve a single quotation template |
| `PATCH` | `/api/v1/quotation-templates/:id` | ADMIN, STAFF | Update template terms or name |
| `DELETE` | `/api/v1/quotation-templates/:id` | ADMIN, STAFF | Delete a template |
| `GET` | `/api/v1/quotations` | All (Scoped) | List quotations (Customers see only their own) |
| `POST` | `/api/v1/quotations` | ADMIN, STAFF | Create new quotation in DRAFT status |
| `GET` | `/api/v1/quotations/:id` | All (Scoped) | Get single quotation with line items & customer |
| `PATCH` | `/api/v1/quotations/:id` | ADMIN, STAFF | Update draft quotation items or terms |
| `POST` | `/api/v1/quotations/:id/send` | ADMIN, STAFF | Move status from DRAFT to SENT |
| `POST` | `/api/v1/quotations/:id/accept` | All (Owner/Staff) | Customer accepts quotation (checks validUntil) |
| `POST` | `/api/v1/quotations/:id/reject` | All (Owner/Staff) | Reject quotation with optional reason |
| `POST` | `/api/v1/quotations/:id/expire` | ADMIN, STAFF | Mark past-due quotation as EXPIRED |
| `POST` | `/api/v1/quotations/:id/convert` | ADMIN, STAFF | Convert ACCEPTED quotation into Subscription |

### Subscriptions
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/subscriptions` | All (Scoped) | List subscriptions with pagination |
| `POST` | `/api/v1/subscriptions` | ADMIN, STAFF | Create a manual subscription |
| `GET` | `/api/v1/subscriptions/:id` | All (Scoped) | Get single subscription with items, invoices & history |
| `POST` | `/api/v1/subscriptions/:id/activate` | ADMIN, STAFF | Activate a subscription |
| `POST` | `/api/v1/subscriptions/:id/pause` | ADMIN, STAFF | Pause subscription (suspends recurring billing) |
| `POST` | `/api/v1/subscriptions/:id/resume` | ADMIN, STAFF | Resume subscription and align next billing date |
| `POST` | `/api/v1/subscriptions/:id/cancel` | All (Owner/Staff) | Cancel subscription with reason |

### Recurring Billing
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/billing/run` | ADMIN only | Execute recurring billing engine up to targetDate |
| `GET` | `/api/v1/billing/runs` | ADMIN, STAFF | List historical billing runs |
| `GET` | `/api/v1/billing/runs/:id` | ADMIN, STAFF | Get single billing run and all attempt details |
| `GET` | `/api/v1/billing/attempts` | ADMIN, STAFF | List per-subscription billing attempts |

### Invoices
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/invoices` | All (Scoped) | List invoices with status & customer filters |
| `GET` | `/api/v1/invoices/:id` | All (Scoped) | Detailed invoice sheet with items, tax breakdown & payments |
| `POST` | `/api/v1/invoices` | ADMIN, STAFF | Manual invoice creation |
| `POST` | `/api/v1/invoices/:id/void` | ADMIN, STAFF | Void unpaid invoice (blocks voiding if payments exist) |

---

## 3. Database Models Used

All models are existing tables from Developer 1's shared schema:
- `quotation_templates` (`QuotationTemplate`)
- `quotations` (`Quotation`)
- `quotation_items` (`QuotationItem`)
- `subscriptions` (`Subscription`)
- `subscription_items` (`SubscriptionItem`)
- `invoices` (`Invoice`)
- `invoice_items` (`InvoiceItem`)
- `billing_runs` (`BillingRun`)
- `billing_attempts` (`BillingAttempt`)
- `discount_applications` (`DiscountApplication`)
- `audit_logs` (`AuditLog`)

---

## 4. Schema Coordination with Developer 1

- **Prisma Schema Integrity:** Developer 2 did **not** modify `database/schema.prisma`. All 27 models provided by Developer 1 were used as designed.
- **Conversion Status Note:** `QuotationStatus` enum contains `DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED`. Converted quotations are identified by `quotation.subscription !== null` while remaining `ACCEPTED`. In a future non-hackathon cycle, Developer 1 can optionally add `CONVERTED` to the `QuotationStatus` enum if required.
- **Invoice Period Constraint:** Developer 1 specified the unique index `(subscription_id, billing_period_start, billing_period_end)`. Developer 2 implemented programmatic checks and database transaction isolation around this index to ensure zero duplicate invoice generation.

---

## 5. Quotation-to-Subscription Flow

```
[ADMIN / STAFF]
   Create Quotation (DRAFT)
         │
         ▼
   Send Quotation (SENT)
         │
         ├─────────────────────────────────────────────┐
         ▼                                             ▼
[CUSTOMER / STAFF]                              [CUSTOMER / STAFF]
   Accept Quotation (ACCEPTED)                     Reject Quotation (REJECTED)
         │
         ▼
[ADMIN / STAFF]
   Convert Quotation (/convert)
   - Transactionally creates Subscription & SubscriptionItems
   - Locks quotation pricing & product variants
   - Links quotationId on Subscription
   - Calculates initial [periodStart, periodEnd)
         │
         ▼
   Subscription ACTIVE
```

---

## 6. Subscription Lifecycle Rules

1. **State Machine:**
   - `DRAFT` / `TRIALING` → `ACTIVE`
   - `ACTIVE` ⇄ `PAUSED`
   - `ACTIVE` / `PAUSED` → `CANCELLED`
   - `ACTIVE` / `PAUSED` → `EXPIRED`
2. **Billing Suspension:** Subscriptions with status `PAUSED` or `CANCELLED` (with effective cancellation date ≤ period start) are filtered out and will **never** generate recurring invoices.
3. **No Silent Reactivation:** Once cancelled, contracts cannot be reactivated; customers must receive a fresh proposal or subscription.
4. **Pause Alignment:** When resuming a paused subscription whose billing date has elapsed, the period start is aligned to the resume date and the next billing date is recalculated according to the original anchor day.

---

## 7. Recurring Billing Engine & Idempotency

### Date Calculation (`billing-period.ts`)
- Convention: Start-inclusive, end-exclusive `[periodStart, periodEnd)`.
- Anchor Preservation: Subscriptions created on month-end dates (e.g. January 31) clamp to February 28 (or 29 on leap years), and automatically restore to the 31st in March and May.
- Daily, Weekly, Monthly, and Yearly intervals fully supported and covered by unit tests.

### Concurrency & Idempotency Guarantee
When `BillingService.runBillingEngine` executes:
1. Candidate subscriptions with `status = ACTIVE` and `nextBillingDate <= targetDate` are selected.
2. For each subscription, an isolated database transaction is opened:
   - Queries existing invoice for `(subscriptionId, periodStart, periodEnd)`.
   - If found: Skips invoice creation, records `BillingAttemptStatus.SUCCESS` with `"Idempotent skip"`, and does not double-bill.
   - If not found: Generates invoice, line items, and audit logs.
   - Subscription's `nextBillingDate`, `currentPeriodStart`, and `currentPeriodEnd` advance **only after successful invoice insertion**.
   - If an error occurs: Records `BillingAttemptStatus.FAILURE`, does not advance subscription billing dates, and isolates the error from aborting other subscriptions.

---

## 8. Developer 3 Integration Points

Developer 2 has prepared clean, modular server-side interfaces so Developer 3's financial modules plug in without rewrites:

1. **Financial Calculation Contract (`financial-calculator.service.ts`):**
   ```typescript
   FinancialCalculatorService.calculateTotals({
     items: LineItemCalculationInput[],
     customerId: string,
     discountCode?: string,
     currency?: string
   })
   ```
   - Automatically queries Developer 1's seeded `Tax` and `ProductTax` tables (18% GST).
   - Validates Developer 3's `Discount` records (`PERCENTAGE` basis points or `FIXED_AMOUNT` minor units).
   - Generates line-item snapshots and returns structured breakdowns:
     `{ subtotalMinor, taxAmountMinor, discountAmountMinor, totalAmountMinor, taxBreakdown }`.

2. **Invoice Payment Status Update (`invoice.service.ts`):**
   ```typescript
   InvoiceService.recordPaymentAllocation(
     invoiceId: string,
     allocatedAmountMinor: bigint,
     tx?: any
   )
   ```
   - Called by Developer 3's payment allocation workflow.
   - Atomically increments `amountPaidMinor`, decrements `balanceDueMinor`, and transitions status to `PARTIALLY_PAID` or `PAID` (`paidAt = now()`).

---

## 9. Frontend Pages Implemented

Built using Next.js 14 App Router, Tailwind CSS, Lucide icons, and real API integrations:

| Path | Purpose |
|---|---|
| `/quotations` | Quotations list, status badges, customer links, search, and filters |
| `/quotations/new` | Multi-product proposal builder with live total estimation |
| `/quotations/[id]` | Detailed commercial proposal view, status transition triggers, print layout |
| `/quotation-templates` | Template management for standard legal terms & SLA boilerplate |
| `/subscriptions` | Subscriptions list, billing interval pills, current period, next billing date |
| `/subscriptions/new` | Manual subscription provisioning from plans or custom products |
| `/subscriptions/[id]` | Subscription details, line items, generated invoices, lifecycle action triggers |
| `/billing` | ADMIN-only dashboard: target-date execution, live run stats, attempts history |
| `/invoices` | Invoices list with status, totals, and outstanding balance tracking |
| `/invoices/[id]` | Professional printable tax invoice with GST breakdown, print action |

---

## 10. Test Execution & Verification

To verify the test suite:
```bash
npm test --workspace=@sms/backend
```

### Results Summary
```
PASS src/__tests__/billing-period.test.ts (12 tests)
  - Daily, Weekly, Monthly, Yearly intervals
  - Jan 31 -> Feb 28 -> Mar 31 anchor day restoration
  - Leap year Feb 29 handling

PASS src/__tests__/commercial_lifecycle.test.ts (16 tests)
  - Quotation creation, validation, atomic numbering
  - Multi-tenant customer scoping & ownership guards
  - Quotation DRAFT -> SENT -> ACCEPTED -> CONVERTED
  - Duplicate quotation conversion rejection (409 Conflict)
  - Recurring billing execution with tax calculation
  - Idempotent double-billing protection
  - Paused subscription skip verification
  - Resume & cancellation state transitions
  - Void invoice validation (blocking voiding of paid invoices)

PASS src/__tests__/auth.test.ts
PASS src/__tests__/authorization.test.ts
PASS src/__tests__/products_plans.test.ts

Test Suites: 5 passed, 5 total
Tests:       48 passed, 48 total
```

---

## 11. Instructions for Running the System

1. **Start PostgreSQL Database:**
   ```powershell
   & "C:\Users\augus\scoop\apps\postgresql\current\bin\pg_ctl.exe" -D "C:\Users\augus\scoop\apps\postgresql\current\data" start
   ```

2. **Run Monorepo Build:**
   ```bash
   npm run build
   ```

3. **Run Test Suites:**
   ```bash
   npm test
   ```

4. **Start Development Servers:**
   ```bash
   npm run dev
   ```
   - Backend API: `http://localhost:4000/api/v1`
   - Frontend UI: `http://localhost:3000`

5. **Demo Accounts:**
   - **Admin:** `admin@brightloop.demo` / `Brightloop!2026`
   - **Staff:** `staff@brightloop.demo` / `Brightloop!2026`
   - **Customer:** `customer@brightloop.demo` / `Brightloop!2026`

