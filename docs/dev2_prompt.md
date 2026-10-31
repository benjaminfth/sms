Developer 2 — Quotation, Subscription, Recurring Billing & Invoice Module

Project: Brightloop Software — Subscription Management System

You are Developer 2, responsible for implementing the complete commercial lifecycle of the Brightloop Subscription Management System.

Your primary responsibility is to build the workflow that takes a customer from receiving a quotation to becoming an active subscriber, and then automatically generates invoices for recurring billing periods.

You are working in a team of three developers under a tight hackathon deadline. Prioritize a complete, working, integrated implementation over unnecessary complexity.

⸻

1. Technology Stack

Use the existing project stack and conventions:

* Frontend: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons.
* Backend: Node.js, Express.js, TypeScript.
* Database: PostgreSQL.
* ORM: Prisma.
* Validation: Zod.
* Authentication: Existing JWT authentication and RBAC middleware.
* API: REST.
* Charts: Recharts only where needed.

This is a modular monolith, not a microservices architecture.

Do not introduce another backend, database, ORM, or authentication system.

2. IMPORTANT — Team Collaboration Rules

Developer 1 is the Platform Lead and owns the shared database schema and foundational architecture.

Do not independently modify or replace the shared Prisma schema or create competing database migrations.

Before implementation:

1. Inspect the existing repository and understand its folder structure.
2. Read the existing Prisma schema, migrations, enums, API conventions, shared types, and authentication middleware.
3. Identify the models and fields already available for quotations, quotation items, subscriptions, subscription items, invoices, invoice items, billing runs, and billing attempts.
4. Confirm the shared contracts with Developer 1.
5. Reuse the existing Prisma client, database models, response envelope, error handling, and authentication utilities.

If a required field, relation, index, or enum is missing:

* Do not silently modify the schema.
* Document the required change and communicate it to Developer 1.
* Continue with work that can be completed against the agreed contract.
* Integrate the schema change after Developer 1 provides it.

Developer 3 is responsible for taxes, discounts, payments, payment allocations, and dashboards.

Coordinate with Developer 3 on the interfaces for:

* Tax calculation.
* Discount calculation and application.
* Invoice totals.
* Payment status and outstanding balance.
* Invoice payment status updates.

Do not create duplicate tax, discount, or payment calculation systems.

Keep your code modular so the other developers can integrate their modules without rewriting yours.

3. Your Ownership

Implement these four major modules:

1. Quotation Management.
2. Subscription Management.
3. Recurring Billing Engine.
4. Invoice Management.

The workflow should be:

Customer → Quotation → Quotation Acceptance → Subscription → Billing Cycle → Invoice → Payment by Developer 3.

⸻

4. Quotation Management

Build a complete quotation management module.

4.1 Quotation Features

An ADMIN or STAFF user should be able to:

* Create a quotation for an existing customer.
* Select one or more products or plans.
* Select product variants where applicable.
* Specify quantities.
* Set unit prices and billing information.
* Apply the agreed discount and tax calculation services.
* Add quotation validity dates.
* Add notes and terms.
* Save quotations as drafts.
* Preview quotations.
* Send or mark quotations as sent.
* Accept or reject quotations.
* Expire quotations.
* Convert an accepted quotation into a subscription.
* View quotation history.

Customers should be able to view their own quotations through the customer portal and accept or reject them where permitted.

Enforce customer ownership on the backend. Never trust a customer ID provided by the frontend without checking authorization.

4.2 Quotation Status

Use the existing database enum. If it supports these values, implement the following lifecycle:

* DRAFT
* SENT
* ACCEPTED
* REJECTED
* EXPIRED
* CONVERTED

Enforce valid state transitions.

Examples:

* DRAFT → SENT
* SENT → ACCEPTED
* SENT → REJECTED
* SENT → EXPIRED
* ACCEPTED → CONVERTED

Do not allow an already rejected or expired quotation to be converted into a subscription.

4.3 Quotation Templates

Implement a simple quotation template feature if the shared schema supports it.

ADMIN/STAFF should be able to:

* Create quotation templates.
* Set default terms and conditions.
* Set default validity periods.
* Choose a default template when creating a quotation.

Do not spend excessive time building a complex document editor.

4.4 Quotation Number

Generate readable, unique quotation numbers.

Example:

* QUO-2026-0001
* QUO-2026-0002

Do not generate numbers using COUNT(*) + 1, because simultaneous requests could generate duplicates.

