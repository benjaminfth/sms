import request from "supertest";
import app from "../app";
import { prisma } from "../database/prisma";
import { emailService } from "../services/email/email.service";
import { LoggerEmailAdapter } from "../services/email/logger.adapter";
import { ResendEmailProvider } from "../services/email/resend.provider";
import { generateOpaqueToken, hashOpaqueToken } from "../utils/token";

describe("Forgot Password & Resend Email Integration Test Suite", () => {
  let testUser: { id: string; email: string; fullName: string };
  let loggerAdapter: LoggerEmailAdapter;

  beforeAll(async () => {
    // Setup logger adapter for capturing emails during test
    loggerAdapter = new LoggerEmailAdapter();
    emailService.setAdapter(loggerAdapter);

    // Create test user
    const email = `pwd-reset-test-${Date.now()}@brightloop.demo`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: "$2b$12$dummyhashforresendtestpurposesonly1234567890",
        fullName: "Resend Integration Tester",
        role: "CUSTOMER",
      },
    });
    testUser = { id: user.id, email: user.email, fullName: user.fullName };
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId: testUser.id } });
    await prisma.refreshToken.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  beforeEach(() => {
    loggerAdapter.clearSentEmails();
  });

  describe("1. Forgot Password Endpoint (POST /auth/forgot-password)", () => {
    it("should accept valid registered email, dispatch email, and return generic success without leaking token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: testUser.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain("If an account exists with this email address");
      expect(res.body.data.resetUrl).toBeUndefined(); // Security rule: token/url never returned in API response

      // Check captured email
      const captured = loggerAdapter.getLastSentEmail();
      expect(captured).toBeDefined();
      expect(captured?.to).toBe(testUser.email);
      expect(captured?.subject).toBe("Reset Your Brightloop SMS Password");
      expect(captured?.text).toContain("/reset-password?token=");
      expect(captured?.html).toContain("Reset Password");
    });

    it("should return identical generic success for unregistered email and not dispatch email (anti-enumeration)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: `unregistered-${Date.now()}@brightloop.demo` });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain("If an account exists with this email address");
      expect(loggerAdapter.getSentEmails().length).toBe(0);
    });

    it("should reject invalid email format with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "not-a-valid-email-format" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject missing email payload with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should invalidate previous reset tokens upon repeated requests", async () => {
      // First request
      await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: testUser.email });

      const firstToken = await prisma.passwordResetToken.findFirst({
        where: { userId: testUser.id, isUsed: false },
        orderBy: { createdAt: "desc" },
      });
      expect(firstToken).toBeDefined();

      // Second request
      await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: testUser.email });

      // First token should now be marked isUsed: true (invalidated)
      const oldTokenCheck = await prisma.passwordResetToken.findUnique({
        where: { id: firstToken!.id },
      });
      expect(oldTokenCheck?.isUsed).toBe(true);

      // Only the newest token should be active
      const activeTokens = await prisma.passwordResetToken.findMany({
        where: { userId: testUser.id, isUsed: false },
      });
      expect(activeTokens.length).toBe(1);
    });
  });

  describe("2. Resend Email Provider Resilience", () => {
    it("should handle missing or simulated Resend API key gracefully without throwing unhandled errors", async () => {
      const originalKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      const provider = new ResendEmailProvider();
      const sendResult = await provider.sendPasswordReset({
        to: "simulated@brightloop.demo",
        resetUrl: "http://localhost:3000/reset-password?token=test-simulated-token",
        userName: "Simulated User",
      });

      expect(sendResult).toBe(true);

      process.env.RESEND_API_KEY = originalKey;
    });

    it("should handle Resend API failure gracefully and return false without leaking tokens", async () => {
      process.env.RESEND_API_KEY = "re_invalid_test_key_12345";
      const provider = new ResendEmailProvider();

      // Attempt sending with invalid test key
      const result = await provider.send({
        to: "recipient@example.com",
        subject: "Test Subject",
        text: "Test content",
      });

      expect(result).toBe(false); // Returns false cleanly instead of unhandled crash
    });
  });

  describe("3. Reset Password Endpoint (POST /auth/reset-password)", () => {
    let validToken: string;

    beforeEach(async () => {
      // Create a fresh active token for testUser
      const { rawToken, tokenHash } = generateOpaqueToken();
      validToken = rawToken;

      await prisma.passwordResetToken.create({
        data: {
          userId: testUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });
    });

    it("should reject password reset when token is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          newPassword: "BrandNewPass!2026",
          confirmPassword: "BrandNewPass!2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject password shorter than 9 characters", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: validToken,
          newPassword: "Short!1",
          confirmPassword: "Short!1",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(
        res.body.error.details.some((d: any) => d.message.includes("at least 9 characters"))
      ).toBe(true);
    });

    it("should reject password missing an uppercase letter", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: validToken,
          newPassword: "lowercasepass!1",
          confirmPassword: "lowercasepass!1",
        });

      expect(res.status).toBe(400);
      expect(
        res.body.error.details.some((d: any) => d.message.includes("uppercase"))
      ).toBe(true);
    });

    it("should reject password missing a lowercase letter", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: validToken,
          newPassword: "UPPERCASEPASS!1",
          confirmPassword: "UPPERCASEPASS!1",
        });

      expect(res.status).toBe(400);
      expect(
        res.body.error.details.some((d: any) => d.message.includes("lowercase"))
      ).toBe(true);
    });

    it("should reject password missing a special character", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: validToken,
          newPassword: "NoSpecialCharacter123",
          confirmPassword: "NoSpecialCharacter123",
        });

      expect(res.status).toBe(400);
      expect(
        res.body.error.details.some((d: any) => d.message.includes("special character"))
      ).toBe(true);
    });

    it("should reject when confirmation password mismatches", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: validToken,
          newPassword: "BrandNewPass!2026",
          confirmPassword: "MismatchedPass!2026",
        });

      expect(res.status).toBe(400);
      expect(
        res.body.error.details.some((d: any) => d.message.includes("Passwords do not match"))
      ).toBe(true);
    });

    it("should reject invalid or non-existent token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "completely-invalid-nonexistent-token-12345",
          newPassword: "BrandNewPass!2026",
          confirmPassword: "BrandNewPass!2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("invalid or has already been used");
    });

    it("should reject expired token", async () => {
      const { rawToken, tokenHash } = generateOpaqueToken();

      await prisma.passwordResetToken.create({
        data: {
          userId: testUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      });

      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: rawToken,
          newPassword: "BrandNewPass!2026",
          confirmPassword: "BrandNewPass!2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("expired");
    });

    it("should succeed with valid token, update password, and invalidate existing refresh sessions", async () => {
      // 1. Create a dummy active refresh token session for testUser
      const { tokenHash: sessionHash } = generateOpaqueToken();
      const activeSession = await prisma.refreshToken.create({
        data: {
          userId: testUser.id,
          tokenHash: sessionHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isRevoked: false,
        },
      });

      // 2. Perform password reset
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: validToken,
          newPassword: "BrandNewPass!2026",
          confirmPassword: "BrandNewPass!2026",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe(
        "Your password has been successfully updated. You can now sign in using your new password."
      );

      // 3. Verify token is marked as used (cannot be reused)
      const tokenHash = hashOpaqueToken(validToken);
      const usedToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
      });
      expect(usedToken?.isUsed).toBe(true);

      // 4. Verify previous refresh token session is revoked
      const updatedSession = await prisma.refreshToken.findUnique({
        where: { id: activeSession.id },
      });
      expect(updatedSession?.isRevoked).toBe(true);

      // 5. Verify the used token cannot be reused
      const secondTry = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: validToken,
          newPassword: "AnotherPass!2026",
          confirmPassword: "AnotherPass!2026",
        });

      expect(secondTry.status).toBe(400);
      expect(secondTry.body.error.message).toContain("invalid or has already been used");
    });
  });
});
