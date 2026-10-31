import { prisma } from "../database/prisma";
import {
  AllSettingsDTO,
  GeneralSettingsDTO,
  CompanyProfileDTO,
  BillingPaymentsSettingsDTO,
  InvoiceSettingsDTO,
  SubscriptionSettingsDTO,
  NotificationSettingsDTO,
  SecuritySettingsDTO,
  RegionalPreferencesDTO,
  SystemInformationDTO,
  SettingsCategory,
} from "@sms/shared";
import { NotFoundError, ValidationError } from "../utils/errors";
import { createAuditLog } from "./audit.service";
import { EmailService } from "./email/email.service";

// Canonical in-code default settings
const DEFAULT_SETTINGS: {
  general: GeneralSettingsDTO;
  company: CompanyProfileDTO;
  billing: BillingPaymentsSettingsDTO;
  invoices: InvoiceSettingsDTO;
  subscriptions: SubscriptionSettingsDTO;
  notifications: NotificationSettingsDTO;
  security: SecuritySettingsDTO;
  regional: RegionalPreferencesDTO;
} = {
  general: {
    organizationName: "Brightloop Technologies Private Limited",
    displayName: "Brightloop",
    supportEmail: "support@brightloop.demo",
    supportPhone: "+91 80 4123 4567",
    websiteUrl: "https://brightloop.demo",
    defaultCurrency: "INR",
    defaultTimeZone: "Asia/Kolkata",
    defaultLanguage: "en",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-IN",
  },
  company: {
    legalCompanyName: "Brightloop Technologies Private Limited",
    displayName: "Brightloop",
    companyLogo: null,
    businessEmail: "billing@brightloop.demo",
    phoneNumber: "+91 80 4123 4567",
    website: "https://brightloop.demo",
    addressLine1: "Prestige Tech Park, Outer Ring Road",
    addressLine2: "Tower 2, 4th Floor, Marathahalli",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560103",
    country: "India",
    taxRegistrationNumber: "29AAAAA0000A1Z5",
    companyRegistrationNumber: "U72200KA2024PTC123456",
  },
  billing: {
    defaultCurrency: "INR",
    defaultPaymentTerms: "15_DAYS",
    defaultPaymentMethod: "UPI",
    allowPartialPayments: true,
    allowMultiplePaymentsPerInvoice: true,
    autoMarkPaidWhenFullyPaid: true,
    paymentInstructions: "Please quote the invoice number in your payment transaction remarks. Settlements are reconciled automatically.",
    bankAccountDetails: {
      bankName: "HDFC Bank Ltd",
      accountNumber: "50200012345678",
      accountName: "Brightloop Technologies Pvt Ltd",
      ifscCode: "HDFC0001234",
      branch: "Koramangala, Bengaluru",
    },
  },
  invoices: {
    invoicePrefix: "INV",
    startingInvoiceNumber: 1,
    nextInvoiceNumber: 1,
    numberFormat: "INV-YYYY-XXXX",
    defaultDueDays: 15,
    defaultInvoiceFooter: "Thank you for partnering with Brightloop. For queries, contact billing@brightloop.demo",
    defaultInvoiceNotes: "All invoices are payable within agreed credit terms. Late settlements may incur statutory interest.",
    displayCompanyLogo: true,
    displayTaxBreakdown: true,
    displayCustomerAddress: true,
    displayPaymentInstructions: true,
    autoGenerateRecurringInvoices: true,
    autoSendInvoiceEmail: true,
    autoMarkOverdueInvoices: true,
  },
  subscriptions: {
    defaultSubscriptionStatus: "ACTIVE",
    defaultBillingCycle: "MONTHLY",
    defaultTrialPeriodDays: 0,
    allowSubscriptionPause: true,
    allowSubscriptionResume: true,
    allowEarlyCancellation: true,
    allowSubscriptionRenewal: true,
    autoRenewEligibleSubscriptions: true,
    sendRenewalReminder: true,
    renewalReminderDaysBefore: 7,
    sendExpiryReminder: true,
    expiryReminderDaysBefore: 3,
  },
  notifications: {
    customerWelcomeEmail: true,
    customerPasswordResetEmail: true,
    customerQuotationCreated: true,
    customerQuotationAccepted: true,
    customerQuotationRejected: true,
    customerSubscriptionActivated: true,
    customerSubscriptionPaused: true,
    customerSubscriptionResumed: true,
    customerSubscriptionCancelled: true,
    customerSubscriptionRenewed: true,
    customerInvoiceGenerated: true,
    customerInvoiceDueReminder: true,
    customerPaymentReceived: true,
    customerPaymentFailed: true,
    customerSubscriptionExpiryReminder: true,
    adminNewCustomerRegistration: true,
    adminNewSubscriptionCreated: true,
    adminPaymentReceived: true,
    adminPaymentFailed: true,
    adminInvoiceOverdue: true,
    adminBillingGenerationFailed: true,
    adminNotificationEmail: "admin@brightloop.demo",
    senderDisplayName: "Brightloop Billing System",
    senderEmailAddress: "billing@brightloop.demo",
    emailProviderStatus: "CONFIGURED",
  },
  security: {
    minPasswordLength: 9,
    requireUppercase: true,
    requireLowercase: true,
    requireSpecialCharacter: true,
    sessionExpirationDurationMinutes: 60,
    maxFailedLoginAttempts: 5,
    accountLockoutDurationMinutes: 15,
    requireEmailVerification: false,
  },
  regional: {
    defaultCurrency: "INR",
    timeZone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12_HOUR",
    numberFormat: "en-IN",
    decimalPrecision: 2,
    taxDisplayFormat: "EXCLUSIVE",
  },
};

