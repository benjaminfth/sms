# Brightloop Software — Subscription Management System (SMS)

A production-oriented, multi-tenant Subscription Management & Recurring Billing Platform built for Brightloop Software.

---

## 1. Technology Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts
- **Backend:** Node.js, Express.js, TypeScript, REST API, Zod Validation, JWT with HttpOnly Refresh Token Rotation, BCrypt (Work Factor 12)
- **Database & ORM:** PostgreSQL, Prisma ORM (UUID Primary Keys, `BIGINT` minor currency units, `TIMESTAMPTZ`, `NUMERIC(12,3)`)
- **Infrastructure:** Docker Compose, npm Workspaces Monorepo

---

## 2. Monorepo Workspaces

```
sms/
├── frontend/             # Next.js 14 Admin Dashboard & UI Pages
├── backend/              # Express REST API, RBAC Middleware, Service Layer
├── shared/               # Universal DTOs, Enums, Zod Schemas, Money Utilities
├── database/             # Shared schema.prisma, Migrations, Idempotent Seed
├── docs/                 # Architecture, Integration Specs, and Dev Handover
├── docker-compose.yml    # Local PostgreSQL Container
├── tsconfig.base.json    # Strict TypeScript Base Config
└── package.json          # Root Monorepo Scripts
```

---

## 3. Team Responsibilities

- **Developer 1 (Platform Lead):** Monorepo foundation, database schema & migrations, authentication, customers, products & surcharge variants, plans & pricing tiers, integration contracts (Contracts A–E), and admin frontend shell.
- **Developer 2:** Quotations, Subscriptions, Recurring billing engine, Invoices.
- **Developer 3:** Tax calculation, Discounts & Coupons, Payments & Allocations, Analytics Dashboard, Customer Portal.

---

## 4. Quickstart & Local Setup

### Prerequisites
- Node.js >= 18 (Tested on v25)
- PostgreSQL (Local or Docker)

### Installation
```bash
# 1. Clone & install dependencies
git clone <repo-url>
cd sms
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start local PostgreSQL (if not already running)
docker compose up -d

# 4. Push schema and seed database
npm run db:push
npm run db:seed

# 5. Run test suite
npm run test

# 6. Start full stack (Frontend on 3000, Backend on 4000)
npm run dev
```

---

## 5. Seed Credentials (Demo Environment)

| Role | Email | Password | Access Level |
|---|---|---|---|
| **ADMIN** | `admin@brightloop.demo` | `Brightloop!2026` | Full platform access, Staff creation, Role assignment |
| **STAFF** | `staff@brightloop.demo` | `Brightloop!2026` | Catalog, Customers, Plans, Quotations management |
| **CUSTOMER** | `customer@brightloop.demo` | `Brightloop!2026` | Profile, Self-service Subscriptions & Invoices |

---

## 6. Root Command Reference

- `npm run dev`: Starts both backend (port 4000) and frontend (port 3000) concurrently.
- `npm run dev:backend`: Starts Express API with hot-reload.
- `npm run dev:frontend`: Starts Next.js app in development mode.
- `npm run build`: Compiles `shared`, `backend`, and `frontend` in order.
- `npm run test`: Executes Jest integration test suite (20 tests).
- `npm run db:push`: Synchronizes Prisma schema with PostgreSQL.
- `npm run db:generate`: Generates typed `@prisma/client`.
- `npm run db:seed`: Idempotently seeds initial users, products, variants, and plans.
- `npm run db:studio`: Opens Prisma Studio GUI in browser.

---

## 7. Developer Documentation

- [docs/developer-handover.md](file:///Users/benjamin/Coding/sms/docs/developer-handover.md): Field-level schema guide and integration contracts for Dev 2 & Dev 3.
- [docs/integration-guide.md](file:///Users/benjamin/Coding/sms/docs/integration-guide.md): Onboarding and integration instructions.
- [docs/api-contracts.md](file:///Users/benjamin/Coding/sms/docs/api-contracts.md): REST API specification.
- [docs/database.md](file:///Users/benjamin/Coding/sms/docs/database.md): Database models, constraints, and partial unique indices.
- [docs/architecture.md](file:///Users/benjamin/Coding/sms/docs/architecture.md): High-level system architecture and security policies.
