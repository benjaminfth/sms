import request from "supertest";
import app from "../app";
import { prisma } from "../database/prisma";
import { generateAccessToken } from "../utils/token";
import { Role, SettingsCategory } from "@sms/shared";

describe("Admin Settings Module — Integration Test Suite", () => {
  let adminToken: string;
  let staffToken: string;
  let customerToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    // 1. Fetch or create Admin
    let admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          email: "admin-settings-test@brightloop.demo",
          passwordHash: "dummyHash123!",
          fullName: "Admin Test",
          role: Role.ADMIN,
          isActive: true,
        },
      });
    }
    adminUserId = admin.id;
    adminToken = generateAccessToken({
      userId: admin.id,
      email: admin.email,
      role: Role.ADMIN,
    });

    // 2. Fetch or create Staff
    let staff = await prisma.user.findFirst({ where: { role: Role.STAFF } });
    if (!staff) {
      staff = await prisma.user.create({
        data: {
          email: "staff-settings-test@brightloop.demo",
          passwordHash: "dummyHash123!",
          fullName: "Staff Test",
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

    // 3. Fetch or create Customer
    let customerUser = await prisma.user.findFirst({ where: { role: Role.CUSTOMER } });
    if (!customerUser) {
      customerUser = await prisma.user.create({
        data: {
          email: "cust-settings-test@brightloop.demo",
          passwordHash: "dummyHash123!",
          fullName: "Customer Test",
          role: Role.CUSTOMER,
          isActive: true,
        },
      });
    }
    customerToken = generateAccessToken({
      userId: customerUser.id,
      email: customerUser.email,
      role: Role.CUSTOMER,
    });
  });

  // ========================================================
  // 1. Authentication & RBAC Enforcement
  // ========================================================
  describe("Authentication & RBAC Security", () => {
    it("should return 401 Unauthorized when requesting settings without token", async () => {
      const res = await request(app).get("/api/v1/settings");
      expect(res.status).toBe(401);
    });

    it("should return 403 Forbidden when STAFF tries to view settings", async () => {
      const res = await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${staffToken}`);
      expect(res.status).toBe(403);
    });

    it("should return 403 Forbidden when CUSTOMER tries to view settings", async () => {
      const res = await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it("should return 403 Forbidden when STAFF tries to modify settings", async () => {
      const res = await request(app)
        .put("/api/v1/settings/general")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ organizationName: "Hacked" });
      expect(res.status).toBe(403);
    });

    it("should return 403 Forbidden when CUSTOMER tries to modify settings", async () => {
      const res = await request(app)
        .put("/api/v1/settings/general")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ organizationName: "Hacked" });
      expect(res.status).toBe(403);
    });
  });

  // ========================================================
  // 2. Fetching Settings as ADMIN
  // ========================================================
  describe("Admin Settings Retrieval", () => {
    it("should fetch all 9 settings categories successfully as ADMIN", async () => {
      const res = await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const { general, company, billing, invoices, subscriptions, notifications, security, regional, system } =
        res.body.data;

      // 1. General defaults
      expect(general).toBeDefined();
      expect(general.defaultCurrency).toBe("INR");
      expect(general.defaultTimeZone).toBe("Asia/Kolkata");

      // 2. Company profile defaults
      expect(company).toBeDefined();
      expect(company.legalCompanyName).toBeDefined();

      // 3. Billing defaults
      expect(billing).toBeDefined();
      expect(billing.defaultPaymentTerms).toBeDefined();
      expect(billing.allowPartialPayments).toBe(true);

      // 4. Invoice defaults
      expect(invoices).toBeDefined();
      expect(invoices.invoicePrefix).toBe("INV");
      expect(invoices.startingInvoiceNumber).toBe(1);

      // 5. Subscription defaults
      expect(subscriptions).toBeDefined();
      expect(subscriptions.defaultBillingCycle).toBe("MONTHLY");

      // 6. Notification defaults
      expect(notifications).toBeDefined();
      expect(notifications.customerInvoiceGenerated).toBe(true);

      // 7. Security defaults
      expect(security).toBeDefined();
      expect(security.minPasswordLength).toBeGreaterThanOrEqual(8);

      // 8. Regional defaults
      expect(regional).toBeDefined();
      expect(regional.defaultCurrency).toBe("INR");

      // 9. System information
      expect(system).toBeDefined();
      expect(system.appName).toBe("Brightloop SMS");
      expect(system.databaseConnectionStatus).toBe("CONNECTED");
      expect(typeof system.totalInvoices).toBe("number");
    });

    it("should fetch a specific category via GET /api/v1/settings/:category", async () => {
      const res = await request(app)
        .get(`/api/v1/settings/${SettingsCategory.BILLING}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.defaultCurrency).toBe("INR");
      expect(res.body.data.allowMultiplePaymentsPerInvoice).toBe(true);
    });
  });

  // ========================================================
  // 3. Category Updates & Persistence
  // ========================================================
  describe("Settings Persistence & Validation", () => {
    it("should update General settings and persist them in PostgreSQL", async () => {
      const updateData = {
        organizationName: "Brightloop Global Test Org",
        displayName: "Brightloop Global",
        supportEmail: "global-support@brightloop.test",
        supportPhone: "+91 99999 88888",
        websiteUrl: "https://global.brightloop.test",
        defaultCurrency: "INR",
        defaultTimeZone: "Asia/Kolkata",
        defaultLanguage: "en",
        dateFormat: "DD/MM/YYYY",
        numberFormat: "en-IN",
      };

      const putRes = await request(app)
        .put("/api/v1/settings/general")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData);

      expect(putRes.status).toBe(200);
      expect(putRes.body.success).toBe(true);
      expect(putRes.body.data.organizationName).toBe("Brightloop Global Test Org");
      expect(putRes.body.data.supportEmail).toBe("global-support@brightloop.test");

      // Verify persistence in DB directly
      const dbRow = await prisma.systemSetting.findUnique({
        where: {
          category_key: {
            category: "general",
            key: "organizationName",
          },
        },
      });
      expect(dbRow).not.toBeNull();
      expect(dbRow!.value).toBe("Brightloop Global Test Org");

      // Verify retrieval returns the updated values
      const getRes = await request(app)
        .get("/api/v1/settings/general")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.organizationName).toBe("Brightloop Global Test Org");
    });

    it("should reject invalid email in General settings with 400 Bad Request", async () => {
      const invalidData = {
        organizationName: "Brightloop Test",
        displayName: "Brightloop",
        supportEmail: "invalid-email-format",
        supportPhone: "123",
        websiteUrl: "https://brightloop.io",
        defaultCurrency: "INR",
        defaultTimeZone: "Asia/Kolkata",
        defaultLanguage: "en",
        dateFormat: "DD/MM/YYYY",
        numberFormat: "en-IN",
      };

      const res = await request(app)
        .put("/api/v1/settings/general")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject security settings when minPasswordLength is less than 8", async () => {
      const invalidSecurity = {
        minPasswordLength: 4, // Too short
        requireUppercase: true,
        requireLowercase: true,
        requireSpecialCharacter: true,
        sessionExpirationDurationMinutes: 1440,
        maxFailedLoginAttempts: 5,
        accountLockoutDurationMinutes: 15,
        requireEmailVerification: false,
      };

      const res = await request(app)
        .put("/api/v1/settings/security")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidSecurity);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should update Security settings successfully and persist", async () => {
      const validSecurity = {
        minPasswordLength: 10,
        requireUppercase: true,
        requireLowercase: true,
        requireSpecialCharacter: true,
        sessionExpirationDurationMinutes: 720,
        maxFailedLoginAttempts: 4,
        accountLockoutDurationMinutes: 30,
        requireEmailVerification: true,
      };

      const res = await request(app)
        .put("/api/v1/settings/security")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validSecurity);

      expect(res.status).toBe(200);
      expect(res.body.data.minPasswordLength).toBe(10);
      expect(res.body.data.sessionExpirationDurationMinutes).toBe(720);
    });
  });

  // ========================================================
  // 4. Company Logo Upload and Delete
  // ========================================================
  describe("Company Logo Management", () => {
    it("should reject logo upload if not a valid base64 image data URL", async () => {
      const res = await request(app)
        .post("/api/v1/settings/company/logo")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ logo: "not-a-data-url" });

      expect(res.status).toBe(400);
    });

    it("should successfully upload and persist a company logo", async () => {
      // Small 1x1 transparent PNG data url
      const samplePng =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const res = await request(app)
        .post("/api/v1/settings/company/logo")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ logo: samplePng });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logoUrl).toBe(samplePng);

      // Verify in company profile settings
      const compRes = await request(app)
        .get("/api/v1/settings/company")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(compRes.body.data.companyLogo).toBe(samplePng);
    });

    it("should remove company logo upon DELETE /api/v1/settings/company/logo", async () => {
      const res = await request(app)
        .delete("/api/v1/settings/company/logo")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const compRes = await request(app)
        .get("/api/v1/settings/company")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(compRes.body.data.companyLogo).toBeNull();
    });
  });

  // ========================================================
  // 5. Test Email Endpoint
  // ========================================================
  describe("Notification Test Email", () => {
    it("should send a test email to a valid email address", async () => {
      const res = await request(app)
        .post("/api/v1/settings/notifications/test-email")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ recipientEmail: "admin-verify@brightloop.demo" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recipient).toBe("admin-verify@brightloop.demo");
    });

    it("should reject test email with invalid email address", async () => {
      const res = await request(app)
        .post("/api/v1/settings/notifications/test-email")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ recipientEmail: "invalid-email" });

      expect(res.status).toBe(400);
    });
  });

  // ========================================================
  // 6. System Health & Diagnostic Endpoints
  // ========================================================
  describe("System Diagnostic & Health", () => {
    it("should return healthy status on GET /api/v1/settings/system/health", async () => {
      const res = await request(app)
        .get("/api/v1/settings/system/health")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("healthy");
      expect(res.body.data.database).toBe("connected");
      expect(res.body.data.timestamp).toBeDefined();
    });

    it("should verify no secrets or credentials are leaked in system information", async () => {
      const res = await request(app)
        .get("/api/v1/settings/system")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.appName).toBe("Brightloop SMS");
      expect(data.databaseConnectionStatus).toBe("CONNECTED");

      // Verify no sensitive credentials leaked
      const stringified = JSON.stringify(data);
      expect(stringified).not.toContain("password");
      expect(stringified).not.toContain("secret");
      expect(stringified).not.toContain("DATABASE_URL");
      expect(stringified).not.toContain("JWT");
      expect(stringified).not.toContain("SMTP_PASS");
    });
  });

  // ========================================================
  // 7. Audit Logging Verification
  // ========================================================
  describe("Audit Trail Recording", () => {
    it("should record an audit log when settings are modified", async () => {
      const auditBefore = await prisma.auditLog.count({
        where: {
          actorUserId: adminUserId,
          action: "UPDATE_SETTINGS",
        },
      });

      await request(app)
        .put("/api/v1/settings/billing")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          defaultCurrency: "INR",
          defaultPaymentTerms: "30_DAYS",
          defaultPaymentMethod: "UPI",
          allowPartialPayments: true,
          allowMultiplePaymentsPerInvoice: true,
          autoMarkPaidWhenFullyPaid: true,
          paymentInstructions: "Updated test instructions",
          bankAccountDetails: {
            bankName: "HDFC Bank",
            accountNumber: "1234567890",
            accountName: "Brightloop",
            ifscCode: "HDFC0001234",
            branch: "Indiranagar",
          },
        });

      const auditAfter = await prisma.auditLog.count({
        where: {
          actorUserId: adminUserId,
          action: "UPDATE_SETTINGS",
        },
      });

      expect(auditAfter).toBeGreaterThan(auditBefore);
    });
  });
});
