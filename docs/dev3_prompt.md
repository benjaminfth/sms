Developer 3 — Tax, Discounts, Payments, Dashboard & Customer Portal

Project: Brightloop Software — Subscription Management System

You are Developer 3, responsible for implementing the financial calculation, payment processing, reporting, and customer-facing modules of the Brightloop Subscription Management System.

You are working in a three-developer team with a strict hackathon deadline.

Your responsibility is to build the modules that make the platform financially functional:

1. Tax Management and Calculation Engine.
2. Discount and Promotion Management.
3. Payment Management.
4. Payment Allocation and Reconciliation.
5. Dashboard and Revenue Analytics.
6. Customer Portal.

Your modules must integrate with the work of Developer 1 and Developer 2. Prioritize a complete, reliable end-to-end workflow over unnecessary complexity.

⸻

1. Technology Stack

Use the existing project stack:

* Frontend: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons.
* Backend: Node.js, Express.js, TypeScript.
* Database: PostgreSQL.
* ORM: Prisma.
* Validation: Zod.
* Authentication: Existing JWT authentication and RBAC middleware.
* API: REST.
* Charts: Recharts.

This is a modular monolith.

Do not introduce another backend, database, ORM, authentication system, or unnecessary infrastructure.

⸻

2. CRITICAL — Team Collaboration Rules

Developer 1 is the Platform Lead and owns the shared Prisma schema, migrations, and foundational architecture.

Developer 2 owns quotations, subscriptions, recurring billing, and invoice generation.

You own taxes, discounts, payment processing, payment allocations, reconciliation, dashboards, and the customer portal.

2.1 Shared Database Rules

Do not independently edit or replace the shared Prisma schema or create competing database migrations.

Before implementation:

1. Inspect the repository structure.
2. Read the existing Prisma schema and migrations.
3. Review the shared enums, models, relations, and API conventions.
4. Review Developer 1’s authentication, customer, product, and plan modules.
5. Coordinate the invoice structure and invoice-generation service with Developer 2.
6. Identify the fields and relations required by your modules.
7. Request missing schema changes from Developer 1.

The expected shared models may include:

* Tax
* ProductTax
* Discount
* DiscountProduct
* DiscountApplication
* Payment
* PaymentAllocation
* Invoice
* InvoiceItem
* Customer
* Subscription
* AuditLog
* Notification

Use the actual names and relationships in the shared schema rather than assuming they are identical to this list.

2.2 Developer 2 Integration

Developer 2 is responsible for creating invoices.

You are responsible for:

* Providing tax calculation.
* Providing discount calculation.
* Applying payment allocations to invoices.
* Updating payment-related invoice status and balances through an agreed service interface.
* Providing payment information for invoice details and the customer portal.

Coordinate these interfaces with Developer 2 before implementing the dependent parts.

Do not create a second invoice-generation system.

Do not duplicate invoice calculations inside your payment module.

2.3 Developer 1 Integration

Reuse:

* Existing authentication.
* Existing RBAC middleware.
* Existing customer and product models.
* Existing Prisma client.
* Existing API response envelope.
* Existing error handling.
* Existing audit logging utilities.

Do not build independent authentication or customer management.

⸻

3. Your Ownership

Implement these six modules:

Module	Main responsibility
Taxes	Tax configuration and tax calculation
Discounts	Discount creation, validation, and application
Payments	Recording and processing customer payments
Reconciliation	Allocating payments to invoices and tracking balances
Dashboard	Revenue, subscription, and payment analytics
Customer Portal	Customer access to their subscriptions, invoices, and payments

The complete business workflow should be:

Customer → Quotation → Subscription → Billing → Invoice → Payment → Payment Allocation → Invoice Paid/Partially Paid → Dashboard Reporting.

Developer 2 handles quotation, subscription, billing, and invoice generation. Your modules handle the financial calculations, payments, and reporting portions.

⸻

4. Tax Management Module

Build a configurable tax management system.

ADMIN should be able to define and manage taxes without changing application code.

4.1 Tax Configuration

A tax record should support the following fields where available in the shared schema:

* Tax ID.
* Tax name.
* Tax code.
* Description.
* Tax type.
* Tax rate.
* Tax calculation method.
* Inclusive/exclusive setting.
* Active/inactive status.
* Effective start date.
* Effective end date.
* Created by.
* Created and updated timestamps.

Examples:

* GST — 18%.
* CGST — 9%.
* SGST — 9%.
* IGST — 18%.

