import { Request, Response, NextFunction } from "express";
import { SettingsService } from "../services/settings.service";
import { AppResponse } from "../utils/response";
import {
  generalSettingsSchema,
  companyProfileSchema,
  billingPaymentsSettingsSchema,
  invoiceSettingsSchema,
  subscriptionSettingsSchema,
  notificationSettingsSchema,
  securitySettingsSchema,
  regionalPreferencesSchema,
  testEmailSchema,
  SettingsCategory,
} from "@sms/shared";
import { ValidationError } from "../utils/errors";

export class SettingsController {
  /**
   * GET /api/v1/settings
   * Retrieve all settings categories.
   */
  static async getAllSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const allSettings = await SettingsService.getAllSettings();
      AppResponse.success(res, allSettings);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/settings/:category
   * Retrieve settings for a specific category.
   */
  static async getCategorySettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.params.category || "";
      const settings = await SettingsService.getCategorySettings(category);
      AppResponse.success(res, settings);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/settings/:category
   * Update settings for a specific category.
   */
  static async updateCategorySettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.params.category || "";
      const cat = category.toLowerCase();

      let validatedData: any;
      switch (cat) {
        case SettingsCategory.GENERAL:
          validatedData = generalSettingsSchema.parse(req.body);
          break;
        case SettingsCategory.COMPANY:
          validatedData = companyProfileSchema.parse(req.body);
          break;
        case SettingsCategory.BILLING:
          validatedData = billingPaymentsSettingsSchema.parse(req.body);
          break;
        case SettingsCategory.INVOICES:
          validatedData = invoiceSettingsSchema.parse(req.body);
          break;
        case SettingsCategory.SUBSCRIPTIONS:
          validatedData = subscriptionSettingsSchema.parse(req.body);
          break;
        case SettingsCategory.NOTIFICATIONS:
          validatedData = notificationSettingsSchema.parse(req.body);
          break;
        case SettingsCategory.SECURITY:
          validatedData = securitySettingsSchema.parse(req.body);
          break;
        case SettingsCategory.REGIONAL:
          validatedData = regionalPreferencesSchema.parse(req.body);
          break;
        default:
          throw new ValidationError(`Unknown settings category: ${category}`);
      }

      const updated = await SettingsService.updateCategorySettings(
        cat,
        validatedData,
        req.user?.userId
      );

      AppResponse.success(res, updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/settings/company/logo
   * Upload or replace company logo.
   */
  static async uploadCompanyLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logoDataUrl = req.body?.logoDataUrl || req.body?.logo || "";
      const updated = await SettingsService.updateCompanyLogo(logoDataUrl, req.user?.userId);
      AppResponse.success(res, { ...updated, logoUrl: updated.companyLogo });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/settings/company/logo
   * Remove company logo.
   */
  static async deleteCompanyLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await SettingsService.deleteCompanyLogo(req.user?.userId);
      AppResponse.success(res, updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/settings/notifications/test-email
   * Send test email through configured provider.
   */
  static async sendTestEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recipientEmail } = testEmailSchema.parse(req.body);
      const result = await SettingsService.sendTestEmail(recipientEmail, req.user?.userId);
      AppResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/settings/system/health
   * Retrieve system health and service statuses.
   */
  static async getSystemHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await SettingsService.getSystemHealth();
      AppResponse.success(res, health);
    } catch (err) {
      next(err);
    }
  }
}
