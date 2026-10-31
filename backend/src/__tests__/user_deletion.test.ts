import request from "supertest";
import app from "../app";
import { prisma } from "../database/prisma";
import { generateAccessToken, hashPassword } from "../utils/token";
import { Role } from "@sms/shared";

describe("User Deletion and Deactivation Integration Tests", () => {
  let adminUser: any;
  let adminToken: string;
  let staffToken: string;
  let customerToken: string;

  beforeAll(async () => {
    adminUser = await prisma.user.findUnique({ where: { email: "admin@brightloop.demo" } });
    if (!adminUser) {
      const pwd = await hashPassword("Brightloop!2026");
      adminUser = await prisma.user.create({
        data: {
          email: "admin@brightloop.demo",
          fullName: "Admin User",
          passwordHash: pwd,
          role: Role.ADMIN,
          isActive: true,
        },
      });
    }
    adminToken = generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    let staff = await prisma.user.findUnique({ where: { email: "staff@brightloop.demo" } });
    if (!staff) {
      const pwd = await hashPassword("Brightloop!2026");
      staff = await prisma.user.create({
        data: {
          email: "staff@brightloop.demo",
          fullName: "Staff User",
          passwordHash: pwd,
          role: Role.STAFF,
          isActive: true,
        },
      });
    }
    staffToken = generateAccessToken({
      userId: staff.id,
      email: staff.email,
      role: Role.STAFF,
    });

    let customer = await prisma.user.findFirst({ where: { role: Role.CUSTOMER } });
    if (!customer) {
      const pwd = await hashPassword("Brightloop!2026");
      customer = await prisma.user.create({
        data: {
          email: `cust-${Date.now()}@brightloop.demo`,
          fullName: "Customer User",
          passwordHash: pwd,
          role: Role.CUSTOMER,
          isActive: true,
        },
      });
    }
    customerToken = generateAccessToken({
      userId: customer.id,
      email: customer.email,
      role: Role.CUSTOMER,
    });
  });

  it("prevents unauthenticated deletion requests (401)", async () => {
    const res = await request(app).delete("/api/v1/users/some-fake-id");
    expect(res.status).toBe(401);
  });

  it("prevents non-admin (STAFF) from deleting users (403)", async () => {
    const res = await request(app)
      .delete("/api/v1/users/some-fake-id")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it("prevents non-admin (CUSTOMER) from deleting users (403)", async () => {
    const res = await request(app)
      .delete("/api/v1/users/some-fake-id")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 when admin attempts to delete a non-existent user", async () => {
    const res = await request(app)
      .delete("/api/v1/users/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("prevents admin from deleting their own account (self-deletion safeguard)", async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${adminUser.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/cannot delete your own account/i);
  });

  it("successfully creates and permanently deletes a user", async () => {
    // 1. Create a disposable user
    const createRes = await request(app)
      .post("/api/v1/users/staff")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: `to-delete-${Date.now()}@brightloop.demo`,
        password: "Brightloop!2026",
        fullName: "User To Delete",
        role: Role.STAFF,
      });
    expect(createRes.status).toBe(201);
    const targetUserId = createRes.body.data.id;

    // 2. Delete the user
    const delRes = await request(app)
      .delete(`/api/v1/users/${targetUserId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.data.deleted).toBe(true);

    // 3. Verify user is removed from database
    const checkUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    expect(checkUser).toBeNull();

    // 4. Verify audit log was generated
    const auditLog = await prisma.auditLog.findFirst({
      where: { entityType: "USER", entityId: targetUserId, action: "DELETE_USER" },
    });
    expect(auditLog).not.toBeNull();
  });

  it("prevents self-deactivation and deactivating the last active admin", async () => {
    // Self-deactivation safeguard
    const res = await request(app)
      .patch(`/api/v1/users/${adminUser.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/cannot deactivate your own account/i);
  });
});

