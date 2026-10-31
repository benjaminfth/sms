# Developer 3 Handover Documentation — Brightloop Subscription Management System

**Author**: Developer 3 (Financial Calculation, Payment Processing, Reconciliation, Analytics & Customer Portal Lead)  
**Role Scope**: Tax Management, Discount Engine, Unified Pricing Service, Payment Processing, Allocation & Reconciliation, Executive Dashboard Analytics, Customer Self-Service Portal.  
**Branch**: `dev_3`  
**Date**: October 31, 2026  

---

## 1. Modules Implemented

| Module | Core Responsibility | Primary Files / Components |
| :--- | :--- | :--- |
| **Taxes** | Tax definition, basis-point calculations, inclusive/exclusive modes, product tax mapping | `tax.service.ts`, `tax-calculation.service.ts`, `tax.routes.ts`, `/admin/taxes/*` |
| **Discounts** | Percentage/fixed promo rules, validity dates, redemption limits, customer/product eligibility | `discount.service.ts`, `discount-calculation.service.ts`, `discount.routes.ts`, `/admin/discounts/*` |
| **Pricing Engine** | Unified, authoritative calculation engine for Developer 2 (Quotations & Subscriptions/Invoices) | `pricing.service.ts`, `contracts.ts` (Contracts F, G, H), `/api/v1/pricing/calculate` |
| **Payments** | Offline manual recording, demo simulated gateway adapter, idempotency, duplicate protection | `payment.service.ts`, `demo-payment-provider.service.ts`, `payment.routes.ts`, `/admin/payments/*` |
| **Allocation & Reconciliation** | Transactional payment-to-invoice allocations, partial settlement, unallocated balance auditing | `allocation.service.ts`, `reconciliation.service.ts`, `invoice-settlement.service.ts`, `/admin/reconciliation` |
| **Dashboard** | Executive revenue KPIs, invoiced vs collected revenue, Recharts time-series, subscription breakdown | `dashboard.service.ts`, `dashboard.routes.ts`, `/admin/dashboard` |
| **Customer Portal** | Authenticated customer self-service, quotations review/accept, invoices, payment simulation, profile | `portal.service.ts`, `portal.routes.ts`, `/portal/*` (8 customer pages) |

---

## 2. Tax Configuration and Calculation Rules

### Configuration
- Defined in the shared `Tax` and `ProductTax` models.
- **Basis Points**: Rates are stored as integer basis points (`rateBasisPoints`), where `100 bps = 1.00%`. For example:
  - 5% = `500` bps
  - 12% = `1200` bps
  - 18% GST = `1800` bps
- **Inclusive vs Exclusive**:
  - `isInclusive = false` (Exclusive): Tax is calculated on top of the taxable amount.
    $$\text{Tax Amount} = \left\lfloor \frac{\text{Taxable Minor} \times \text{Rate BPS} + 5000}{10000} \right\rfloor$$
  - `isInclusive = true` (Inclusive): Tax is extracted from the gross amount.
    $$\text{Tax Amount} = \left\lfloor \frac{\text{Gross Minor} \times \text{Rate BPS} + \frac{10000 + \text{Rate BPS}}{2}}{10000 + \text{Rate BPS}} \right\rfloor$$
- **Precision**: 100% integer arithmetic in minor units (paise for INR). Zero floating-point arithmetic used for money.
- **Audit Snapshots**: Line-item tax breakdowns are stored as JSON snapshots (`taxBreakdownSnapshot`) so historical invoices remain legally binding and immutable even if rates change later.

---

## 3. Discount Validation and Application Rules

- **Types Supported**: `PERCENTAGE` (basis points) and `FIXED_AMOUNT` (integer paise).
- **Backend Validation Criteria**:
  1. Discount code exists and has `isActive = true`.
  2. Current time falls within `validFrom` and `validUntil` (inclusive).
  3. Minimum invoice amount requirement (`minInvoiceAmountMinor`) is satisfied.
  4. Total redemptions limit (`maxRedemptionsTotal`) has not been exceeded.
  5. Per-customer redemption limit (`maxRedemptionsPerCustomer`) has not been exceeded by the querying customer.
  6. Product eligibility: If assigned to specific products via `DiscountProduct`, the invoice must contain at least one eligible product.
- **Calculation Constraints**:
  - For percentage discounts, capped by `maxDiscountAmountMinor` where configured.
  - Clamped so discount can never exceed the order subtotal (payable amount never negative).
  - Discount is distributed proportionally across line items before computing item-level taxes.

---

## 4. Pricing Calculation Service Interface (Developer 2 Contract H)

