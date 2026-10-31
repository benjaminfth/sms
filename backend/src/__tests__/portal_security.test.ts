import request from "supertest";
import app from "../app";
import { prisma } from "../database/prisma";
import { InvoiceStatus, PaymentMethod } from "@sms/shared";

describe("Developer 3 — Customer Portal & Ownership Security", () => {
  let customerAccessToken: string;
  let customerId: string;
  let otherCustomerId: string;
  let portalInvoiceId: string;

  beforeAll(async () => {
    // 1. Login as standard demo customer
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "customer@brightloop.demo",
      password: "Brightloop!2026",
    });

    customerAccessToken = loginRes.body.data.accessToken;

    const user = await prisma.user.findUnique({
      where: { email: "customer@brightloop.demo" },
      include: { customer: true },
    });
    customerId = user!.customer!.id;

    // 2. Create another customer to test isolation
    const otherCust = await prisma.customer.create({
      data: {
        email: "other@brightloop.demo",
        fullName: "Another Company Ltd",
        companyName: "Another Company Ltd",
      },
    });
    otherCustomerId = otherCust.id;

    // 3. Create invoice for our customer
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `PORTAL-INV-${Date.now().toString().slice(-6)}`,
        customerId,
        status: InvoiceStatus.ISSUED,
        totalAmountMinor: 150000n, // ₹1,500
        subtotalMinor: 150000n,
        amountPaidMinor: 0n,
        balanceDueMinor: 150000n,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    portalInvoiceId = invoice.id;
  });

  afterAll(async () => {
    await prisma.paymentAllocation.deleteMany({
      where: { invoiceId: portalInvoiceId },
    });
    await prisma.invoice.deleteMany({
      where: { id: portalInvoiceId },
    });
    await prisma.customer.deleteMany({
      where: { id: otherCustomerId },
    });
  });

  it("allows CUSTOMER to view their own portal overview", async () => {
    const res = await request(app)
      .get("/api/v1/portal/overview")
      .set("Authorization", `Bearer ${customerAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.customer.id).toBe(customerId);
    expect(res.body.data.totalOutstandingBalanceMinor).toBeDefined();
  });

  it("allows CUSTOMER to view their own invoice details", async () => {
    const res = await request(app)
      .get(`/api/v1/portal/invoices/${portalInvoiceId}`)
      .set("Authorization", `Bearer ${customerAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(portalInvoiceId);
    expect(res.body.data.customerId).toBe(customerId);
  });

  it("STRICT SECURITY: Customer CANNOT access invoices belonging to another customer", async () => {
    // Create invoice for other customer
    const otherInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `FOREIGN-INV-${Date.now().toString().slice(-6)}`,
        customerId: otherCustomerId,
        status: InvoiceStatus.ISSUED,
        totalAmountMinor: 200000n,
        balanceDueMinor: 200000n,
        dueDate: new Date(),
      },
    });

    const res = await request(app)
      .get(`/api/v1/portal/invoices/${otherInvoice.id}`)
      .set("Authorization", `Bearer ${customerAccessToken}`);

    // Must be 404 Not Found (or 403 Forbidden) so customer doesn't even know it exists
    expect([403, 404]).toContain(res.status);

    await prisma.invoice.delete({ where: { id: otherInvoice.id } });
  });

  it("allows customer to initiate a demo payment for their invoice and auto-settles invoice", async () => {
    const payRes = await request(app)
      .post(`/api/v1/portal/invoices/${portalInvoiceId}/pay`)
      .set("Authorization", `Bearer ${customerAccessToken}`)
      .send({
        paymentMethod: PaymentMethod.UPI,
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.payment).toBeDefined();
    expect(payRes.body.data.updatedInvoice.status).toBe(InvoiceStatus.PAID);
    expect(payRes.body.data.updatedInvoice.balanceDueMinor).toBe("0");
  });
});