These are examples for demonstration only. Tax rates must be configurable and must not be permanently hardcoded.

Use integer basis points for percentage rates where supported.

For example:

* 5% = 500 basis points.
* 12% = 1200 basis points.
* 18% = 1800 basis points.

4.2 Tax Management Actions

ADMIN should be able to:

* Create a tax.
* Edit a tax.
* Activate or deactivate a tax.
* View tax details.
* View products associated with a tax.
* Assign taxes to products.
* Remove tax assignments where permitted.
* View applicable tax rates.

Only active and effective taxes should be applied to new calculations.

Do not rewrite historical tax values on already issued invoices when a tax configuration changes.

4.3 Product Tax Assignment

Use the existing ProductTax relation if available.

Support:

* Assigning a tax to a product.
* Assigning multiple tax components where appropriate.
* Selecting applicable tax rules for a product.
* Retrieving a product’s applicable taxes.

Do not duplicate product or variant records.

Coordinate with Developer 2 to ensure that subscription invoice items contain enough product and pricing context for tax calculation.

4.4 Tax Calculation Engine

Create a reusable backend tax calculation service.

It must be usable from:

* Quotation calculations.
* Subscription invoice generation.
* Manual invoice calculations, where supported.

Developer 2 must be able to call this service directly from the backend. Do not require a frontend request to calculate authoritative invoice values.

Support:

* Percentage-based tax.
* Inclusive tax.
* Exclusive tax.
* Multiple tax components.
* Product-level tax assignments.
* Effective tax dates.
* Appropriate rounding.

For exclusive tax:

Tax Amount = Taxable Amount × Tax Rate

For inclusive tax:

Tax Amount = Gross Amount × Rate / (100 + Rate)

Use integer minor units and a consistent rounding strategy. Do not use JavaScript floating-point arithmetic for monetary calculations.

For example, if the taxable amount is ₹2,000 and the tax rate is 18%:

* Subtotal: ₹2,000.
* Tax: ₹360.
* Total: ₹2,360.

All calculations should use integer paise internally.

Use a well-tested utility for converting percentage or basis-point rates into monetary amounts.

4.5 Tax Breakdown

The invoice calculation service should be able to return a structured breakdown similar to:

{
  "subtotal": "200000",
  "taxableAmount": "200000",
  "taxTotal": "36000",
  "grandTotal": "236000",
  "taxBreakdown": [
    {
      "taxCode": "GST18",
      "name": "GST",
      "rateBps": 1800,
      "amount": "36000"
    }
  ]
}

This represents INR paise.

The exact response structure must be agreed with Developer 2.

Preserve tax details as invoice snapshots so historical invoices remain correct even if tax configurations change later.

⸻

5. Discount Management Module

Build a configurable discount and promotion system.

ADMIN and authorized STAFF users should be able to create and manage discounts.

5.1 Discount Types

Support these types where the shared schema allows:

1. Percentage discount.
2. Fixed amount discount.

Examples:

* 10% off.
* ₹500 off.
* 20% discount for the first three billing cycles.

Use integer paise for fixed discounts and basis points for percentage discounts.

Do not use floating-point calculations.

5.2 Discount Configuration

A discount should support:

* Discount ID.
* Name.
* Description.
* Discount code.
* Discount type.
* Discount value.
* Minimum order or invoice amount.
* Maximum discount amount, where applicable.
* Start date.
* Expiration date.
* Active/inactive status.
* Maximum total redemptions.
* Maximum redemptions per customer.
* Eligible products or plans.
* Eligible customer, if applicable.
* Recurring discount duration.
* Whether the discount can be combined with another discount.
* Created by.

Use existing schema fields where available. Request missing fields from Developer 1.

5.3 Discount Management Actions

Implement:

* Create discount.
* Edit discount.
* Activate/deactivate discount.
* View discount details.
* Set discount code.
* Define eligibility.
* Assign discount to products or plans.
* Define validity dates.
* Define usage limits.
* View redemption history.
* View applied discounts.

Do not let ordinary users create or modify discount rules.

5.4 Discount Application

Customers should be able to enter a discount code where applicable.

The backend must validate:

* Code exists.
* Code is active.
* Code is within its validity period.
* Customer is eligible.
* Product or plan is eligible.
* Minimum invoice amount is satisfied.
* Redemption limits have not been exceeded.
* The discount has not already been consumed where usage rules prohibit it.
* Stacking rules are satisfied.

Never trust a frontend-provided discount amount.

The backend must calculate the actual discount.

5.5 Discount Calculation Rules