Developer 2 can import and call `PricingService.calculatePricing(input)` directly on the backend, or call `POST /api/v1/pricing/calculate`.

### TypeScript Interface:
```typescript
import { PricingService } from "./services/pricing.service";

export interface PricingItemInput {
  productId: string;
  productVariantId?: string | null;
  description?: string;
  quantity: string | number; // e.g. "1.000"
  unitPriceMinor?: string | bigint; // Optional: resolves from product catalog if omitted
}

export interface CalculatePricingInput {
  items: PricingItemInput[];
  customerId?: string;
  discountCode?: string;
  currency?: string; // Default: "INR"
  isInclusiveTax?: boolean;
}

export interface PricingCalculationResult {
  currency: string;
  subtotalMinor: string;
  discountTotalMinor: string;
  taxableAmountMinor: string;
  taxTotalMinor: string;
  grandTotalMinor: string;
  items: Array<{
    productId: string;
    productVariantId: string | null;
    description: string;
    quantity: string;
    unitPriceMinor: string;
    subtotalMinor: string;
    discountMinor: string;
    taxAmountMinor: string;
    totalAmountMinor: string;
    applicableTaxes: TaxComponentBreakdown[];
  }>;
  discountBreakdown: Array<{
    discountId: string;
    code: string;
    name: string;
    discountType: string;
    amountMinor: string;
  }>;
  taxBreakdown: TaxComponentBreakdown[];
}
```

---

## 5. Payment Recording Workflow

1. **Manual / Offline Payments (`POST /api/v1/payments`)**:
   - Authorized `ADMIN` / `STAFF` records payments received via `UPI`, `BANK_TRANSFER`, `CASH`, `CARD`, or `OTHER`.
   - Validates existence of `customerId`.
   - If an optional `invoiceId` is supplied, verifies invoice belongs to customer and verifies balance.
   - Enforces unique idempotency check against `paymentReference`.
   - Records payment with status `COMPLETED` and automatically creates an initial `PaymentAllocation` against the invoice if specified.
   - Triggers `InvoiceSettlementService` to recalculate invoice status (`PAID` or `PARTIALLY_PAID`).
   - Writes an immutable `AuditLog` entry.

---

## 6. Payment Gateway & Demo Payment Implementation

- **Provider Abstraction (`IPaymentProvider`)**:
  - Defined in `backend/src/services/payment-provider.interface.ts`.
  - Future real gateways (Razorpay, Stripe, Cashfree) simply implement `processPayment(params)` and `verifyPayment(reference)`.
- **Demo Gateway (`DemoPaymentProvider`)**:
  - Implemented in `backend/src/services/demo-payment-provider.service.ts`.
  - Generates verifiable test transaction references prefixed with `DEMO-`.
  - Explicitly tags notes and logs with `(DEMO SIMULATION)` — never represents simulated transactions as real bank settlements.
  - Zero sensitive card numbers or CVVs stored in the database.

---

## 7. Payment Allocation Logic

- **Model**: `PaymentAllocation` connecting `paymentId` to `invoiceId`.
- **Validation Rules**:
  1. Payment must be in `COMPLETED` status.
  2. Cumulative allocations for a payment cannot exceed `payment.amountMinor`.
  3. Invoices cannot be in `VOID` or `CANCELLED` status.
  4. Cumulative allocations for an invoice cannot exceed `invoice.totalAmountMinor`.
  5. Cross-customer allocation is rejected; payment customer and invoice customer must match.
  6. Idempotent check prevents duplicate double-allocation in the same database transaction.

---

## 8. Reconciliation Behavior

- **Reconciliation Console (`/admin/reconciliation`)**:
  - Computes `unallocatedAmountMinor = payment.amountMinor - sum(allocatedAmountMinor)`.
  - Categorizes payments into **Fully Allocated** vs **Unmatched / Partially Allocated**.
  - Provides date filtering, search by transaction reference, and filter by payment method.
- **Manual Reconciliation Action (`POST /api/v1/reconciliation/:paymentId/allocate`)**:
  - Allows staff to review unmatched payments and select eligible open customer invoices to settle remaining balances.
  - Runs in a Prisma interactive transaction `$transaction` with row-level integrity.

---

## 9. Invoice Status Integration (Developer 2 Contract I & J)

When allocations are created or modified, `InvoiceSettlementService.updateInvoiceSettlement(invoiceId, tx)` calculates:

$$\text{amountPaidMinor} = \sum_{\text{allocations}} \text{allocatedAmountMinor}$$
$$\text{balanceDueMinor} = \max\left(0, \text{totalAmountMinor} - \text{amountPaidMinor}\right)$$

