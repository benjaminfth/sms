# Brightloop SMS — Database Specification

## 1. Schema Overview

- **Database Engine:** PostgreSQL 15+
- **ORM:** Prisma 5.22.0
- **Location:** `database/schema.prisma`
- **Client Export:** `database/prisma.ts` / `backend/src/database/prisma.ts`
- **Default Currency:** INR
- **Primary Keys:** UUID (v4)
- **Financial Units:** `BIGINT` in minor currency units (paise)
- **Quantities:** `NUMERIC(12,3)` (`Decimal`)
- **Timestamps:** `TIMESTAMPTZ`

---

## 2. Models Matrix

| Module | Models | Key Constraints |
|---|---|---|
| **Auth** | `User`, `RefreshToken`, `PasswordResetToken` | `User.email` unique; SHA-256 hashed refresh/reset tokens; Cascade deletion |
| **Customers** | `Customer` | `Customer.userId` unique; indexed by email and active status |
| **Catalog** | `Product`, `ProductVariant`, `ProductTax`, `Tax` | `Product.sku` unique; `ProductVariant.sku` unique; soft-archive flags |
| **Plans** | `Plan`, `PlanPrice`, `PlanItem` | `Plan.code` unique; `BillingInterval` enum; multi-tier pricing |
| **Quotations** | `QuotationTemplate`, `Quotation`, `QuotationItem` | `Quotation.quotationNumber` unique; 1-to-1 quotation-to-subscription linkage |
| **Subscriptions**| `Subscription`, `SubscriptionItem` | `Subscription.subscriptionNumber` unique; status and next billing date indexed |
| **Discounts** | `Discount`, `DiscountProduct`, `DiscountApplication` | `Discount.code` unique; percentage or fixed minor units |
| **Invoices** | `Invoice`, `InvoiceItem` | `Invoice.invoiceNumber` unique; partial unique index on `(subscriptionId, billingPeriodStart, billingPeriodEnd)` |
| **Payments** | `Payment`, `PaymentAllocation` | `Payment.paymentReference` unique; atomic allocation mapping to invoices |
| **System** | `AuditLog`, `Notification`, `BillingRun`, `BillingAttempt` | Full audit trail and automated billing attempt tracker |

---

## 3. Database Constraints & Partial Indices

### Partial Unique Index on Invoices
Ensures a subscription can only have one invoice per billing period:
```sql
CREATE UNIQUE INDEX uq_invoice_subscription_period
ON invoices ("subscriptionId", "billingPeriodStart", "billingPeriodEnd")
WHERE "subscriptionId" IS NOT NULL;
```

---

## 4. Migration & Maintenance Commands

```bash
# Push schema changes to development database
npm run db:push

# Generate typed Prisma client
npm run db:generate

# Run idempotent database seed
npm run db:seed

# Launch Prisma Studio GUI
npm run db:studio
```
