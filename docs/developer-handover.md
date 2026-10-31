# Brightloop SMS — Developer Handover & Integration Spec

**Author:** Developer 1 (Platform Lead)  
**Target Audience:** Developer 2 (Quotations, Subscriptions, Invoices) & Developer 3 (Tax, Discounts, Payments, Portal)  
**Database Schema Version:** `1.0.0-baseline`  
**Shared Database Client:** `sms/database/prisma.ts` / `sms/backend/src/database/prisma.ts`

---

## 1. Golden Rules of Collaboration

1. **Prisma Schema Ownership:** Developer 1 is the sole owner of `database/schema.prisma`. All 27 models needed by all 3 developers are already created and verified in the baseline schema. Do not independently edit `database/schema.prisma` or generate conflicting migrations.
2. **Shared Prisma Instance (Contract E):** Always import the single shared Prisma client.
   ```typescript
   import { prisma } from "../../database/prisma";
   // OR
   import { prisma } from "../database/prisma";
   ```
   Never instantiate `new PrismaClient()`.
3. **Monetary Values & Currency:**
   - All financial amounts are stored in minor currency units (paise for INR) as PostgreSQL `BIGINT` (`BigInt` in Prisma).
   - In API requests/responses, money is always serialized as decimal strings (`amountMinor: "200000"`).
   - **Never convert monetary amounts to JavaScript floating-point numbers.**
   - Default application currency is `INR`.
4. **Quantities:** Quantities use `NUMERIC(12,3)` (`Decimal` in Prisma) to allow fractional units.
5. **Standard API Response Format:**
   ```json
   // Single Object
   { "success": true, "data": { ... }, "meta": null, "error": null }

   // Paginated List
   { "success": true, "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "total": 100, "totalPages": 5 }, "error": null }

   // Error
   { "success": false, "data": null, "meta": null, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
   ```

---

## 2. Integration Service Contracts

The following integration functions are exported from `backend/src/services/contracts.ts`:

### Contract A: Customer Lookup
```typescript
import { getCustomerById, getCustomerByUserId } from "../services/contracts";

// Retrieve customer with linked user details
const customer = await getCustomerById(customerId: string);
const customer = await getCustomerByUserId(userId: string);
```

### Contract B: Product Pricing & Surcharge Resolution
```typescript
import { getProductWithVariant } from "../services/contracts";

// Resolves base price + variant surcharge using integer money arithmetic
const { product, variant, finalPriceMinor, currency } = await getProductWithVariant(
  productId: string,
  variantId?: string
);
// finalPriceMinor is a string representation of BigInt (e.g. "256000")
```

### Contract C: Plan & Price Resolution
```typescript
import { getActivePlanWithPrice } from "../services/contracts";

// Validates that plan and price are active for subscription creation
const { plan, price } = await getActivePlanWithPrice(
  planId: string,
  planPriceId: string
);
```

### Contract D: Audit Logging
```typescript
import { createAuditLog } from "../services/contracts";

await createAuditLog({
  actorUserId: req.user?.userId,
  action: "CREATE_INVOICE",
  entityType: "INVOICE",
  entityId: invoice.id,
  beforeData: null,
  afterData: invoice
});
```

### Contract E: Shared Prisma Client
```typescript
import { prisma } from "../database/prisma";
```

---

## 3. Developer 2 Specification: Quotations, Subscriptions & Invoices

### Exact Prisma Models & Fields

#### Quotation (`quotations`)
- `id`: UUID (String)
- `quotationNumber`: String (Unique, e.g. `QUO-2026-0001`)
- `customerId`: UUID -> references `Customer.id`
- `templateId`: UUID? -> references `QuotationTemplate.id`
- `status`: Enum `QuotationStatus` (`DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`)
- `totalAmountMinor`: BigInt
- `currency`: String (default `"INR"`)
- `validUntil`: DateTime (Timestamptz)
- `notes`: String?
- `items`: `QuotationItem[]`
- `subscription`: `Subscription?` (One-to-one constraint: only 1 subscription per quotation)

#### QuotationItem (`quotation_items`)
- `id`: UUID
- `quotationId`: UUID -> references `Quotation.id`
- `productId`: UUID -> references `Product.id`
- `productVariantId`: UUID? -> references `ProductVariant.id`
- `description`: String?
- `quantity`: Decimal (12, 3)
- `unitPriceMinor`: BigInt
- `totalAmountMinor`: BigInt

