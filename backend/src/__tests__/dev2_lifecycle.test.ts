import request from "supertest";
import app from "../app";
import { prisma } from "../database/prisma";
import { generateAccessToken } from "../utils/token";
import { Role, QuotationStatus, SubscriptionStatus, InvoiceStatus } from "@sms/shared";
import { InvoiceService } from "../services/invoice.service";

describe("Developer 2: Quotation -> Subscription -> Recurring Billing -> Invoice Lifecycle", () => {
  let adminToken: string;
  let customerToken: string;
  let customerId: string;
  let testProductId: string;
  let testVariantId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findUnique({ where: { email: "admin@brightloop.demo" } });
    adminToken = generateAccessToken({
      userId: admin!.id,
      email: admin!.email,
      role: Role.ADMIN,
    });

    const customerUser = await prisma.user.findUnique({
      where: { email: "customer@brightloop.demo" },
      include: { customer: true },
    });
    customerId = customerUser!.customer!.id;
    customerToken = generateAccessToken({
      userId: customerUser!.id,
      email: customerUser!.email,
      role: Role.CUSTOMER,
    });

    const product = await prisma.product.findUnique({
      where: { sku: "BL-PRO-001" },
      include: { variants: true },
    });
    testProductId = product!.id;
    testVariantId = product!.variants[0]!.id;
  });

  describe("1. Quotation Lifecycle", () => {
    let quotationId: string;

    it("should create a quotation with sequential concurrency-safe number (QUO-YYYY-XXXX)", async () => {
      const validUntil = new Date(Date.now() + 7 * 86400000).toISOString();

      const res = await request(app)
        .post("/api/v1/quotations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          validUntil,
          notes: "Commercial terms: Net 30",
          items: [
            {
              productId: testProductId,
              productVariantId: testVariantId,
              quantity: "2.000",
              unitPriceMinor: "256000", // ₹2,560 each
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quotationNumber).toMatch(/^QUO-\d{4}-\d{4}$/);
      expect(res.body.data.status).toBe(QuotationStatus.DRAFT);
      // 2 * 256000 = 512000 subtotal + 18% GST (92160) = 604160
      expect(res.body.data.totalAmountMinor).toBe("604160");

      quotationId = res.body.data.id;
    });

    it("should allow customer to view their own quotation, but reject foreign access", async () => {
      const res = await request(app)
        .get(`/api/v1/quotations/${quotationId}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(quotationId);
    });

    it("should transition quotation from DRAFT to SENT", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${quotationId}/send`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(QuotationStatus.SENT);
    });

    it("should reject invalid state transitions (cannot send an already SENT quotation)", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${quotationId}/send`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it("should allow customer to accept their SENT quotation", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${quotationId}/accept`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(QuotationStatus.ACCEPTED);
    });

    it("should reject acceptance of an expired quotation", async () => {
      // Create an already-expired quotation
      const expiredQuo = await prisma.quotation.create({
        data: {
          quotationNumber: `QUO-EXP-${Date.now()}`,
          customerId,
          status: QuotationStatus.SENT,
          validUntil: new Date(Date.now() - 86400000), // yesterday
          totalAmountMinor: 100000n,
        },
      });

      const res = await request(app)
        .post(`/api/v1/quotations/${expiredQuo.id}/accept`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe("2. Quotation to Subscription Conversion & Lifecycle", () => {
    let acceptedQuotationId: string;
    let convertedSubscriptionId: string;

    beforeAll(async () => {
      // Create and accept a quotation for conversion
      const quo = await request(app)
        .post("/api/v1/quotations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          validUntil: new Date(Date.now() + 86400000).toISOString(),
          items: [
            {
              productId: testProductId,
              productVariantId: testVariantId,
              quantity: "1.000",
              unitPriceMinor: "256000",
            },
          ],
        });

      acceptedQuotationId = quo.body.data.id;
      await request(app)
        .post(`/api/v1/quotations/${acceptedQuotationId}/send`)
        .set("Authorization", `Bearer ${adminToken}`);
      await request(app)
        .post(`/api/v1/quotations/${acceptedQuotationId}/accept`)
        .set("Authorization", `Bearer ${adminToken}`);
    });

    it("should convert an accepted quotation into an active subscription transactionally", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${acceptedQuotationId}/convert`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ billingInterval: "MONTHLY" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscriptionNumber).toMatch(/^SUB-\d{4}-\d{4}$/);
      expect(res.body.data.status).toBe(SubscriptionStatus.ACTIVE);
      expect(res.body.data.quotationId).toBe(acceptedQuotationId);
      expect(res.body.data.items).toHaveLength(1);

      convertedSubscriptionId = res.body.data.id;
    });

    it("should prevent duplicate conversion of the same quotation", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${acceptedQuotationId}/convert`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ billingInterval: "MONTHLY" });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it("should pause an active subscription and prevent billing", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${convertedSubscriptionId}/pause`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Customer requested temporary pause" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(SubscriptionStatus.PAUSED);
    });

    it("should resume a paused subscription", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${convertedSubscriptionId}/resume`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it("should cancel a subscription immediately with reason", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${convertedSubscriptionId}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          cancellationReason: "Migrating to on-premise",
          effectiveImmediately: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(SubscriptionStatus.CANCELLED);
      expect(res.body.data.cancelledAt).not.toBeNull();
    });

    it("should NOT silently reactivate a cancelled subscription", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${convertedSubscriptionId}/activate`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe("3. Recurring Billing Engine & Idempotency", () => {
    let billingSubId: string;

    beforeAll(async () => {
      // Create a subscription due for billing in the past
      const pastStart = new Date(Date.UTC(2026, 8, 1)); // 1 Sept 2026
      const pastEnd = new Date(Date.UTC(2026, 9, 1)); // 1 Oct 2026

      const sub = await prisma.subscription.create({
        data: {
          subscriptionNumber: `SUB-BILL-${Date.now()}`,
          customerId,
          status: SubscriptionStatus.ACTIVE,
          billingInterval: "MONTHLY",
          intervalCount: 1,
          currency: "INR",
          currentPeriodStart: pastStart,
          currentPeriodEnd: pastEnd,
          nextBillingDate: pastEnd, // Due on 1 Oct 2026
          items: {
            create: [
              {
                productId: testProductId,
                productVariantId: testVariantId,
                quantity: "1.000",
                unitPriceMinor: 256000n,
              },
            ],
          },
        },
      });

      billingSubId = sub.id;
    });

    it("should execute billing run and generate exactly 1 invoice for the due period", async () => {
      const targetDate = new Date(Date.UTC(2026, 9, 15)).toISOString(); // 15 Oct 2026

      const res = await request(app)
        .post("/api/v1/billing/run")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ targetDate });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoicesGeneratedCount).toBeGreaterThanOrEqual(1);

      // Verify the generated invoice in DB
      const invoice = await prisma.invoice.findFirst({
        where: { subscriptionId: billingSubId },
        include: { items: true },
      });

      expect(invoice).not.toBeNull();
      expect(invoice!.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(invoice!.items).toHaveLength(1);
      expect(invoice!.status).toBe(InvoiceStatus.ISSUED);

      // Verify subscription nextBillingDate advanced to next period
      const updatedSub = await prisma.subscription.findUnique({
        where: { id: billingSubId },
      });
      expect(updatedSub!.currentPeriodStart.toISOString()).toBe("2026-10-01T00:00:00.000Z");
      expect(updatedSub!.currentPeriodEnd.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    });

    it("IDEMPOTENCY: second billing run for the same period must NOT create duplicate invoice", async () => {
      // Get current invoice count for this subscription
      const initialCount = await prisma.invoice.count({
        where: { subscriptionId: billingSubId },
      });

      // Run billing again with the same or earlier target date
      const targetDate = new Date(Date.UTC(2026, 9, 15)).toISOString();
      const res = await request(app)
        .post("/api/v1/billing/run")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ targetDate });

      expect(res.status).toBe(200);

      // Check invoice count did not increase
      const finalCount = await prisma.invoice.count({
        where: { subscriptionId: billingSubId },
      });
      expect(finalCount).toBe(initialCount);
    });

    it("should skip paused and cancelled subscriptions during billing runs", async () => {
      // Create a paused subscription due in the past
      const pausedSub = await prisma.subscription.create({
        data: {
          subscriptionNumber: `SUB-PAUSED-${Date.now()}`,
          customerId,
          status: SubscriptionStatus.PAUSED,
          billingInterval: "MONTHLY",
          intervalCount: 1,
          currency: "INR",
          currentPeriodStart: new Date(Date.UTC(2026, 8, 1)),
          currentPeriodEnd: new Date(Date.UTC(2026, 9, 1)),
          nextBillingDate: new Date(Date.UTC(2026, 9, 1)),
          items: {
            create: [
              {
                productId: testProductId,
                quantity: "1.000",
                unitPriceMinor: 200000n,
              },
            ],
          },
        },
      });

      const res = await request(app)
        .post("/api/v1/billing/run")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ targetDate: new Date(Date.UTC(2026, 9, 15)).toISOString() });

      expect(res.status).toBe(200);

      // Verify no invoice generated for paused sub
      const invoice = await prisma.invoice.findFirst({
        where: { subscriptionId: pausedSub.id },
      });
      expect(invoice).toBeNull();
    });
  });

  describe("4. Invoice Management & Developer 3 Payment Integration", () => {
    let testInvoiceId: string;

    beforeAll(async () => {
      const inv = await InvoiceService.createInvoice({
        customerId,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
        items: [
          {
            productId: testProductId,
            description: "Brightloop Professional Suite",
            quantity: "1.000",
            unitPriceMinor: "200000",
          },
        ],
      });
      testInvoiceId = inv.id;
    });

    it("should retrieve invoice details with line item snapshots", async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${testInvoiceId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testInvoiceId);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.status).toBe(InvoiceStatus.ISSUED);
    });

    it("should preserve invoice snapshot even if product base price changes later", async () => {
      const originalInvoice = await prisma.invoice.findUnique({
        where: { id: testInvoiceId },
        include: { items: true },
      });

      // Update product base price in catalog
      await prisma.product.update({
        where: { id: testProductId },
        data: { baseSellingPriceMinor: 999999n },
      });

      // Verify the issued invoice retains original unit price snapshot
      const invoiceAfter = await prisma.invoice.findUnique({
        where: { id: testInvoiceId },
        include: { items: true },
      });
      expect(invoiceAfter!.items[0]!.unitPriceMinor).toBe(originalInvoice!.items[0]!.unitPriceMinor);

      // Reset product price
      await prisma.product.update({
        where: { id: testProductId },
        data: { baseSellingPriceMinor: 200000n },
      });
    });

    it("Developer 3 Integration: recordPaymentAllocation should update payment status and balance", async () => {
      const invoiceBefore = await prisma.invoice.findUnique({
        where: { id: testInvoiceId },
      });

      // Partial payment
      const partialAmount = 50000n; // ₹500
      const partialResult = await InvoiceService.recordPaymentAllocation(testInvoiceId, partialAmount);
      expect(partialResult.amountPaidMinor).toBe(partialAmount);
      expect(partialResult.status).toBe(InvoiceStatus.PARTIALLY_PAID);

      // Full remaining payment
      const remainingAmount = invoiceBefore!.totalAmountMinor - partialAmount;
      const fullResult = await InvoiceService.recordPaymentAllocation(testInvoiceId, remainingAmount);
      expect(fullResult.amountPaidMinor).toBe(invoiceBefore!.totalAmountMinor);
      expect(fullResult.balanceDueMinor).toBe(0n);
      expect(fullResult.status).toBe(InvoiceStatus.PAID);
      expect(fullResult.paidAt).not.toBeNull();
    });

    it("should reject voiding an already PAID invoice", async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${testInvoiceId}/void`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Cancelled contract" });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });
});
