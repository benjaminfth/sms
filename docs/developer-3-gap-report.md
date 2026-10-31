# Developer 3 — Gap Analysis & Progress Report

**Project:** Brightloop Software — Subscription Management System  
**Author:** Developer 3 (Financial Calculation, Payments, Reconciliation, Analytics & Customer Portal Lead)  
**Date:** October 31, 2026  
**Status:** In Progress — Gap Closure Phase  

---

## 1. What Already Works (Baseline)

| Module | Features Operational | Baseline Verification |
| :--- | :--- | :--- |
| **Tax Engine** | Configurable rates in basis points (`1800` = `18%`), exclusive and inclusive calculation formulas, multi-tax component assignment to products via `ProductTax`, immutable invoice tax breakdown snapshots. | Verified via `taxes_discounts.test.ts` (100% pass) and `/admin/taxes/*` pages. |
| **Pricing Engine** | `PricingService.calculatePricing(input)` calculating line-item subtotals, proportional discount distribution, item-level taxes, and grand totals in integer paise. | Verified via Developer 2 Contract H integration and `/api/v1/pricing/calculate`. |
| **Payment Ledger** | Offline payment recording (`POST /api/v1/payments`) with unique reference check, idempotency, and support for all shared payment methods (`CARD`, `UPI`, `BANK_TRANSFER`, `CASH`, `OTHER`). | Verified via `payments_reconciliation.test.ts` and `/admin/payments/*` pages. |
| **Payment Allocations** | Transactional allocation to invoices, partial payments tracking (`amountPaidMinor`, `balanceDueMinor`), status transitions (`ISSUED` $\rightarrow$ `PARTIALLY_PAID` $\rightarrow$ `PAID`), over-allocation prevention. | Verified via `payments_reconciliation.test.ts` and `/admin/reconciliation`. |
| **Dashboard** | Real-time PostgreSQL metrics distinguishing Invoiced vs Collected revenue, Recharts time-series, date filters (`7D`, `30D`, `90D`, `1Y`). | Verified on `/admin/dashboard`. |
| **Customer Portal** | Customer authentication, portal overview, printable tax invoices, demo payment simulation modal, subscription cancellation requests, quotation reviews. | Verified via `portal_security.test.ts` and `/portal/*` routes. |

---

## 2. Gaps Identified & Closure Strategy

| Gap # | Category | Description of Gap | Closure Strategy |
| :--- | :--- | :--- | :--- |
| **Gap 1** | **Discount Permissions** | `STAFF` users currently had access to `POST /api/v1/discounts` and `PATCH /api/v1/discounts/:id`. The specification mandates: **Only ADMIN can create or modify discount rules.** | Restrict discount mutations strictly to `Role.ADMIN`. Staff retain view permissions (`GET`) and checkout validation (`validate`). Add automated tests verifying 403 Forbidden for Staff and Customers. |
| **Gap 2** | **Minimum Quantity Rules** | Discounts currently only validated minimum invoice amount, not minimum line item quantity. | Support independent `minQuantity` validation. If discount is restricted to specific products, sum quantities of only eligible products; unrelated products do not satisfy the minimum quantity. |
| **Gap 3** | **Eligibility Scopes** | Discounts lacked explicit distinction between `PRODUCT`, `PLAN`, and `SUBSCRIPTION` scopes. | Support `scope` (`PRODUCT`, `PLAN`, `SUBSCRIPTION`). For `PRODUCT` discounts, discount is calculated and applied solely to eligible line items. |
| **Gap 4** | **Automatic Recurring Discounts** | Subscriptions required manual discount re-entry per billing cycle; discounts did not automatically apply to next cycle or expire after $N$ cycles. | Implement subscription discount attachment, cycle counting (`recurringCycleCount`), and automatic calculation in recurring invoices (e.g. applies to cycles 1-3, stops on cycle 4). |
| **Gap 5** | **Discount Concurrency** | Global and per-customer limits required database transaction protections against race conditions. | Add atomic updates on redemptions inside Prisma interactive transactions and validate `maxRedemptionsPerCustomer`. |
| **Gap 6** | **Payment Notes Separation** | Payment notes were a single text field; internal staff notes could potentially leak to customers. | Explicitly separate `internalNotes` from `customerNotes`. Ensure Customer Portal queries strictly omit internal notes. |

---

## 3. Formal Schema Change Request for Developer 1

To maintain zero database migration conflicts during the hackathon, Developer 3 will use existing fields with a transparent JSON serializer for new configuration attributes. However, Developer 1 is requested to formally add the following columns to the schema in the next platform release:

1. **Table `discounts`**:
   - `scope`: `VARCHAR(32) DEFAULT 'SUBSCRIPTION'` (`PRODUCT`, `PLAN`, `SUBSCRIPTION`)
   - `min_quantity`: `INT NULL`
   - `min_order_amount_minor`: `BIGINT NULL`
   - `max_discount_amount_minor`: `BIGINT NULL`
   - `recurring_cycle_count`: `INT NULL`
   - `max_redemptions_per_customer`: `INT NULL`
2. **Table `payments`**:
   - `internal_notes`: `TEXT NULL`
   - `customer_notes`: `TEXT NULL`
