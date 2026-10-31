import { prisma } from "../database/prisma";
import { PaymentService } from "../services/payment.service";
import { AllocationService } from "../services/allocation.service";
import { ReconciliationService } from "../services/reconciliation.service";
import { PaymentMethod, PaymentStatus, InvoiceStatus } from "@sms/shared";

describe("Developer 3 — Payment Management & Allocation Engine", () => {
  let testCustomerId: string;
  let testInvoiceId: string;

  beforeAll(async () => {
    // 1. Fetch or create test customer
    const customer = await prisma.customer.findFirst({
      where: { isActive: true },
    });
    testCustomerId = customer!.id;

    // 3. Create test invoice for settlement testing (Total: 500000 paise = ₹5,000)
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `TEST-INV-${Date.now().toString().slice(-6)}`,
        customerId: testCustomerId,
        status: InvoiceStatus.ISSUED,
        currency: "INR",
        subtotalMinor: 500000n,
        totalAmountMinor: 500000n,
        amountPaidMinor: 0n,
        balanceDueMinor: 500000n,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    testInvoiceId = invoice.id;
  });

  afterAll(async () => {
    // Clean up test invoice and allocations
    await prisma.paymentAllocation.deleteMany({
      where: { invoiceId: testInvoiceId },
    });
    await prisma.invoice.deleteMany({
      where: { id: testInvoiceId },
    });
  });

  describe("Payment Recording & Idempotency", () => {
    it("records a successful manual payment with auto-generated reference", async () => {
      const payment = await PaymentService.recordPayment({
        customerId: testCustomerId,
        amountMinor: 200000n, // ₹2,000
        paymentMethod: PaymentMethod.UPI,
        status: PaymentStatus.COMPLETED,
        notes: "Test UPI Payment",
      });

      expect(payment).toBeDefined();
      expect(payment!.paymentReference).toMatch(/^PAY-/);
      expect(payment!.amountMinor).toBe(200000n);
      expect(payment!.status).toBe(PaymentStatus.COMPLETED);
    });

    it("prevents duplicate transaction references", async () => {
      const uniqueRef = `DUP-TEST-${Date.now().toString().slice(-6)}`;

      await PaymentService.recordPayment({
        customerId: testCustomerId,
        amountMinor: 100000n,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentReference: uniqueRef,
      });

      await expect(
        PaymentService.recordPayment({
          customerId: testCustomerId,
          amountMinor: 100000n,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paymentReference: uniqueRef,
        })
      ).rejects.toThrow(/already exists/i);
    });
  });

  describe("Payment Allocation & Invoice Status Lifecycle", () => {
    it("applies a partial payment and transitions invoice to PARTIALLY_PAID", async () => {
      // Create payment of 200000 paise (₹2,000) against ₹5,000 invoice
      const payment = await PaymentService.recordPayment({
        customerId: testCustomerId,
        amountMinor: 200000n,
        paymentMethod: PaymentMethod.CARD,
        status: PaymentStatus.COMPLETED,
        invoiceId: testInvoiceId,
      });

      expect(payment).toBeDefined();

      // Check invoice state
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: testInvoiceId },
      });

      expect(updatedInvoice!.status).toBe(InvoiceStatus.PARTIALLY_PAID);
      expect(updatedInvoice!.amountPaidMinor).toBe(200000n);
      expect(updatedInvoice!.balanceDueMinor).toBe(300000n);
    });

    it("applies remaining balance payment and transitions invoice to PAID", async () => {
      // Settle remaining 300000 paise (₹3,000)
      const payment = await PaymentService.recordPayment({
        customerId: testCustomerId,
        amountMinor: 300000n,
        paymentMethod: PaymentMethod.UPI,
        status: PaymentStatus.COMPLETED,
        invoiceId: testInvoiceId,
      });

      expect(payment).toBeDefined();

      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: testInvoiceId },
      });

      expect(updatedInvoice!.status).toBe(InvoiceStatus.PAID);
      expect(updatedInvoice!.amountPaidMinor).toBe(500000n);
      expect(updatedInvoice!.balanceDueMinor).toBe(0n);
      expect(updatedInvoice!.paidAt).not.toBeNull();
    });

    it("prevents over-allocation beyond outstanding invoice balance", async () => {
      // Invoice is already fully paid (balanceDueMinor is 0)
      const extraPayment = await PaymentService.recordPayment({
        customerId: testCustomerId,
        amountMinor: 100000n,
        paymentMethod: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
      });

      await expect(
        AllocationService.allocatePayment(extraPayment!.id, [
          {
            invoiceId: testInvoiceId,
            allocatedAmountMinor: 100000n,
          },
        ])
      ).rejects.toThrow(/exceeds outstanding balance/i);
    });

    it("prevents allocation of FAILED payments", async () => {
      const failedPayment = await PaymentService.recordPayment({
        customerId: testCustomerId,
        amountMinor: 100000n,
        paymentMethod: PaymentMethod.CARD,
        status: PaymentStatus.FAILED,
      });

      await expect(
        AllocationService.allocatePayment(failedPayment!.id, [
          {
            invoiceId: testInvoiceId,
            allocatedAmountMinor: 50000n,
          },
        ])
      ).rejects.toThrow(/COMPLETED/i);
    });
  });

  describe("Reconciliation Reporting", () => {
    it("reports unmatched and partially allocated payments accurately", async () => {
      // Create an unallocated payment
      await PaymentService.recordPayment({
        customerId: testCustomerId,
        amountMinor: 99900n,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: PaymentStatus.COMPLETED,
        notes: "Unmatched test deposit",
      });

      const report = await ReconciliationService.getReconciliationReport({
        page: 1,
        pageSize: 50,
      });

      expect(report.records.length).toBeGreaterThan(0);
      const unmatched = report.records.find((r) => !r.isFullyAllocated);
      expect(unmatched).toBeDefined();
      expect(BigInt(unmatched!.unallocatedAmountMinor)).toBeGreaterThan(0n);
    });
  });
});