Support:

* Percentage discounts.
* Fixed amount discounts.
* Maximum discount caps.
* Product-specific discounts.
* Plan-specific discounts.
* Recurring discounts for a configured number of billing cycles.
* One-time discounts.
* Usage restrictions.

Do not allow the discount to make the payable amount negative.

If multiple discounts are supported, apply them according to explicit stacking rules and document the order of calculation.

Do not assume all discounts can be combined.

5.6 Recurring Discount Handling

For a recurring discount:

Example:

* Monthly plan: ₹2,000.
* Discount: 10%.
* Duration: First three billing cycles.

The discount should apply to the first three eligible invoices and stop after the configured duration.

Use the shared DiscountApplication or equivalent record to track usage.

Ensure concurrent invoice generation cannot consume the same discount usage more than permitted.

Store the applied discount details as invoice snapshots.

⸻

6. Shared Pricing Calculation Interface

This is a critical integration point with Developer 2.

Agree on a clean backend service interface for calculating a quotation or invoice.

The service should receive enough information to determine:

* Customer.
* Products and variants.
* Quantities.
* Unit prices.
* Currency.
* Discount code or applicable discount records.
* Billing period.
* Applicable taxes.

It should return:

* Line item subtotals.
* Discount breakdown.
* Tax breakdown.
* Taxable amount.
* Grand total.
* Currency.
* Any validation errors.

Example conceptual result:

{
  "currency": "INR",
  "subtotal": "200000",
  "discountTotal": "20000",
  "taxableAmount": "180000",
  "taxTotal": "32400",
  "grandTotal": "212400",
  "discountBreakdown": [],
  "taxBreakdown": []
}

All monetary values are integer paise represented as strings in JSON.

The above is illustrative. Agree on the exact TypeScript types and function signature with Developer 2.

Important rules:

1. Final calculations happen on the backend.
2. Do not trust frontend-supplied totals.
3. Use the same pricing engine for quotations and invoices wherever the business rules permit.
4. Keep the calculation service independent from HTTP controllers.
5. Invoice creation must preserve the resulting calculation snapshot.
6. Historical invoices must not recalculate themselves when tax or discount rules change.

If Developer 2 is not ready, build the service behind a stable interface and use test data. Do not create an alternative invoice generator.

⸻

7. Payment Management Module

Build a payment management system that supports payment recording and invoice settlement.

7.1 Payment Methods

Support the payment methods available in the shared schema, such as:

* UPI.
* Bank Transfer.
* Credit Card.
* Debit Card.
* Cash.
* Other.

The payment method should be configurable or represented by a shared enum, consistent with the project.

7.2 Payment Status

Use the existing shared enum. Support statuses such as:

* PENDING.
* PROCESSING.
* SUCCESS.
* FAILED.
* REFUNDED.
* PARTIALLY_REFUNDED.

Use only statuses compatible with the shared model.

7.3 Payment Information

A payment record should contain or reference:

* Payment ID.
* Customer.
* Amount.
* Currency.
* Payment method.
* Payment status.
* Transaction reference.
* External gateway reference, if applicable.
* Payment date.
* Failure reason, if applicable.
* Created by.
* Created and updated timestamps.

Store payment amounts as BIGINT integer paise.

Serialize monetary BIGINT values as strings in API responses.

7.4 Payment Creation

Support these workflows:

A. Record a manual payment

ADMIN/STAFF can record a payment received through:

* UPI.
* Bank transfer.
* Cash.
* Other supported offline methods.

Capture a transaction reference or payment note where available.

B. Customer payment workflow

Customers should be able to initiate payment for an outstanding invoice through the agreed payment interface.

C. Payment gateway adapter

Keep payment gateway integration modular.

First inspect the repository and ask whether the team has already selected and configured a gateway.

If real gateway credentials and an existing provider choice are available, integrate that provider using its official server-side APIs.

Otherwise, implement a clean provider interface and a clearly labelled demo/manual payment flow.

Do not assume payment gateway credentials exist.

Do not collect or store raw card numbers, CVV, or other sensitive card information.

A simulated payment must be visibly marked as a demo flow. Never represent a simulated payment as a real transaction.

7.5 Payment API Behavior

Payment creation must:

* Validate the customer and invoice.
* Verify that the invoice is payable.
* Check the outstanding balance.
* Validate the amount.
* Prevent duplicate transaction references where appropriate.
* Use idempotency for payment initiation or recording.
* Record the transaction result.
* Create payment allocations.
* Update invoice payment status through the agreed invoice service.
* Write relevant audit events.

