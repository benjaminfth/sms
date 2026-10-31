import request from "supertest";
import app from "../app";
import { prisma } from "../database/prisma";
import { DiscountCalculationService } from "../services/discount-calculation.service";
import { PricingService } from "../services/pricing.service";
import { DiscountService } from "../services/discount.service";
import { PaymentService } from "../services/payment.service";
import { PortalService } from "../services/portal.service";
import { DiscountType, PaymentMethod, PaymentStatus, InvoiceStatus } from "@sms/shared";

describe("Developer 3 — Gap Closure Comprehensive Test Suite", () => {
  let adminToken: string;
  let staffToken: string;
  let customerToken: string;
  let customerId: string;

  let testProductAId: string;
  let testProductBId: string;

  beforeAll(async () => {
    // 1. Admin login
    const adminLogin = await request(app).post("/api/v1/auth/login").send({
      email: "admin@brightloop.demo",
      password: "Brightloop!2026",
    });
    adminToken = adminLogin.body.data.accessToken;

    // 2. Staff login
    const staffLogin = await request(app).post("/api/v1/auth/login").send({
      email: "staff@brightloop.demo",
      password: "Brightloop!2026",
    });
    staffToken = staffLogin.body.data.accessToken;

    // 3. Customer login
    const customerLogin = await request(app).post("/api/v1/auth/login").send({
      email: "customer@brightloop.demo",
      password: "Brightloop!2026",
    });
    customerToken = customerLogin.body.data.accessToken;

    const customerRecord = await prisma.customer.findFirst({
      where: { email: "customer@brightloop.demo" },
    });
    customerId = customerRecord!.id;

    // 4. Ensure test products
    const products = await prisma.product.findMany({ take: 2 });
    if (products.length >= 2) {
      testProductAId = products[0]!.id;
      testProductBId = products[1]!.id;
    } else {
      const p1 = await prisma.product.create({
        data: {
          name: "Test Seat License A",
          sku: `SKU-A-${Date.now()}`,
          baseSellingPriceMinor: 200000n, // ₹2,000
          costPriceMinor: 100000n,
          currency: "INR",
        },
      });
      const p2 = await prisma.product.create({
        data: {
          name: "Test Add-on B",
          sku: `SKU-B-${Date.now()}`,
          baseSellingPriceMinor: 100000n, // ₹1,000
          costPriceMinor: 50000n,
          currency: "INR",
        },
      });
      testProductAId = p1.id;
      testProductBId = p2.id;
    }
  });

  // ==========================================
  // 1. DISCOUNT PERMISSION TESTS
  // ==========================================
  describe("1. Discount Permission Enforcement (ADMIN vs STAFF vs CUSTOMER)", () => {
    const uniqueCode = `ADM_${Date.now().toString().slice(-4)}`;
    let createdDiscountId: string;

    it("ADMIN can successfully create a new discount rule", async () => {
      const res = await request(app)
        .post("/api/v1/discounts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: uniqueCode,
          name: "Admin Authorized Discount",
          discountType: DiscountType.PERCENTAGE,
          valueMinorOrBasisPoints: "1000", // 10%
          scope: "SUBSCRIPTION",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe(uniqueCode);
      createdDiscountId = res.body.data.id;
    });

    it("STAFF cannot create a discount rule (rejected with 403 Forbidden)", async () => {
      const res = await request(app)
        .post("/api/v1/discounts")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          code: `STF_${Date.now().toString().slice(-4)}`,
          name: "Staff Unauthorized Discount",
          discountType: DiscountType.PERCENTAGE,
          valueMinorOrBasisPoints: "1000",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("CUSTOMER cannot create a discount rule (rejected with 403 Forbidden)", async () => {
      const res = await request(app)
        .post("/api/v1/discounts")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          code: `CUS_${Date.now().toString().slice(-4)}`,
          name: "Customer Unauthorized Discount",
          discountType: DiscountType.PERCENTAGE,
          valueMinorOrBasisPoints: "1000",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("STAFF cannot edit an existing discount rule (rejected with 403 Forbidden)", async () => {
      const res = await request(app)
        .patch(`/api/v1/discounts/${createdDiscountId}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          name: "Staff Malicious Override",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("CUSTOMER cannot edit an existing discount rule (rejected with 403 Forbidden)", async () => {
      const res = await request(app)
        .patch(`/api/v1/discounts/${createdDiscountId}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          name: "Customer Malicious Override",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("STAFF cannot deactivate an existing discount (rejected with 403 Forbidden)", async () => {
      const res = await request(app)
        .post(`/api/v1/discounts/${createdDiscountId}/deactivate`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });

    it("ADMIN can successfully edit an existing discount rule", async () => {
      const res = await request(app)
        .patch(`/api/v1/discounts/${createdDiscountId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Admin Updated Discount Title",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Admin Updated Discount Title");
    });
  });

  // ==========================================
  // 2. MINIMUM QUANTITY DISCOUNT RULES
  // ==========================================
  describe("2. Minimum Quantity Discount Rules & Calculation", () => {
    const minQtyCode = `MINQTY_${Date.now().toString().slice(-4)}`;

    beforeAll(async () => {
      // Create discount: 10% off, requires minimum 10 units, product-specific to Product A
      await DiscountService.createDiscount({
        code: minQtyCode,
        name: "Min 10 Seats Product A Special",
        discountType: DiscountType.PERCENTAGE,
        valueMinorOrBasisPoints: "1000", // 10%
        scope: "PRODUCT",
        minQuantity: 10,
        productIds: [testProductAId],
      });
    });

    it("rejects discount when quantity is below minimum (e.g. 8 seats < 10 minimum)", async () => {
      const result = await DiscountCalculationService.validateAndCalculateDiscount(minQtyCode, {
        items: [
          {
            productId: testProductAId,
            quantity: 8,
            unitPriceMinor: 200000n,
          },
        ],
        subtotalMinor: 1600000n,
      });

      expect(result.valid).toBe(false);
      expect(result.amountDeductedMinor).toBe(0n);
      expect(result.reason).toContain("Minimum quantity of 10 eligible items required");
    });

    it("accepts discount when quantity meets minimum exactly (10 seats = 10 minimum)", async () => {
      const result = await DiscountCalculationService.validateAndCalculateDiscount(minQtyCode, {
        items: [
          {
            productId: testProductAId,
            quantity: 10,
            unitPriceMinor: 200000n,
          },
        ],
        subtotalMinor: 2000000n, // ₹20,000
      });

      expect(result.valid).toBe(true);
      // 10% of ₹20,000 = ₹2,000 = 200000 paise
      expect(result.amountDeductedMinor).toBe(200000n);
    });

    it("accepts discount when quantity is above minimum (15 seats > 10 minimum)", async () => {
      const result = await DiscountCalculationService.validateAndCalculateDiscount(minQtyCode, {
        items: [
          {
            productId: testProductAId,
            quantity: 15,
            unitPriceMinor: 200000n,
          },
        ],
        subtotalMinor: 3000000n, // ₹30,000
      });

      expect(result.valid).toBe(true);
      // 10% of ₹30,000 = ₹3,000 = 300000 paise
      expect(result.amountDeductedMinor).toBe(300000n);
    });

    it("ineligible product quantity does NOT satisfy another product's minimum quantity", async () => {
      // Customer buys 8 seats of eligible Product A and 5 units of ineligible Product B
      // Total items = 13, but only 8 are eligible for the discount!
      const result = await DiscountCalculationService.validateAndCalculateDiscount(minQtyCode, {
        items: [
          {
            productId: testProductAId,
            quantity: 8,
            unitPriceMinor: 200000n,
          },
          {
            productId: testProductBId,
            quantity: 5,
            unitPriceMinor: 100000n,
          },
        ],
        subtotalMinor: 2100000n,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Minimum quantity of 10 eligible items required");
      expect(result.amountDeductedMinor).toBe(0n);
    });
  });

  // ==========================================
  // 3. PRODUCT-SPECIFIC VS SUBSCRIPTION-WIDE SCOPE
  // ==========================================
  describe("3. Product-Specific vs Subscription-Wide Discount Eligibility", () => {
    it("Product-specific discount applies only to eligible items; ineligible items receive ₹0 discount", async () => {
      const prodCode = `PROD_${Date.now().toString().slice(-4)}`;
      await DiscountService.createDiscount({
        code: prodCode,
        name: "Product A 20% Discount",
        discountType: DiscountType.PERCENTAGE,
        valueMinorOrBasisPoints: "2000", // 20%
        scope: "PRODUCT",
        productIds: [testProductAId],
      });

      const pricing = await PricingService.calculatePricing({
        items: [
          {
            productId: testProductAId,
            quantity: 1,
            unitPriceMinor: 200000n, // ₹2,000
          },
          {
            productId: testProductBId,
            quantity: 1,
            unitPriceMinor: 100000n, // ₹1,000
          },
        ],
        discountCode: prodCode,
      });

      // Total subtotal: ₹3,000 (300000 paise)
      // Product A discount: 20% of ₹2,000 = ₹400 (40000 paise)
      // Product B discount: ₹0
      expect(pricing.discountTotalMinor).toBe("40000");

      const itemA = pricing.items.find((i) => i.productId === testProductAId);
      const itemB = pricing.items.find((i) => i.productId === testProductBId);

      expect(itemA?.discountMinor).toBe("40000");
      expect(itemB?.discountMinor).toBe("0");
    });

    it("Subscription-wide discount distributes across the entire eligible invoice", async () => {
      const subCode = `SUB_${Date.now().toString().slice(-4)}`;
      await DiscountService.createDiscount({
        code: subCode,
        name: "Subscription 10% Off",
        discountType: DiscountType.PERCENTAGE,
        valueMinorOrBasisPoints: "1000", // 10%
        scope: "SUBSCRIPTION",
      });

      const pricing = await PricingService.calculatePricing({
        items: [
          {
            productId: testProductAId,
            quantity: 1,
            unitPriceMinor: 200000n, // ₹2,000
          },
          {
            productId: testProductBId,
            quantity: 1,
            unitPriceMinor: 100000n, // ₹1,000
          },
        ],
        discountCode: subCode,
      });

      // 10% of ₹3,000 = ₹300 (30000 paise)
      expect(pricing.discountTotalMinor).toBe("30000");
      // Taxable subtotal = ₹2,700
      expect(pricing.taxableAmountMinor).toBe("270000");
    });

    it("Clamping prevents negative invoice payable amounts", async () => {
      const hugeDiscountCode = `HUGE_${Date.now().toString().slice(-4)}`;
      await DiscountService.createDiscount({
        code: hugeDiscountCode,
        name: "Mega Fixed ₹10,000 Off",
        discountType: DiscountType.FIXED_AMOUNT,
        valueMinorOrBasisPoints: "1000000", // ₹10,000
        scope: "SUBSCRIPTION",
      });

      const pricing = await PricingService.calculatePricing({
        items: [
          {
            productId: testProductAId,
            quantity: 1,
            unitPriceMinor: 200000n, // ₹2,000 invoice subtotal
          },
        ],
        discountCode: hugeDiscountCode,
      });

      // Discount cannot exceed the subtotal ₹2,000; payable cannot be negative
      expect(pricing.discountTotalMinor).toBe("200000");
      expect(pricing.taxableAmountMinor).toBe("0");
      expect(BigInt(pricing.grandTotalMinor)).toBeGreaterThanOrEqual(0n);
    });
  });

  // ==========================================
  // 4. AUTOMATIC RECURRING DISCOUNT APPLICATION
  // ==========================================
  describe("4. Automatic Recurring Discount Application & Billing Cycles", () => {
    let testSubId: string;
    const recurringCode = `REC3_${Date.now().toString().slice(-4)}`;

    beforeAll(async () => {
      // Create subscription
      const plan = await prisma.plan.findFirst();
      const customer = await prisma.customer.findFirst();

      const sub = await prisma.subscription.create({
        data: {
          subscriptionNumber: `SUB-TEST-${Date.now()}`,
          customerId: customer!.id,
          planId: plan!.id,
          status: "ACTIVE",
          billingInterval: "MONTHLY",
          intervalCount: 1,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
          nextBillingDate: new Date(Date.now() + 30 * 86400000),
        },
      });
      testSubId = sub.id;

      // Create 10% recurring discount valid for 3 cycles
      await DiscountService.createDiscount({
        code: recurringCode,
        name: "10% Off First 3 Monthly Cycles",
        discountType: DiscountType.PERCENTAGE,
        valueMinorOrBasisPoints: "1000", // 10%
        scope: "SUBSCRIPTION",
        recurringCycleCount: 3,
      });

      // Attach discount to subscription
      await DiscountService.attachDiscountToSubscription({
        subscriptionId: testSubId,
        discountCode: recurringCode,
      });
    });

    it("Cycle 1: Auto-detects attached discount without manual code entry and applies ₹200 discount", async () => {
      // Simulate Cycle 1 billing
      const pricing = await PricingService.calculatePricing({
        items: [
          {
            productId: testProductAId,
            quantity: 1,
            unitPriceMinor: 200000n, // ₹2,000
          },
        ],
        subscriptionId: testSubId, // No discountCode provided!
      });

      // 10% of ₹2,000 = ₹200 (20000 paise)
      expect(pricing.discountTotalMinor).toBe("20000");
      expect(pricing.discountBreakdown[0]?.code).toBe(recurringCode);

      // Record Cycle 1 invoice and redemption
      const inv1 = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-CYC1-${Date.now()}`,
          customer: { connect: { id: customerId } },
          subscription: { connect: { id: testSubId } },
          subtotalMinor: 200000n,
          discountAmountMinor: 20000n,
          totalAmountMinor: 180000n,
          balanceDueMinor: 180000n,
          status: InvoiceStatus.ISSUED,
          dueDate: new Date(),
        },
      });

      await prisma.$transaction(async (tx) => {
        const disc = await tx.discount.findUnique({ where: { code: recurringCode } });
        await DiscountCalculationService.recordDiscountRedemption(tx, disc!.id, 20000n, {
          invoiceId: inv1.id,
          subscriptionId: testSubId,
        });
      });
    });

    it("Cycle 2: Automatically applies discount on the second recurring billing run", async () => {
      const pricing = await PricingService.calculatePricing({
        items: [
          {
            productId: testProductAId,
            quantity: 1,
            unitPriceMinor: 200000n,
          },
        ],
        subscriptionId: testSubId,
      });

      expect(pricing.discountTotalMinor).toBe("20000");

      const inv2 = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-CYC2-${Date.now()}`,
          customer: { connect: { id: customerId } },
          subscription: { connect: { id: testSubId } },
          subtotalMinor: 200000n,
          discountAmountMinor: 20000n,
          totalAmountMinor: 180000n,
          balanceDueMinor: 180000n,
          status: InvoiceStatus.ISSUED,
          dueDate: new Date(),
        },
      });

      await prisma.$transaction(async (tx) => {
        const disc = await tx.discount.findUnique({ where: { code: recurringCode } });
        await DiscountCalculationService.recordDiscountRedemption(tx, disc!.id, 20000n, {
          invoiceId: inv2.id,
          subscriptionId: testSubId,
        });
      });
    });

    it("Cycle 3: Automatically applies discount on the third recurring billing run", async () => {
      const pricing = await PricingService.calculatePricing({
        items: [
          {
            productId: testProductAId,
            quantity: 1,
            unitPriceMinor: 200000n,
          },
        ],
        subscriptionId: testSubId,
      });

      expect(pricing.discountTotalMinor).toBe("20000");

      const inv3 = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-CYC3-${Date.now()}`,
          customer: { connect: { id: customerId } },
          subscription: { connect: { id: testSubId } },
          subtotalMinor: 200000n,
          discountAmountMinor: 20000n,
          totalAmountMinor: 180000n,
          balanceDueMinor: 180000n,
          status: InvoiceStatus.ISSUED,
          dueDate: new Date(),
        },
      });

      await prisma.$transaction(async (tx) => {
        const disc = await tx.discount.findUnique({ where: { code: recurringCode } });
        await DiscountCalculationService.recordDiscountRedemption(tx, disc!.id, 20000n, {
          invoiceId: inv3.id,
          subscriptionId: testSubId,
        });
      });
    });

    it("Cycle 4: Automatically stops applying discount after configured 3 cycles (reverts to base ₹2,000)", async () => {
      const pricing = await PricingService.calculatePricing({
        items: [
          {
            productId: testProductAId,
            quantity: 1,
            unitPriceMinor: 200000n, // ₹2,000 base
          },
        ],
        subscriptionId: testSubId,
      });

      // Cycles 1, 2, and 3 exhausted the allowed duration -> Cycle 4 receives ₹0 discount
      expect(pricing.discountTotalMinor).toBe("0");
      expect(pricing.discountBreakdown.length).toBe(0);
      expect(pricing.taxableAmountMinor).toBe("200000"); // Base ₹2,000
    });
  });

  // ==========================================
  // 5. PAYMENT NOTES & CUSTOMER PORTAL PRIVACY
  // ==========================================
  describe("5. Payment Record Enhancements & Customer Note Privacy", () => {
    it("records both internal and customer notes, and strictly hides internal notes from portal", async () => {
      const paymentRes = await PaymentService.recordPayment({
        customerId,
        amountMinor: 50000n, // ₹500
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: PaymentStatus.COMPLETED,
        internalNotes: "CONFIDENTIAL: Checked against HDFC Bank Wire Statement Ref #TXN9992384.",
        customerNotes: "Payment received through HDFC bank transfer for October subscription.",
      });

      expect(paymentRes).toBeDefined();
      expect(paymentRes?.internalNotes).toContain("CONFIDENTIAL: Checked against HDFC");
      expect(paymentRes?.customerNotes).toBe(
        "Payment received through HDFC bank transfer for October subscription."
      );

      // Verify portal query for this customer
      const portalPayments = await PortalService.getPayments(customerId);
      const targetPayment = portalPayments.find((p) => p.id === paymentRes?.id);

      expect(targetPayment).toBeDefined();
      // Customer-visible note is visible
      expect(targetPayment?.notes).toBe(
        "Payment received through HDFC bank transfer for October subscription."
      );
      // Internal note must NEVER be exposed
      expect((targetPayment as any).internalNotes).toBeUndefined();
      expect(
        JSON.stringify(targetPayment, (_, v) => (typeof v === "bigint" ? v.toString() : v))
      ).not.toContain("CONFIDENTIAL: Checked against HDFC");
    });

    it("prevents customer role from submitting arbitrary COMPLETED payment status", async () => {
      const res = await request(app)
        .post("/api/v1/payments")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          customerId,
          amountMinor: "20000",
          paymentMethod: PaymentMethod.UPI,
          status: PaymentStatus.COMPLETED, // Customer attempting to self-mark as COMPLETED
          internalNotes: "Customer injected staff note",
        });

      expect(res.status).toBe(201);
      // Status must be coerced to PENDING
      expect(res.body.data.status).toBe(PaymentStatus.PENDING);
      // Internal notes must be ignored
      expect(res.body.data.internalNotes).toBeNull();
    });
  });

  // ==========================================
  // 6. CONCURRENCY & DUPLICATE REDEMPTION SAFEGUARDS
  // ==========================================
  describe("6. Concurrency & Redemptions Safeguards", () => {
    it("prevents duplicate discount application against the same invoice", async () => {
      const testInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-DUP-${Date.now()}`,
          customer: { connect: { id: customerId } },
          subtotalMinor: 100000n,
          totalAmountMinor: 100000n,
          balanceDueMinor: 100000n,
          status: InvoiceStatus.ISSUED,
          dueDate: new Date(),
        },
      });

      const discount = await prisma.discount.findFirst({ where: { isActive: true } });

      await prisma.$transaction(async (tx) => {
        await DiscountCalculationService.recordDiscountRedemption(tx, discount!.id, 10000n, {
          invoiceId: testInvoice.id,
        });
      });

      // Second attempt on the exact same invoice should throw BusinessRuleError
      await expect(
        prisma.$transaction(async (tx) => {
          await DiscountCalculationService.recordDiscountRedemption(tx, discount!.id, 10000n, {
            invoiceId: testInvoice.id,
          });
        })
      ).rejects.toThrow("Discount is already applied to this invoice");
    });
  });
});
