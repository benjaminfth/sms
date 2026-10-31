import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../services/subscription.service";
import { AppResponse } from "../utils/response";
import { Role, SubscriptionStatus } from "@sms/shared";
import { assertCustomerOwnership } from "../middleware/authorize";

export class SubscriptionController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
      const status = req.query.status as SubscriptionStatus;
      const search = req.query.search as string;

      let customerId = req.query.customerId as string;
      if (req.user?.role === Role.CUSTOMER) {
        customerId = req.user.customerId || "NONE";
      }

      const { subscriptions, pagination } = await SubscriptionService.listSubscriptions({
        page,
        pageSize,
        customerId,
        status,
        search,
      });

      return AppResponse.paginated(res, subscriptions, pagination);
    } catch (err) {
      return next(err);
    }
  }

  static async get(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const subscription = await SubscriptionService.getSubscriptionById(req.params.id as string);

      if (req.user?.role === Role.CUSTOMER) {
        assertCustomerOwnership(req, subscription.customerId);
      }

      return AppResponse.success(res, subscription);
    } catch (err) {
      return next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const subscription = await SubscriptionService.createSubscription(
        req.body,
        req.user?.userId
      );
      return AppResponse.created(res, subscription);
    } catch (err) {
      return next(err);
    }
  }

  static async activate(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const updated = await SubscriptionService.activateSubscription(
        req.params.id as string,
        req.user?.userId
      );
      return AppResponse.success(res, updated);
    } catch (err) {
      return next(err);
    }
  }

  static async pause(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const updated = await SubscriptionService.pauseSubscription(
        req.params.id as string,
        req.user?.userId
      );
      return AppResponse.success(res, updated);
    } catch (err) {
      return next(err);
    }
  }

  static async resume(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const updated = await SubscriptionService.resumeSubscription(
        req.params.id as string,
        req.user?.userId
      );
      return AppResponse.success(res, updated);
    } catch (err) {
      return next(err);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const subscription = await SubscriptionService.getSubscriptionById(req.params.id as string);
      if (req.user?.role === Role.CUSTOMER) {
        assertCustomerOwnership(req, subscription.customerId);
      }

      const updated = await SubscriptionService.cancelSubscription(
        req.params.id as string,
        req.body,
        req.user?.userId
      );
      return AppResponse.success(res, updated);
    } catch (err) {
      return next(err);
    }
  }
}