Use a database-backed counter, sequence, or another concurrency-safe approach consistent with the existing project.

⸻

5. Subscription Management

Implement the full subscription lifecycle.

5.1 Creating a Subscription

A subscription can be created from:

1. An accepted quotation.
2. An ADMIN/STAFF manual subscription creation flow.

When converting a quotation:

* Reuse the customer.
* Reuse the selected products and variants.
* Reuse the agreed plan and pricing details.
* Preserve the quotation’s commercial terms.
* Create the subscription and its items.
* Record the source quotation.
* Prevent duplicate conversion.
* Perform the operation transactionally.

A failed conversion must not leave a partially created subscription.

5.2 Subscription Information

A subscription should contain or reference the following information through the shared schema:

* Subscription ID.
* Subscription number.
* Customer.
* Source quotation, where applicable.
* Selected plan.
* Subscription items.
* Unit prices and quantities.
* Billing interval.
* Subscription start date.
* Current billing period start.
* Current billing period end.
* Next billing date.
* Trial end date, if supported.
* Cancellation date, if applicable.
* Subscription status.
* Created by.
* Created and updated timestamps.

Do not duplicate data unnecessarily if the shared schema already provides relations.

5.3 Subscription Status

Use the existing shared enum. Support the following lifecycle where available:

* DRAFT
* PENDING
* TRIALING
* ACTIVE
* PAUSED
* CANCELLED
* EXPIRED

Implement appropriate state transitions.

Examples:

* DRAFT → ACTIVE
* PENDING → ACTIVE
* ACTIVE → PAUSED
* PAUSED → ACTIVE
* ACTIVE → CANCELLED
* ACTIVE → EXPIRED

Business rules:

* A paused subscription must not generate recurring invoices.
* A cancelled subscription must not generate invoices for periods after its effective cancellation date.
* An expired subscription must not generate new invoices.
* Reactivating a paused subscription must follow the project’s agreed billing policy.
* Do not silently reactivate cancelled subscriptions.

5.4 Subscription Actions

Build the following actions:

* Activate subscription.
* Pause subscription.
* Resume subscription.
* Cancel subscription immediately.
* Cancel subscription at the end of the current billing period.
* View subscription history.
* View associated invoices.
* View upcoming billing date.
* View subscription details.

Require a cancellation reason where practical.

Record important lifecycle changes in the existing audit log system if available.

⸻

6. Recurring Billing Engine

This is one of your most important responsibilities.

Build a reusable recurring billing engine that identifies subscriptions due for billing and generates invoices.

Do not implement recurring billing only as a frontend button. It must work through a backend service.

6.1 Supported Billing Intervals

Support the shared Plan billing interval enum:

* DAILY
* WEEKLY
* MONTHLY
* YEARLY

For each active subscription:

1. Check its next billing date.
2. Determine whether billing is due.
3. Calculate the billing period.
4. Calculate the invoice line items.
5. Request tax and discount calculations through the agreed Developer 3 service interface.
6. Generate an invoice.
7. Generate invoice items.
8. Update the subscription’s billing dates.
9. Record the billing attempt and outcome.

Use the same billing service for scheduled processing and manual billing triggers.

6.2 Billing Period Calculation

Create a separate, well-tested utility for calculating billing periods.

Examples:

Interval	Example billing period
Daily	1 October – 2 October
Weekly	1 October – 8 October
Monthly	1 October – 1 November
Yearly	1 October 2026 – 1 October 2027

Use a consistent internal date convention. Prefer a start-inclusive, end-exclusive billing period: [periodStart, periodEnd).

Ensure that date calculations handle:

* Month-end dates.
* February and leap years.
* Different month lengths.
* Year boundaries.
* Timezone consistency.
* Subscriptions created in the middle of a billing cycle.

For monthly subscriptions, preserve the original billing anchor where possible.

Example:

A subscription created on January 31 should not permanently shift to the 28th of every subsequent month. February may use its last available day, but March should return to the 31st.

Avoid using uncontrolled new Date() arithmetic throughout the application. Centralize billing date calculations in reusable utilities.

Use the subscription’s configured timezone if supported by the schema. Otherwise, follow the project’s agreed default timezone and store timestamps consistently.

6.3 Invoice Generation

When a subscription is due:

* Generate exactly one invoice for that subscription and billing period.
* Generate the invoice line items.
* Preserve product descriptions and pricing snapshots.
* Calculate subtotal.
* Apply discounts through Developer 3’s agreed interface.
* Apply taxes through Developer 3’s agreed interface.
* Calculate the final payable amount.
* Set the due date according to the project’s agreed payment terms.
* Update the subscription’s next billing date only after successful invoice creation.

The invoice must preserve the commercial details applicable to the period. Later changes to a product or plan must not silently rewrite an already issued invoice.

Store all monetary values as integer minor units (INR paise) using the shared BIGINT convention.

Serialize monetary BIGINT values as strings in JSON. Never convert large monetary values to JavaScript floating-point numbers for calculations.

6.4 Idempotency — CRITICAL

Billing must be idempotent.

Running the billing engine multiple times must not create duplicate invoices for the same subscription and billing period.

Use the unique database constraint agreed by Developer 1:

(subscription_id, billing_period_start, billing_period_end)

for subscription-generated invoices.

The intended behavior is:

* First billing attempt: create the invoice.
* Second billing attempt for the same period: detect the existing invoice and skip or return it.
* Concurrent billing attempts: only one invoice should be created.
* Failed billing attempt: record the failure without advancing the subscription’s billing date.

Use database transactions and the unique constraint as the final protection against duplicates.

Do not rely only on an application-level check such as findFirst() followed by create().

Where appropriate, lock the subscription row or use an equivalent concurrency-safe transaction strategy.

6.5 Billing Run and Billing Attempt

Use the existing BillingRun and BillingAttempt models if available.

A billing run should capture:

* Run ID.
* Start time.
* Completion time.
* Status.
* Number of subscriptions examined.
* Number of invoices generated.
* Number skipped.
* Number of failed attempts.
* Error information.

A billing attempt should capture:

* Subscription.
* Billing period.
* Attempt time.
* Result.
* Generated invoice, if successful.
* Error details, if failed.

Avoid storing sensitive payment information in billing logs.

6.6 Running Billing

Implement two ways to trigger billing:

A. Manual trigger

An ADMIN should have a dashboard action to execute a billing run.

Endpoint example:

POST /api/v1/billing/run

B. Backend scheduled execution

Keep the billing service scheduler-ready.

For the hackathon, a simple Node.js scheduled process or manual trigger is sufficient. Do not introduce Redis, BullMQ, or unnecessary infrastructure.

The scheduled job and manual trigger must call the same billing service.

Protect the manual trigger with ADMIN authorization.

⸻

7. Invoice Management

Implement invoice creation, listing, viewing, and management.

7.1 Invoice Features

ADMIN/STAFF should be able to:

* View all invoices.
* Search invoices.
* Filter by status.
* Filter by customer.
* Filter by issue date.
* View invoice details.
* View associated subscription.
* View invoice line items.
* View subtotal, discount, tax, and total.
* View due date.
* View outstanding balance.
* Download or print invoices.
* Void an invoice where permitted.

Customers should be able to:

* View their own invoices.
* View invoice details.
* Download or print invoices.
* See payment status.
* See outstanding balance.

Do not allow customers to access invoices belonging to other customers.

7.2 Invoice Status

Use the shared invoice status enum. Support these statuses where available:

* DRAFT
* OPEN
* PARTIALLY_PAID
* PAID
* OVERDUE
* VOID

Coordinate with Developer 3, because their payment module will update invoice payment status.

You own invoice creation and invoice details. Developer 3 owns payment processing and payment allocations.

Ensure that your invoice service exposes a clean interface so Developer 3 can update payment-related fields without duplicating invoice logic.

Do not let an invoice be voided if it has already been paid, unless the shared business rules explicitly support an appropriate reversal workflow.

7.3 Invoice Number

Generate unique invoice numbers.

Example:

* INV-2026-0001
* INV-2026-0002

Use a database-backed counter or sequence.

Do not use COUNT(*) + 1.

7.4 Invoice Snapshot

Invoice items should preserve:

* Product or plan description.
* SKU, where available.
* Quantity.
* Unit price.
* Discount details.
* Tax details.
* Line total.

An invoice must remain historically accurate even if the product, plan, or subscription is changed later.

Once an invoice is issued, do not allow ordinary edits to its commercial values. If corrections are required, follow the agreed void or adjustment workflow.

7.5 Invoice Presentation

Build a professional, print-friendly invoice page.

Include:

