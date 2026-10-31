import request from "supertest";
import app from "../app";
import { prisma } from "../database/prisma";
import { generateAccessToken } from "../utils/token";
import { Role } from "@sms/shared";

describe("Authorization and RBAC Integration Tests", () => {
  let adminToken: string;
  let staffToken: string;
  let customerAToken: string;

  let customerAId: string;
  let customerBId: string;

  beforeAll(async () => {
    // Admin
    const admin = await prisma.user.findUnique({ where: { email: "admin@brightloop.demo" } });
    adminToken = generateAccessToken({
      userId: admin!.id,
      email: admin!.email,
      role: Role.ADMIN,
    });

    // Staff
    const staff = await prisma.user.findUnique({ where: { email: "staff@brightloop.demo" } });
    staffToken = generateAccessToken({
      userId: staff!.id,
      email: staff!.email,
      role: Role.STAFF,
    });

    // Customer A (from seed)
    const customerUserA = await prisma.user.findUnique({
      where: { email: "customer@brightloop.demo" },
      include: { customer: true },
    });
    customerAToken = generateAccessToken({
      userId: customerUserA!.id,
      email: customerUserA!.email,
      role: Role.CUSTOMER,
    });
    customerAId = customerUserA!.customer!.id;

    // Customer B (create for cross-customer test)
    const customerUserB = await prisma.user.create({
      data: {
        email: `customer-b-${Date.now()}@brightloop.demo`,
        passwordHash: "hash",
        fullName: "Customer B",
        role: Role.CUSTOMER,
        isActive: true,
        customer: {
          create: {
            email: `customer-b-${Date.now()}@brightloop.demo`,
            fullName: "Customer B",
            currency: "INR",
          },
        },
      },
      include: { customer: true },
    });
    customerBId = customerUserB.customer!.id;
  });

  describe("Staff Creation Permissions", () => {
    it("should allow ADMIN to create a staff member", async () => {
      const res = await request(app)
        .post("/api/v1/users/staff")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: `newstaff-${Date.now()}@brightloop.demo`,
          password: "StaffPass!2026",
          fullName: "New Support Staff",
          role: "STAFF",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("STAFF");
    });

    it("should reject STAFF from creating a staff member with 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/v1/users/staff")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          email: `illegalstaff-${Date.now()}@brightloop.demo`,
          password: "StaffPass!2026",
          fullName: "Illegal Staff",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should reject CUSTOMER from accessing admin routes with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${customerAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("Customer Ownership Guard", () => {
    it("should allow Customer A to access their own customer profile", async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${customerAId}`)
        .set("Authorization", `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(customerAId);
    });

    it("should reject Customer A from accessing Customer B's profile with 403 Forbidden", async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${customerBId}`)
        .set("Authorization", `Bearer ${customerAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("belonging to another customer");
    });

    it("should allow STAFF to access any customer profile", async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${customerAId}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(customerAId);
    });
  });
});
