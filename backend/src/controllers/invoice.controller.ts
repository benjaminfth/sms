import { Request, Response, NextFunction } from "express";
import { InvoiceService } from "../services/invoice.service";
import { AppResponse } from "../utils/response";
import { assertCustomerOwnership } from "../middleware/authorize";
import { Role } from "@sms/shared";

export class InvoiceController {
  static async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await InvoiceService.createInvoice(
        req.body,
        req.user?.userId
      );
      AppResponse.created(res, invoice);
    } catch (err) {
      next(err);
    }
  }

  static async confirmInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await InvoiceService.confirmInvoice(
        req.params.id as string,
        req.body?.paymentTerms,
        req.user?.userId
      );
      AppResponse.success(res, invoice);
    } catch (err) {
      next(err);
    }
  }

  static async sendInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await InvoiceService.sendInvoice(
        req.params.id as string,
        req.body?.recipientEmail,
        req.user?.userId
      );
      AppResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { invoices, pagination } = await InvoiceService.getInvoices(query);
      AppResponse.paginated(res, invoices, pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await InvoiceService.getInvoiceById(req.params.id as string);
      assertCustomerOwnership(req, invoice.customerId);
      AppResponse.success(res, invoice);
    } catch (err) {
      next(err);
    }
  }

  static async voidInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await InvoiceService.voidInvoice(
        req.params.id as string,
        req.body?.reason,
        req.user?.userId
      );
      AppResponse.success(res, invoice);
    } catch (err) {
      next(err);
    }
  }
}