export class SettingsService {
  private static cache: Map<string, any> = new Map();
  private static cacheTime = 0;
  private static CACHE_TTL_MS = 30000; // 30 seconds

  private static invalidateCache() {
    this.cache.clear();
    this.cacheTime = 0;
  }

  /**
   * Fetch all settings categories, merging database records with authoritative defaults.
   */
  static async getAllSettings(): Promise<AllSettingsDTO> {
    const [
      general,
      company,
      billing,
      invoices,
      subscriptions,
      notifications,
      security,
      regional,
      system,
    ] = await Promise.all([
      this.getCategorySettings<GeneralSettingsDTO>(SettingsCategory.GENERAL),
      this.getCategorySettings<CompanyProfileDTO>(SettingsCategory.COMPANY),
      this.getCategorySettings<BillingPaymentsSettingsDTO>(SettingsCategory.BILLING),
      this.getCategorySettings<InvoiceSettingsDTO>(SettingsCategory.INVOICES),
      this.getCategorySettings<SubscriptionSettingsDTO>(SettingsCategory.SUBSCRIPTIONS),
      this.getCategorySettings<NotificationSettingsDTO>(SettingsCategory.NOTIFICATIONS),
      this.getCategorySettings<SecuritySettingsDTO>(SettingsCategory.SECURITY),
      this.getCategorySettings<RegionalPreferencesDTO>(SettingsCategory.REGIONAL),
      this.getSystemInformation(),
    ]);

    return {
      general,
      company,
      billing,
      invoices,
      subscriptions,
      notifications,
      security,
      regional,
      system,
    };
  }

  /**
   * Fetch a single category's settings, merging persisted keys over defaults.
   */
  static async getCategorySettings<T>(category: SettingsCategory | string): Promise<T> {
    const cat = category.toLowerCase();
    const cacheKey = `cat_${cat}`;

    if (this.cache.has(cacheKey) && Date.now() - this.cacheTime < this.CACHE_TTL_MS) {
      return this.cache.get(cacheKey) as T;
    }

    if (cat === SettingsCategory.SYSTEM) {
      return (await this.getSystemInformation()) as unknown as T;
    }

    const defaultCat = (DEFAULT_SETTINGS as any)[cat];
    if (!defaultCat) {
      throw new NotFoundError(`Settings category '${category}' not found`);
    }

    const rows = await prisma.systemSetting.findMany({
      where: { category: cat },
    });

    const result = { ...defaultCat };
    for (const row of rows) {
      try {
        if (row.valueType === "BOOLEAN") {
          result[row.key] = row.value === "true";
        } else if (row.valueType === "NUMBER") {
          result[row.key] = Number(row.value);
        } else if (row.valueType === "JSON") {
          result[row.key] = JSON.parse(row.value);
        } else {
          if (row.key === "companyLogo" && !row.value) {
            result[row.key] = null;
          } else {
            result[row.key] = row.value;
          }
        }
      } catch (e) {
        result[row.key] = row.value;
      }
    }

    // Dynamic next invoice number computation for invoices category
    if (cat === SettingsCategory.INVOICES) {
      const invoiceCount = await prisma.invoice.count();
      result.nextInvoiceNumber = (result.startingInvoiceNumber || 1) + invoiceCount;
    }

    // Dynamic email provider detection for notifications category
    if (cat === SettingsCategory.NOTIFICATIONS) {
      const provider = process.env.EMAIL_PROVIDER || "smtp";
      result.emailProviderStatus = provider === "smtp" ? "ACTIVE" : "CONFIGURED";
    }

    this.cache.set(cacheKey, result);
    return result as T;
  }