A failed payment must not create a successful allocation.

⸻

8. Payment Allocation and Reconciliation

Payment allocation is essential because a customer may make partial payments or pay several invoices together.

Implement this module carefully.

8.1 Payment Allocation

Use the shared PaymentAllocation model.

It should connect a payment to one or more invoices.

Support:

* One payment settling one invoice.
* Partial payment against an invoice.
* One payment allocated across multiple invoices, if supported.
* Multiple payments allocated to one invoice.
* Tracking the remaining unallocated amount, if supported.

Example:

Invoice total: ₹5,000.

First payment: ₹2,000.

* Amount paid: ₹2,000.
* Outstanding balance: ₹3,000.
* Invoice status: PARTIALLY_PAID.

Second payment: ₹3,000.

* Amount paid: ₹5,000.
* Outstanding balance: ₹0.
* Invoice status: PAID.

All values should be calculated in integer paise.

8.2 Allocation Rules

Enforce:

1. A payment cannot allocate more than its successful payment amount.
2. An invoice cannot receive more than its outstanding balance through ordinary allocation.
3. Failed payments cannot be allocated.
4. Voided invoices cannot receive new allocations.
5. Duplicate allocations must be prevented.
6. Allocation creation and invoice balance updates must be transactional.
7. Customers can allocate payments only within their own invoices.
8. ADMIN/STAFF permissions must be enforced on backend routes.

Handle concurrent allocations safely using database transactions and suitable row-level locking or conditional updates.

8.3 Invoice Status Updates

Coordinate with Developer 2.

Based on successful allocations, update the invoice’s payment state through the agreed invoice service.

The behavior should be:

* No payment received → OPEN.
* Some amount received → PARTIALLY_PAID.
* Full outstanding amount received → PAID.
* Due date passed with an unpaid balance → OVERDUE, unless another status takes precedence.
* Invoice voided → VOID.

Do not independently duplicate invoice generation or invoice total calculation.

The outstanding amount should be derived reliably from invoice total and successful allocations, with an appropriate database-backed update strategy.

8.4 Payment Reconciliation

Build a simple reconciliation interface for ADMIN/STAFF.

Display:

* Payment reference.
* Customer.
* Invoice.
* Payment date.
* Payment method.
* Payment amount.
* Allocated amount.
* Unallocated amount, where supported.
* Payment status.
* Reconciliation status.

Include:

* Search by transaction reference.
* Filter by status.
* Filter by payment method.
* Filter by date range.
* View payment details.
* View associated allocations.
* Manually allocate an eligible payment, where permitted.
* Identify unmatched payments.

Do not allow a user to change a failed payment into a successful payment simply by changing a frontend status field. Any manual verification or status change must be explicitly authorized and audited.

⸻

9. Dashboard and Revenue Analytics

Build the main ADMIN dashboard using actual database information.

Do not use hardcoded values or static mock charts in the completed implementation.

9.1 Dashboard Metrics

Display useful summary metrics:

* Total customers.
* Active subscriptions.
* New subscriptions.
* Cancelled subscriptions.
* Total invoices.
* Paid invoices.
* Outstanding invoices.
* Overdue invoices.
* Total collected revenue.
* Outstanding revenue.
* Revenue for the selected period.

Clearly distinguish between invoiced revenue and collected revenue.

Do not report unpaid invoice totals as cash collected.

9.2 Revenue Reporting

Implement reports for:

* Daily revenue.
* Weekly revenue.
* Monthly revenue.
* Annual revenue.

Use successful payment allocations or another explicitly agreed accounting definition for collected revenue.

Use issued invoice totals for invoiced revenue.

Display the metric’s definition in the UI or report documentation to prevent confusion.

9.3 Charts

Use Recharts to implement:

1. Revenue over time.
2. New versus cancelled subscriptions.
3. Invoice payment status distribution.
4. Payment method distribution.
5. Outstanding versus collected amounts.

Use the existing design system.

Add date-range filters:

* Last 7 days.
* Last 30 days.
* Last 90 days.
* This year.
* Custom range.

Charts must update based on the selected range using real API data.

9.4 Subscription Analytics

Display:

* Active subscriptions.
* New subscriptions in the selected period.
* Cancelled subscriptions.
* Paused subscriptions.
* Subscription distribution by plan.
* Upcoming renewals, where useful.

Do not invent metrics or display misleading values.

If churn rate is implemented, document its calculation and time window. Do not divide by an arbitrary customer count.

