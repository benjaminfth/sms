import request from "supertest";
import app from "../app";
import { prisma } from "../database/prisma";

describe("Authentication Module Integration Tests", () => {
  const testUser = {
    email: `test-${Date.now()}@brightloop.demo`,
    password: "StrongPass!2026",
    fullName: "Integration Test Customer",
    phone: "9876543210",
    companyName: "Test Technologies Pvt Ltd",
  };

  afterAll(async () => {
    // Clean up test customer and user
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (user) {
      await prisma.customer.deleteMany({ where: { userId: user.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  describe("Customer Registration", () => {
    it("should successfully register customer and linked customer record atomically", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.role).toBe("CUSTOMER");
      expect(res.body.data.customer.companyName).toBe(testUser.companyName);

      // Verify in database
      const dbCustomer = await prisma.customer.findUnique({
        where: { userId: res.body.data.user.id },
      });
      expect(dbCustomer).toBeDefined();
      expect(dbCustomer?.companyName).toBe(testUser.companyName);
    });

    it("should reject duplicate registration with 409 Conflict", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("should reject registration with weak passwords (< 9 chars, missing special char)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "weakpass@example.com",
          password: "short",
          fullName: "Weak Pass User",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Login and Token Lifecycle", () => {
    let refreshTokenCookie: string;
    let accessToken: string;

    it("should fail login with invalid credentials", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testUser.email,
          password: "WrongPassword!2026",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should succeed login with valid credentials and issue tokens", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());

      accessToken = res.body.data.accessToken;

      const rawCookies = res.headers["set-cookie"];
      const cookieArray = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
      expect(cookieArray.length).toBeGreaterThan(0);
      refreshTokenCookie = cookieArray.find((c: string) => c.startsWith("refreshToken=")) || "";
      expect(refreshTokenCookie).toContain("HttpOnly");
    });

    it("should rotate refresh token and issue a fresh access token", async () => {
      // Wait 1 second so JWT iat timestamp advances
      await new Promise((r) => setTimeout(r, 1050));

      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", [refreshTokenCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.accessToken).not.toBe(accessToken);

      const rawCookies = res.headers["set-cookie"];
      const cookieArray = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
      refreshTokenCookie = cookieArray.find((c: string) => c.startsWith("refreshToken=")) || "";
    });

    it("should logout and revoke the refresh token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", [refreshTokenCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Attempting to refresh with the revoked token should now fail with 401
      const refreshRes = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", [refreshTokenCookie]);

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.success).toBe(false);
    });
  });
});