  /**
   * Update all settings within a category transactionally and record an audit log.
   */
  static async updateCategorySettings<T>(
    category: SettingsCategory | string,
    data: Partial<T>,
    actorUserId?: string
  ): Promise<T> {
    const cat = category.toLowerCase();
    if (cat === SettingsCategory.SYSTEM) {
      throw new ValidationError("System Information is read-only and cannot be updated directly");
    }

    const currentSettings = await this.getCategorySettings<any>(cat);

    // Save each key into SystemSetting table
    await prisma.$transaction(async (tx) => {
      for (const [key, rawValue] of Object.entries(data)) {
        if (rawValue === undefined) continue;

        let valueStr: string;
        let valueType = "STRING";

        if (typeof rawValue === "boolean") {
          valueStr = rawValue ? "true" : "false";
          valueType = "BOOLEAN";
        } else if (typeof rawValue === "number") {
          valueStr = rawValue.toString();
          valueType = "NUMBER";
        } else if (typeof rawValue === "object" && rawValue !== null) {
          valueStr = JSON.stringify(rawValue);
          valueType = "JSON";
        } else {
          valueStr = rawValue !== null && rawValue !== undefined ? String(rawValue) : "";
          valueType = "STRING";
        }

        await tx.systemSetting.upsert({
          where: {
            category_key: {
              category: cat,
              key,
            },
          },
          update: {
            value: valueStr,
            valueType,
            updatedBy: actorUserId || null,
          },
          create: {
            category: cat,
            key,
            value: valueStr,
            valueType,
            updatedBy: actorUserId || null,
          },
        });
      }
    });

    this.invalidateCache();
    const updatedSettings = await this.getCategorySettings<T>(cat);

    // Record audit log for configuration changes
    await createAuditLog({
      actorUserId,
      action: "UPDATE_SETTINGS",
      entityType: "SETTINGS",
      entityId: cat,
      beforeData: currentSettings,
      afterData: updatedSettings,
    });

    return updatedSettings;
  }

  /**
   * Upload or replace company logo
   */
  static async updateCompanyLogo(logoDataUrl: string, actorUserId?: string): Promise<CompanyProfileDTO> {
    if (!logoDataUrl || !logoDataUrl.startsWith("data:image/")) {
      throw new ValidationError("Company logo must be a valid image data URL (PNG, JPEG, WebP, or SVG)");
    }

    return this.updateCategorySettings<CompanyProfileDTO>(
      SettingsCategory.COMPANY,
      { companyLogo: logoDataUrl } as any,
      actorUserId
    );
  }

  /**
   * Delete company logo
   */
  static async deleteCompanyLogo(actorUserId?: string): Promise<CompanyProfileDTO> {
    return this.updateCategorySettings<CompanyProfileDTO>(
      SettingsCategory.COMPANY,
      { companyLogo: null } as any,
      actorUserId
    );
  }

  /**
   * Send test email to verify transactional delivery
   */
  static async sendTestEmail(recipientEmail: string, actorUserId?: string): Promise<{ success: boolean; message: string; recipient: string }> {
    const emailService = EmailService.getInstance();
    const general = await this.getCategorySettings<GeneralSettingsDTO>(SettingsCategory.GENERAL);

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; border: 1px solid #E5EAF1; border-radius: 8px;">
        <h2 style="color: #0F172A; font-size: 20px; font-weight: 600; margin-bottom: 12px;">Brightloop SMS — Test Email</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">This is a test notification dispatched from <strong>${general.organizationName}</strong>.</p>
        <div style="background-color: #F8FAFC; border-left: 3px solid #2563EB; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px; color: #1E293B;"><strong>Status:</strong> Email provider is operational and delivering messages.</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">Timestamp: ${new Date().toUTCString()}</p>
        </div>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 24px;">Sent by Brightloop Subscription Management System Settings Console.</p>
      </div>
    `;

    const success = await emailService.send({
      to: recipientEmail,
      subject: `[Test] Transactional Email Delivery Test — ${general.displayName}`,
      html: htmlContent,
      text: `Brightloop SMS Test Email: Operational check for ${general.displayName} at ${new Date().toISOString()}`,
    });

    if (!success) {
      throw new ValidationError("Failed to dispatch test email through configured provider. Please verify SMTP credentials.");
    }

    await createAuditLog({
      actorUserId,
      action: "TEST_EMAIL_SENT",
      entityType: "SETTINGS",
      entityId: recipientEmail,
      afterData: { recipientEmail, timestamp: new Date().toISOString() },
    });

    return {
      success: true,
      message: `Test email successfully dispatched to ${recipientEmail}`,
      recipient: recipientEmail,
    };
  }

  /**
   * Gather live system information metrics and database counts without exposing secrets.
   */
  static async getSystemInformation(): Promise<SystemInformationDTO> {
    const [
      totalRegisteredUsers,
      totalCustomers,
      totalProducts,
      totalSubscriptions,
      totalInvoices,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.subscription.count(),
      prisma.invoice.count(),
    ]);

    // Check database connection
    let dbStatus = "CONNECTED";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "DISCONNECTED";
    }

    return {
      appName: "Brightloop SMS",
      appVersion: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      backendStatus: "HEALTHY",
      databaseConnectionStatus: dbStatus,
      currentServerTime: new Date().toISOString(),
      lastDatabaseMigration: "2026-10-31 15:48:50 UTC (SystemSetting Model)",
      totalRegisteredUsers,
      totalCustomers,
      totalProducts,
      totalSubscriptions,
      totalInvoices,
    };
  }

  /**
   * Health probe endpoint
   */
  static async getSystemHealth() {
    let dbStatus = "ok";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "error";
    }

    return {
      status: dbStatus === "ok" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      database: dbStatus === "ok" ? "connected" : "disconnected",
      services: {
        api: "ok",
        pricingEngine: "ok",
        billingEngine: "ok",
        emailDelivery: process.env.EMAIL_PROVIDER || "smtp",
      },
    };
  }
}
