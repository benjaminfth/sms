# Developer 3 Handover Documentation — Brightloop Subscription Management System

**Author**: Developer 3 (Financial Calculation, Payment Processing, Reconciliation, Analytics & Customer Portal Lead)  
**Role Scope**: Tax Management, Discount Engine, Unified Pricing Service, Payment Processing, Allocation & Reconciliation, Executive Dashboard Analytics, Customer Self-Service Portal.  
**Branch**: `dev_3`  
**Date**: October 31, 2026 (Updated with Complete Gap Closure)  

---

## 1. Modules Implemented

| Module | Core Responsibility | Primary Files / Components |
| :--- | :--- | :--- |
| **Taxes** | Tax definition, basis-point calculations, inclusive/exclusive modes, product tax mapping | `tax.service.ts`, `tax-calculation.service.ts`, `tax.routes.ts`, `/admin/taxes/*` |
| **Discounts & Gap Closure** | Percentage/fixed promo rules, minimum quantity, scope (`PRODUCT`, `PLAN`, `SUBSCRIPTION`), automatic recurring cycles, atomic concurrency protections | `discount.service.ts`, `discount-calculation.service.ts`, `discount.routes.ts`, `/admin/discounts/*` |
| **Pricing Engine** | Unified, authoritative calculation engine for Developer 2 (Quotations & Subscriptions/Invoices) with recurring discount auto-detection | `pricing.service.ts`, `contracts.ts` (Contracts F, G, H), `/api/v1/pricing/calculate` |
| **Payments** | Offline manual recording, demo simulated gateway adapter, internal staff notes vs customer-visible notes, idempotency | `payment.service.ts`, `demo-payment-provider.service.ts`, `payment.routes.ts`, `/admin/payments/*` |
| **Allocation & Reconciliation** | Transactional payment-to-invoice allocations, partial settlement, unallocated balance auditing | `allocation.service.ts`, `reconciliation.service.ts`, `invoice-settlement.service.ts`, `/admin/reconciliation` |
| **Dashboard** | Executive revenue KPIs, invoiced vs collected revenue, Recharts time-series, subscription breakdown | `dashboard.service.ts`, `dashboard.routes.ts`, `/admin/dashboard` |
| **Customer Portal** | Authenticated customer self-service, quotations review/accept, invoices, payment simulation, note privacy | `portal.service.ts`, `portal.routes.ts`, `/portal/*` (8 customer pages) |

---

## 2. Discount Permission Policy

Per the original Brightloop challenge specifications: **Only ADMIN can create and modify discount rules.**

### Backend Authorization Matrix
| Route | Action | ADMIN | STAFF | CUSTOMER |
| :--- | :--- | :---: | :---: | :---: |
| `GET /api/v1/discounts` | List & search active/inactive discounts | Allowed | Allowed | 403 Forbidden |
| `GET /api/v1/discounts/:id` | View discount details & redemptions | Allowed | Allowed | 403 Forbidden |
| `POST /api/v1/discounts` | Create new discount rule | Allowed | **403 Forbidden** | **403 Forbidden** |
| `PATCH /api/v1/discounts/:id` | Edit discount rules/parameters | Allowed | **403 Forbidden** | **403 Forbidden** |
| `POST /api/v1/discounts/:id/activate` | Activate discount rule | Allowed | **403 Forbidden** | **403 Forbidden** |
| `POST /api/v1/discounts/:id/deactivate` | Deactivate discount rule | Allowed | **403 Forbidden** | **403 Forbidden** |
| `POST /api/v1/discounts/attach-subscription` | Attach discount to subscription | Allowed | **403 Forbidden** | **403 Forbidden** |
| `POST /api/v1/discounts/validate` | Validate code eligibility | Allowed | Allowed | Allowed |

### Frontend UI Enforcement
- **Discounts List (`/admin/discounts`)**: The "Create New Discount" button is conditionally rendered only for `Role.ADMIN`. Staff users see a helpful informational badge: *"Staff View (Admin Required to Create)"*.
- **Discount Details (`/admin/discounts/[id]`)**: Inputs are disabled (`disabled={!isAdmin}`) and the save button is hidden for Staff users with a banner explaining read-only access.

---

## 3. Minimum Quantity Discount Rules

Discounts support independent validation of **minimum quantity** (`minQuantity`) and **minimum purchase amount** (`minOrderAmountMinor`):