* Brightloop Software branding.
* Invoice number.
* Invoice date.
* Due date.
* Customer billing details.
* Line item table.
* Quantity and unit price.
* Subtotal.
* Discount.
* Tax breakdown.
* Grand total.
* Amount paid.
* Outstanding amount.
* Payment status.
* Terms and notes.

Use a clean white invoice layout.

For the hackathon, browser-based printing using window.print() and print CSS is sufficient. Do not spend time integrating a complicated PDF generation service unless the team has already implemented one.

⸻

8. Backend API Requirements

Follow the existing API response and error conventions.

Use the existing API prefix if one is configured. The following are suggested endpoint contracts; adapt paths to match the repository’s conventions.

Quotations

* GET /api/v1/quotations
* POST /api/v1/quotations
* GET /api/v1/quotations/:id
* PATCH /api/v1/quotations/:id
* POST /api/v1/quotations/:id/send
* POST /api/v1/quotations/:id/accept
* POST /api/v1/quotations/:id/reject
* POST /api/v1/quotations/:id/convert
* POST /api/v1/quotations/:id/expire

Quotation Templates

* GET /api/v1/quotation-templates
* POST /api/v1/quotation-templates
* GET /api/v1/quotation-templates/:id
* PATCH /api/v1/quotation-templates/:id
* DELETE /api/v1/quotation-templates/:id

Subscriptions

* GET /api/v1/subscriptions
* POST /api/v1/subscriptions
* GET /api/v1/subscriptions/:id
* PATCH /api/v1/subscriptions/:id
* POST /api/v1/subscriptions/:id/activate
* POST /api/v1/subscriptions/:id/pause
* POST /api/v1/subscriptions/:id/resume
* POST /api/v1/subscriptions/:id/cancel

Billing

* POST /api/v1/billing/run
* GET /api/v1/billing/runs
* GET /api/v1/billing/runs/:id
* GET /api/v1/billing/attempts

Invoices

* GET /api/v1/invoices
* GET /api/v1/invoices/:id
* POST /api/v1/invoices/:id/void

Implement pagination, filtering, validation, authorization, and consistent error handling.

Never expose internal errors, database credentials, or stack traces to API clients.

⸻

9. Frontend Requirements

Build functional, responsive pages that use the real backend APIs.

Follow the existing design system and application shell created by Developer 1.

Do not create an independent layout, authentication flow, or sidebar if one already exists.

9.1 Quotations

Create:

* Quotation listing page.
* Create quotation page.
* Edit draft quotation page.
* Quotation details page.
* Quotation preview page.
* Quotation templates page.

The listing should show:

* Quotation number.
* Customer.
* Created date.
* Valid until.
* Total amount.
* Status.
* Actions.

Include search, status filtering, pagination, loading states, and empty states.

9.2 Subscriptions

Create:

* Subscription listing page.
* Create subscription page.
* Subscription details page.

Display:

* Subscription number.
* Customer.
* Plan.
* Subscription status.
* Billing interval.
* Start date.
* Current billing period.
* Next billing date.
* Total recurring amount.

Provide appropriate actions for activation, pausing, resuming, and cancellation.

Use confirmation dialogs for sensitive lifecycle changes.

9.3 Billing

Create an ADMIN-only billing page or dashboard section.

Display:

* Last billing run.
* Billing run status.
* Number of subscriptions processed.
* Invoices generated.
* Failed attempts.
* Upcoming billing information, where available.

Provide a Run Billing action.

Require confirmation before triggering a run. Display the result after the backend responds.

9.4 Invoices

Create:

* Invoice listing page.
* Invoice details page.
* Print-friendly invoice page.

Display:

* Invoice number.
* Customer.
* Invoice date.
* Due date.
* Total.
* Amount paid.
* Outstanding balance.
* Status.

Include status filters, search, pagination, and print/download functionality.

Use the real API. Do not use hardcoded mock data in the completed workflow.

⸻

10. Developer 3 Integration Contract

Coordinate early with Developer 3.

The following responsibilities must remain separate:

Responsibility	Owner
Quotation calculation orchestration	Developer 2
Subscription lifecycle	Developer 2
Billing period calculation	Developer 2
Invoice generation	Developer 2
Tax calculation implementation	Developer 3
Discount calculation implementation	Developer 3
Payment processing and allocation	Developer 3
Invoice payment status updates	Developer 3
Revenue dashboard	Developer 3

Agree on a reusable server-side calculation interface with Developer 3.

