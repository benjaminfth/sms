import request from "supertest";
import app from "../app";
import { prisma } from "../database/prisma";
import { generateAccessToken } from "../utils/token";
import { Role } from "@sms/shared";
import {
  getProductWithVariant,
  getActivePlanWithPrice,
} from "../services/contracts";

describe("Catalog & Plan Management Integration Tests", () => {
  let adminToken: string;
  let testProductId: string;
  let testVariantId: string;
  let testPlanId: string;
  let testPlanPriceId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findUnique({ where: { email: "admin@brightloop.demo" } });
    adminToken = generateAccessToken({
      userId: admin!.id,
      email: admin!.email,
      role: Role.ADMIN,
    });
  });

  describe("Product Management & Surcharge Pricing", () => {
    it("should create a product with base selling price in minor units", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sku: `TEST-PROD-${Date.now()}`,
          name: "Test CRM Suite",
          productType: "SERVICE",
          baseSellingPriceMinor: "200000", // ₹2,000
          costPriceMinor: "50000",
          currency: "INR",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.baseSellingPriceMinor).toBe("200000");
      testProductId = res.body.data.id;
    });

    it("should reject duplicate SKU with 409 Conflict", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sku: "BL-PRO-001", // Seeded product SKU
          name: "Duplicate SKU Product",
          baseSellingPriceMinor: "100000",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("should add a surcharge variant and accurately calculate total price in integer arithmetic", async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProductId}/variants`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sku: `VAR-ADDON-${Date.now()}`,
          name: "Analytics Add-On",
          priceAdjustmentType: "SURCHARGE",
          priceAdjustmentMinor: "56000", // ₹560 surcharge
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      testVariantId = res.body.data.id;

      // Verify Contract B: getProductWithVariant
      const pricing = await getProductWithVariant(testProductId, testVariantId);
      // Base (200000) + Surcharge (56000) = 256000
      expect(pricing.finalPriceMinor).toBe("256000");
    });

    it("should archive a product and make it unavailable for new sales", async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${testProductId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in DB that it is archived
      const dbProd = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(dbProd?.isArchived).toBe(true);
      expect(dbProd?.isActive).toBe(false);

      // Contract B should reject lookup of archived product
      await expect(getProductWithVariant(testProductId)).rejects.toThrow();
    });
  });

  describe("Plan Management", () => {
    it("should create a monthly plan with valid billing frequency and items", async () => {
      // Create a fresh active product for the plan
      const activeProd = await prisma.product.create({
        data: {
          sku: `PLAN-ITEM-${Date.now()}`,
          name: "Plan Base Item",
          baseSellingPriceMinor: BigInt(100000),
          currency: "INR",
          isActive: true,
          isArchived: false,
        },
      });

      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-CODE-${Date.now()}`,
          name: "Starter Monthly",
          prices: [
            {
              currency: "INR",
              billingInterval: "MONTHLY",
              intervalCount: 1,
              amountMinor: "100000",
              setupFeeMinor: "0",
            },
          ],
          items: [
            {
              productId: activeProd.id,
              quantity: "1.000",
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.prices[0].billingInterval).toBe("MONTHLY");
      expect(res.body.data.prices[0].amountMinor).toBe("100000");

      testPlanId = res.body.data.id;
      testPlanPriceId = res.body.data.prices[0].id;

      // Verify Contract C: getActivePlanWithPrice
      const planLookup = await getActivePlanWithPrice(testPlanId, testPlanPriceId);
      expect(planLookup.plan.id).toBe(testPlanId);
      expect(planLookup.price.id).toBe(testPlanPriceId);
    });

    it("should reject invalid billing intervals", async () => {
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-INVALID-${Date.now()}`,
          name: "Invalid Interval Plan",
          prices: [
            {
              billingInterval: "BI_MONTHLY_INVALID",
              amountMinor: "100000",
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject adding an inactive or archived product to a new plan", async () => {
      // Use the archived product from earlier
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-FAIL-${Date.now()}`,
          name: "Fail Plan",
          prices: [
            {
              billingInterval: "MONTHLY",
              amountMinor: "100000",
            },
          ],
          items: [
            {
              productId: testProductId, // archived product
              quantity: "1.000",
            },
          ],
        });

      expect(res.status).toBe(422); // Business rule validation failure
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("inactive or archived product");
    });
  });
});