1. **Independent Evaluation**: A discount can define `minQuantity: 10` seats and `minOrderAmountMinor: 100000` (₹1,000) independently.
2. **Eligible Products Scoping**:
   - For `scope: "PRODUCT"` discounts, quantity is counted **strictly on eligible items**.
   - If Customer buys 8 seats of eligible Product A and 5 units of ineligible Product B, total quantity is 13, but eligible quantity is 8. Since 8 < 10, the discount is **rejected**.
   - If Customer buys 10 seats of eligible Product A, discount is **accepted**.
3. **Integer Clamping**: Discounts can never produce negative invoice totals.

---

## 4. Product, Plan, and Subscription Eligibility Scopes

Supported discount eligibility scopes:
- **`PRODUCT`**: The discount applies **exclusively** to the eligible items specified in `discountProducts`. Ineligible line items receive ₹0 discount.
- **`PLAN`**: Applies when the subscription or quotation matches the eligible plan.
- **`SUBSCRIPTION`**: Subscription-wide discount that distributes proportionally across all line items on the recurring invoice.
- **Stacking Restrictions**: Product-level and subscription-level discounts are not duplicated unless explicit stacking is enabled.

---

## 5. Automatic Recurring Discount Application

Recurring discounts attached to a subscription are evaluated and applied automatically by the backend pricing engine without requiring staff to re-enter promo codes manually on every billing cycle:

### Workflow
1. **Attachment**: Admin calls `POST /api/v1/discounts/attach-subscription` with `subscriptionId` and `discountCode`. A tracking record is created in `DiscountApplication` with `invoiceId: null`.
2. **Cycle Tracking (`recurringCycleCount`)**:
   - Each completed billing cycle that issues an invoice creates a `DiscountApplication` linking `subscriptionId` and `invoiceId`.
   - Before applying, `DiscountCalculationService` counts completed non-void cycles:
     $$\text{completedCycles} = \text{count}(\text{DiscountApplication where subscriptionId, invoiceId } \ne \text{ null and invoice.status } \ne \text{ VOID})$$
   - If $\text{completedCycles} \ge \text{recurringCycleCount}$, the discount **stops applying automatically**.
3. **Example**:
   - Monthly plan: ₹2,000/month.
   - 10% recurring discount, `recurringCycleCount: 3`.
   - **Billing Cycle 1**: ₹2,000 base, ₹200 discount $\rightarrow$ ₹1,800 payable.
   - **Billing Cycle 2**: ₹2,000 base, ₹200 discount $\rightarrow$ ₹1,800 payable.
   - **Billing Cycle 3**: ₹2,000 base, ₹200 discount $\rightarrow$ ₹1,800 payable.
   - **Billing Cycle 4**: ₹2,000 base, ₹0 discount $\rightarrow$ ₹2,000 payable.
4. **Resilience**:
   - A failed billing attempt does not consume a cycle.
   - Retrying billing uses the existing invoice snapshot and does not double-count redemptions.
   - Expired or deactivated discounts stop applying to new cycles.

---

## 6. Discount Usage & Concurrency Protection

1. **Global Redemption Limit**: `maxRedemptions` is enforced.
2. **Per-Customer Limit**: `maxRedemptionsPerCustomer` is validated per customer ID.
3. **Atomic Conditional Updates**:
   - To eliminate race conditions during concurrent invoice generation, redemptions use an atomic SQL conditional update:
     ```typescript
     const updateResult = await tx.discount.updateMany({
       where: {
         id: discountId,
         currentRedemptions: { lt: current.maxRedemptions },
       },
       data: { currentRedemptions: { increment: 1 } },
     });
     if (updateResult.count === 0) {
       throw new BusinessRuleError("Discount has reached its maximum redemptions limit");
     }
     ```
   - If two invoices run concurrently when only 1 redemption remains, exactly one transaction succeeds; the other transaction fails and rolls back cleanly.
4. **Duplicate Application Prevention**: An invoice cannot have multiple redemptions for the same discount code.

---

## 7. Payment Record Enhancements & Note Privacy

### Payment Note Separation
Payments support two distinct types of notes:
- **`internalNotes`**: Confidential staff notes (e.g., *"Payment received through HDFC bank transfer UTR # 42398492834"*). Accessible only to ADMIN and STAFF.
- **`customerNotes`**: Customer-visible notes (e.g., *"Payment received through HDFC bank transfer for October subscription"*).

### Data Confidentiality
- In `portal.service.ts` (`getPayments` and `getOverview`), all `internalNotes` are **strictly redacted** and never sent over the wire to the customer.
- If a customer attempts to submit an internal note via API, the backend ignores and discards it.
- Customers cannot submit arbitrary payment statuses; customer-initiated offline submissions are coerced to `PaymentStatus.PENDING`.

