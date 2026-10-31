import { Request, Response, NextFunction } from "express";
import { BillingService } from "../services/billing.service";
import { AppResponse } from "../utils/response";

export class BillingController {
  static async executeBillingRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetDate = req.body?.targetDate ? new Date(req.body.targetDate) : new Date();
      const result = await BillingService.executeBillingRun(
        targetDate,
        req.user?.userId
      );
      AppResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getBillingRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { runs, pagination } = await BillingService.getBillingRuns(req.query as any);
      AppResponse.paginated(res, runs, pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getBillingRunById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const run = await BillingService.getBillingRunById(req.params.id as string);
      AppResponse.success(res, run);
    } catch (err) {
      next(err);
    }
  }

  static async getBillingAttempts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { attempts, pagination } = await BillingService.getBillingAttempts(req.query as any);
      AppResponse.paginated(res, attempts, pagination);
    } catch (err) {
      next(err);
    }
  }
}

