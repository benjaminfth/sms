import { Request, Response, NextFunction } from "express";
import { AllocationService } from "../services/allocation.service";
import { AppResponse } from "../utils/response";

export class AllocationController {
  static async allocate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paymentId = (req.params.id || req.body.paymentId) as string;
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

  static async listAllocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const paymentId = req.query.paymentId as string;
      const invoiceId = req.query.invoiceId as string;

      const { allocations, pagination } = await AllocationService.getAllocations({
        page,
        pageSize,
        paymentId,
        invoiceId,
      });

      AppResponse.paginated(res, allocations, pagination);
    } catch (err) {
      next(err);
    }
  }
}
