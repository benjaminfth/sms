# Brightloop SMS — Integration Guide for Developers 2 & 3

Welcome to the Brightloop SMS team! As Developer 2 and Developer 3, you are building directly on top of the platform foundation established by Developer 1.

---

## 1. Quickstart

1. **Clone/Pull repository:**
   ```bash
   git pull origin main
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure local environment:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Ensure PostgreSQL is running locally on port `5432` with database `sms_dev`.
4. **Synchronize database & seed:**
   ```bash
   npm run db:push
   npm run db:seed
   ```
5. **Run tests to verify setup:**
   ```bash
   npm run test
   ```
6. **Start development servers:**
   ```bash
   npm run dev
   ```
   - Backend API: `http://localhost:4000/api/v1`
   - Frontend: `http://localhost:3000`

---

## 2. Shared Integration Contracts

All integration contracts are ready and exported from `backend/src/services/contracts.ts`:

- **Customer Lookup:** `getCustomerById(id)`, `getCustomerByUserId(userId)`
- **Product Pricing & Surcharges:** `getProductWithVariant(productId, variantId?)`
- **Plan Lookup:** `getActivePlanWithPrice(planId, planPriceId)`
- **Audit Logging:** `createAuditLog({ actorUserId, action, entityType, entityId, beforeData, afterData })`
- **Shared Prisma Singleton:** `import { prisma } from "../database/prisma";`

---

## 3. Developer Responsibilities

### Developer 2
- **Routes to create:**
  - Quotations: `backend/src/routes/quotation.routes.ts`
  - Subscriptions: `backend/src/routes/subscription.routes.ts`
  - Invoices: `backend/src/routes/invoice.routes.ts`
- **Frontend Pages:**
  - `/admin/quotations`, `/admin/subscriptions`, `/admin/invoices`

### Developer 3
- **Routes to create:**
  - Taxes: `backend/src/routes/tax.routes.ts`
  - Discounts: `backend/src/routes/discount.routes.ts`
  - Payments: `backend/src/routes/payment.routes.ts`
- **Frontend Pages:**
  - `/admin/discounts`, `/admin/payments`, `/customer/portal`

All DTOs, Zod validation schemas, and database models are already generated and ready for your immediate use in `@sms/shared` and `database/schema.prisma`.
