import { Request, Response, NextFunction } from "express";
import { QuotationService } from "../services/quotation.service";
import { AppResponse } from "../utils/response";
import { Role, QuotationStatus } from "@sms/shared";
import { assertCustomerOwnership } from "../middleware/authorize";

export class QuotationController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
      const status = req.query.status as QuotationStatus;
      const search = req.query.search as string;

      let customerId = req.query.customerId as string;
      if (req.user?.role === Role.CUSTOMER) {
        customerId = req.user.customerId || "NONE";
      }

      const { quotations, pagination } = await QuotationService.listQuotations({
        page,
        pageSize,
        customerId,
        status,
        search,
      });

      return AppResponse.paginated(res, quotations, pagination);
    } catch (err) {
      return next(err);
    }
  }

  static async get(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const quotation = await QuotationService.getQuotationById(req.params.id as string);

      // Verify customer ownership if requester is a CUSTOMER
      if (req.user?.role === Role.CUSTOMER) {
        assertCustomerOwnership(req, quotation.customerId);
      }

      return AppResponse.success(res, quotation);
    } catch (err) {
      return next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const quotation = await QuotationService.createQuotation(
        req.body,
        req.user?.userId
      );
      return AppResponse.created(res, quotation);
    } catch (err) {
      return next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const updated = await QuotationService.updateQuotation(
        req.params.id as string,
        req.body,
        req.user?.userId
      );
      return AppResponse.success(res, updated);
    } catch (err) {
      return next(err);
    }
  }

  static async send(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const updated = await QuotationService.sendQuotation(
        req.params.id as string,
        req.user?.userId
      );
      return AppResponse.success(res, updated);
    } catch (err) {
      return next(err);
    }
  }

  static async accept(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const quotation = await QuotationService.getQuotationById(req.params.id as string);
      if (req.user?.role === Role.CUSTOMER) {
        assertCustomerOwnership(req, quotation.customerId);
      }

      const updated = await QuotationService.acceptQuotation(
        req.params.id as string,
        req.user?.userId
      );
      return AppResponse.success(res, updated);
    } catch (err) {
      return next(err);
    }
  }

  static async reject(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const quotation = await QuotationService.getQuotationById(req.params.id as string);
      if (req.user?.role === Role.CUSTOMER) {
        assertCustomerOwnership(req, quotation.customerId);
      }

      const updated = await QuotationService.rejectQuotation(
        req.params.id as string,
        req.body.reason,
        req.user?.userId
      );
      return AppResponse.success(res, updated);
    } catch (err) {
      return next(err);
    }
  }

  static async expire(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const updated = await QuotationService.expireQuotation(
        req.params.id as string,
        req.user?.userId
      );
      return AppResponse.success(res, updated);
    } catch (err) {
      return next(err);
    }
  }

  static async convert(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const subscription = await QuotationService.convertToSubscription(
        req.params.id as string,
        req.body,
        req.user?.userId
      );
      return AppResponse.created(res, subscription);
    } catch (err) {
      return next(err);
    }
  }
}