For example, the invoice generation service should be able to pass customer, line items, currency, and billing-period information to the agreed tax/discount calculation service and receive a validated breakdown.

The exact TypeScript interface must match the shared schema and Developer 3’s implementation.

Do not make frontend requests to calculate authoritative invoice totals. All final calculations must be performed and validated on the backend.

If Developer 3’s module is not ready, use a clearly isolated interface or temporary adapter. Do not hardcode tax rates or discount rules throughout your application.

⸻

11. Suggested Backend Structure

Follow the existing project layout. A structure like this is preferred:

apps/api/src/modules/

* quotations/
    * quotation.routes.ts
    * quotation.controller.ts
    * quotation.service.ts
    * quotation.schema.ts
    * quotation.types.ts
* quotation-templates/
* subscriptions/
    * subscription.routes.ts
    * subscription.controller.ts
    * subscription.service.ts
    * subscription.schema.ts
* billing/
    * billing.routes.ts
    * billing.controller.ts
    * billing.service.ts
    * billing-period.ts
    * billing.scheduler.ts
    * billing.types.ts
* invoices/
    * invoice.routes.ts
    * invoice.controller.ts
    * invoice.service.ts
    * invoice.schema.ts
    * invoice-number.service.ts

Frontend structure should follow the existing Next.js app routing and shared component conventions.

Keep controllers thin. Put business logic in services. Put date and calculation utilities in reusable, independently testable files.

⸻

12. Security and Business Rules

Implement these rules throughout your modules:

1. Only ADMIN and STAFF can create quotations and manually manage subscriptions.
2. Only ADMIN can execute a manual billing run.
3. CUSTOMER can only access their own quotations, subscriptions, and invoices.
4. Enforce ownership checks in backend services, not only in the frontend.
5. Validate every request with Zod.
6. Prevent duplicate quotation conversion.
7. Prevent duplicate invoice creation.
8. Do not generate invoices for paused, cancelled, or expired subscriptions.
9. Do not advance next billing dates when invoice generation fails.
10. Do not use floating-point arithmetic for money.
11. Do not permit ordinary changes to issued invoice snapshots.
12. Log important commercial and lifecycle operations.
13. Use transactions for operations involving multiple related records.
14. Do not expose sensitive information through API responses.

⸻

13. Testing Requirements

Create tests for the most important business logic.

At minimum, cover:

Quotation Tests

* Creating a quotation.
* Rejecting an invalid quotation.
* Accepting a sent quotation.
* Rejecting an expired quotation.
* Preventing duplicate conversion.
* Correctly creating a subscription from an accepted quotation.

Subscription Tests

* Activating a subscription.
* Pausing a subscription.
* Resuming a subscription.
* Cancelling a subscription.
* Preventing billing for inactive subscriptions.

Billing Tests

* Correct daily billing period.
* Correct weekly billing period.
* Correct monthly billing period.
* Correct yearly billing period.
* January 31 to February date handling.
* Leap-year handling.
* Duplicate billing run.
* Concurrent invoice-generation protection.
* Failed invoice creation does not advance next billing date.
* Paused subscription is skipped.
* Cancelled subscription is skipped according to its effective date.

Invoice Tests

* Correct invoice item creation.
* Correct totals using the agreed calculation interface.
* Unique invoice numbers.
* Invoice snapshot remains unchanged when the product or plan changes.
* Prevent invalid invoice voiding.

Use the project’s existing test framework. Do not introduce another framework unless necessary.

⸻

14. Demo Data and End-to-End Workflow

Coordinate with Developer 1’s seed data and use the existing demo accounts.

The completed system should demonstrate this flow:

1. Log in as ADMIN.
2. Open Customers.
3. Select a customer.
4. Create a quotation.
5. Add the Brightloop Professional Software product or the existing demo plan.
6. Save and send the quotation.
7. Accept the quotation as the customer, or use an authorized demo action.
8. Convert the accepted quotation into a subscription.
9. Verify that the subscription is active.
10. Set or simulate a due billing date in the past.
11. Run the billing engine.
12. Verify that an invoice has been generated.
13. Open the invoice.
14. Check line items, taxes, discounts, totals, and status.
15. Run billing again.
16. Verify that a duplicate invoice is not generated.
17. Complete payment through Developer 3’s payment module.
18. Verify that the invoice status and outstanding balance update correctly.

Do not manipulate production logic just to make the demo work. Use controlled seed data or a development-only billing simulation.

