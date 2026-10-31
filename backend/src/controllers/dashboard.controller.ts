import { Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/dashboard.service";
import { AppResponse } from "../utils/response";

export class DashboardController {
  static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as string) || "30d";
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const data = await DashboardService.getOverview(period, startDate, endDate);
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getRevenue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as string) || "30d";
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const data = await DashboardService.getRevenueAnalytics(period, startDate, endDate);
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getSubscriptions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await DashboardService.getSubscriptionAnalytics();
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getInvoices(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await DashboardService.getInvoiceAnalytics();
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getPaymentMethods(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await DashboardService.getPaymentMethodAnalytics();
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }
}
