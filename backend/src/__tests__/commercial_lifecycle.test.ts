import request from "supertest";
import app from "../app";
import { prisma } from "../database/prisma";
import { generateAccessToken } from "../utils/token";
import { QuotationStatus, SubscriptionStatus, InvoiceStatus, BillingInterval, Role } from "@sms/shared";

describe("Developer 2 — Commercial Lifecycle Integration Tests", () => {
  let adminToken: string;
  let staffToken: string;
  let customerToken: string;
  let customerId: string;
  let secondCustomerToken: string;

  let testProductId: string;
  let testVariantId: string;

  beforeAll(async () => {
    // 1. Fetch seed users and generate tokens
    const adminUser = await prisma.user.findUnique({ where: { email: "admin@brightloop.demo" } });
    adminToken = generateAccessToken({
      userId: adminUser!.id,
      email: adminUser!.email,
      role: adminUser!.role as unknown as Role,
    });

    const staffUser = await prisma.user.findUnique({ where: { email: "staff@brightloop.demo" } });
    staffToken = generateAccessToken({
      userId: staffUser!.id,
      email: staffUser!.email,
      role: staffUser!.role as unknown as Role,
    });

    const customerUser = await prisma.user.findUnique({
      where: { email: "customer@brightloop.demo" },
      include: { customer: true },
    });
    customerId = customerUser!.customer!.id;
    customerToken = generateAccessToken({
      userId: customerUser!.id,
      email: customerUser!.email,
      role: customerUser!.role as unknown as Role,
    });

    // Create a second customer for customer ownership boundary tests
    const secondUser = await prisma.user.upsert({
      where: { email: "customer2@brightloop.demo" },
      update: {},
      create: {
        email: "customer2@brightloop.demo",
        passwordHash: "hash",
        fullName: "Second Customer",
        role: "CUSTOMER",
      },
    });
    await prisma.customer.upsert({
      where: { userId: secondUser.id },
      update: {},
      create: {
        userId: secondUser.id,
        email: secondUser.email,
        fullName: secondUser.fullName,
        currency: "INR",
      },
    });
    secondCustomerToken = generateAccessToken({
      userId: secondUser.id,
      email: secondUser.email,
      role: secondUser.role as unknown as Role,
    });

    // 2. Fetch seed catalog product, variant, plan
    const product = await prisma.product.findUnique({
      where: { sku: "BL-PRO-001" },
      include: { variants: true },
    });
    testProductId = product!.id;
    testVariantId = product!.variants[0]!.id;
  });

  describe("Quotation Lifecycle", () => {
    let quotationId: string;

    it("should allow ADMIN to create a quotation in DRAFT status with atomic sequence number", async () => {
      const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post("/api/v1/quotations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          validUntil,
          notes: "Initial Commercial Proposal",
          items: [
            {
              productId: testProductId,
              productVariantId: testVariantId,
              quantity: "2.000",
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quotationNumber).toMatch(/^QUO-\d{4}-\d{4}$/);
      expect(res.body.data.status).toBe(QuotationStatus.DRAFT);
      expect(res.body.data.customerId).toBe(customerId);
      expect(res.body.data.items).toHaveLength(1);
      // Base (200000) + Surcharge (56000) = 256000 * 2 = 512000 paise
      expect(res.body.data.totalAmountMinor).toBe("512000");

      quotationId = res.body.data.id;
    });

    it("should prevent CUSTOMER from creating quotations directly", async () => {
      const res = await request(app)
        .post("/api/v1/quotations")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          customerId,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          items: [{ productId: testProductId, quantity: "1.000" }],
        });

      expect(res.status).toBe(403);
    });

    it("should allow Customer A to view their own quotation", async () => {
      const res = await request(app)
        .get(`/api/v1/quotations/${quotationId}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(quotationId);
    });

    it("should reject Customer B from accessing Customer A's quotation", async () => {
      const res = await request(app)
        .get(`/api/v1/quotations/${quotationId}`)
        .set("Authorization", `Bearer ${secondCustomerToken}`);

      expect(res.status).toBe(403);
    });

    it("should transition quotation from DRAFT to SENT", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${quotationId}/send`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(QuotationStatus.SENT);
    });

    it("should reject converting a SENT quotation before it is ACCEPTED", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${quotationId}/convert`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.error.message).toContain("Only ACCEPTED quotations can be converted");
    });

    it("should allow CUSTOMER to ACCEPT their sent quotation", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${quotationId}/accept`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(QuotationStatus.ACCEPTED);
    });

    it("should convert an ACCEPTED quotation into an ACTIVE Subscription", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${quotationId}/convert`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          billingInterval: BillingInterval.MONTHLY,
          intervalCount: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscriptionNumber).toMatch(/^SUB-\d{4}-\d{4}$/);
      expect(res.body.data.status).toBe(SubscriptionStatus.ACTIVE);
      expect(res.body.data.quotationId).toBe(quotationId);
      expect(res.body.data.items).toHaveLength(1);
      expect(parseFloat(res.body.data.items[0].quantity)).toBe(2);
    });

    it("should reject duplicate conversion of an already converted quotation", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${quotationId}/convert`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain("already been converted");
    });
  });

  describe("Subscription Lifecycle & Billing Engine", () => {
    let subscriptionId: string;

    beforeAll(async () => {
      // Create an active subscription with nextBillingDate in the past to simulate due billing
      const pastStart = new Date("2026-09-01T00:00:00.000Z");
      const pastEnd = new Date("2026-10-01T00:00:00.000Z");

      const sub = await prisma.subscription.create({
        data: {
          subscriptionNumber: "SUB-TEST-RECURRING",
          customerId,
          status: SubscriptionStatus.ACTIVE,
          billingInterval: BillingInterval.MONTHLY,
          intervalCount: 1,
          currency: "INR",
          currentPeriodStart: pastStart,
          currentPeriodEnd: pastEnd,
          nextBillingDate: pastEnd,
          items: {
            create: [
              {
                productId: testProductId,
                productVariantId: testVariantId,
                quantity: "1.000",
                unitPriceMinor: BigInt(256000), // ₹2,560
              },
            ],
          },
        },
      });

      subscriptionId = sub.id;
    });

    afterAll(async () => {
      await prisma.billingAttempt.deleteMany({ where: { subscriptionId } });
      await prisma.invoiceItem.deleteMany({ where: { invoice: { subscriptionId } } });
      await prisma.invoice.deleteMany({ where: { subscriptionId } });
      await prisma.subscriptionItem.deleteMany({ where: { subscriptionId } });
      await prisma.subscription.deleteMany({ where: { id: subscriptionId } });
    });

    it("should allow ADMIN to trigger billing engine and generate an invoice for due subscription", async () => {
      const res = await request(app)
        .post("/api/v1/billing/run")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          targetDate: new Date("2026-10-15T00:00:00.000Z").toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.successfulInvoicesCount).toBeGreaterThanOrEqual(1);

      // Verify the subscription's next billing date was advanced to 2026-11-01
      const updatedSub = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });
      expect(updatedSub!.currentPeriodStart.toISOString()).toBe("2026-10-01T00:00:00.000Z");
      expect(updatedSub!.currentPeriodEnd.toISOString()).toBe("2026-11-01T00:00:00.000Z");
      expect(updatedSub!.nextBillingDate.toISOString()).toBe("2026-11-01T00:00:00.000Z");

      // Verify invoice was created with correct tax and totals
      const invoice = await prisma.invoice.findFirst({
        where: { subscriptionId },
        include: { items: true },
      });
      expect(invoice).toBeDefined();
      expect(invoice!.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(invoice!.status).toBe(InvoiceStatus.ISSUED);
      // Base ₹2,560 (256000 paise) + 18% GST (46080 paise) = 302080 paise
      expect(invoice!.subtotalMinor.toString()).toBe("256000");
      expect(invoice!.taxAmountMinor.toString()).toBe("46080");
      expect(invoice!.totalAmountMinor.toString()).toBe("302080");
      expect(invoice!.balanceDueMinor.toString()).toBe("302080");
    });

    it("should be IDEMPOTENT: running billing again for the same period must not duplicate invoices", async () => {
      // Set the subscription back to the same due date to test idempotency
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          currentPeriodStart: new Date("2026-09-01T00:00:00.000Z"),
          currentPeriodEnd: new Date("2026-10-01T00:00:00.000Z"),
          nextBillingDate: new Date("2026-10-01T00:00:00.000Z"),
        },
      });

      const initialInvoiceCount = await prisma.invoice.count({
        where: { subscriptionId },
      });

      const res = await request(app)
        .post("/api/v1/billing/run")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          targetDate: new Date("2026-10-15T00:00:00.000Z").toISOString(),
        });

      expect(res.status).toBe(200);

      const afterInvoiceCount = await prisma.invoice.count({
        where: { subscriptionId },
      });
      // No duplicate invoice created!
      expect(afterInvoiceCount).toBe(initialInvoiceCount);
    });

    it("should pause subscription and verify paused subscriptions are skipped during billing", async () => {
      // 1. Pause subscription
      const pauseRes = await request(app)
        .post(`/api/v1/subscriptions/${subscriptionId}/pause`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(pauseRes.status).toBe(200);
      expect(pauseRes.body.data.status).toBe(SubscriptionStatus.PAUSED);

      // 2. Set next billing date to past
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          nextBillingDate: new Date("2026-08-01T00:00:00.000Z"),
        },
      });

      const countBefore = await prisma.invoice.count({ where: { subscriptionId } });

      // 3. Run billing
      await request(app)
        .post("/api/v1/billing/run")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ targetDate: new Date().toISOString() });

      const countAfter = await prisma.invoice.count({ where: { subscriptionId } });
      expect(countAfter).toBe(countBefore); // Skipped completely
    });

    it("should resume paused subscription", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${subscriptionId}/resume`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it("should cancel subscription and reject silent reactivation", async () => {
      const cancelRes = await request(app)
        .post(`/api/v1/subscriptions/${subscriptionId}/cancel`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ reason: "Switching to annual contract" });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe(SubscriptionStatus.CANCELLED);

      // Try reactivating cancelled subscription
      const reactivateRes = await request(app)
        .post(`/api/v1/subscriptions/${subscriptionId}/activate`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(reactivateRes.status).toBe(422);
      expect(reactivateRes.body.error.message).toContain("Cannot reactivate a cancelled subscription");
    });
  });

  describe("Invoice Management & Void Workflow", () => {
    let invoiceId: string;

    beforeAll(async () => {
      const inv = await prisma.invoice.create({
        data: {
          invoiceNumber: "INV-TEST-VOID-001",
          customerId,
          status: InvoiceStatus.ISSUED,
          subtotalMinor: BigInt(200000),
          taxAmountMinor: BigInt(36000),
          totalAmountMinor: BigInt(236000),
          balanceDueMinor: BigInt(236000),
          amountPaidMinor: BigInt(0),
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          items: {
            create: [
              {
                description: "Test Software License",
                quantity: "1.000",
                unitPriceMinor: BigInt(200000),
                taxAmountMinor: BigInt(36000),
                totalAmountMinor: BigInt(236000),
              },
            ],
          },
        },
      });
      invoiceId = inv.id;
    });

    afterAll(async () => {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId } });
      await prisma.invoice.deleteMany({ where: { id: invoiceId } });
    });

    it("should allow STAFF to void an unpaid invoice", async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/void`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ reason: "Issued in error" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(InvoiceStatus.VOID);
    });

    it("should prevent voiding an invoice that has payments allocated", async () => {
      const paidInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber: "INV-TEST-PAID-001",
          customerId,
          status: InvoiceStatus.PAID,
          subtotalMinor: BigInt(100000),
          totalAmountMinor: BigInt(118000),
          amountPaidMinor: BigInt(118000),
          balanceDueMinor: BigInt(0),
          dueDate: new Date(),
        },
      });

      const res = await request(app)
        .post(`/api/v1/invoices/${paidInvoice.id}/void`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(422);
      expect(res.body.error.message).toContain("Cannot void an already paid invoice");

      await prisma.invoice.delete({ where: { id: paidInvoice.id } });
    });
  });
});