### Status Transitions:
- If $\text{balanceDueMinor} = 0$: status becomes `PAID` and `paidAt` is timestamped.
- If $\text{amountPaidMinor} > 0$ and $\text{balanceDueMinor} > 0$: status becomes `PARTIALLY_PAID`.
- If $\text{amountPaidMinor} = 0$ and $\text{dueDate} < \text{today}$: status becomes `OVERDUE`.
- If $\text{amountPaidMinor} = 0$ and $\text{dueDate} \ge \text{today}$: status remains `ISSUED`.

---

## 10. Dashboard Metric Definitions

Aggregated on the PostgreSQL database in `backend/src/services/dashboard.service.ts`:
- **Invoiced Revenue**: Sum of `totalAmountMinor` for all issued, active invoices (excluding `VOID` and `CANCELLED`).
- **Collected Revenue**: Sum of `allocatedAmountMinor` across completed payment allocations (or completed payments within period).
- **Outstanding Revenue**: Difference between invoiced revenue and collected revenue.
- **Active Subscriptions**: Current subscriptions with status `ACTIVE`.
- **Invoice Status Distribution**: Breakdown count and volume across `PAID`, `PARTIALLY_PAID`, `ISSUED`, `OVERDUE`, `VOID`.
- **Payment Method Distribution**: Breakdown of revenue captured across `UPI`, `CARD`, `BANK_TRANSFER`, `CASH`.

---

## 11. Customer Portal Routes & Ownership Rules

All routes enforce customer identity via authenticated JWT `req.user.customerId`. Never trusts client-supplied query parameters.

| Portal Endpoint | Method | Authorization & Ownership |
| :--- | :--- | :--- |
| `/api/v1/portal/overview` | `GET` | Customer session: returns active plans, balances, recent items |
| `/api/v1/portal/subscriptions` | `GET` | Filters `subscription.customerId == session.customerId` |
| `/api/v1/portal/subscriptions/:id` | `GET` | Verifies ownership; 404 if belongs to another customer |
| `/api/v1/portal/subscriptions/:id/cancel` | `POST` | Sets status `CANCELLED` and writes audit log |
| `/api/v1/portal/quotations` | `GET` | Filters `quotation.customerId == session.customerId` |
| `/api/v1/portal/quotations/:id` | `GET` | Verifies quotation ownership |
| `/api/v1/portal/quotations/:id/accept` | `POST` | Updates status to `ACCEPTED` |
| `/api/v1/portal/quotations/:id/reject` | `POST` | Updates status to `REJECTED` |
| `/api/v1/portal/invoices` | `GET` | Filters `invoice.customerId == session.customerId` |
| `/api/v1/portal/invoices/:id` | `GET` | Verifies invoice ownership, line items, and allocations |
| `/api/v1/portal/invoices/:id/pay` | `POST` | Executes demo payment, allocates, marks invoice paid |
| `/api/v1/portal/payments` | `GET` | Filters `payment.customerId == session.customerId` |
| `/api/v1/portal/profile` | `GET`, `PATCH` | Updates address, company name, phone, GSTIN |

---

## 12. Database Models Used

Directly leverages Developer 1's shared schema in `database/schema.prisma`:
- `Tax`, `ProductTax`
- `Discount`, `DiscountProduct`, `DiscountApplication`
- `Payment`, `PaymentAllocation`
- `Invoice`, `InvoiceItem`
- `Quotation`, `QuotationItem`
- `Subscription`, `SubscriptionItem`
- `Customer`, `User`, `AuditLog`

---

## 13. Schema Changes Requested from Developer 1

All required models already existed in the shared schema. No additional database migrations or schema alterations were needed.

---

## 14. Integration Requirements for Developer 2

1. **Quotations & Invoice Pricing**:
   - In your quotation creation and invoice generation services, call `PricingService.calculatePricing(input)`.
   - Pass line items (`productId`, `quantity`, `unitPriceMinor`) and optional `discountCode`.
   - Use the returned `subtotalMinor`, `discountTotalMinor`, `taxTotalMinor`, `grandTotalMinor`, and store `taxBreakdown` as `taxBreakdownSnapshot` in the invoice.
2. **Payment Settlement Notification**:
   - If an invoice total is adjusted, call `InvoiceSettlementService.updateInvoiceSettlement(invoiceId)` to refresh balances and payment status.
3. **Quotation Acceptance**:
   - When a quotation is accepted in the customer portal (`QuotationStatus.ACCEPTED`), Developer 2's subscription generation routine can consume the quotation and create the initial subscription and invoice.