#### Subscription (`subscriptions`)
- `id`: UUID
- `subscriptionNumber`: String (Unique, e.g. `SUB-2026-0001`)
- `customerId`: UUID -> references `Customer.id`
- `planId`: UUID? -> references `Plan.id`
- `quotationId`: UUID? (Unique) -> references `Quotation.id`
- `status`: Enum `SubscriptionStatus` (`TRIALING`, `ACTIVE`, `PAST_DUE`, `PAUSED`, `CANCELLED`, `EXPIRED`)
- `billingInterval`: Enum `BillingInterval` (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`)
- `intervalCount`: Int (e.g. `1`)
- `currency`: String (default `"INR"`)
- `currentPeriodStart`: DateTime (Timestamptz)
- `currentPeriodEnd`: DateTime (Timestamptz)
- `nextBillingDate`: DateTime (Timestamptz)
- `cancelledAt`: DateTime?
- `cancellationReason`: String?
- `items`: `SubscriptionItem[]`
- `invoices`: `Invoice[]`

#### SubscriptionItem (`subscription_items`)
- `id`: UUID
- `subscriptionId`: UUID -> references `Subscription.id`
- `productId`: UUID -> references `Product.id`
- `productVariantId`: UUID? -> references `ProductVariant.id`
- `quantity`: Decimal (12, 3)
- `unitPriceMinor`: BigInt

#### Invoice (`invoices`)
- `id`: UUID
- `invoiceNumber`: String (Unique, e.g. `INV-2026-0001`)
- `subscriptionId`: UUID? -> references `Subscription.id`
- `customerId`: UUID -> references `Customer.id`
- `status`: Enum `InvoiceStatus` (`DRAFT`, `ISSUED`, `PAID`, `PARTIALLY_PAID`, `OVERDUE`, `VOID`, `CANCELLED`)
- `currency`: String (default `"INR"`)
- `subtotalMinor`: BigInt
- `taxAmountMinor`: BigInt
- `discountAmountMinor`: BigInt
- `totalAmountMinor`: BigInt
- `amountPaidMinor`: BigInt
- `balanceDueMinor`: BigInt
- `dueDate`: DateTime (Timestamptz)
- `billingPeriodStart`: DateTime?
- `billingPeriodEnd`: DateTime?
- `issuedAt`: DateTime?
- `paidAt`: DateTime?
- `items`: `InvoiceItem[]`
- `paymentAllocations`: `PaymentAllocation[]`

> **Critical Constraint for Developer 2:**
> There is a partial unique index on invoices:
> `(subscription_id, billing_period_start, billing_period_end) WHERE subscription_id IS NOT NULL`
> Only one invoice can exist for a subscription and billing period.

#### InvoiceItem (`invoice_items`)
- `id`: UUID
- `invoiceId`: UUID -> references `Invoice.id`
- `productId`: UUID? -> references `Product.id`
- `description`: String
- `quantity`: Decimal (12, 3)
- `unitPriceMinor`: BigInt
- `taxAmountMinor`: BigInt
- `totalAmountMinor`: BigInt

---

## 4. Developer 3 Specification: Taxes, Discounts, Payments & Customer Portal

### Exact Prisma Models & Fields

#### Tax (`taxes`) & ProductTax (`product_taxes`)
- `Tax.id`: UUID
- `Tax.name`: String (e.g. `"Goods & Services Tax (18%)"`)
- `Tax.code`: String (Unique, e.g. `"GST-18"`)
- `Tax.rateBasisPoints`: Int (e.g. `1800` for 18.00%)
- `Tax.isActive`: Boolean
- `ProductTax.productId`: UUID
- `ProductTax.taxId`: UUID

#### Discount (`discounts`) & DiscountApplication (`discount_applications`)
- `Discount.id`: UUID
- `Discount.code`: String (Unique, e.g. `"LAUNCH20"`)
- `Discount.name`: String
- `Discount.discountType`: Enum `DiscountType` (`PERCENTAGE`, `FIXED_AMOUNT`)
- `Discount.valueMinorOrBasisPoints`: BigInt (e.g. `2000` for 20.00% or `50000` for ₹500 off)
- `Discount.startDate`: DateTime?
- `Discount.endDate`: DateTime?
- `Discount.maxRedemptions`: Int?
- `Discount.currentRedemptions`: Int
- `DiscountApplication`: Links discount to `quotationId`, `subscriptionId`, or `invoiceId` with `amountDeductedMinor`.

#### Payment (`payments`) & PaymentAllocation (`payment_allocations`)
- `Payment.id`: UUID
- `Payment.paymentReference`: String (Unique, e.g. `"PAY-2026-0001"`)
- `Payment.customerId`: UUID -> references `Customer.id`
- `Payment.amountMinor`: BigInt
- `Payment.currency`: String (default `"INR"`)
- `Payment.paymentMethod`: Enum `PaymentMethod` (`CARD`, `BANK_TRANSFER`, `UPI`, `CASH`, `OTHER`)
- `Payment.status`: Enum `PaymentStatus` (`PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`)
- `Payment.notes`: String?
- `Payment.paidAt`: DateTime
- `PaymentAllocation.paymentId`: UUID -> references `Payment.id`
- `PaymentAllocation.invoiceId`: UUID -> references `Invoice.id`
- `PaymentAllocation.allocatedAmountMinor`: BigInt

---

## 5. Middleware & Security Enforcements

- **Authentication:** `authenticate` attaches `req.user = { userId, role, email, customerId }`.
- **Role Enforcement:**
  - `requireRole(Role.ADMIN)`
  - `requireRole(Role.ADMIN, Role.STAFF)`
- **Customer Ownership Guard:**
  ```typescript
  import { assertCustomerOwnership } from "../middleware/authorize";
  assertCustomerOwnership(req, targetCustomerId);
  ```
  Ensures that Customers can only view/mutate their own invoices, subscriptions, and payments.

---

## 6. Seed Credentials for Local Testing

| Role | Email | Password | Linked Customer |
|---|---|---|---|
| **ADMIN** | `admin@brightloop.demo` | `Brightloop!2026` | - |
| **STAFF** | `staff@brightloop.demo` | `Brightloop!2026` | - |
| **CUSTOMER** | `customer@brightloop.demo` | `Brightloop!2026` | Acme Global Solutions |
