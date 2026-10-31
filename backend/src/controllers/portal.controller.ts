import { Request, Response, NextFunction } from "express";
import { PortalService } from "../services/portal.service";
import { AppResponse } from "../utils/response";
import { PaymentMethod } from "@sms/shared";
import { ForbiddenError } from "../utils/errors";

export class PortalController {
  private static async getCustomerId(req: Request): Promise<string> {
    if (!req.user) {
      throw new ForbiddenError("Authentication required");
    }

    const customer = await PortalService.getCustomerForUser(
      req.user.userId,
      req.user.customerId
    );

    return customer.id;
  }

  static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const data = await PortalService.getOverview(customerId);
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const data = await PortalService.getSubscriptions(customerId);
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getSubscriptionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const subId = req.params.id as string;
      const data = await PortalService.getSubscriptionById(customerId, subId);
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const subId = req.params.id as string;
      const data = await PortalService.cancelSubscription(
        customerId,
        subId,
        req.body.reason,
        req.user?.userId
      );
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const data = await PortalService.getInvoices(customerId);
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const invId = req.params.id as string;
      const data = await PortalService.getInvoiceById(customerId, invId);
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async payInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const invId = req.params.id as string;
      const paymentMethod = req.body.paymentMethod || PaymentMethod.CARD;
      const data = await PortalService.payInvoice(
        customerId,
        invId,
        paymentMethod,
        req.user?.userId
      );
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getQuotations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const data = await PortalService.getQuotations(customerId);
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getQuotationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const quoId = req.params.id as string;
      const data = await PortalService.getQuotationById(customerId, quoId);
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async acceptQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const quoId = req.params.id as string;
      const data = await PortalService.respondToQuotation(
        customerId,
        quoId,
        "ACCEPT",
        req.user?.userId
      );
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async rejectQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const quoId = req.params.id as string;
      const data = await PortalService.respondToQuotation(
        customerId,
        quoId,
        "REJECT",
        req.user?.userId
      );
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const data = await PortalService.getPayments(customerId);
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const data = await PortalService.getProfile(customerId);
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = await PortalController.getCustomerId(req);
      const data = await PortalService.updateProfile(customerId, req.body, req.user?.userId);
      AppResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }
}