---

## 8. Payment Allocation & Reconciliation Rules

- **One-to-One Settlement**: One payment settling one invoice in full.
- **Partial Payment**: Payment amount is less than invoice balance; invoice updates to `PARTIALLY_PAID` and `balanceDueMinor` decreases accurately.
- **Multiple Payments against One Invoice**: Subsequent payments deduct from remaining balance until `balanceDueMinor === 0n` (`PAID`).
- **Unallocated Payment Balance**: Tracked as `unallocatedAmountMinor = amountMinor - sum(allocatedAmountMinor)`.
- **Cross-Customer Protection**: Allocating a payment to an invoice belonging to a different customer is rejected with `BusinessRuleError`.
- **Over-Allocation Protection**: Allocations exceeding the invoice's remaining `balanceDueMinor` are rejected.

---

## 9. Dashboard Metric Definitions

The executive analytics dashboard strictly adheres to the following accounting definitions:
1. **Invoiced Revenue**: Total of all non-void, non-cancelled invoice grand totals.
2. **Collected Revenue**: Sum of **successful, completed payments only** (`status === PaymentStatus.COMPLETED`). Failed or pending payments are excluded.
3. **Outstanding Receivables**: Sum of unpaid invoice balances (`balanceDueMinor`) across open and partially paid invoices.
4. **Overdue Invoices**: Invoices where `dueDate < now` and `status === InvoiceStatus.OVERDUE`. Excludes fully paid and voided invoices.
5. **No Double Counting**: Discounts are not counted as collected revenue; invoice totals and allocations reconcile transactionally.

---

## 10. Developer 1 Schema Change Request

To preserve collaborative integrity, Developer 3 did **not** run conflicting Prisma migrations. The new rule attributes (`scope`, `minQuantity`, `minOrderAmountMinor`, `maxDiscountAmountMinor`, `recurringCycleCount`, `maxRedemptionsPerCustomer`) are serialized transparently in the `Discount.name` field via `formatDiscountName` / `parseDiscountMetadata`.

### Formal Request for Developer 1:
When Developer 1 prepares the next database migration, please add the following native columns to `Discount` in `database/schema.prisma`:
```prisma
enum DiscountScope {
  PRODUCT
  PLAN
  SUBSCRIPTION
}

model Discount {
  // Existing fields ...
  scope                     DiscountScope @default(SUBSCRIPTION)
  minQuantity               Int?
  minOrderAmountMinor       BigInt?       @db.BigInt
  maxDiscountAmountMinor    BigInt?       @db.BigInt
  recurringCycleCount       Int?
  maxRedemptionsPerCustomer Int?
}
```

---

## 11. Developer 2 Integration Contract (Updated)

Developer 2's recurring billing and invoice generation service can integrate seamlessly with Developer 3's pricing engine:

```typescript
import { PricingService } from "./services/pricing.service";

// Inside Developer 2's recurring invoice generation routine:
const pricing = await PricingService.calculatePricing({
  items: subscription.items.map(item => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPriceMinor: item.unitPriceMinor,
  })),
  subscriptionId: subscription.id, // Auto-detects attached recurring discounts!
  customerId: subscription.customerId,
});

// Use calculated financial snapshot:
// - pricing.subtotalMinor
// - pricing.discountTotalMinor
// - pricing.taxTotalMinor
// - pricing.grandTotalMinor
// - pricing.taxBreakdown (store in taxBreakdownSnapshot)
```

---

## 12. Test Execution & Results

### Command:
```bash
npm --prefix backend test
```

### Result: 100% Passed (7 Test Suites, 63 Tests)
```text
PASS src/__tests__/gap_closure.test.ts (21 tests)
PASS src/__tests__/taxes_discounts.test.ts (11 tests)
PASS src/__tests__/auth.test.ts (7 tests)
PASS src/__tests__/portal_security.test.ts (6 tests)
PASS src/__tests__/authorization.test.ts (6 tests)
PASS src/__tests__/products_plans.test.ts (6 tests)
PASS src/__tests__/payments_reconciliation.test.ts (6 tests)

Test Suites: 7 passed, 7 total
Tests:       63 passed, 63 total
Snapshots:   0 total
Time:        8.603 s
```

### Frontend Build Verification:
```bash
npm --prefix frontend run build
```
Result: **Compiled successfully** across all 29 routes. Zero build or lint errors.
