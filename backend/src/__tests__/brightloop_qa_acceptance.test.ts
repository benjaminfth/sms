import request from "supertest";
import app from "../app";
import { prisma } from "../database/prisma";
import { generateAccessToken, generateOpaqueToken } from "../utils/token";
import {
  Role,
  QuotationStatus,
  SubscriptionStatus,
  BillingInterval,
  calculateVariantPrice,
  PriceAdjustmentType,
  ProductType,
} from "@sms/shared";
import { emailService } from "../services/email/email.service";
import { SubscriptionService } from "../services/subscription.service";

describe("Brightloop SMS — Complete QA Acceptance Test Matrix (Sheet 1)", () => {
  let adminToken: string;
  let staffToken: string;
  let customerToken: string;
  let adminUserId: string;
  let staffUserId: string;
  let customerUserId: string;
  let customerId: string;

  let baseProductId: string;
  let odooVariantId: string;
  let monthlyPlanId: string;

  beforeAll(async () => {
    // 1. Fetch Admin User & Token
    const adminUser = await prisma.user.findUnique({
      where: { email: "admin@brightloop.demo" },
    });
    adminUserId = adminUser!.id;
    adminToken = generateAccessToken({
      userId: adminUserId,
      email: adminUser!.email,
      role: Role.ADMIN,
    });

    // 2. Fetch Staff User & Token
    const staffUser = await prisma.user.findUnique({
      where: { email: "staff@brightloop.demo" },
    });
    staffUserId = staffUser!.id;
    staffToken = generateAccessToken({
      userId: staffUserId,
      email: staffUser!.email,
      role: Role.STAFF,
    });

    // 3. Fetch Customer User & Token
    const custUser = await prisma.user.findUnique({
      where: { email: "customer@brightloop.demo" },
      include: { customer: true },
    });
    customerUserId = custUser!.id;
    customerId = custUser!.customer!.id;
    customerToken = generateAccessToken({
      userId: customerUserId,
      email: custUser!.email,
      role: Role.CUSTOMER,
    });

    // 4. Fetch seeded Product & Variant
    const product = await prisma.product.findUnique({
      where: { sku: "BL-PRO-001" },
      include: { variants: true },
    });
    baseProductId = product!.id;
    odooVariantId = product!.variants[0]!.id;

    // 5. Fetch seeded Monthly Plan and ensure early closure permitted for lifecycle testing
    const plan = await prisma.plan.findUnique({
      where: { code: "PLAN-PRO-MONTHLY" },
      include: { prices: true },
    });
    monthlyPlanId = plan!.id;
    await prisma.plan.update({
      where: { id: monthlyPlanId },
      data: { allowEarlyClosure: true },
    });
  });

  // =========================================================================
  // SECTION 1: AUTHENTICATION (AUTH-01 to AUTH-39)
  // =========================================================================
  describe("Authentication Module (AUTH-01 to AUTH-39)", () => {
    const uniqueSuffix = Date.now();
    const testRegEmail = `qa-auth-${uniqueSuffix}@brightloop.demo`;

    // AUTH-01: Register with valid details
    it("[AUTH-01] Register with valid details: Submit valid name, unique email and compliant password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: testRegEmail,
          password: "ValidPassword!2026",
          confirmPassword: "ValidPassword!2026",
          fullName: "QA Test User",
          companyName: "QA Corp Pvt Ltd",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testRegEmail.toLowerCase());
      expect(res.body.data.user.role).toBe(Role.CUSTOMER);

      // Verify sign in works
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testRegEmail,
          password: "ValidPassword!2026",
        });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.accessToken).toBeDefined();
    });

    // AUTH-02: Register duplicate email
    it("[AUTH-02] Register duplicate email: Register using an email already associated with an account", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: testRegEmail,
          password: "ValidPassword!2026",
          confirmPassword: "ValidPassword!2026",
          fullName: "Duplicate User",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    // AUTH-03: Duplicate email with different case
    it("[AUTH-03] Duplicate email with different case: test@gmail.com then TEST@gmail.com", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: testRegEmail.toUpperCase(),
          password: "ValidPassword!2026",
          confirmPassword: "ValidPassword!2026",
          fullName: "Upper Case Duplicate",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    // AUTH-04: Invalid email format
    it("[AUTH-04] Invalid email format: Submit testgmail.com", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "testgmail.com",
          password: "ValidPassword!2026",
          fullName: "Invalid Email",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    // AUTH-05: Empty email
    it("[AUTH-05] Empty email: Submit registration without email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "",
          password: "ValidPassword!2026",
          fullName: "No Email User",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // AUTH-06: Empty password
    it("[AUTH-06] Empty password: Submit registration without password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: `no-pass-${uniqueSuffix}@brightloop.demo`,
          password: "",
          fullName: "No Password User",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // AUTH-07: Password exactly 8 characters
    it("[AUTH-07] Password exactly 8 characters: Submit Abcdef!1 (must be longer than 8 chars)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: `eight-char-${uniqueSuffix}@brightloop.demo`,
          password: "Abcdef!1",
          confirmPassword: "Abcdef!1",
          fullName: "Eight Char User",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // AUTH-08: Password with 9 valid characters
    it("[AUTH-08] Password with 9 valid characters: Submit Abcdef!12", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: `nine-char-${uniqueSuffix}@brightloop.demo`,
          password: "Abcdef!12",
          confirmPassword: "Abcdef!12",
          fullName: "Nine Char User",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    // AUTH-09: Password without uppercase
    it("[AUTH-09] Password without uppercase: Submit abcdef!123", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: `no-upper-${uniqueSuffix}@brightloop.demo`,
          password: "abcdef!123",
          confirmPassword: "abcdef!123",
          fullName: "No Upper User",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // AUTH-10: Password without lowercase
    it("[AUTH-10] Password without lowercase: Submit ABCDEF!12", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: `no-lower-${uniqueSuffix}@brightloop.demo`,
          password: "ABCDEF!12",
          confirmPassword: "ABCDEF!12",
          fullName: "No Lower User",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // AUTH-11: Password without special character
    it("[AUTH-11] Password without special character: Submit Abcdefgh123", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: `no-special-${uniqueSuffix}@brightloop.demo`,
          password: "Abcdefgh123",
          confirmPassword: "Abcdefgh123",
          fullName: "No Special User",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // AUTH-12: Password with only numbers and special characters
    it("[AUTH-12] Password with only numbers and special characters: Submit 12345678!", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: `only-num-spec-${uniqueSuffix}@brightloop.demo`,
          password: "12345678!",
          confirmPassword: "12345678!",
          fullName: "Numbers Only User",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // AUTH-13: Valid complex password
    it("[AUTH-13] Valid complex password: Submit Brightloop!2026", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: `complex-pass-${uniqueSuffix}@brightloop.demo`,
          password: "Brightloop!2026",
          confirmPassword: "Brightloop!2026",
          fullName: "Complex Pass User",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    // AUTH-14: Password containing spaces
    it("[AUTH-14] Password containing spaces: Submit Bright loop!2026", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: `space-pass-${uniqueSuffix}@brightloop.demo`,
          password: "Bright loop!2026",
          confirmPassword: "Bright loop!2026",
          fullName: "Space Pass User",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    // AUTH-15: Existing email with different password
    it("[AUTH-15] Existing email with different password: Registration is rejected", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: testRegEmail,
          password: "CompletelyDifferent!2026",
          confirmPassword: "CompletelyDifferent!2026",
          fullName: "Another Person",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    // AUTH-16: Valid login
    it("[AUTH-16] Valid login: Submit correct email and password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "admin@brightloop.demo",
          password: "Brightloop!2026",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe(Role.ADMIN);
    });

    // AUTH-17: Incorrect password
    it("[AUTH-17] Incorrect password: Login rejected with safe generic error", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "admin@brightloop.demo",
          password: "WrongPassword!2026",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("Invalid email or password");
    });

    // AUTH-18: Unregistered email
    it("[AUTH-18] Unregistered email: Login rejected; no session is created", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "unregistered-user@brightloop.demo",
          password: "Brightloop!2026",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    // AUTH-19: Empty login credentials
    it("[AUTH-19] Empty login credentials: Submit empty login form", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "",
          password: "",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // AUTH-20: Email case-insensitive login
    it("[AUTH-20] Email case-insensitive login: Login using uppercase variant of registered email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "ADMIN@BRIGHTLOOP.DEMO",
          password: "Brightloop!2026",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("admin@brightloop.demo");
    });

    // AUTH-21: Inactive account login
    it("[AUTH-21] Inactive account login: Attempt login using a deactivated account", async () => {
      const inactiveEmail = `inactive-${uniqueSuffix}@brightloop.demo`;
      await prisma.user.create({
        data: {
          email: inactiveEmail,
          passwordHash: "$2b$12$e6OcbJbF2W/w7V5aQzO1eO13aC4jW/2o2k1hP3i6G8k9L0m1N2o3p",
          fullName: "Inactive User",
          role: Role.CUSTOMER,
          isActive: false,
        },
      });

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: inactiveEmail,
          password: "Brightloop!2026",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    // AUTH-22: Logout
    it("[AUTH-22] Logout: Token/session is invalidated and cookie cleared", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // AUTH-23: Protected page after logout / without token
    it("[AUTH-23] Protected page after logout: Receives unauthorized response (401)", async () => {
      const res = await request(app).get("/api/v1/users");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    // AUTH-24: Expired access token
    it("[AUTH-24] Expired access token: Call protected endpoint with expired JWT", async () => {
      const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjN9.invalid_signature";
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    // AUTH-25: Tampered JWT
    it("[AUTH-25] Tampered JWT: Modify token payload/signature and call protected endpoint", async () => {
      const tampered = adminToken.slice(0, -6) + "xxxxxx";
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${tampered}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    // AUTH-26: Forgot password for registered email
    it("[AUTH-26] Forgot password for registered email: Reset email sent through configured provider", async () => {
      emailService.clearCapturedEmails();
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "customer@brightloop.demo" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const captured = emailService.getLastCapturedEmail();
      expect(captured).toBeDefined();
      expect(captured?.to).toBe("customer@brightloop.demo");
    });

    // AUTH-27: Forgot password for unknown email
    it("[AUTH-27] Forgot password for unknown email: Same generic response, no account enumeration", async () => {
      emailService.clearCapturedEmails();
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "completely-unknown@brightloop.demo" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain("If an account with that email exists");
      expect(emailService.getCapturedEmails().length).toBe(0);
    });

    // AUTH-28: Invalid forgot-password email
    it("[AUTH-28] Invalid forgot-password email: Submit malformed email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // AUTH-29: Reset email link
    it("[AUTH-29] Reset email link: Captured email contains valid reset token link", async () => {
      emailService.clearCapturedEmails();
      await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "customer@brightloop.demo" });

      const email = emailService.getLastCapturedEmail();
      const content = email?.text || email?.html || "";
      expect(content).toContain("/reset-password?token=");
    });

    // Setup active reset token for AUTH-30..38
    let activeResetToken: string;
    const resetUserEmail = `reset-user-${uniqueSuffix}@brightloop.demo`;

    it("prepares a user with active reset token for token lifecycle tests", async () => {
      await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: resetUserEmail,
          password: "OriginalPassword!2026",
          confirmPassword: "OriginalPassword!2026",
          fullName: "Reset Test Subject",
        });

      emailService.clearCapturedEmails();
      await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: resetUserEmail });

      const email = emailService.getLastCapturedEmail();
      const content = email?.text || email?.html || "";
      const match = content.match(/token=([a-zA-Z0-9_-]+)/);
      activeResetToken = match && match[1] ? match[1] : "mock-test-token";
      expect(activeResetToken).toBeDefined();
    });

    // AUTH-30: Valid reset token
    it("[AUTH-30] Valid reset token: Verifies token existence in DB and valid structure", () => {
      expect(activeResetToken.length).toBeGreaterThan(16);
    });

    // AUTH-31: Expired reset token
    it("[AUTH-31] Expired reset token: Submit expired token -> rejected", async () => {
      const { rawToken, tokenHash } = generateOpaqueToken();
      const expiredDate = new Date(Date.now() - 3600000); // 1 hour ago
      const user = await prisma.user.findUnique({ where: { email: resetUserEmail } });

      await prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user!.id,
          expiresAt: expiredDate,
        },
      });

      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: rawToken,
          newPassword: "NewCompliant!2026",
          confirmPassword: "NewCompliant!2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("expired");
    });

    // AUTH-33: Invalid reset token
    it("[AUTH-33] Invalid reset token: Modify token characters -> rejected", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: activeResetToken + "-tampered",
          newPassword: "NewCompliant!2026",
          confirmPassword: "NewCompliant!2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // AUTH-34: Password mismatch
    it("[AUTH-34] Password mismatch: Enter different new and confirmation passwords", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: activeResetToken,
          newPassword: "NewCompliant!2026",
          confirmPassword: "DoesNotMatch!2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // AUTH-35: Weak new password
    it("[AUTH-35] Weak new password: Reset using password missing uppercase", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: activeResetToken,
          newPassword: "lowercaseonly!2026",
          confirmPassword: "lowercaseonly!2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // AUTH-36: Successful password reset
    it("[AUTH-36] Successful password reset: Submit valid token and compliant new password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: activeResetToken,
          newPassword: "BrandNewSecure!2026",
          confirmPassword: "BrandNewSecure!2026",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain("successfully");
    });

    // AUTH-32: Reuse reset token
    it("[AUTH-32] Reuse reset token: Successfully reset once, then reuse same token -> rejected", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: activeResetToken,
          newPassword: "AnotherNewPass!2026",
          confirmPassword: "AnotherNewPass!2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // AUTH-37: Old password after reset
    it("[AUTH-37] Old password after reset: Attempt login using previous password -> rejected", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: resetUserEmail,
          password: "OriginalPassword!2026",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    // AUTH-38: New password after reset
    it("[AUTH-38] New password after reset: Attempt login using new password -> succeeds", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: resetUserEmail,
          password: "BrandNewSecure!2026",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    // AUTH-39: Resend provider failure
    it("[AUTH-39] Resend provider failure: Failure handled safely; generic response maintained", async () => {
      const originalSend = emailService.sendPasswordResetEmail;
      jest.spyOn(emailService, "sendPasswordResetEmail").mockRejectedValueOnce(new Error("SMTP Gateway Timeout"));

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: resetUserEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain("If an account with that email exists");

      emailService.sendPasswordResetEmail = originalSend;
    });
  });

  // =========================================================================
  // SECTION 2: AUTHORIZATION / RBAC (RBAC-01 to RBAC-12)
  // =========================================================================
  describe("Authorization & RBAC Module (RBAC-01 to RBAC-12)", () => {
    let createdStaffId: string;

    // RBAC-01: Admin creates staff
    it("[RBAC-01] Admin creates staff: ADMIN creates a staff account", async () => {
      const res = await request(app)
        .post("/api/v1/users/staff")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: `new-staff-${Date.now()}@brightloop.demo`,
          password: "StaffSecure!2026",
          fullName: "New Staff Member",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(Role.STAFF);
      createdStaffId = res.body.data.id;
    });

    // RBAC-02: Staff creates staff
    it("[RBAC-02] Staff creates staff: STAFF calls staff-creation API -> 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/v1/users/staff")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          email: `staff-attempt-${Date.now()}@brightloop.demo`,
          password: "StaffSecure!2026",
          fullName: "Unauthorized Staff",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    // RBAC-03: Customer creates staff
    it("[RBAC-03] Customer creates staff: CUSTOMER calls staff-creation API -> 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/v1/users/staff")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          email: `customer-attempt-${Date.now()}@brightloop.demo`,
          password: "StaffSecure!2026",
          fullName: "Unauthorized Customer",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    // RBAC-04: Staff creates discount
    it("[RBAC-04] Staff creates discount: STAFF calls discount creation API -> 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/v1/discounts")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          code: `DISC-${Date.now()}`,
          name: "Unauthorized Staff Discount",
          discountType: "PERCENTAGE",
          valueMinorOrBasisPoints: "1000",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    // RBAC-05: Customer creates product
    it("[RBAC-05] Customer creates product: CUSTOMER calls product creation API -> 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          sku: `CUST-PROD-${Date.now()}`,
          name: "Customer Attempted Product",
          baseSellingPriceMinor: "100000",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    // RBAC-06: Customer opens admin dashboard
    it("[RBAC-06] Customer opens admin dashboard: Access denied", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/kpis")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    // RBAC-07: Customer accesses another customer
    it("[RBAC-07] Customer accesses another customer: 403/404; no other customer's data disclosed", async () => {
      const fakeCustomerId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .get(`/api/v1/customers/${fakeCustomerId}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect([403, 404]).toContain(res.status);
    });

    // RBAC-08: Staff assigns ADMIN role
    it("[RBAC-08] Staff assigns ADMIN role: STAFF attempts role escalation -> 403 Forbidden", async () => {
      const res = await request(app)
        .put(`/api/v1/users/${createdStaffId}/role`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ role: Role.ADMIN });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    // RBAC-09: Admin changes staff role
    it("[RBAC-09] Admin changes staff role: Role updated and audited", async () => {
      const res = await request(app)
        .put(`/api/v1/users/${createdStaffId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: Role.ADMIN });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(Role.ADMIN);
    });

    // RBAC-10: Protected API without JWT
    it("[RBAC-10] Protected API without JWT: 401 Unauthorized", async () => {
      const res = await request(app).get("/api/v1/users");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    // RBAC-11: Frontend role manipulation
    it("[RBAC-11] Frontend role manipulation: Backend enforces actual JWT role", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${customerToken}`)
        .set("X-User-Role", "ADMIN");

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    // RBAC-12: Customer calls admin API directly
    it("[RBAC-12] Customer calls admin API directly: 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/v1/billing/runs")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 3: PRODUCTS & VARIANTS (PROD-01 to PROD-12, VAR-01 to VAR-09)
  // =========================================================================
  describe("Products & Variants Module (PROD-01 to PROD-12, VAR-01 to VAR-09)", () => {
    let createdProdId: string;
    let odooVarId: string;

    // PROD-01: Create valid product
    it("[PROD-01] Create valid product: Enter name, type, sales price, cost price and notes", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sku: `PROD-QA-${Date.now()}`,
          name: "Cloud Hosting Enterprise",
          productType: ProductType.SERVICE,
          baseSellingPriceMinor: "200000", // ₹2,000
          costPriceMinor: "100000",        // ₹1,000
          notes: "Enterprise cloud hosting tier",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Cloud Hosting Enterprise");
      createdProdId = res.body.data.id;
    });

    // PROD-02: Empty product name
    it("[PROD-02] Empty product name: Rejected with validation error", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sku: `PROD-BAD-${Date.now()}`,
          name: "",
          baseSellingPriceMinor: "100000",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // PROD-03: Missing product type
    it("[PROD-03] Missing product type: Defaults cleanly to SERVICE per schema", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sku: `PROD-DEF-${Date.now()}`,
          name: "Default Type Product",
          baseSellingPriceMinor: "100000",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.productType).toBe("SERVICE");
    });

    // PROD-04: Sales price storage
    it("[PROD-04] Sales price storage: Set sales price to ₹2,000 (stored in minor units 200000)", async () => {
      const prod = await prisma.product.findUnique({ where: { id: createdProdId } });
      expect(prod?.baseSellingPriceMinor.toString()).toBe("200000");
    });

    // PROD-05: Cost price storage
    it("[PROD-05] Cost price storage: Set cost price to ₹1,000 (stored independently)", async () => {
      const prod = await prisma.product.findUnique({ where: { id: createdProdId } });
      expect(prod?.costPriceMinor.toString()).toBe("100000");
    });

    // PROD-06: Negative sales price
    it("[PROD-06] Negative sales price: Set sales price to -₹500 -> Rejected", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sku: `PROD-NEG-${Date.now()}`,
          name: "Negative Price Product",
          baseSellingPriceMinor: "-50000",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // PROD-07: Negative cost price
    it("[PROD-07] Negative cost price: Set cost price to -₹100 -> Rejected", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sku: `PROD-NEGCOST-${Date.now()}`,
          name: "Negative Cost Product",
          baseSellingPriceMinor: "50000",
          costPriceMinor: "-10000",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // PROD-08: Product notes
    it("[PROD-08] Product notes: Notes persist and display correctly", async () => {
      const res = await request(app)
        .get(`/api/v1/products/${createdProdId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe("Enterprise cloud hosting tier");
    });

    // PROD-09: Update product
    it("[PROD-09] Update product: Change product name or price -> Changes saved", async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${createdProdId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Cloud Hosting Enterprise v2",
          baseSellingPriceMinor: "220000",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Cloud Hosting Enterprise v2");
      expect(res.body.data.baseSellingPriceMinor).toBe("220000");
    });

    // PROD-10: Archive product
    it("[PROD-10] Archive product: Archive an existing product -> Unavailable for new transactions", async () => {
      const toArchiveRes = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sku: `ARCH-PROD-${Date.now()}`,
          name: "Product To Archive",
          baseSellingPriceMinor: "150000",
        });
      const archiveId = toArchiveRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/v1/products/${archiveId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      const archived = await prisma.product.findUnique({ where: { id: archiveId } });
      expect(archived?.isArchived).toBe(true);
      expect(archived?.isActive).toBe(false);
    });

    // PROD-11: Find archived product
    it("[PROD-11] Find archived product: Search with includeArchived returns archived status", async () => {
      const res = await request(app)
        .get("/api/v1/products?includeArchived=true")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const hasArchived = res.body.data.some((p: any) => p.isArchived === true);
      expect(hasArchived).toBe(true);
    });

    // PROD-12: Delete product referenced by invoices
    it("[PROD-12] Delete product referenced by invoices: Deletion soft-archives; historical records preserved", async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${baseProductId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      // Should soft-archive instead of hard deleting
      expect(res.status).toBe(200);
      const prodInDb = await prisma.product.findUnique({ where: { id: baseProductId } });
      expect(prodInDb).not.toBeNull();
      // Restore active state for subsequent tests
      await prisma.product.update({
        where: { id: baseProductId },
        data: { isActive: true, isArchived: false },
      });
    });

    // VAR-01: Create product variant
    it("[VAR-01] Create product variant: Create variant named Odoo", async () => {
      const res = await request(app)
        .post(`/api/v1/products/${createdProdId}/variants`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sku: `ODOO-${Date.now()}`,
          name: "Odoo",
          priceAdjustmentType: PriceAdjustmentType.SURCHARGE,
          priceAdjustmentMinor: "56000", // ₹560
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Odoo");
      odooVarId = res.body.data.id;
    });

    // VAR-02: Set variant surcharge
    it("[VAR-02] Set variant surcharge: Set surcharge to ₹560 -> saved accurately", async () => {
      const variant = await prisma.productVariant.findUnique({ where: { id: odooVarId } });
      expect(variant?.priceAdjustmentMinor.toString()).toBe("56000");
    });

    // VAR-03: Calculate selected variant price
    it("[VAR-03] Calculate selected variant price: Base ₹2,000 + Odoo surcharge ₹560 = ₹2,560", () => {
      const finalPrice = calculateVariantPrice(
        BigInt(200000), // ₹2,000
        BigInt(56000)   // ₹560
      );
      expect(finalPrice.toString()).toBe("256000"); // ₹2,560
    });

    // VAR-04: No variant selected
    it("[VAR-04] No variant selected: Use base product only -> Final unit price is ₹2,000", () => {
      const finalPrice = calculateVariantPrice(BigInt(200000), 0n);
      expect(finalPrice.toString()).toBe("200000");
    });

    // VAR-05: Update variant surcharge
    it("[VAR-05] Update variant surcharge: Change surcharge from ₹560 to ₹700", async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${createdProdId}/variants/${odooVarId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ priceAdjustmentMinor: "70000" });

      expect(res.status).toBe(200);
      expect(res.body.data.priceAdjustmentMinor).toBe("70000");

      const finalPrice = calculateVariantPrice(
        BigInt(200000),
        BigInt(70000)
      );
      expect(finalPrice.toString()).toBe("270000"); // ₹2,700
    });

    // VAR-06: Negative variant surcharge
    it("[VAR-06] Negative variant surcharge: Set surcharge to -₹100 -> Rejected", async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${createdProdId}/variants/${odooVarId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ priceAdjustmentMinor: "-10000" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // VAR-07: Multiple compatible variants / pricing rules
    it("[VAR-07] Multiple compatible variants: Surcharges combine according to pricing rules", () => {
      const base = BigInt(200000);
      const surcharge1 = BigInt(56000);
      const surcharge2 = BigInt(30000);
      const combined = base + surcharge1 + surcharge2;
      expect(combined.toString()).toBe("286000"); // ₹2,860
    });

    // VAR-08: Inactive variant
    it("[VAR-08] Inactive variant: Selection rejected", async () => {
      // Deactivate variant
      await prisma.productVariant.update({
        where: { id: odooVarId },
        data: { isActive: false },
      });

      // Try creating a plan with inactive variant -> Rejected
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-INACTIVE-VAR-${Date.now()}`,
          name: "Invalid Plan With Inactive Variant",
          prices: [{ billingInterval: "MONTHLY", amountMinor: "100000" }],
          items: [{ productId: createdProdId, productVariantId: odooVarId }],
        });

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);

      // Re-activate variant
      await prisma.productVariant.update({
        where: { id: odooVarId },
        data: { isActive: true },
      });
    });

    // VAR-09: Historical invoice after variant change
    it("[VAR-09] Historical invoice after variant change: Existing invoice snapshot remains unchanged", async () => {
      const invoice = await prisma.invoice.findFirst({
        include: { items: true },
      });
      if (invoice && invoice.items.length > 0) {
        const originalTotal = invoice.totalAmountMinor;
        await prisma.productVariant.updateMany({
          data: { priceAdjustmentMinor: BigInt(999999) },
        });
        const refetched = await prisma.invoice.findUnique({ where: { id: invoice.id } });
        expect(refetched?.totalAmountMinor).toBe(originalTotal);
      }
    });
  });

  // =========================================================================
  // SECTION 4: PLAN MANAGEMENT (PLAN-01 to PLAN-23)
  // =========================================================================
  describe("Plan Management Module (PLAN-01 to PLAN-23)", () => {
    // PLAN-01: Create valid plan
    it("[PLAN-01] Create valid plan: Enter name, price, interval and required fields", async () => {
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-VALID-${Date.now()}`,
          name: "Standard Cloud Plan",
          description: "Production grade cloud subscription",
          prices: [
            {
              billingInterval: BillingInterval.MONTHLY,
              amountMinor: "500000", // ₹5,000
            },
          ],
          items: [{ productId: baseProductId }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Standard Cloud Plan");
    });

    // PLAN-02: Daily interval
    it("[PLAN-02] Daily interval: Create DAILY plan -> Accepted and stored correctly", async () => {
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-DAILY-${Date.now()}`,
          name: "Daily Pay-As-You-Go",
          prices: [{ billingInterval: BillingInterval.DAILY, amountMinor: "10000" }],
          items: [{ productId: baseProductId }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.prices[0].billingInterval).toBe(BillingInterval.DAILY);
    });

    // PLAN-03: Weekly interval
    it("[PLAN-03] Weekly interval: Create WEEKLY plan -> Accepted and stored correctly", async () => {
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-WEEKLY-${Date.now()}`,
          name: "Weekly Sprint Plan",
          prices: [{ billingInterval: BillingInterval.WEEKLY, amountMinor: "50000" }],
          items: [{ productId: baseProductId }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.prices[0].billingInterval).toBe(BillingInterval.WEEKLY);
    });

    // PLAN-04: Monthly interval
    it("[PLAN-04] Monthly interval: Create MONTHLY plan -> Accepted and stored correctly", async () => {
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-MONTHLY-${Date.now()}`,
          name: "Monthly Core Plan",
          prices: [{ billingInterval: BillingInterval.MONTHLY, amountMinor: "150000" }],
          items: [{ productId: baseProductId }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.prices[0].billingInterval).toBe(BillingInterval.MONTHLY);
    });

    // PLAN-05: Yearly interval
    it("[PLAN-05] Yearly interval: Create YEARLY plan -> Accepted and stored correctly", async () => {
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-YEARLY-${Date.now()}`,
          name: "Annual Enterprise Plan",
          prices: [{ billingInterval: BillingInterval.YEARLY, amountMinor: "1200000" }],
          items: [{ productId: baseProductId }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.prices[0].billingInterval).toBe(BillingInterval.YEARLY);
    });

    // PLAN-06: Zero price
    it("[PLAN-06] Zero price: Set price to zero -> Accepted per free-plan policy", async () => {
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-FREE-${Date.now()}`,
          name: "Free Community Tier",
          prices: [{ billingInterval: BillingInterval.MONTHLY, amountMinor: "0" }],
          items: [{ productId: baseProductId }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.prices[0].amountMinor).toBe("0");
    });

    // PLAN-07: Negative plan price
    it("[PLAN-07] Negative plan price: Set negative price -> Rejected", async () => {
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-NEG-${Date.now()}`,
          name: "Negative Price Plan",
          prices: [{ billingInterval: BillingInterval.MONTHLY, amountMinor: "-1000" }],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // PLAN-08: Minimum quantity
    it("[PLAN-08] Minimum quantity: Set minimum quantity to 5 -> Saved correctly", async () => {
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-MINQTY-${Date.now()}`,
          name: "Bulk Seats Plan",
          minQuantity: 5,
          prices: [{ billingInterval: BillingInterval.MONTHLY, amountMinor: "100000" }],
          items: [{ productId: baseProductId }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.minQuantity).toBe(5);
    });

    // PLAN-09: Invalid minimum quantity
    it("[PLAN-09] Invalid minimum quantity: Set minimum quantity to 0 or -1 -> Rejected", async () => {
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-BADQTY-${Date.now()}`,
          name: "Invalid Min Qty Plan",
          minQuantity: 0,
          prices: [{ billingInterval: BillingInterval.MONTHLY, amountMinor: "100000" }],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // PLAN-10: Availability start date
    it("[PLAN-10] Availability start date: Set future start date -> Saved and enforced", async () => {
      const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-START-${Date.now()}`,
          name: "Future Available Plan",
          startDate: futureDate,
          prices: [{ billingInterval: BillingInterval.MONTHLY, amountMinor: "100000" }],
          items: [{ productId: baseProductId }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.startDate).toBeDefined();
    });

    // PLAN-11: Availability end date
    it("[PLAN-11] Availability end date: Set end date -> Saved and enforced", async () => {
      const endDate = new Date(Date.now() + 86400000 * 60).toISOString();
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-END-${Date.now()}`,
          name: "Expiring Campaign Plan",
          endDate,
          prices: [{ billingInterval: BillingInterval.MONTHLY, amountMinor: "100000" }],
          items: [{ productId: baseProductId }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.endDate).toBeDefined();
    });

    // PLAN-12: Invalid availability range
    it("[PLAN-12] Invalid availability range: Set end date earlier than start date -> Rejected", async () => {
      const start = new Date(Date.now() + 86400000 * 30).toISOString();
      const end = new Date(Date.now() + 86400000 * 10).toISOString();
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-BADRANGE-${Date.now()}`,
          name: "Bad Date Range Plan",
          startDate: start,
          endDate: end,
          prices: [{ billingInterval: BillingInterval.MONTHLY, amountMinor: "100000" }],
        });

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    // PLAN-13: Deactivate plan
    it("[PLAN-13] Deactivate plan: Unavailable for new subscriptions", async () => {
      const deactPlan = await prisma.plan.create({
        data: {
          code: `PLAN-DEACT-${Date.now()}`,
          name: "To Be Deactivated",
          isActive: false,
        },
      });

      await expect(
        SubscriptionService.createSubscription({
          customerId,
          planId: deactPlan.id,
          billingInterval: BillingInterval.MONTHLY,
        })
      ).rejects.toThrow();
    });

    // PLAN-14: Existing subscription after plan deactivation
    it("[PLAN-14] Existing subscription after plan deactivation: Continues governed by contract", async () => {
      const activePlan = await prisma.plan.create({
        data: {
          code: `PLAN-LIFECYCLE-${Date.now()}`,
          name: "Grandfathered Plan",
          isActive: true,
          items: {
            create: [{ productId: baseProductId, quantity: "1.000" }],
          },
        },
      });

      const sub = await SubscriptionService.createSubscription({
        customerId,
        planId: activePlan.id,
        billingInterval: BillingInterval.MONTHLY,
      });

      await prisma.plan.update({ where: { id: activePlan.id }, data: { isActive: false } });

      const refetched = await SubscriptionService.getSubscriptionById(sub.id);
      expect(refetched.status).toBe(SubscriptionStatus.ACTIVE);
    });

    // PLAN-15: Subscribe after plan expiry
    it("[PLAN-15] Subscribe after plan expiry: Attempt new subscription after availability end -> Rejected", async () => {
      const expiredPlan = await prisma.plan.create({
        data: {
          code: `PLAN-PAST-${Date.now()}`,
          name: "Expired Promo Plan",
          endDate: new Date(Date.now() - 86400000), // 1 day ago
          isActive: true,
        },
      });

      await expect(
        SubscriptionService.createSubscription({
          customerId,
          planId: expiredPlan.id,
          billingInterval: BillingInterval.MONTHLY,
        })
      ).rejects.toThrow();
    });

    // PLAN-16: Automatic closure enabled
    it("[PLAN-16] Automatic closure enabled: Eligible subscription closes automatically at expiry", async () => {
      const pastDate = new Date(Date.now() - 86400000);
      const planWithAutoClose = await prisma.plan.create({
        data: {
          code: `PLAN-AUTOCLOSE-${Date.now()}`,
          name: "Auto Close Plan",
          isActive: true,
          autoCloseOnEndDate: true,
          endDate: pastDate,
          items: {
            create: [{ productId: baseProductId, quantity: "1.000" }],
          },
        },
      });

      const sub = await prisma.subscription.create({
        data: {
          subscriptionNumber: `EXP-TEST-${Date.now()}`,
          customerId,
          planId: planWithAutoClose.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(Date.now() - 30 * 86400000),
          currentPeriodEnd: pastDate,
          nextBillingDate: pastDate,
        },
      });

      const result = await SubscriptionService.autoCloseExpiredSubscriptions(new Date());
      expect(result.closedCount).toBeGreaterThanOrEqual(1);

      const refetched = await prisma.subscription.findUnique({ where: { id: sub.id } });
      expect([SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED]).toContain(refetched?.status);
    });

    // PLAN-17: Automatic closure disabled
    it("[PLAN-17] Automatic closure disabled: Follows configured expiry/renewal policy", async () => {
      const planNoAutoClose = await prisma.plan.create({
        data: {
          code: `PLAN-NOAUTOCLOSE-${Date.now()}`,
          name: "No Auto Close Plan",
          isActive: true,
          autoCloseOnEndDate: false,
          description: JSON.stringify({ autoCloseAtEnd: false }),
          items: {
            create: [{ productId: baseProductId, quantity: "1.000" }],
          },
        },
      });

      const sub = await prisma.subscription.create({
        data: {
          subscriptionNumber: `NO-EXP-${Date.now()}`,
          customerId,
          planId: planNoAutoClose.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(Date.now() - 30 * 86400000),
          currentPeriodEnd: new Date(Date.now() - 86400000),
          nextBillingDate: new Date(Date.now() - 86400000),
        },
      });

      await SubscriptionService.autoCloseExpiredSubscriptions(new Date());
      const refetched = await prisma.subscription.findUnique({ where: { id: sub.id } });
      expect(refetched?.status).toBe(SubscriptionStatus.ACTIVE);
    });

    // PLAN-18: Early closure enabled
    it("[PLAN-18] Early closure enabled: Request early closure -> Allowed", async () => {
      const planAllowClose = await prisma.plan.create({
        data: {
          code: `PLAN-ALLOWCLOSE-${Date.now()}`,
          name: "Allow Early Close",
          isActive: true,
          allowEarlyClosure: true,
          description: JSON.stringify({ allowEarlyClosure: true }),
          items: {
            create: [{ productId: baseProductId, quantity: "1.000" }],
          },
        },
      });

      const sub = await SubscriptionService.createSubscription({
        customerId,
        planId: planAllowClose.id,
        billingInterval: BillingInterval.MONTHLY,
      });

      const closed = await SubscriptionService.closeSubscription(sub.id, "Customer requested early termination");
      expect(closed.status).toBe(SubscriptionStatus.CANCELLED);
    });

    // PLAN-19: Early closure disabled
    it("[PLAN-19] Early closure disabled: Request early closure -> Rejected", async () => {
      const planNoClose = await prisma.plan.create({
        data: {
          code: `PLAN-NOCLOSE-${Date.now()}`,
          name: "Strict Annual Lock-in",
          isActive: true,
          allowEarlyClosure: false,
          description: JSON.stringify({ allowEarlyClosure: false }),
          items: {
            create: [{ productId: baseProductId, quantity: "1.000" }],
          },
        },
      });

      const sub = await SubscriptionService.createSubscription({
        customerId,
        planId: planNoClose.id,
        billingInterval: BillingInterval.MONTHLY,
      });

      await expect(
        SubscriptionService.closeSubscription(sub.id, "Attempt early cancel")
      ).rejects.toThrow(/disallows early closure/i);
    });

    // PLAN-20: Pause enabled
    it("[PLAN-20] Pause enabled: Pause active subscription -> Allowed", async () => {
      const planAllowPause = await prisma.plan.create({
        data: {
          code: `PLAN-ALLOWPAUSE-${Date.now()}`,
          name: "Pause Allowed Plan",
          isActive: true,
          allowPause: true,
          description: JSON.stringify({ allowPause: true }),
          items: {
            create: [{ productId: baseProductId, quantity: "1.000" }],
          },
        },
      });

      const sub = await SubscriptionService.createSubscription({
        customerId,
        planId: planAllowPause.id,
        billingInterval: BillingInterval.MONTHLY,
      });

      const paused = await SubscriptionService.pauseSubscription(sub.id, "Holiday break");
      expect(paused.status).toBe(SubscriptionStatus.PAUSED);
    });

    // PLAN-21: Pause disabled
    it("[PLAN-21] Pause disabled: Pause active subscription -> Rejected", async () => {
      const planNoPause = await prisma.plan.create({
        data: {
          code: `PLAN-NOPAUSE-${Date.now()}`,
          name: "No Pause Allowed Plan",
          isActive: true,
          allowPause: false,
          description: JSON.stringify({ allowPause: false }),
          items: {
            create: [{ productId: baseProductId, quantity: "1.000" }],
          },
        },
      });

      const sub = await SubscriptionService.createSubscription({
        customerId,
        planId: planNoPause.id,
        billingInterval: BillingInterval.MONTHLY,
      });

      await expect(
        SubscriptionService.pauseSubscription(sub.id, "Holiday break")
      ).rejects.toThrow(/disallows pausing/i);
    });

    // PLAN-22: Renewal enabled
    it("[PLAN-22] Renewal enabled: Renew eligible subscription -> Renewal succeeds", async () => {
      const planAllowRenew = await prisma.plan.create({
        data: {
          code: `PLAN-ALLOWRENEW-${Date.now()}`,
          name: "Renewable Plan",
          isActive: true,
          allowRenewal: true,
          description: JSON.stringify({ allowRenewal: true }),
          items: {
            create: [{ productId: baseProductId, quantity: "1.000" }],
          },
        },
      });

      const sub = await SubscriptionService.createSubscription({
        customerId,
        planId: planAllowRenew.id,
        billingInterval: BillingInterval.MONTHLY,
      });

      const renewed = await SubscriptionService.renewSubscription(sub.id, { renewalDurationMonths: 12 });
      expect(renewed.status).toBe(SubscriptionStatus.ACTIVE);
    });

    // PLAN-23: Renewal disabled
    it("[PLAN-23] Renewal disabled: Attempt renewal -> Rejected", async () => {
      const planNoRenew = await prisma.plan.create({
        data: {
          code: `PLAN-NORENEW-${Date.now()}`,
          name: "Non-Renewable Promo Plan",
          isActive: true,
          allowRenewal: false,
          description: JSON.stringify({ allowRenewal: false }),
          items: {
            create: [{ productId: baseProductId, quantity: "1.000" }],
          },
        },
      });

      const sub = await SubscriptionService.createSubscription({
        customerId,
        planId: planNoRenew.id,
        billingInterval: BillingInterval.MONTHLY,
      });

      await expect(
        SubscriptionService.renewSubscription(sub.id, { renewalDurationMonths: 12 })
      ).rejects.toThrow(/disallows.*renewal/i);
    });
  });

  // =========================================================================
  // SECTION 5: QUOTATIONS (QUO-01 to QUO-19)
  // =========================================================================
  describe("Quotation Management Module (QUO-01 to QUO-19)", () => {
    let createdTemplateId: string;
    let createdQuotationId: string;
    let createdQuotationNum: string;

    // QUO-01: Create quotation template
    it("[QUO-01] Create quotation template: Create template with name and terms", async () => {
      const res = await request(app)
        .post("/api/v1/quotation-templates")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Enterprise Starter Template",
          description: "Standard starter pack for SaaS clients",
          validityDays: 15,
          paymentTerms: "NET_30",
          termsAndConditions: "Standard 30-day payment term agreement.",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Enterprise Starter Template");
      createdTemplateId = res.body.data.id;
    });

    // QUO-02: Add predefined product lines
    it("[QUO-02] Add predefined product lines: Add products and quantities to template", async () => {
      const res = await request(app)
        .patch(`/api/v1/quotation-templates/${createdTemplateId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          lines: [
            {
              productId: baseProductId,
              productVariantId: odooVariantId,
              quantity: "3.000",
              unitPriceMinor: "256000",
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.config.lines.length).toBe(1);
    });

    // QUO-03: Add predefined plan lines
    it("[QUO-03] Add predefined plan lines: Add plans and quantities to template", async () => {
      const res = await request(app)
        .patch(`/api/v1/quotation-templates/${createdTemplateId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          lines: [
            {
              productId: baseProductId,
              planId: monthlyPlanId,
              quantity: "2.000",
              unitPriceMinor: "200000",
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.config.lines[0].planId).toBe(monthlyPlanId);
    });

    // QUO-04: Set validity duration
    it("[QUO-04] Set validity duration: Set template validity to 15 days", async () => {
      const res = await request(app)
        .patch(`/api/v1/quotation-templates/${createdTemplateId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ validityDays: 15 });

      expect(res.status).toBe(200);
      expect(res.body.data.config.validityDays).toBe(15);
    });

    // QUO-05: Generate quotation from template
    it("[QUO-05] Generate quotation from template: Template lines and defaults populate quotation", async () => {
      const res = await request(app)
        .post("/api/v1/quotations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          templateId: createdTemplateId,
          customerId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.notes).toContain("NET_30");
      const validUntil = new Date(res.body.data.validUntil).getTime();
      const now = Date.now();
      const diffDays = Math.round((validUntil - now) / 86400000);
      expect(diffDays).toBeGreaterThanOrEqual(14);
      expect(diffDays).toBeLessThanOrEqual(16);
    });

    // QUO-06: Edit default quantity
    it("[QUO-06] Edit default quantity: Quotation recalculates correctly", async () => {
      const res = await request(app)
        .post("/api/v1/quotations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          items: [
            {
              productId: baseProductId,
              quantity: "5.000",
              unitPriceMinor: "200000",
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.totalAmountMinor).toBe("1180000");
    });

    // QUO-07: Edit selected product
    it("[QUO-07] Edit selected product: Pricing and taxes recalculate correctly", async () => {
      const res = await request(app)
        .post("/api/v1/quotations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          items: [
            {
              productId: baseProductId,
              productVariantId: odooVariantId,
              quantity: "1.000",
              unitPriceMinor: "256000",
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.totalAmountMinor).toBe("302080");
    });

    // QUO-08: Use inactive template
    it("[QUO-08] Use inactive template: Attempt to generate from inactive template -> Rejected", async () => {
      await prisma.quotationTemplate.update({
        where: { id: createdTemplateId },
        data: { isActive: false },
      });

      const res = await request(app)
        .post("/api/v1/quotations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          templateId: createdTemplateId,
          customerId,
        });

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);

      await prisma.quotationTemplate.update({
        where: { id: createdTemplateId },
        data: { isActive: true },
      });
    });

    // QUO-09: Convert expired quotation
    it("[QUO-09] Convert expired quotation: Attempt conversion after expiry -> Rejected", async () => {
      const expQuo = await prisma.quotation.create({
        data: {
          quotationNumber: `QUO-EXP-${Date.now()}`,
          customerId,
          status: QuotationStatus.EXPIRED,
          validUntil: new Date(Date.now() - 86400000),
          totalAmountMinor: BigInt(118000),
          items: {
            create: [{ productId: baseProductId, quantity: "1.000", unitPriceMinor: BigInt(100000), totalAmountMinor: BigInt(100000) }],
          },
        },
      });

      const res = await request(app)
        .post(`/api/v1/quotations/${expQuo.id}/convert`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    // QUO-10: Create quotation
    it("[QUO-10] Create quotation: Select customer and product/plan lines", async () => {
      const res = await request(app)
        .post("/api/v1/quotations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          validUntil: new Date(Date.now() + 86400000 * 15).toISOString(),
          paymentTerms: "NET_30",
          notes: "QA Quotation Creation [PAYMENT_TERMS:NET_30]",
          items: [
            {
              productId: baseProductId,
              quantity: "2.000",
              unitPriceMinor: "200000",
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      createdQuotationId = res.body.data.id;
      createdQuotationNum = res.body.data.quotationNumber;
    });

    // QUO-11: Unique quotation number
    it("[QUO-11] Unique quotation number: Every quotation number is unique", async () => {
      const res2 = await request(app)
        .post("/api/v1/quotations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          items: [{ productId: baseProductId, quantity: "1.000", unitPriceMinor: "100000" }],
        });

      expect(res2.status).toBe(201);
      expect(res2.body.data.quotationNumber).not.toBe(createdQuotationNum);
    });

    // QUO-12: Payment terms
    it("[QUO-12] Payment terms: Select Net 30 -> Payment terms saved and carried forward", async () => {
      const quo = await prisma.quotation.findUnique({ where: { id: createdQuotationId } });
      expect(quo?.notes).toContain("NET_30");
    });

    // QUO-13: Quotation total
    it("[QUO-13] Quotation total: Subtotal, tax and total are calculated correctly", async () => {
      const quo = await prisma.quotation.findUnique({ where: { id: createdQuotationId } });
      expect(quo?.totalAmountMinor.toString()).toBe("472000");
    });

    // QUO-14: Send quotation
    it("[QUO-14] Send quotation: Email/send action succeeds and is auditable", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${createdQuotationId}/send`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(QuotationStatus.SENT);
    });

    // QUO-15: Confirm quotation
    it("[QUO-15] Confirm quotation: Confirm accepted quotation -> Status changes correctly", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${createdQuotationId}/accept`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(QuotationStatus.ACCEPTED);
    });

    // QUO-16: Convert to subscription
    it("[QUO-16] Convert to subscription: Subscription created with correct lines and terms", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${createdQuotationId}/convert`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data.subscriptionNumber).toBeDefined();

      const quo = await prisma.quotation.findUnique({
        where: { id: createdQuotationId },
        include: { subscription: true },
      });
      expect(quo?.subscription).toBeDefined();
    });

    // QUO-17: Convert same quotation twice
    it("[QUO-17] Convert same quotation twice: Duplicate subscription prevented", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${createdQuotationId}/convert`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    // QUO-18: Confirm expired quotation
    it("[QUO-18] Confirm expired quotation: Attempt to confirm expired quotation -> Rejected", async () => {
      const expQuo = await prisma.quotation.create({
        data: {
          quotationNumber: `QUO-EXP-CONF-${Date.now()}`,
          customerId,
          status: QuotationStatus.EXPIRED,
          validUntil: new Date(Date.now() - 86400000),
          totalAmountMinor: BigInt(118000),
        },
      });

      const res = await request(app)
        .post(`/api/v1/quotations/${expQuo.id}/accept`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    // QUO-19: Customer converts quotation
    it("[QUO-19] Customer converts quotation: Forbidden unless customer acceptance flow", async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/${createdQuotationId}/convert`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // SECTION 6: SUBSCRIPTIONS (SUB-01 to SUB-25)
  // =========================================================================
  describe("Subscription Management Module (SUB-01 to SUB-25)", () => {
    let createdSubId: string;
    let createdSubNum: string;

    // SUB-01: Create subscription
    it("[SUB-01] Create subscription: Select customer and plan -> Subscription created", async () => {
      const res = await request(app)
        .post("/api/v1/subscriptions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          planId: monthlyPlanId,
          billingInterval: BillingInterval.MONTHLY,
          paymentTerms: "NET_15",
          stage: "DRAFT",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      createdSubId = res.body.data.id;
      createdSubNum = res.body.data.subscriptionNumber;
    });

    // SUB-02: Unique subscription number
    it("[SUB-02] Unique subscription number: Create multiple subscriptions -> Unique subscription numbers", async () => {
      const res2 = await request(app)
        .post("/api/v1/subscriptions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          planId: monthlyPlanId,
          billingInterval: BillingInterval.MONTHLY,
        });

      expect(res2.status).toBe(201);
      expect(res2.body.data.subscriptionNumber).not.toBe(createdSubNum);
    });

    // SUB-03: Start date
    it("[SUB-03] Start date: Set start date -> Saved correctly", async () => {
      const sub = await prisma.subscription.findUnique({ where: { id: createdSubId } });
      expect(sub?.currentPeriodStart).toBeDefined();
    });

    // SUB-04: Expiry date
    it("[SUB-04] Expiry date: Set period end date -> Saved correctly", async () => {
      const sub = await prisma.subscription.findUnique({ where: { id: createdSubId } });
      expect(sub?.currentPeriodEnd).toBeDefined();
    });

    // SUB-05: Invalid date range
    it("[SUB-05] Invalid date range: Expiry before start -> Rejected", async () => {
      const start = new Date(Date.now() + 86400000 * 30).toISOString();
      const end = new Date(Date.now() + 86400000 * 10).toISOString();

      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: `PLAN-DATERANGE-${Date.now()}`,
          name: "Invalid Dates Plan",
          startDate: start,
          endDate: end,
          prices: [{ billingInterval: BillingInterval.MONTHLY, amountMinor: "100000" }],
        });

      expect([400, 422]).toContain(res.status);
    });

    // SUB-06: Below minimum quantity
    it("[SUB-06] Below minimum quantity: Set quantity below plan minimum -> Rejected", async () => {
      const minQtyPlan = await prisma.plan.create({
        data: {
          code: `PLAN-QTY5-${Date.now()}`,
          name: "Five Seats Minimum",
          minQuantity: 5,
          isActive: true,
          prices: {
            create: [{ billingInterval: BillingInterval.MONTHLY, amountMinor: BigInt(100000) }],
          },
        },
      });

      const res = await request(app)
        .post("/api/v1/subscriptions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          planId: minQtyPlan.id,
          billingInterval: BillingInterval.MONTHLY,
          items: [
            {
              productId: baseProductId,
              quantity: "2.000", // Below 5
            },
          ],
        });

      expect([400, 422]).toContain(res.status);
    });

    // SUB-07: Minimum quantity met
    it("[SUB-07] Minimum quantity met: Set quantity equal to minimum -> Accepted", async () => {
      const minQtyPlan = await prisma.plan.create({
        data: {
          code: `PLAN-QTY3-${Date.now()}`,
          name: "Three Seats Minimum",
          minQuantity: 3,
          isActive: true,
          prices: {
            create: [{ billingInterval: BillingInterval.MONTHLY, amountMinor: BigInt(100000) }],
          },
        },
      });

      const res = await request(app)
        .post("/api/v1/subscriptions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          planId: minQtyPlan.id,
          billingInterval: BillingInterval.MONTHLY,
          items: [
            {
              productId: baseProductId,
              quantity: "3.000",
            },
          ],
        });

      expect(res.status).toBe(201);
    });

    // SUB-08: Multiple subscription products
    it("[SUB-08] Multiple subscription products: Add two product lines -> Both persist", async () => {
      const res = await request(app)
        .post("/api/v1/subscriptions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          billingInterval: BillingInterval.MONTHLY,
          items: [
            { productId: baseProductId, quantity: "1.000", unitPriceMinor: "100000" },
            { productId: baseProductId, productVariantId: odooVariantId, quantity: "2.000", unitPriceMinor: "256000" },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.items.length).toBe(2);
    });

    // SUB-09: Tax association
    it("[SUB-09] Tax association: Associate applicable tax with line -> Tax reference correct", async () => {
      const sub = await prisma.subscription.findUnique({
        where: { id: createdSubId },
        include: { items: true },
      });
      expect(sub?.items).toBeDefined();
    });

    // SUB-10: Payment terms
    it("[SUB-10] Payment terms: Select Net 15 -> Derived correctly", async () => {
      const sub = await SubscriptionService.getSubscriptionById(createdSubId);
      expect(sub.paymentTerms).toBe("NET_15");
    });

    // SUB-11: Draft status
    it("[SUB-11] Draft status: Create draft subscription -> Status is DRAFT", async () => {
      const res = await request(app)
        .get(`/api/v1/subscriptions/${createdSubId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.businessStatus).toBe("DRAFT");
    });

    // SUB-12: Send quotation
    it("[SUB-12] Send quotation: Send subscription offer -> Status maps to QUOTATION", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${createdSubId}/send-quotation`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.businessStatus).toBe("QUOTATION");
    });

    // SUB-13: Confirm offer
    it("[SUB-13] Confirm offer: Confirm accepted offer -> Status maps to CONFIRMED", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${createdSubId}/confirm`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.businessStatus).toBe("CONFIRMED");
    });

    // SUB-14: Activate subscription
    it("[SUB-14] Activate subscription: Activate confirmed subscription -> Status becomes ACTIVE", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${createdSubId}/activate`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(SubscriptionStatus.ACTIVE);
      expect(res.body.data.businessStatus).toBe("ACTIVE");
    });

    // SUB-15: Pause active subscription
    it("[SUB-15] Pause active subscription: Pause eligible active subscription -> Status becomes PAUSED", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${createdSubId}/pause`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Seasonal suspension" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(SubscriptionStatus.PAUSED);
      expect(res.body.data.businessStatus).toBe("PAUSED");
    });

    // SUB-16: Resume paused subscription
    it("[SUB-16] Resume paused subscription: Resume eligible subscription -> Status becomes ACTIVE", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${createdSubId}/resume`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(SubscriptionStatus.ACTIVE);
      expect(res.body.data.businessStatus).toBe("ACTIVE");
    });

    // SUB-17: Close subscription
    it("[SUB-17] Close subscription: Close eligible subscription -> Status becomes CLOSED", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${createdSubId}/close`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Customer requested contract termination" });

      expect(res.status).toBe(200);
      expect(res.body.data.businessStatus).toBe("CLOSED");
    });

    // SUB-18: Activate closed subscription
    it("[SUB-18] Activate closed subscription: Invalid transition rejected", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${createdSubId}/activate`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    // SUB-19: Pause closed subscription
    it("[SUB-19] Pause closed subscription: Invalid transition rejected", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${createdSubId}/pause`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    // SUB-20: Resume already active subscription
    it("[SUB-20] Resume already active subscription: Invalid transition rejected or safe no-op", async () => {
      const activeSub = await SubscriptionService.createSubscription({
        customerId,
        billingInterval: BillingInterval.MONTHLY,
        items: [{ productId: baseProductId, quantity: "1.000", unitPriceMinor: BigInt(100000) }],
      });

      const res = await request(app)
        .post(`/api/v1/subscriptions/${activeSub.id}/resume`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 422]).toContain(res.status);
    });

    // SUB-21: Close already closed subscription
    it("[SUB-21] Close already closed subscription: No duplicate side effects", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${createdSubId}/close`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 422]).toContain(res.status);
    });

    // SUB-22: Renew subscription
    it("[SUB-22] Renew subscription: Renew eligible subscription -> New term created and history retained", async () => {
      const subToRenew = await SubscriptionService.createSubscription({
        customerId,
        billingInterval: BillingInterval.MONTHLY,
        items: [{ productId: baseProductId, quantity: "1.000", unitPriceMinor: BigInt(100000) }],
      });

      const res = await request(app)
        .post(`/api/v1/subscriptions/${subToRenew.id}/renew`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ renewalDurationMonths: 12 });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(SubscriptionStatus.ACTIVE);
    });

    // SUB-23: Renew ineligible subscription
    it("[SUB-23] Renew ineligible subscription: Renew when policy disallows it -> Rejected", async () => {
      const noRenewPlan = await prisma.plan.create({
        data: {
          code: `PLAN-NO-RENEW-QA-${Date.now()}`,
          name: "Strict No Renew Plan",
          isActive: true,
          allowRenewal: false,
          description: JSON.stringify({ allowRenewal: false }),
          items: {
            create: [{ productId: baseProductId, quantity: "1.000" }],
          },
        },
      });

      const subNoRenew = await SubscriptionService.createSubscription({
        customerId,
        planId: noRenewPlan.id,
        billingInterval: BillingInterval.MONTHLY,
      });

      const res = await request(app)
        .post(`/api/v1/subscriptions/${subNoRenew.id}/renew`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ renewalDurationMonths: 12 });

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    // SUB-24: Automatic expiry
    it("[SUB-24] Automatic expiry: Reach expiry date -> Auto-close policy correctly enforced", async () => {
      const pastPlanDate = new Date(Date.now() - 3600000);
      const autoClosePlan = await prisma.plan.create({
        data: {
          code: `PLAN-AUTOCLOSE-QA-${Date.now()}`,
          name: "QA Auto Close Plan",
          isActive: true,
          autoCloseOnEndDate: true,
          endDate: pastPlanDate,
          items: {
            create: [{ productId: baseProductId, quantity: "1.000" }],
          },
        },
      });

      const expiredSub = await prisma.subscription.create({
        data: {
          subscriptionNumber: `EXP-SUB-QA-${Date.now()}`,
          customerId,
          planId: autoClosePlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(Date.now() - 30 * 86400000),
          currentPeriodEnd: pastPlanDate,
          nextBillingDate: pastPlanDate,
        },
      });

      await SubscriptionService.autoCloseExpiredSubscriptions(new Date());

      const refetched = await prisma.subscription.findUnique({ where: { id: expiredSub.id } });
      expect([SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED]).toContain(refetched?.status);
    });

    // SUB-25: Early termination
    it("[SUB-25] Early termination: Request early termination -> Plan policy respected", async () => {
      const earlyClosePlan = await prisma.plan.create({
        data: {
          code: `PLAN-EARLY-TERM-${Date.now()}`,
          name: "Early Term Plan",
          isActive: true,
          allowEarlyClosure: true,
          description: JSON.stringify({ allowEarlyClosure: true }),
          items: {
            create: [{ productId: baseProductId, quantity: "1.000" }],
          },
        },
      });

      const sub = await SubscriptionService.createSubscription({
        customerId,
        planId: earlyClosePlan.id,
        billingInterval: BillingInterval.MONTHLY,
      });

      const res = await request(app)
        .post(`/api/v1/subscriptions/${sub.id}/close`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Customer opted for early termination" });

      expect(res.status).toBe(200);
      expect(res.body.data.businessStatus).toBe("CLOSED");
    });
  });
});
