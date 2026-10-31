import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../services/subscription.service";
import { AppResponse } from "../utils/response";
import { assertCustomerOwnership } from "../middleware/authorize";
import { Role } from "@sms/shared";

export class SubscriptionController {
  static async createSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await SubscriptionService.createSubscription(
        req.body,
        req.user?.userId
      );
      AppResponse.created(res, subscription);
    } catch (err) {
      next(err);
    }
  }

  static async getSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { subscriptions, pagination } = await SubscriptionService.getSubscriptions(query);
      AppResponse.paginated(res, subscriptions, pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getSubscriptionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await SubscriptionService.getSubscriptionById(req.params.id as string);
      assertCustomerOwnership(req, subscription.customerId);
      AppResponse.success(res, subscription);
    } catch (err) {
      next(err);
    }
  }

  static async sendSubscriptionQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await SubscriptionService.sendSubscriptionQuotation(
        req.params.id as string,
        req.user?.userId
      );
      AppResponse.success(res, subscription);
    } catch (err) {
      next(err);
    }
  }

  static async confirmSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await SubscriptionService.confirmSubscription(
        req.params.id as string,
        req.user?.userId
      );
      AppResponse.success(res, subscription);
    } catch (err) {
      next(err);
    }
  }

  static async activateSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await SubscriptionService.activateSubscription(
        req.params.id as string,
        req.user?.userId
      );
      AppResponse.success(res, subscription);
    } catch (err) {
      next(err);
    }
  }

  static async pauseSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await SubscriptionService.pauseSubscription(
        req.params.id as string,
        req.body?.reason,
        req.user?.userId
      );
      AppResponse.success(res, subscription);
    } catch (err) {
      next(err);
    }
  }

  static async resumeSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await SubscriptionService.resumeSubscription(
        req.params.id as string,
        req.user?.userId
      );
      AppResponse.success(res, subscription);
    } catch (err) {
      next(err);
    }
  }

  static async closeSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await SubscriptionService.closeSubscription(
        req.params.id as string,
        req.body?.reason,
        req.user?.userId
      );
      AppResponse.success(res, subscription);
    } catch (err) {
      next(err);
    }
  }

  static async cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await SubscriptionService.cancelSubscription(
        req.params.id as string,
        req.body?.cancellationReason,
        req.body?.effectiveImmediately ?? true,
        req.user?.userId
      );
      AppResponse.success(res, subscription);
    } catch (err) {
      next(err);
    }
  }

  static async renewSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await SubscriptionService.renewSubscription(
        req.params.id as string,
        req.body || {},
        req.user?.userId
      );
      AppResponse.success(res, subscription);
    } catch (err) {
      next(err);
    }
  }
}
