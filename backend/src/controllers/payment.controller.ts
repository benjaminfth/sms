import { Request, Response, NextFunction } from "express";
import { PaymentService } from "../services/payment.service";
import { AppResponse } from "../utils/response";
import { PaymentMethod, PaymentStatus, Role } from "@sms/shared";
import { assertCustomerOwnership } from "../middleware/authorize";

export class PaymentController {
  static async listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      let customerId = req.query.customerId as string;

      // If customer is querying, enforce their own customerId
      if (req.user?.role === Role.CUSTOMER) {
        customerId = req.user.customerId!;
      }

      const status = req.query.status as PaymentStatus;
      const paymentMethod = req.query.paymentMethod as PaymentMethod;
      const search = req.query.search as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const { payments, pagination } = await PaymentService.getPayments({
        page,
        pageSize,
        customerId,
        status,
        paymentMethod,
        search,
        startDate,
        endDate,
      });

      AppResponse.paginated(res, payments, pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getPaymentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paymentId = req.params.id as string;
      const payment = await PaymentService.getPaymentById(paymentId);
      assertCustomerOwnership(req, payment.customerId);
      AppResponse.success(res, payment);
    } catch (err) {
      next(err);
    }
  }

  static async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // If customer, customerId must match
      if (req.user?.role === Role.CUSTOMER) {
        assertCustomerOwnership(req, req.body.customerId);
      }

      const payment = await PaymentService.recordPayment(req.body, req.user?.userId);
      AppResponse.created(res, payment);
    } catch (err) {
      next(err);
    }
  }

  static async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paymentId = req.params.id as string;
      const { status, notes } = req.body;
      const payment = await PaymentService.verifyPayment(
        paymentId,
        status,
        notes,
        req.user?.userId
      );
      AppResponse.success(res, payment);
    } catch (err) {
      next(err);
    }
  }

  static async getPaymentAllocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paymentId = req.params.id as string;
      const payment = await PaymentService.getPaymentById(paymentId);
      assertCustomerOwnership(req, payment.customerId);
      AppResponse.success(res, payment.allocations);
    } catch (err) {
      next(err);
    }
  }
}