9.5 Dashboard API

Create aggregated backend endpoints.

Suggested examples:

* GET /api/v1/dashboard/overview
* GET /api/v1/dashboard/revenue
* GET /api/v1/dashboard/subscriptions
* GET /api/v1/dashboard/invoices
* GET /api/v1/dashboard/payment-methods

Support date filters and appropriate ADMIN authorization.

Avoid fetching every payment or invoice into the frontend to calculate dashboard statistics.

Use database aggregation and pagination where appropriate.

⸻

10. Customer Portal

Build a customer-facing portal integrated into the existing application.

Do not create a separate authentication system.

A CUSTOMER should see only their own information.

The backend must obtain the customer identity from the authenticated session and enforce ownership in every relevant query.

Never rely on a customer ID sent by the frontend as proof of ownership.

10.1 Customer Portal Overview

Create a customer dashboard displaying:

* Welcome message.
* Active subscriptions.
* Upcoming billing date.
* Recent invoices.
* Outstanding balance.
* Recent payments.
* Payment status.

Keep the interface simple and professional.

10.2 My Subscriptions

Customers should be able to:

* View their subscriptions.
* View subscription details.
* View current status.
* View plan details.
* View billing interval.
* View start date.
* View next billing date.
* View associated invoices.
* Submit a cancellation request, if supported by the agreed business rules.

Do not permit customers to change subscription prices or billing terms directly.

10.3 My Invoices

Customers should be able to:

* View all their invoices.
* Open invoice details.
* View line items.
* View taxes and discounts.
* View amount paid.
* View outstanding balance.
* View due date.
* Print or download an invoice.
* Initiate payment for an eligible outstanding invoice.

Use Developer 2’s invoice endpoints and coordinate with their implementation.

10.4 My Payments

Customers should be able to:

* View payment history.
* View payment date.
* View payment method.
* View transaction reference.
* View amount.
* View payment status.
* View associated invoice.
* View failed payment information where appropriate.

Never expose internal gateway credentials or sensitive transaction metadata.

10.5 My Quotations

Integrate with Developer 2’s quotation module.

Customers should be able to:

* View their quotations.
* Open quotation details.
* Review line items and totals.
* Accept or reject a quotation where permitted.
* View quotation status.

Do not duplicate quotation creation or quotation conversion logic.

10.6 Customer Profile

Allow customers to view and update permitted profile and billing details through the existing customer/profile APIs.

Do not implement a separate customer database.

⸻

11. Backend API Requirements

Use the project’s established API prefix, response envelope, authentication middleware, and error conventions.

The following are suggested API contracts. Adapt them to the existing routes and Developer 1’s conventions.

Tax Management

* GET /api/v1/taxes
* POST /api/v1/taxes
* GET /api/v1/taxes/:id
* PATCH /api/v1/taxes/:id
* DELETE /api/v1/taxes/:id
* GET /api/v1/taxes/:id/products
* POST /api/v1/products/:productId/taxes
* DELETE /api/v1/products/:productId/taxes/:taxId

Discounts

* GET /api/v1/discounts
* POST /api/v1/discounts
* GET /api/v1/discounts/:id
* PATCH /api/v1/discounts/:id
* POST /api/v1/discounts/:id/activate
* POST /api/v1/discounts/:id/deactivate
* GET /api/v1/discounts/:id/redemptions
* POST /api/v1/discounts/validate

Payments

* GET /api/v1/payments
* POST /api/v1/payments
* GET /api/v1/payments/:id
* POST /api/v1/payments/:id/verify, if manual verification is part of the agreed workflow
* GET /api/v1/payments/:id/allocations

Payment Allocations

* POST /api/v1/payments/:id/allocations
* GET /api/v1/payment-allocations
* DELETE /api/v1/payment-allocations/:id, only where the business rules permit reversal

Reconciliation

* GET /api/v1/reconciliation
* GET /api/v1/reconciliation/unmatched
* POST /api/v1/reconciliation/:paymentId/allocate

Dashboard

* GET /api/v1/dashboard/overview
* GET /api/v1/dashboard/revenue
* GET /api/v1/dashboard/subscriptions
* GET /api/v1/dashboard/invoices
* GET /api/v1/dashboard/payment-methods

Customer Portal

