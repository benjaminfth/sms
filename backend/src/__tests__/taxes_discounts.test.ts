import request from "supertest";
import app from "../app";
import { prisma } from "../database/prisma";
import { TaxCalculationService } from "../services/tax-calculation.service";
import { DiscountCalculationService } from "../services/discount-calculation.service";
import { PricingService } from "../services/pricing.service";
import { DiscountType } from "@sms/shared";

describe("Developer 3 — Tax & Discount Calculation Engine", () => {
  let adminAccessToken: string;
  let testProductId: string;

  beforeAll(async () => {
    // Login as Admin
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "admin@brightloop.demo",
      password: "Brightloop!2026",
    });
    adminAccessToken = loginRes.body.data.accessToken;

    // Fetch or create a test product
    const product = await prisma.product.findFirst({
      where: { isActive: true },
    });
    if (product) {
      testProductId = product.id;
    }
  });

  describe("Tax Calculation Unit Tests", () => {
    it("correctly calculates exclusive percentage tax with integer paise", () => {
      // 200000 paise (₹2,000) at 1800 basis points (18.00%) = 36000 paise (₹360)
      const tax = TaxCalculationService.calculateExclusiveTax(200000n, 1800);
      expect(tax).toBe(36000n);
    });

    it("correctly calculates exclusive tax rounding to nearest paise", () => {
      // 10005 paise at 1800 bps -> (10005 * 1800 + 5000) / 10000 = 1801 paise
      const tax = TaxCalculationService.calculateExclusiveTax(10005n, 1800);
      expect(tax).toBe(1801n);
    });

    it("correctly calculates inclusive tax", () => {
      // Gross 236000 paise (₹2,360) with 18% inclusive tax -> 36000 paise tax, 200000 base
      const tax = TaxCalculationService.calculateInclusiveTax(236000n, 1800);
      expect(tax).toBe(36000n);
    });

    it("returns zero tax for non-positive amounts or zero rates", () => {
      expect(TaxCalculationService.calculateExclusiveTax(0n, 1800)).toBe(0n);
      expect(TaxCalculationService.calculateExclusiveTax(200000n, 0)).toBe(0n);
    });
  });

  describe("Discount Calculation Unit Tests", () => {
    let testDiscountId: string;
    const testCode = `TESTDISC-${Date.now().toString().slice(-4)}`;

    beforeAll(async () => {
      // Create active percentage discount of 2000 bps (20%)
      const discount = await prisma.discount.create({
        data: {
          code: testCode,
          name: "Test 20% Discount",
          discountType: DiscountType.PERCENTAGE,
          valueMinorOrBasisPoints: 2000n,
          maxRedemptions: 5,
          isActive: true,
        },
      });
      testDiscountId = discount.id;
    });

    afterAll(async () => {
      await prisma.discount.deleteMany({
        where: { id: testDiscountId },
      });
    });

    it("validates and calculates valid percentage discount", async () => {
      // 200000 paise * 20% = 40000 paise
      const result = await DiscountCalculationService.validateAndCalculateDiscount(testCode, {
        subtotalMinor: 200000n,
      });

      expect(result.valid).toBe(true);
      expect(result.amountDeductedMinor).toBe(40000n);
    });

    it("clamps discount so amount payable cannot become negative", async () => {
      const fixedCode = `FIXEDOVER-${Date.now().toString().slice(-4)}`;
      const fixedDiscount = await prisma.discount.create({
        data: {
          code: fixedCode,
          name: "Huge Fixed Discount",
          discountType: DiscountType.FIXED_AMOUNT,
          valueMinorOrBasisPoints: 500000n, // ₹5,000 off
          isActive: true,
        },
      });

      // Subtotal is only ₹2,000 (200000 paise)
      const result = await DiscountCalculationService.validateAndCalculateDiscount(fixedCode, {
        subtotalMinor: 200000n,
      });

      expect(result.valid).toBe(true);
      expect(result.amountDeductedMinor).toBe(200000n); // Clamped to subtotal

      await prisma.discount.delete({ where: { id: fixedDiscount.id } });
    });

    it("rejects inactive discount code", async () => {
      const inactiveCode = `INACTIVE-${Date.now().toString().slice(-4)}`;
      const inactive = await prisma.discount.create({
        data: {
          code: inactiveCode,
          name: "Inactive Discount",
          discountType: DiscountType.PERCENTAGE,
          valueMinorOrBasisPoints: 1000n,
          isActive: false,
        },
      });

      const result = await DiscountCalculationService.validateAndCalculateDiscount(inactiveCode, {
        subtotalMinor: 100000n,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("inactive");

      await prisma.discount.delete({ where: { id: inactive.id } });
    });

    it("rejects expired discount code", async () => {
      const expiredCode = `EXPIRED-${Date.now().toString().slice(-4)}`;
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const expired = await prisma.discount.create({
        data: {
          code: expiredCode,
          name: "Expired Discount",
          discountType: DiscountType.PERCENTAGE,
          valueMinorOrBasisPoints: 1000n,
          endDate: pastDate,
          isActive: true,
        },
      });

      const result = await DiscountCalculationService.validateAndCalculateDiscount(expiredCode, {
        subtotalMinor: 100000n,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("expired");

      await prisma.discount.delete({ where: { id: expired.id } });
    });
  });

  describe("Tax & Discount API Endpoints", () => {
    it("allows ADMIN to create and list taxes", async () => {
      const code = `VAT-${Date.now().toString().slice(-4)}`;
      const createRes = await request(app)
        .post("/api/v1/taxes")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({
          name: "Value Added Tax 5%",
          code,
          rateBasisPoints: 500,
          isActive: true,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.code).toBe(code);

      const listRes = await request(app)
        .get("/api/v1/taxes")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThan(0);
    });

    it("allows ADMIN to create and validate discounts", async () => {
      const code = `PROMO${Date.now().toString().slice(-4)}`;
      const createRes = await request(app)
        .post("/api/v1/discounts")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({
          name: "Spring Sale 15%",
          code,
          discountType: DiscountType.PERCENTAGE,
          valueMinorOrBasisPoints: "1500",
          isActive: true,
        });

      expect(createRes.status).toBe(201);

      const validateRes = await request(app)
        .post("/api/v1/discounts/validate")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({
          code,
          subtotalMinor: "200000",
        });

      expect(validateRes.status).toBe(200);
      expect(validateRes.body.data.valid).toBe(true);
      expect(validateRes.body.data.amountDeductedMinor).toBe("30000"); // 15% of 200,000 = 30,000
    });
  });

  describe("Unified Pricing Engine (Developer 2 Contract H)", () => {
    it("calculates comprehensive quotation/invoice pricing with discounts and taxes", async () => {
      const promoCode = `ENGINEPROMO-${Date.now().toString().slice(-4)}`;
      const discount = await prisma.discount.create({
        data: {
          code: promoCode,
          name: "Engine Test Discount",
          discountType: DiscountType.PERCENTAGE,
          valueMinorOrBasisPoints: 1000n, // 10%
          isActive: true,
        },
      });

      const gstTax = await prisma.tax.findFirst({ where: { isActive: true } });
      if (gstTax) {
        await prisma.productTax.upsert({
          where: { productId_taxId: { productId: testProductId, taxId: gstTax.id } },
          create: { productId: testProductId, taxId: gstTax.id },
          update: {},
        });
      }

      const pricing = await PricingService.calculatePricing({
        items: [
          {
            productId: testProductId,
            quantity: "1.000",
            unitPriceMinor: "200000", // ₹2,000
          },
        ],
        discountCode: promoCode,
      });

      expect(pricing.currency).toBe("INR");
      expect(pricing.subtotalMinor).toBe("200000");
      expect(pricing.discountTotalMinor).toBe("20000"); // 10% of 2,000 = 200 (20000 paise)
      expect(pricing.taxableAmountMinor).toBe("180000"); // 200,000 - 20,000 = 180,000
      expect(BigInt(pricing.grandTotalMinor)).toBeGreaterThan(180000n);

      await prisma.discount.delete({ where: { id: discount.id } });
    });
  });
});
