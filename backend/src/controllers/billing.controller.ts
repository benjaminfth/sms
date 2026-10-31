import { Request, Response, NextFunction } from "express";
import { BillingService } from "../services/billing.service";
import { AppResponse } from "../utils/response";

export class BillingController {
  /**
   * ADMIN-only manual execution of the Recurring Billing Engine.
   */
  static async runBilling(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const targetDate = req.body.targetDate;
      const result = await BillingService.runBillingEngine(
        targetDate,
        req.user?.userId
      );
      return AppResponse.success(res, result);
    } catch (err) {
      return next(err);
    }
  }

  static async listRuns(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;

      const { runs, pagination } = await BillingService.listBillingRuns({
        page,
        pageSize,
      });

      return AppResponse.paginated(res, runs, pagination);
    } catch (err) {
      return next(err);
    }
  }

  static async getRun(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const run = await BillingService.getBillingRunById(req.params.id as string);
      return AppResponse.success(res, run);
    } catch (err) {
      return next(err);
    }
  }

  static async listAttempts(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
      const subscriptionId = req.query.subscriptionId as string;
      const billingRunId = req.query.billingRunId as string;

      const { attempts, pagination } = await BillingService.listBillingAttempts({
        page,
        pageSize,
        subscriptionId,
        billingRunId,
      });

      return AppResponse.paginated(res, attempts, pagination);
    } catch (err) {
      return next(err);
    }
  }
}