* GET /api/v1/portal/overview
* GET /api/v1/portal/subscriptions
* GET /api/v1/portal/subscriptions/:id
* GET /api/v1/portal/quotations
* GET /api/v1/portal/quotations/:id
* POST /api/v1/portal/quotations/:id/accept
* POST /api/v1/portal/quotations/:id/reject
* GET /api/v1/portal/invoices
* GET /api/v1/portal/invoices/:id
* GET /api/v1/portal/payments
* POST /api/v1/portal/invoices/:id/pay

Implement pagination, filtering, Zod validation, ownership checks, and consistent error handling.

Do not expose raw database errors or stack traces.

⸻

12. Suggested Backend Structure

Follow the existing monorepo conventions.

A suggested structure is:

apps/api/src/modules/

* taxes/
    * tax.routes.ts
    * tax.controller.ts
    * tax.service.ts
    * tax-calculation.service.ts
    * tax.schema.ts
    * tax.types.ts
* discounts/
    * discount.routes.ts
    * discount.controller.ts
    * discount.service.ts
    * discount-validation.service.ts
    * discount-calculation.service.ts
    * discount.schema.ts
* payments/
    * payment.routes.ts
    * payment.controller.ts
    * payment.service.ts
    * payment-provider.interface.ts
    * payment.schema.ts
* payment-allocations/
    * allocation.routes.ts
    * allocation.controller.ts
    * allocation.service.ts
* reconciliation/
    * reconciliation.routes.ts
    * reconciliation.controller.ts
    * reconciliation.service.ts
* dashboard/
    * dashboard.routes.ts
    * dashboard.controller.ts
    * dashboard.service.ts
* portal/
    * portal.routes.ts
    * portal.controller.ts
    * portal.service.ts

Keep controllers thin.

Put business logic in reusable services.

Do not place tax, discount, payment, or allocation calculations directly inside route handlers.

⸻

13. Frontend Requirements

Use the Next.js application shell, shared navigation, components, and styles created by Developer 1.

Do not create another frontend project or independent design system.

Use the actual backend APIs. Do not leave important pages as hardcoded mockups.

13.1 Admin Dashboard

Create a dashboard with:

* KPI summary cards.
* Revenue chart.
* Subscription chart.
* Invoice status chart.
* Recent payments.
* Recent invoices.
* Upcoming renewals.
* Date-range selection.

Use clear currency formatting for INR.

Ensure the dashboard distinguishes invoiced revenue from collected revenue.

13.2 Tax Management Pages

Create:

* Tax listing.
* Create tax form.
* Edit tax form.
* Tax details.
* Product-tax assignment interface.

Display tax name, code, rate, calculation type, and status.

Validate forms and show useful error messages.

13.3 Discount Management Pages

Create:

* Discount listing.
* Create discount.
* Edit discount.
* Discount details.
* Redemption history.

Create a usable form to configure discount type, value, expiry, eligibility, and limits.

Display discount status and redemption information.

13.4 Payments Pages

Create:

* Payments listing.
* Payment details.
* Record payment form.
* Payment status filters.
* Transaction reference search.

Display:

* Payment ID.
* Customer.
* Amount.
* Payment method.
* Transaction reference.
* Date.
* Status.

13.5 Reconciliation Page

Create a reconciliation interface with:

* Unmatched payments.
* Payment allocation details.
* Allocated amount.
* Remaining amount.
* Associated invoices.
* Reconciliation status.

Allow authorized users to allocate eligible payments with validation and confirmation.

13.6 Customer Portal Pages

Create a separate CUSTOMER experience using the existing application layout where appropriate.

Include:

* Customer dashboard.
* My subscriptions.
* Subscription details.
* My quotations.
* Quotation details.
* My invoices.
* Invoice details.
* My payments.
* Profile and billing information.

The UI must adapt to the signed-in role.

A customer must never see ADMIN/STAFF navigation or administrative actions.

Use loading states, empty states, error states, confirmation dialogs, and responsive layouts.

⸻

14. Security and Financial Integrity

These rules are mandatory.

1. Only ADMIN can configure global tax rules.
2. Only authorized ADMIN/STAFF users can manage discounts.
3. Customers can use only discounts that the backend validates as eligible.
4. Customers can view only their own invoices, subscriptions, quotations, and payments.
5. Customers cannot modify invoice totals or payment statuses.
6. All monetary calculations use integer paise.
7. Never calculate authoritative amounts in frontend JavaScript.
8. Never trust client-submitted totals, tax amounts, discounts, or balances.
9. Successful payment allocations must be transactional.
10. Failed payments cannot settle invoices.
11. Duplicate payment submissions must be protected using idempotency.
12. Use appropriate uniqueness constraints for transaction references.
13. Do not store raw card data or sensitive gateway credentials in database records.
14. Keep gateway secrets in server-side environment variables.
15. Verify payment gateway callbacks/webhooks using the provider’s official verification mechanism if an actual gateway is integrated.
16. Log financial state changes.
17. Protect against over-allocation and duplicate allocation.
18. Never allow a customer to access another customer’s data by changing a URL ID.