---

## 15. Frontend Pages Implemented

### Admin Pages (`/admin/*`)
- `/admin/taxes`: Configurable tax rates list, search, active toggles.
- `/admin/taxes/new`: Create tax rule with basis points calculator.
- `/admin/taxes/[id]`: Edit tax rate and assign products to tax rules.
- `/admin/discounts`: Promotional codes list, redemptions count, eligibility.
- `/admin/discounts/new`: Create percentage or fixed discount with date limits.
- `/admin/discounts/[id]`: Edit discount and view redemption history audit trail.
- `/admin/payments`: Transaction ledger, search by reference, method filters.
- `/admin/payments/new`: Record offline/manual payment with invoice allocation.
- `/admin/payments/[id]`: Payment receipt, unallocated balance, allocation modal.
- `/admin/reconciliation`: Audit unmatched payments and allocate deposits.
- `/admin/dashboard`: Real-time Recharts revenue analytics and subscription KPIs.

### Customer Portal Pages (`/portal/*`)
- `/portal`: Customer dashboard with active plans, balance due, recent invoices.
- `/portal/invoices`: Invoices list with status badges.
- `/portal/invoices/[id]`: Printable tax invoice, line items, breakdown, and Pay modal.
- `/portal/subscriptions`: Subscriptions list with billing intervals.
- `/portal/subscriptions/[id]`: Plan details and cancellation request dialog.
- `/portal/quotations`: Proposals list with validity dates.
- `/portal/quotations/[id]`: Proposal review with Accept / Decline actions.
- `/portal/payments`: Customer transaction history and receipt links.
- `/portal/profile`: Customer profile, GSTIN, and legal billing address form.

---

## 16. Test Commands and Test Results

### Test Suite Execution
```bash
npm --prefix backend test
```

### Result: 100% Passing (6/6 Suites, 42/42 Tests)
```text
PASS src/__tests__/taxes_discounts.test.ts
PASS src/__tests__/auth.test.ts
PASS src/__tests__/portal_security.test.ts
PASS src/__tests__/authorization.test.ts
PASS src/__tests__/products_plans.test.ts
PASS src/__tests__/payments_reconciliation.test.ts

Test Suites: 6 passed, 6 total
Tests:       42 passed, 42 total
Snapshots:   0 total
Time:        6.803 s
```

### Frontend Build Verification
```bash
npm --prefix frontend run build
```
Result: **Compiled successfully** — all 29 routes statically/dynamically generated with zero TypeScript or packaging errors.

---

## 17. Known Issues or Incomplete Features

- **None**: All core financial modules, calculations, transactional settlements, analytics, and portal views are 100% complete and verified against live PostgreSQL data.
- **Future Enhancement**: If real payment gateway credentials (Razorpay/Stripe) are provisioned post-hackathon, create an implementation of `IPaymentProvider` with webhook signature validation.

---

## 18. Instructions to Run and Test the Modules

### 1. Database & Seed
```bash
npm run db:generate
npm run db:seed
```

### 2. Start Servers
- Backend (Port 4000):
  ```bash
  npm run dev:backend
  ```
- Frontend (Port 3000):
  ```bash
  npm run dev:frontend
  ```

### 3. Demo Credentials
- **Admin**: `admin@brightloop.demo` / `Brightloop!2026`
- **Staff**: `staff@brightloop.demo` / `Brightloop!2026`
- **Customer**: `customer@brightloop.demo` / `Brightloop!2026`

### 4. End-to-End Demo Workflow
1. Log in as **Admin** (`admin@brightloop.demo`).
2. Go to **Taxes** (`/admin/taxes`) → View GST 18% rule and assigned products.
3. Go to **Discounts** (`/admin/discounts`) → View promo codes `LAUNCH20` (20% off) and `SAVE500`.
4. Go to **Dashboard** (`/admin/dashboard`) → Inspect live revenue charts (collected vs invoiced).
5. Log out and log in as **Customer** (`customer@brightloop.demo`).
6. Navigate to **Customer Portal** (`/portal`):
   - Review pending invoice `INV-2026-0001` (balance ₹2,360).
   - Click invoice → click **Pay Outstanding Balance**.
   - Select UPI/Card and confirm payment.
   - Observe invoice status update to **Paid in Full** and ledger settlement created.
7. Switch back to **Admin** → Open **Reconciliation** (`/admin/reconciliation`) and **Dashboard** (`/admin/dashboard`) to verify that collected revenue increased in real time.
