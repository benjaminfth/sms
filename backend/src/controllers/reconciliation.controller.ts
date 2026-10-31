import { Request, Response, NextFunction } from "express";
import { ReconciliationService } from "../services/reconciliation.service";
import { AllocationService } from "../services/allocation.service";
import { AppResponse } from "../utils/response";
import { PaymentMethod, PaymentStatus } from "@sms/shared";

export class ReconciliationController {
  static async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const search = req.query.search as string;
      const paymentMethod = req.query.paymentMethod as PaymentMethod;
      const status = req.query.status as PaymentStatus;
      const onlyUnmatched = req.query.onlyUnmatched === "true";
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const { records, pagination } = await ReconciliationService.getReconciliationReport({
        page,
        pageSize,
        search,
        paymentMethod,
        status,
        onlyUnmatched,
        startDate,
        endDate,
      });

      AppResponse.paginated(res, records, pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getUnmatched(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const unmatched = await ReconciliationService.getUnmatchedPayments();
      AppResponse.success(res, unmatched);
    } catch (err) {
      next(err);
    }
  }

  static async allocate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paymentId = req.params.paymentId as string;
      const allocations = req.body.allocations || [
        {
          invoiceId: req.body.invoiceId,
          allocatedAmountMinor: req.body.allocatedAmountMinor,
        },
      ];

      const result = await AllocationService.allocatePayment(
        paymentId,
        allocations,
        req.user?.userId
      );

      AppResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }
}