⸻

15. Testing Requirements

Use the project’s existing test framework.

Create tests for the core financial and access-control logic.

Tax Tests

* Correct percentage tax calculation.
* Correct inclusive tax calculation.
* Correct exclusive tax calculation.
* Multiple tax components.
* Inactive tax is not applied.
* Expired tax is not applied.
* Correct rounding.
* Historical invoice tax snapshot remains unchanged.

Discount Tests

* Percentage discount.
* Fixed amount discount.
* Maximum discount cap.
* Minimum invoice amount.
* Expired discount rejection.
* Inactive discount rejection.
* Invalid code rejection.
* Ineligible customer rejection.
* Ineligible product rejection.
* Redemption limit enforcement.
* Recurring discount duration.
* Discount cannot create a negative payable amount.
* Concurrent discount redemption protection, where applicable.

Payment Tests

* Successful payment recording.
* Failed payment recording.
* Duplicate transaction reference.
* Duplicate submission/idempotency.
* Correct payment status.
* Correct customer ownership enforcement.

Allocation Tests

* Full invoice payment.
* Partial payment.
* Multiple payments for one invoice.
* One payment across multiple invoices, if supported.
* Prevent over-allocation.
* Prevent allocation to void invoice.
* Prevent failed payment allocation.
* Concurrent allocation protection.
* Correct invoice balance update.

Dashboard Tests

* Collected revenue uses the agreed successful-payment definition.
* Invoiced revenue uses the agreed issued-invoice definition.
* Date filtering works.
* Cancelled/void invoices are treated according to documented metrics.
* Dashboard respects authorization.

Portal Security Tests

* Customer can access their own invoice.
* Customer cannot access another customer’s invoice.
* Customer can access their own subscription.
* Customer cannot access another customer’s subscription.
* Customer cannot access administrative payment routes.
* Customer cannot change invoice totals or payment status.

⸻

16. Demo Data and End-to-End Workflow

Coordinate with Developer 1’s seed data.

Use the existing demo accounts and products.

Your modules must support this end-to-end demonstration:

1. Log in as ADMIN.
2. Open Tax Management.
3. Create or activate a configurable tax.
4. Open Discount Management.
5. Create a percentage discount code.
6. Assign it to an eligible product or plan.
7. Coordinate with Developer 2 to create a quotation and subscription using the appropriate calculation service.
8. Ensure the generated invoice contains the expected discount and tax breakdown.
9. Log in as CUSTOMER.
10. Open the customer portal.
11. View the subscription and invoice.
12. Initiate or record a demo payment through the agreed payment flow.
13. Verify that the payment is recorded.
14. Verify that the payment is allocated to the invoice.
15. Verify that the invoice changes to PARTIALLY_PAID or PAID as appropriate.
16. Log back in as ADMIN.
17. Open the payment reconciliation page.
18. Verify the payment allocation and outstanding balance.
19. Open the dashboard.
20. Verify that collected revenue and invoice metrics reflect the transaction.

The entire workflow must use actual backend data.

Use clearly labelled demo payments if no real payment gateway is configured.

Do not make a simulated payment appear to be a real bank or gateway transaction.

⸻

17. Implementation Strategy

Work in this order.

Phase 1 — Repository Inspection and Team Contracts

* Inspect the existing repository.
* Read the Prisma schema.
* Identify tax, discount, payment, and allocation models.
* Review authentication and RBAC.
* Meet Developer 1 to request any missing schema requirements.
* Meet Developer 2 to agree on tax, discount, invoice, and payment-status service contracts.
* Document the agreed interfaces.

Phase 2 — Tax Engine

* Implement tax CRUD.
* Implement product-tax assignments.
* Implement inclusive and exclusive tax calculation.
* Add tax snapshots to the agreed invoice calculation flow.
* Add tests.

Phase 3 — Discount Engine

* Implement discount CRUD.
* Implement discount-code validation.
* Implement eligibility checks.
* Implement percentage and fixed discounts.
* Implement redemption tracking.
* Integrate with Developer 2.
* Add tests.

Phase 4 — Payment Management