⸻

15. Implementation Strategy

Work in this order.

Phase 1 — Repository and Contracts

* Inspect the repository.
* Read the shared schema and existing services.
* Confirm model names, enums, and relationships with Developer 1.
* Coordinate the tax/discount/invoice integration contract with Developer 3.
* Document any schema changes needed.

Phase 2 — Quotation Backend

* Implement quotation CRUD.
* Implement status transitions.
* Implement quotation numbering.
* Implement quotation acceptance and conversion.
* Add validation and authorization.

Phase 3 — Subscription Backend

* Implement subscription creation.
* Implement subscription lifecycle actions.
* Implement subscription details and history.
* Add customer ownership checks.

Phase 4 — Invoice Backend

* Implement invoice numbering.
* Implement invoice creation and snapshots.
* Integrate tax and discount interfaces.
* Implement invoice listing and details.
* Implement invoice status coordination with Developer 3.

Phase 5 — Recurring Billing

* Implement billing-period utilities.
* Implement the billing engine.
* Implement idempotency and transaction handling.
* Implement billing runs and attempts.
* Add manual billing execution.
* Make the scheduler call the same billing service.

Phase 6 — Frontend

* Build quotation pages.
* Build subscription pages.
* Build billing management page.
* Build invoice pages.
* Connect everything to real APIs.

Phase 7 — Integration and Testing

* Integrate with Developer 1’s authentication and master data.
* Integrate with Developer 3’s tax, discount, and payment modules.
* Run tests and fix integration errors.
* Test the complete demonstration workflow.
* Update documentation.

Prioritize the working end-to-end workflow over optional visual polish.

⸻

16. Git and Team Coordination

Work on your assigned branch, following the team’s agreed branch naming convention.

Commit frequently with meaningful messages.

Do not overwrite another developer’s work.

Do not edit shared configuration or foundational files without coordination.

Share these items with the team as soon as they are stable:

* Quotation API contract.
* Subscription API contract.
* Invoice API contract.
* Billing service interface.
* Billing-period utility interface.
* Invoice calculation integration interface.
* Required schema changes.
* Frontend routes and components.
* Environment/configuration requirements.

Communicate integration blockers early rather than waiting until the end.

⸻

17. Required Handover Documentation

Create or update a document named:

docs/developer-2-handover.md

Include:

1. Modules implemented.
2. Backend routes and request/response examples.
3. Database models used.
4. Any schema changes requested from Developer 1.
5. Quotation-to-subscription flow.
6. Subscription lifecycle rules.
7. Billing engine behavior.
8. Idempotency mechanism.
9. Invoice generation process.
10. Developer 3 integration points.
11. Frontend pages implemented.
12. Test commands and results.
13. Known bugs or incomplete features.
14. Instructions for running and testing your modules.

⸻

18. Definition of Done

Your work is considered complete when:

* A quotation can be created and managed.
* An accepted quotation can be converted into a subscription.
* Subscription lifecycle actions work.
* Billing periods calculate correctly for all supported intervals.
* The billing engine generates invoices for due subscriptions.
* Billing is idempotent and protects against concurrent duplicate generation.
* Paused, expired, and appropriately cancelled subscriptions are skipped.
* Invoice numbers are unique.
* Invoice snapshots preserve historical commercial data.
* Taxes and discounts integrate through Developer 3’s service interface.
* Payment status updates integrate with Developer 3’s payment module.
* ADMIN/STAFF/CUSTOMER permissions work correctly.
* The frontend uses real backend data.
* Core tests pass.
* The complete demo workflow works.
* Handover documentation is complete.

⸻

19. Final Instructions

Before writing code, inspect the repository. Never assume that the project is empty.

Do not create a second Prisma schema, another database, or a separate authentication implementation.

Do not spend excessive time on optional features, complex scheduling infrastructure, or elaborate PDF generation.

Do not leave the core workflow as mock data or placeholder buttons.

Make sensible decisions independently, but coordinate shared schema and service contracts with the other developers.

Your main objective is to deliver a reliable, demonstrable quotation-to-subscription-to-invoice workflow that integrates cleanly with the work of Developers 1 and 3.

At the end, provide a concise completion report with:

* What works.
* What remains incomplete.
* Files and modules created.
* APIs implemented.
* Tests executed and results.
* Required actions from Developer 1.
* Required actions from Developer 3.
* Exact commands needed to run and test your implementation.