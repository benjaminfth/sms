import { Request, Response, NextFunction } from "express";
import { InvoiceService } from "../services/invoice.service";
import { AppResponse } from "../utils/response";
import { Role, InvoiceStatus } from "@sms/shared";
import { assertCustomerOwnership } from "../middleware/authorize";

export class InvoiceController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
      const status = req.query.status as InvoiceStatus;
      const subscriptionId = req.query.subscriptionId as string;
      const search = req.query.search as string;

      let customerId = req.query.customerId as string;
      if (req.user?.role === Role.CUSTOMER) {
        customerId = req.user.customerId || "NONE";
      }

      const { invoices, pagination } = await InvoiceService.listInvoices({
        page,
        pageSize,
        customerId,
        subscriptionId,
        status,
        search,
      });

      return AppResponse.paginated(res, invoices, pagination);
    } catch (err) {
      return next(err);
    }
  }

  static async get(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const invoice = await InvoiceService.getInvoiceById(req.params.id as string);

      if (req.user?.role === Role.CUSTOMER) {
        assertCustomerOwnership(req, invoice.customerId);
      }

      return AppResponse.success(res, invoice);
    } catch (err) {
      return next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { invoice } = await InvoiceService.createInvoice(
        req.body,
        req.user?.userId
      );
      return AppResponse.created(res, invoice);
    } catch (err) {
      return next(err);
    }
  }

  static async void(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const updated = await InvoiceService.voidInvoice(
        req.params.id as string,
        req.body?.reason,
        req.user?.userId
      );
      return AppResponse.success(res, updated);
    } catch (err) {
      return next(err);
    }
  }
}
