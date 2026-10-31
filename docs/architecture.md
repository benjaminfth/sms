# Brightloop Subscription Management System (SMS) — Architecture

## 1. System Overview

Brightloop SMS is a production-oriented, multi-tenant B2B subscription management and recurring billing platform engineered for high financial accuracy, strict role-based access control, and modular team delivery.

```
                           +----------------------------------------+
                           |     Brightloop Next.js Frontend        |
                           |   (App Router, Tailwind, Lucide,       |
                           |    Recharts, Memory Access Token)      |
                           +-------------------+--------------------+
                                               |
                                     HTTPS / JSON / HttpOnly Cookie
                                               |
                                               v
                           +----------------------------------------+
                           |       Node.js / Express Backend        |
                           |  (Thin Controllers, Service Layer,     |
                           |   Strict Zod Validation, Rate Limiter) |
                           +-------------------+--------------------+
                                               |
                              Prisma ORM (Single Shared Client)
                                               |
                                               v
                           +----------------------------------------+
                           |          PostgreSQL Database           |
                           | (UUIDs, BIGINT Minor Units, TIMESTAMPTZ|
                           |  NUMERIC(12,3), Partial Unique Indices)|
                           +----------------------------------------+
```

## 2. Monorepo Organization

The codebase is organized as an npm workspaces monorepo:

```
sms/
├── frontend/             # Next.js 14 React UI application
│   ├── src/
│   │   ├── app/          # App router pages (/login, /admin/*, /staff/*)
│   │   ├── components/   # UI primitives, Sidebar, Header, Tables, Forms
│   │   └── lib/          # Centralized api-client.ts (Token rotation safe)
│   └── package.json
├── backend/              # Express REST API service
│   ├── src/
│   │   ├── controllers/  # Thin HTTP request / response adapters
│   │   ├── services/     # Pure business logic and domain operations
│   │   ├── middleware/   # authenticate, authorize, validate, errorHandler
│   │   ├── routes/       # API v1 routes (/auth, /users, /customers, /products, /plans)
│   │   └── database/     # Prisma client re-export
│   └── package.json
├── shared/               # Universal DTOs, Zod schemas, Enums, and Utils
│   ├── src/
│   │   ├── enums/        # Role, BillingInterval, InvoiceStatus, etc.
│   │   ├── types/        # TypeScript DTOs, APIResponse, PaginatedResponse
│   │   ├── schemas/      # Shared Zod validation schemas
│   │   └── utils/        # Money calculations and BigInt JSON serializers
│   └── package.json
├── database/             # Sole source of truth for database schema
│   ├── schema.prisma     # 27 comprehensive models for all 3 developers
│   ├── prisma.ts         # Singleton shared Prisma client
│   └── seed/             # Idempotent database seeder
├── docs/                 # Architectural specifications and handover guides
├── docker-compose.yml    # Local PostgreSQL service
├── tsconfig.base.json    # Strict TypeScript configuration
└── README.md
```

## 3. Team Division of Responsibilities

- **Developer 1 (Platform Lead):** Monorepo foundation, Shared types & Zod schemas, Database ownership & migrations, Authentication with refresh token rotation, Users & Staff management, Customers, Products & Surcharge-based Variants, Plans with multi-frequency pricing, Integration contracts.
- **Developer 2:** Quotations, Subscriptions, Recurring billing engine, Invoices.
- **Developer 3:** Tax calculation, Discounts & Coupons, Payments & Allocations, Analytics Dashboard, Customer Portal.

## 4. Key Architectural Decisions

1. **Integer Minor Unit Currency (BigInt):**
   - Floating-point representations (e.g. `29.99 * 3 = 89.97000000000001`) are forbidden.
   - All amounts are stored in minor currency units (paise for INR) as PostgreSQL `BIGINT`.
   - APIs serialize `BigInt` into decimal strings via `serializeBigInts()`.
2. **Two-Tier Authentication & Token Rotation:**
   - Short-lived JWT access tokens (15m) kept strictly in application memory.
   - High-entropy opaque refresh tokens stored only as SHA-256 hashes in the database with rotation upon each refresh.
   - Refresh tokens delivered via secure `HttpOnly`, `SameSite=Lax` cookies.
3. **Role-Based Access Control (RBAC):**
   - 3 System Roles: `ADMIN`, `STAFF`, `CUSTOMER`.
   - Never trust frontend role claims; enforced strictly in backend middleware.
   - `assertCustomerOwnership` utility blocks cross-customer data leakage.
4. **Soft Deletions & Historical Auditability:**
   - Products and variants are archived (`isArchived = true`, `isActive = false`) when referenced in past transactions.
   - `createAuditLog` logs actor ID, action, before/after states, IP, and timestamp.