* Implement payment creation and listing.
* Implement the payment-provider abstraction.
* Implement the demo/manual payment workflow if no real gateway is configured.
* Add idempotency and duplicate protection.
* Add payment detail views.

Phase 5 — Allocation and Reconciliation

* Implement payment allocations.
* Implement partial payments.
* Implement outstanding balance calculations.
* Integrate invoice status updates with Developer 2.
* Implement reconciliation endpoints.
* Add transaction and concurrency protections.

Phase 6 — Dashboard

* Implement aggregation services.
* Implement overview APIs.
* Implement revenue and subscription analytics.
* Connect Recharts to actual API responses.

Phase 7 — Customer Portal

* Implement portal APIs with strict ownership enforcement.
* Implement subscription and quotation views.
* Implement invoice and payment views.
* Connect payment initiation.
* Implement customer profile views.

Phase 8 — Integration and Testing

* Integrate with Developer 1’s authentication and master data.
* Integrate with Developer 2’s invoice and subscription services.
* Test taxes, discounts, payments, and allocations together.
* Run the complete demo.
* Fix integration errors.
* Update handover documentation.

Prioritize an integrated workflow over optional features and extra visual polish.

⸻

18. Git and Team Coordination

Work on your assigned branch, following the agreed team branch naming convention.

Commit frequently with meaningful commit messages.

Do not overwrite another developer’s code.

Do not independently modify shared database schemas or foundational project configuration.

Send the following contracts to the other developers as soon as they are stable:

* Tax calculation service interface.
* Discount calculation service interface.
* Combined pricing calculation interface.
* Payment recording API.
* Payment allocation service interface.
* Invoice payment-status update interface.
* Dashboard API response formats.
* Customer portal API routes.
* Required schema changes.
* Environment variables, if any.
* Test instructions.

Coordinate especially closely with Developer 2 on invoice calculation and payment status updates.

Do not wait until the end to discover incompatible interfaces.

⸻

19. Required Handover Documentation

Create:

docs/developer-3-handover.md

Include:

1. Modules implemented.
2. Tax configuration and calculation rules.
3. Discount validation and application rules.
4. Pricing calculation service interface.
5. Payment recording workflow.
6. Payment gateway or demo payment implementation details.
7. Payment allocation logic.
8. Reconciliation behavior.
9. Invoice status integration.
10. Dashboard metric definitions.
11. Customer portal routes and ownership rules.
12. Database models used.
13. Any schema changes requested from Developer 1.
14. Integration requirements for Developer 2.
15. Frontend pages implemented.
16. Test commands and test results.
17. Known issues or incomplete features.
18. Instructions to run and test the modules.

⸻

20. Definition of Done

Your work is complete when:

* Taxes can be configured and assigned to products.
* Inclusive and exclusive tax calculations work.
* Discounts can be created and validated.
* Fixed and percentage discounts work.
* Eligibility and redemption limits are enforced.
* Developer 2 can use your calculation services.
* Payments can be recorded through the agreed workflow.
* Payment records are protected against duplicate submissions.
* Payments can be allocated to invoices.
* Partial payments work.
* Invoice outstanding balances update correctly.
* Invoice payment statuses update through the agreed interface.
* ADMIN/STAFF can reconcile payments.
* Dashboard metrics use real database data.
* Revenue metrics distinguish invoiced and collected revenue.
* Customers can access their own portal.
* Customers can view their own subscriptions, quotations, invoices, and payments.
* Customer ownership checks work on the backend.
* Frontend pages are connected to real APIs.
* Core tests pass.
* Full demonstration workflow works.
* Handover documentation is complete.

⸻

21. Final Instructions

Before writing code, inspect the repository. Never assume the project is empty.

Do not create a second Prisma schema, database, authentication system, or invoice generator.

Do not hardcode tax rates or discount values throughout the application.

Do not use floating-point arithmetic for money.

Do not implement real payment gateway integration without an agreed provider and credentials.

Do not let customers access other customers’ records.

Do not leave the financial workflow as mock data or placeholder buttons.

Make reasonable implementation decisions independently, but communicate shared schema and service requirements early.

Your main objective is to deliver a working tax, discount, payment, reconciliation, reporting, and customer portal implementation that integrates cleanly with Developers 1 and 2.

At the end, provide a concise completion report covering:

* What works.
* What remains incomplete.
* Files and modules created.
* APIs implemented.
* Calculation services exposed.
* Payment workflow implemented.
* Tests executed and results.
* Required actions from Developer 1.
* Required actions from Developer 2.
* Exact commands needed to run and test your implementation.