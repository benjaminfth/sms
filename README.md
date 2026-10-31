# Brightloop Subscription Management System (SMS)

A modern, production-grade Subscription Management and Recurring Billing platform designed for enterprise SaaS and subscription businesses. Built as a high-performance TypeScript monorepo with **Next.js 14**, **Express.js**, **Prisma ORM**, and **PostgreSQL**.

---

## Table of Contents
- [1. Executive Overview](#1-executive-overview)
- [2. System Architecture](#2-system-architecture)
- [3. Feature Modules](#3-feature-modules)
- [4. Technology Stack](#4-technology-stack)
- [5. Repository Structure](#5-repository-structure)
- [6. Prerequisites](#6-prerequisites)
- [7. Environment Configuration](#7-environment-configuration)
- [8. Installation & Quickstart](#8-installation--quickstart)
- [9. Demo & Seed Credentials](#9-demo--seed-credentials)
- [10. Command Reference](#10-command-reference)
- [11. Testing & Quality Assurance](#11-testing--quality-assurance)
- [12. Security & Compliance Standards](#12-security--compliance-standards)
- [13. Developer Documentation](#13-developer-documentation)

---

## 1. Executive Overview

Brightloop SMS streamlines the complete subscription lifecycle—from quotation generation and plan enrollment to recurring invoice generation, automated payment reconciliation, tax compliance, and customer self-service.

### Key Capabilities
- **Strict Role-Based Access Control (RBAC):** Dedicated administrative console (`/admin`), operational staff console (`/staff`), and self-service customer portal (`/portal`).
- **Concurrency-Safe Sequential Invoicing:** Immutable, formatted invoice numbering (e.g., `INV-2026-0001`) with real-time tax breakdown.
- **Accurate Financial Arithmetic:** Monetary values are strictly calculated and stored in integer minor units (paise/cents) using `bigint`, eliminating floating-point rounding errors.
- **Automated Lifecycle & Billing Engine:** Cron-driven recurring invoice generation, subscription trial transitions, and overdue payment detection.
- **Unified Settings Console:** Centralized configuration for general platform defaults, company legal branding, invoicing defaults, email delivery, and statutory compliance.

---

## 2. System Architecture

```mermaid
graph TD
    Client[Browser / Next.js 14 Frontend\nlocalhost:3000]
    API[Express.js REST API\nlocalhost:4000]
    DB[(PostgreSQL 16\nlocalhost:5433)]
    SMTP[SMTP Email Gateway\nNodemailer / Mock Logger]

    Client -->|HTTP / JSON / JWT Cookie| API
    API -->|Prisma ORM 5.22| DB
    API -->|Transactional Emails| SMTP
```

The application is structured as an npm workspaces monorepo:
1. **Frontend (`@sms/frontend`):** Next.js 14 App Router, React 18, Tailwind CSS, Lucide icons, and Recharts. Styled with the Executive Precision design system.
2. **Backend (`@sms/backend`):** Express.js TypeScript API with centralized middleware for authentication, RBAC, Zod payload validation, and structured error handling.
3. **Shared Package (`@sms/shared`):** Universal types, DTOs, Enums, Zod validation schemas, and currency calculation utilities shared between frontend and backend.
4. **Database (`database/`):** Unified Prisma schema (`schema.prisma`), database migrations, and idempotent seed scripts.

---

## 3. Feature Modules

### 1. Authentication & Security
- Secure JWT access tokens with rotating **HttpOnly, SameSite** refresh cookies.
- Comprehensive password complexity policy (minimum 9 characters, uppercase, lowercase, numbers, and special characters).
- Rate-limited login endpoints with brute-force lockout safeguards.
- Password reset flow powered by cryptographic token hashing and email verification links.

### 2. Product Catalog & Subscription Plans
- Catalog support for both **Goods** and **Services**.
- Product variant support with custom price adjustments (surcharges or discounts).
- Multi-cadence billing intervals: **Daily, Weekly, Monthly, Yearly**.
- Trial period configuration, minimum commitment periods, and plan cancellation rules.

### 3. Quotation & Proposal Management
- Multi-line quotation drafting with product selection and variant surcharges.
- Automatic pricing calculation factoring in taxes and applicable coupons.
- Client acceptance and rejection lifecycle with one-click conversion into active subscriptions.
- Print-ready and downloadable quotation documents.

### 4. Subscriptions & Automated Billing Engine
- Complete subscription lifecycle: `TRIALING`, `ACTIVE`, `PAUSED`, `PAST_DUE`, `CANCELLED`, `EXPIRED`.
- Automated recurring billing engine generating invoices on renewal dates.
- Pause and resume management with subscription period extensions.
- Automated email reminder alerts before subscription expiration or auto-renewal.

### 5. Invoicing & Tax Engine
- Concurrency-safe sequential invoice numbering with customizable prefix (`INV-YYYY-XXXX`).
- Multi-component GST/VAT calculation supporting both **Exclusive** and **Inclusive** tax pricing.
- Partial payment tracking (`ISSUED` → `PARTIALLY_PAID` → `PAID`).
- Automated invoice overdue detection and PDF generation.

### 6. Discounts & Promotions
- Fixed-amount discounts (in minor units) and percentage-based discounts (in basis points).
- Scoped eligibility rules: Product-specific, Plan-specific, or Subscription-wide.
- Maximum redemption thresholds, customer redemption caps, and date validity windows.

### 7. Payments & Multi-Allocation Reconciliation
- Multi-method collection: **UPI, Bank Transfer (NEFT/RTGS/IMPS), Card, Cash, and Other**.
- Payment allocation service allowing single payments to be split across multiple invoices.
- Reconciliation workbench tracking unallocated cash balances and customer credit balances.

### 8. Analytics & Financial Dashboards
- Real-time revenue analytics: Monthly Recurring Revenue (MRR), Annual Recurring Revenue (ARR), Churn Rate, and Active Subscriptions.
- Visual revenue trends, subscription lifecycle distributions, and top-selling product breakdowns.

### 9. Self-Service Customer Portal
- Isolated customer portal (`/portal`) with strict row-level authorization.
- Self-service invoice downloads, payment history audits, and subscription management.

### 10. Admin Settings Console
A centralized 9-category configuration suite persisted in PostgreSQL:
1. **General:** Application branding, support channels, default currency (`INR`), timezone (`Asia/Kolkata`), date and number formats.
2. **Company Profile:** Corporate entity name, company logo upload with live preview, registered office address, GSTIN, and CIN.
3. **Billing & Payments:** Default payment terms, preferred remittance methods, partial payment rules, and bank account remittance coordinates.
4. **Invoices:** Prefix sequence, live numbering preview, default due periods, notes, footers, and presentation layout toggles.
5. **Subscriptions:** Default status, default cycle, trial durations, and customer pause/renewal policies.
6. **Notifications:** 15 customer transactional email toggles, 6 admin operational alert toggles, sender identity, and a live **Test Email** dispatch trigger.
7. **Security:** Minimum password length governance, complexity rules, and session expiration durations.
8. **Regional Preferences:** Standard currencies, timezone localizations, decimal precision, and inclusive/exclusive tax display.
9. **System Information:** Read-only diagnostics displaying app version, PostgreSQL health status, UTC server time, and live entity volume metrics.

---

## 4. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React, Recharts |
| **Backend** | Node.js (v18+), Express.js, TypeScript, Nodemailer, Bcrypt.js, Zod, Cookie-Parser, CORS |
| **Database & ORM** | PostgreSQL 16, Prisma ORM 5.22, UUID keys, BigInt currency storage |
| **Testing** | Jest 29, Ts-Jest, Supertest |
| **DevOps** | Docker Compose, Concurrently, TSX (hot reload) |

---

## 5. Repository Structure

```
sms/
├── frontend/                  # Next.js 14 Client Application
│   ├── src/app/               # App Router pages (/admin, /staff, /portal, /login)
│   ├── src/components/        # UI components (Settings, Layouts, Tables, Modals)
│   └── src/lib/               # API client, auth context, formatters
├── backend/                   # Express.js REST API
│   ├── src/controllers/       # Request handlers
│   ├── src/services/          # Business logic & domain services
│   ├── src/routes/            # Express REST route definitions
│   ├── src/middleware/        # Auth, RBAC, error handling, rate limiting
│   └── src/__tests__/         # Comprehensive Jest integration test suites
├── shared/                    # Isomorphic Shared Library (@sms/shared)
│   ├── src/enums/             # Roles, Statuses, PaymentMethods, Categories
│   ├── src/types/             # Universal DTO interfaces
│   ├── src/schemas/           # Zod validation schemas
│   └── src/utils/             # Monetary calculations & helper functions
├── database/                  # Prisma Database Configuration
│   ├── schema.prisma          # PostgreSQL relational schema
│   └── seed/                  # Idempotent seed data script
├── docs/                      # Technical documentation & handover specs
├── docker-compose.yml         # Containerized PostgreSQL service
├── package.json               # Monorepo workspaces & root scripts
└── tsconfig.base.json         # Base TypeScript configuration
```

---

## 6. Prerequisites

Ensure your development environment meets the following requirements:
- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **npm:** v9.0.0 or higher
- **Docker & Docker Compose:** Required to run the local PostgreSQL database container (or a local PostgreSQL instance running on port 5433).

---

## 7. Environment Configuration

The monorepo uses a root `.env` file that configures database connections, authentication secrets, application ports, and email delivery.

Create your `.env` file from `.env.example`:
```bash
cp .env.example .env
```

### Complete Environment Variable Reference

```env
# ==============================================================================
# ENVIRONMENT & PORTS
# ==============================================================================
NODE_ENV="development"
PORT=4000
FRONTEND_URL="http://localhost:3000"

# ==============================================================================
# DATABASE CONNECTION (PostgreSQL)
# Note: Docker Compose maps PostgreSQL host port to 5433 to avoid conflicts.
# ==============================================================================
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sms_dev?schema=public"

# ==============================================================================
# AUTHENTICATION & JWT SECRETS
# Generate cryptographically secure keys: openssl rand -base64 32
# ==============================================================================
JWT_ACCESS_SECRET="brightloop-jwt-access-secret-min-32-chars-long-random"
JWT_REFRESH_SECRET="brightloop-jwt-refresh-secret-min-32-chars-long-random"
ACCESS_TOKEN_EXPIRY="15m"
REFRESH_TOKEN_EXPIRY_DAYS=7

# ==============================================================================
# SYSTEM & REGIONAL DEFAULTS
# ==============================================================================
DEFAULT_CURRENCY="INR"

# ==============================================================================
# EMAIL DELIVERY CONFIGURATION
# Options:
#   - "logger": Development terminal logging (no real email dispatch needed)
#   - "smtp":   Real email transmission via SMTP credentials
# ==============================================================================
EMAIL_PROVIDER="smtp"
EMAIL_FROM="Brightloop Billing <noreply@brightloop.demo>"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@example.com"
SMTP_PASS="your-app-password"
```

---

## 8. Installation & Quickstart

Follow these steps to set up and run the entire platform locally from scratch:

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/benjaminfth/sms.git
cd sms
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

### Step 3: Launch PostgreSQL Database Container
```bash
docker compose up -d
```
*Verify the container is healthy:*
```bash
docker ps --filter "name=sms-postgres"
```

### Step 4: Synchronize Database Schema & Seed Data
```bash
# Push Prisma schema to PostgreSQL
npm run db:push

# Run idempotent database seed
npm run db:seed
```

### Step 5: Start Development Servers
```bash
npm run dev
```

Both services will start concurrently:
- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **Backend API Server:** [http://localhost:4000](http://localhost:4000)
- **API Health Check:** [http://localhost:4000/api/v1/settings/system/health](http://localhost:4000/api/v1/settings/system/health)

---

## 9. Demo & Seed Credentials

The database seed provides ready-to-use accounts for all three application roles:

| Role | Email / Username | Password | Default Portal & Access |
|---|---|---|---|
| **ADMIN** | `admin@brightloop.demo` | `Brightloop!2026` | Full platform access, settings, staff management, financial reports (`/admin`) |
| **STAFF** | `staff@brightloop.demo` | `Brightloop!2026` | Operations access, catalog, customer onboarding, quotations (`/staff`) |
| **CUSTOMER** | `customer@brightloop.demo` | `Brightloop!2026` | Self-service portal for Acme Global Solutions, invoices, subscriptions (`/portal`) |

---

## 10. Command Reference

All primary workflows can be managed from the root directory using npm scripts:

| Command | Description |
|---|---|
| `npm run dev` | Runs backend (port 4000) and frontend (port 3000) concurrently with hot reload |
| `npm run dev:backend` | Starts Express backend in development watch mode using `tsx` |
| `npm run dev:frontend` | Starts Next.js frontend in development mode |
| `npm run build` | Builds all packages in dependency order (`shared` → `backend` → `frontend`) |
| `npm run test` | Executes all 13 Jest automated backend integration test suites |
| `npm run db:push` | Pushes `schema.prisma` directly to PostgreSQL without generating migrations |
| `npm run db:generate` | Regenerates `@prisma/client` types |
| `npm run db:seed` | Populates the database with initial users, products, plans, and taxes |
| `npm run db:studio` | Launches Prisma Studio visual database browser |

---

## 11. Testing & Quality Assurance

The backend includes a comprehensive Jest integration test suite covering RBAC, authentication, business domain logic, financial calculations, and settings persistence:

```bash
# Run all backend tests
npm run test

# Run a specific test suite
npm --prefix backend test -- backend/src/__tests__/settings.test.ts
```

### Test Coverage Highlights
- **`auth.test.ts`**: Registration, login, JWT token rotation, logout.
- **`authorization.test.ts`**: Role boundary verification (ADMIN vs STAFF vs CUSTOMER).
- **`settings.test.ts`**: 19 tests validating all 9 settings categories, RBAC enforcement, logo upload/deletion, SMTP test email, and audit logs.
- **`taxes_discounts.test.ts`**: Inclusive/exclusive tax math, coupon redemption limits.
- **`billing_period.test.ts`**: Proration arithmetic, renewal interval calculation.
- **`payments_reconciliation.test.ts`**: Multi-invoice payment allocation and partial settlements.
- **`portal_security.test.ts`**: Customer data isolation and anti-tampering guards.

---

## 12. Security & Compliance Standards

- **Zero Floating-Point Arithmetic:** All currency calculations are handled as integer minor units (paise/cents) through `@sms/shared` money utilities.
- **Data Protection:** Database connection strings, SMTP passwords, and JWT secrets are strictly redacted and never returned to client interfaces.
- **Audit Logging:** Administrative configuration updates, quotation approvals, and payment collections are recorded in the PostgreSQL `audit_logs` table.
- **Input Sanitization:** All incoming requests are strictly validated using Zod schemas with type-coercion guards.
- **CORS & Cookies:** Access tokens are delivered via Authorization bearer headers or secure HttpOnly cookies with origin whitelisting.

---

## 13. Developer Documentation

For deeper architectural context and developer handovers, consult the `docs/` directory:
- [docs/developer-handover.md](file:///docs/developer-handover.md): Field-level schema definitions and integration contracts.
- [docs/api-contracts.md](file:///docs/api-contracts.md): REST API contracts and request/response shapes.
- [docs/architecture.md](file:///docs/architecture.md): Core platform architectural specifications.
- [docs/database.md](file:///docs/database.md): Entity-relationship diagrams and index definitions.

---

© 2026 Brightloop Technologies. All rights reserved.
