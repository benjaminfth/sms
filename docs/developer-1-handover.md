# Brightloop Software — Subscription Management System (SMS)
# Developer 1 Handover: Platform Foundation & Gap Closure

**Author:** Developer 1 (Platform Lead)  
**Status:** Complete & Sealed  
**Branch:** `dev1`  
**Test Suite:** 53 / 53 Tests Passing (`npm run test`)  
**Production Build:** 17 / 17 Routes Compiling (`npm run build`)  

---

## 1. Completed Authentication Gaps & Policy

### 1.1 Strict Password Complexity
Every new password must satisfy all 4 conditions:
1. Minimum length: 9 characters (strictly $\ge 9$).
2. At least one uppercase English letter (`[A-Z]`).
3. At least one lowercase English letter (`[a-z]`).
4. At least one special character outside the English alphabet, digits, and spaces:
   $$\mathtt{/[^A-Za-z0-9\backslash s]/}$$
   *Spaces do not count as special characters.*

**Enforced At:**
- Customer registration: `POST /api/v1/auth/register`
- Password reset: `POST /api/v1/auth/reset-password`
- Admin staff creation: `POST /api/v1/users/staff`

**Frontend Real-Time Feedback:**
- Reusable component `PasswordRequirementsChecklist` renders dynamic validation feedback (grey when unfulfilled, green checkmark when met, red upon invalid submit).
- Confirm Password verification is enforced on both frontend and backend.
- Passwords are never returned in responses or stored in plaintext; hashed with bcrypt (work factor 12).

### 1.2 Case-Insensitive Email Uniqueness
- Email addresses are normalized via `toLowerCase().trim()` in Zod and services.
- Database unique constraint on `users.email` prevents concurrent race-condition duplicates.
- Case variations (e.g., `User@Example.COM` vs `user@example.com`) are rejected with `409 Conflict`.

### 1.3 Password Reset Email Delivery Architecture
- Cryptographically secure single-use opaque token generated via `crypto.randomBytes(32).toString("hex")`.
- Stored as SHA-256 hash in `password_reset_tokens` table with 1-hour expiration.
- Invalidation on use (`isUsed: true`) and all existing refresh sessions are revoked upon reset.
- Token reuse and expired tokens are rejected.
- Protection against account enumeration: returns uniform success message even if email is not found.
- **Email Service Adapter Pattern (`backend/src/services/email/`):**
  - `IEmailAdapter`: Adapter interface contract.
  - `LoggerEmailAdapter`: Local development adapter that logs clean terminal previews and records sent emails in memory for automated test assertions.
  - `SmtpEmailAdapter`: Configurable SMTP transmission adapter.
  - Controlled via `EMAIL_PROVIDER="logger" | "smtp"` in `.env`.

---

## 2. Product & Variant Management Gaps

### 2.1 Product Fields & Validation
- **Product Model:** `sku`, `name`, `description`, `productType` (`GOODS` / `SERVICE`), `baseSellingPriceMinor` (BIGINT), `costPriceMinor` (BIGINT), `currency`, `notes`, `isActive`, `isArchived`.
- Negative prices are rejected via `minorAmountSchema`.
- Cost price and base sales price are tracked independently.
- Soft-deletion via `isArchived: true` preserves historical references.

### 2.2 Product Variants
- **Fields:** `productId`, `sku`, `name`, `brand` (optional), `attribute` (optional, e.g. "Color: Blue", "Module: Enterprise"), `priceAdjustmentType` (`SURCHARGE` / `DISCOUNT`), `priceAdjustmentMinor`, `isActive`, `isArchived`.
- **Variant Pricing:** Calculated on the backend using integer paise arithmetic:
  $$\text{Final Price} = \text{baseSellingPriceMinor} + \text{priceAdjustmentMinor}$$
  Implemented in `calculateVariantPrice(basePriceMinor: bigint, surchargeMinor: bigint): bigint`.

---

## 3. Plan Configuration & Lifecycle Gaps

### 3.1 Plan Model Specification
- **Core Fields:** `code`, `name`, `description`, `minQuantity` (default 1), `startDate`, `endDate`, `isActive`.
- **Billing Frequencies:** Supported in `PlanPrice` across all 4 intervals: `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`.
- **Lifecycle Configuration Policies:**
  - `autoCloseOnEndDate` (`Boolean @default(true)`): Dictates whether plan automatically ceases accepting subscriptions after `endDate`.
  - `allowEarlyClosure` (`Boolean @default(false)`): Governs whether subscribers can terminate their contracts early.
  - `allowPause` (`Boolean @default(true)`): Governs whether subscribers can pause recurring billing cycles.
  - `allowRenewal` (`Boolean @default(true)`): Governs whether subscriptions automatically renew.

### 3.2 Minimum Quantity Rule
- If customer attempts to subscribe with `quantity < plan.minQuantity`, the backend rejects with `BusinessRuleError`:
  `"Requested quantity (X) is below the required minimum quantity (Y) for plan 'Z'"`
- Enforced on backend in `PlanService.getActivePlanWithPrice(planId, planPriceId, requestedQuantity)`.

### 3.3 Plan Availability & Closure Boundary Rules
- **Before Start Date:** Rejects subscription attempts if `now < plan.startDate`.
- **After End Date:** Rejects subscription attempts if `now > plan.endDate`.
- **Plan Deactivation Isolation:** Calling `PlanService.deactivatePlan(planId)` sets `isActive: false` to stop new subscriptions. It **never** cancels or alters existing subscriptions.

---

## 4. Integration Contracts for Developer 2 & Developer 3

Import these pre-built methods directly from `backend/src/services/contracts.ts`:

```typescript
import {
  getCustomerById,
  getCustomerByUserId,
  getProductWithVariant,
  getActivePlanWithPrice,
  createAuditLog,
  prisma,
} from "../services/contracts";
```

### Contract Signatures:
1. `getCustomerById(customerId: string)`: Retrieves customer entity.
2. `getCustomerByUserId(userId: string)`: Retrieves customer linked to user account.
3. `getProductWithVariant(productId: string, variantId?: string)`:
   Returns `{ product, variant, finalPriceMinor, currency }`.
4. `getActivePlanWithPrice(planId: string, planPriceId: string, requestedQuantity?: number)`:
   Validates plan active state, availability date boundaries (`startDate` / `endDate`), and enforces `minQuantity`.
5. `createAuditLog({ actorUserId, action, entityType, entityId, beforeData, afterData })`:
   Records tamper-evident audit logs.
6. `prisma`: Shared singleton Prisma client.

---

## 5. Automated Verification Results

Command: `npm run test`

```text
PASS src/__tests__/gap_closure.test.ts
PASS src/__tests__/auth.test.ts
PASS src/__tests__/password_complexity.test.ts
PASS src/__tests__/authorization.test.ts
PASS src/__tests__/products_plans.test.ts

Test Suites: 5 passed, 5 total
Tests:       53 passed, 53 total
Snapshots:   0 total
Time:        4.232 s
```

---

## 6. Commands to Run & Verify

```bash
# 1. Synchronize PostgreSQL database schema and seed
npm run db:push
npm run db:seed

# 2. Run automated test suites (53 tests)
npm run test

# 3. Run ESLint across packages
npm run lint

# 4. Build all workspaces
npm run build

# 5. Start development servers
npm run dev
# Backend: http://localhost:4000
# Frontend: http://localhost:3000
```
