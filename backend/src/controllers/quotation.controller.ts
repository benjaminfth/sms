import { Request, Response, NextFunction } from "express";
import { QuotationService } from "../services/quotation.service";
import { SubscriptionService } from "../services/subscription.service";
import { AppResponse } from "../utils/response";
import { assertCustomerOwnership } from "../middleware/authorize";
import { Role } from "@sms/shared";

export class QuotationController {
  static async createQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quotation = await QuotationService.createQuotation(
        req.body,
        req.user?.userId
      );
      AppResponse.created(res, quotation);
    } catch (err) {
      next(err);
    }
  }

  static async getQuotations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = { ...(req.query as any) };

      // If user is a customer, restrict to their own records
      if (req.user?.role === Role.CUSTOMER) {
        if (!req.user.customerId) {
          AppResponse.paginated(res, [], { page: 1, pageSize: 20, total: 0 });
          return;
        }
        query.customerId = req.user.customerId;
      }

      const { quotations, pagination } = await QuotationService.getQuotations(
        query,
        req.user?.role,
        req.user?.userId
      );
      AppResponse.paginated(res, quotations, pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getQuotationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quotation = await QuotationService.getQuotationById(req.params.id as string);
      assertCustomerOwnership(req, quotation.customerId);
      AppResponse.success(res, quotation);
    } catch (err) {
      next(err);
    }
  }

  static async updateQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quotation = await QuotationService.updateQuotation(
        req.params.id as string,
        req.body,
        req.user?.userId
      );
      AppResponse.success(res, quotation);
    } catch (err) {
      next(err);
    }
  }

  static async sendQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quotation = await QuotationService.sendQuotation(
        req.params.id as string,
        req.user?.userId
      );
      AppResponse.success(res, quotation);
    } catch (err) {
      next(err);
    }
  }

  static async acceptQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quotation = await QuotationService.acceptQuotation(
        req.params.id as string,
        req.user?.userId,
        req.user?.role,
        req.user?.customerId
      );
      AppResponse.success(res, quotation);
    } catch (err) {
      next(err);
    }
  }

  static async rejectQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quotation = await QuotationService.rejectQuotation(
        req.params.id as string,
        req.body?.reason,
        req.user?.userId,
        req.user?.role,
        req.user?.customerId
      );
      AppResponse.success(res, quotation);
    } catch (err) {
      next(err);
    }
  }

  static async expireQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quotation = await QuotationService.expireQuotation(
        req.params.id as string,
        req.user?.userId
      );
      AppResponse.success(res, quotation);
    } catch (err) {
      next(err);
    }
  }

  static async convertQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await SubscriptionService.convertFromQuotation(
        req.params.id as string,
        req.body?.billingInterval,
        req.user?.userId
      );
      AppResponse.created(res, subscription);
    } catch (err) {
      next(err);
    }
  }
}
