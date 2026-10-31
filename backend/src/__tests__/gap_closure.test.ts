import request from "supertest";
import app from "../app";
import { prisma } from "../database/prisma";
import { PlanService } from "../services/plan.service";
import { emailService } from "../services/email/email.service";
import { calculateVariantPrice, BillingInterval, ProductType } from "@sms/shared";
import { generateOpaqueToken } from "../utils/token";

describe("Developer 1 Gap Closure Verification Suite", () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    // Authenticate as Admin
    const adminRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@brightloop.demo", password: "Brightloop!2026" });
    adminToken = adminRes.body.data.accessToken;

    // Authenticate as Staff
    const staffRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "staff@brightloop.demo", password: "Brightloop!2026" });
    staffToken = staffRes.body.data.accessToken;
  });

  describe("1. Authentication & Email Security Gaps", () => {
    const baseEmail = `gap-test-${Date.now()}`;
    const emailUpper = `${baseEmail}@BrightLoop.DEMO`;
    const emailLower = `${baseEmail}@brightloop.demo`;

    afterAll(async () => {
      const user = await prisma.user.findFirst({
        where: { email: { equals: emailLower, mode: "insensitive" } },
      });
      if (user) {
        await prisma.customer.deleteMany({ where: { userId: user.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    });

    it("should reject duplicate registration with case-variant email", async () => {
      // Register with mixed/uppercase email
      const regRes = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: emailUpper,
          password: "StrongPass!2026",
          confirmPassword: "StrongPass!2026",
          fullName: "Case Sensitive Test",
          companyName: "Case Test Corp",
        });
      expect(regRes.status).toBe(201);
      expect(regRes.body.data.user.email).toBe(emailLower);

      // Attempt duplicate registration with lowercase variant
      const dupRes = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: emailLower,
          password: "StrongPass!2026",
          confirmPassword: "StrongPass!2026",
          fullName: "Duplicate User",
        });
      expect(dupRes.status).toBe(409);
      expect(dupRes.body.success).toBe(false);
      expect(dupRes.body.error.code).toBe("CONFLICT");
    });

    it("should not reveal account existence when requesting password reset for nonexistent email", async () => {
      emailService.clearCapturedEmails();

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "nonexistent-user-12345@brightloop.demo" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain("If an account with that email exists");

      // Verify no email was dispatched for nonexistent user
      expect(emailService.getCapturedEmails().length).toBe(0);
    });

    it("should dispatch password reset email via emailService for registered users", async () => {
      emailService.clearCapturedEmails();

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: emailLower });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const captured = emailService.getLastCapturedEmail();
      expect(captured).toBeDefined();
      expect(captured?.to).toBe(emailLower);
      expect(captured?.subject).toContain("Reset Your Brightloop Software Password");
    });

    it("should reject password reset when token has expired", async () => {
      const { rawToken, tokenHash } = generateOpaqueToken();

      const tempUser = await prisma.user.create({
        data: {
          email: `expired-token-${Date.now()}@brightloop.demo`,
          passwordHash: "dummyhash",
          fullName: "Expired Token Test",
          role: "CUSTOMER",
        },
      });

      await prisma.passwordResetToken.create({
        data: {
          userId: tempUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() - 1000 * 60), // Expired 1 minute ago
        },
      });

      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: rawToken,
          newPassword: "NewValidPass!2026",
          confirmPassword: "NewValidPass!2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("expired");

      await prisma.passwordResetToken.deleteMany({ where: { userId: tempUser.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });
    });

    it("should reject password reset when token has already been reused", async () => {
      const { rawToken, tokenHash } = generateOpaqueToken();

      const tempUser = await prisma.user.create({
        data: {
          email: `reused-token-${Date.now()}@brightloop.demo`,
          passwordHash: "dummyhash",
          fullName: "Reused Token Test",
          role: "CUSTOMER",
        },
      });

      await prisma.passwordResetToken.create({
        data: {
          userId: tempUser.id,
          tokenHash,
          isUsed: true, // Already marked used
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        },
      });

      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: rawToken,
          newPassword: "NewValidPass!2026",
          confirmPassword: "NewValidPass!2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("already been used");

      await prisma.passwordResetToken.deleteMany({ where: { userId: tempUser.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });
    });

    it("should forbid STAFF from creating another staff or admin account", async () => {
      const res = await request(app)
        .post("/api/v1/users/staff")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          email: `unauthorized-staff-${Date.now()}@brightloop.demo`,
          password: "ValidPass!2026",
          fullName: "Unauthorized Account",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe("2. Product Management Gaps", () => {
    let createdProductId: string;

    afterAll(async () => {
      if (createdProductId) {
        await prisma.productVariant.deleteMany({ where: { productId: createdProductId } });
        await prisma.product.deleteMany({ where: { id: createdProductId } });
      }
    });

    it("should store product type and independent cost/sales prices", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sku: `GAP-PROD-${Date.now()}`,
          name: "Brightloop Enterprise Suite",
          productType: ProductType.GOODS,
          baseSellingPriceMinor: "250000", // ₹2,500.00
          costPriceMinor: "120000",       // ₹1,200.00
          notes: "Internal hardware bundle",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.productType).toBe(ProductType.GOODS);
      expect(res.body.data.baseSellingPriceMinor).toBe("250000");
      expect(res.body.data.costPriceMinor).toBe("120000");

      createdProductId = res.body.data.id;
    });

    it("should reject negative prices during product creation", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sku: `NEG-PROD-${Date.now()}`,
          name: "Invalid Negative Price",
          baseSellingPriceMinor: "-1000",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should support variant brand, attribute, and calculate surcharge correctly", async () => {
      const variantRes = await request(app)
        .post(`/api/v1/products/${createdProductId}/variants`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sku: `VAR-BRAND-${Date.now()}`,
          name: "Odoo Connector Module",
          brand: "Odoo SA",
          attribute: "Edition: Enterprise 17",
          priceAdjustmentMinor: "56000", // +₹560.00
        });

      expect(variantRes.status).toBe(201);
      expect(variantRes.body.data.brand).toBe("Odoo SA");
      expect(variantRes.body.data.attribute).toBe("Edition: Enterprise 17");

      // Verify variant pricing utility
      const basePrice = 200000n; // ₹2,000.00
      const surcharge = 56000n;  // ₹560.00
      const finalPrice = calculateVariantPrice(basePrice, surcharge);
      expect(finalPrice).toBe(256000n); // ₹2,560.00
    });
  });

  describe("3. Plan Management & Lifecycle Gaps", () => {
    let activePlanId: string;
    let activePriceId: string;
    let futurePlanId: string;
    let futurePriceId: string;

    afterAll(async () => {
      const planIds = [activePlanId, futurePlanId].filter(Boolean);
      for (const id of planIds) {
        await prisma.subscriptionItem.deleteMany({ where: { subscription: { planId: id } } });
        await prisma.subscription.deleteMany({ where: { planId: id } });
        await prisma.planPrice.deleteMany({ where: { planId: id } });
        await prisma.plan.deleteMany({ where: { id } });
      }
    });

    it("should create plan supporting all 4 billing intervals, min quantity, and lifecycle policies", async () => {
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-GAP-${Date.now()}`,
          name: "Multi-Interval Enterprise Plan",
          minQuantity: 5,
          autoCloseOnEndDate: true,
          allowEarlyClosure: false,
          allowPause: true,
          allowRenewal: true,
          prices: [
            { billingInterval: BillingInterval.DAILY, intervalCount: 1, amountMinor: "10000" },
            { billingInterval: BillingInterval.WEEKLY, intervalCount: 1, amountMinor: "60000" },
            { billingInterval: BillingInterval.MONTHLY, intervalCount: 1, amountMinor: "240000" },
            { billingInterval: BillingInterval.YEARLY, intervalCount: 1, amountMinor: "2500000" },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.minQuantity).toBe(5);
      expect(res.body.data.autoCloseOnEndDate).toBe(true);
      expect(res.body.data.allowEarlyClosure).toBe(false);
      expect(res.body.data.allowPause).toBe(true);
      expect(res.body.data.allowRenewal).toBe(true);
      expect(res.body.data.prices.length).toBe(4);

      activePlanId = res.body.data.id;
      activePriceId = res.body.data.prices[0].id;
    });

    it("should reject subscription attempt when requested quantity is below plan minimum", async () => {
      await expect(
        PlanService.getActivePlanWithPrice(activePlanId, activePriceId, 3)
      ).rejects.toThrow("below the required minimum quantity (5)");
    });

    it("should accept subscription attempt when requested quantity meets or exceeds plan minimum", async () => {
      const result = await PlanService.getActivePlanWithPrice(activePlanId, activePriceId, 5);
      expect(result.plan.id).toBe(activePlanId);
      expect(result.price.id).toBe(activePriceId);
    });

    it("should reject plan selection when current date is outside availability dates", async () => {
      // Create a plan starting next month
      const futureStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const futurePlan = await prisma.plan.create({
        data: {
          code: `FUTURE-PLAN-${Date.now()}`,
          name: "Future Q4 Plan",
          startDate: futureStart,
          prices: {
            create: [
              {
                billingInterval: BillingInterval.MONTHLY,
                intervalCount: 1,
                amountMinor: 100000n,
              },
            ],
          },
        },
        include: { prices: true },
      });

      futurePlanId = futurePlan.id;
      futurePriceId = futurePlan.prices[0]!.id;

      await expect(
        PlanService.getActivePlanWithPrice(futurePlanId, futurePriceId, 1)
      ).rejects.toThrow("not yet available for subscriptions");
    });

    it("should ensure deactivating a plan does not terminate existing subscriptions", async () => {
      // Create a mock customer & active subscription linked to activePlanId
      const customer = await prisma.customer.findFirst();
      if (!customer) return;

      const sub = await prisma.subscription.create({
        data: {
          subscriptionNumber: `SUB-GAP-${Date.now()}`,
          customerId: customer.id,
          planId: activePlanId,
          billingInterval: BillingInterval.MONTHLY,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Deactivate the plan (Admin closes it to new subscriptions)
      await PlanService.deactivatePlan(activePlanId);

      // Verify the plan is inactive
      const updatedPlan = await prisma.plan.findUnique({ where: { id: activePlanId } });
      expect(updatedPlan?.isActive).toBe(false);

      // Verify the existing subscription remains ACTIVE and completely unaffected
      const existingSub = await prisma.subscription.findUnique({ where: { id: sub.id } });
      expect(existingSub?.status).toBe("ACTIVE");
      expect(existingSub?.planId).toBe(activePlanId);

      // Clean up subscription
      await prisma.subscription.delete({ where: { id: sub.id } });
    });
  });
});
