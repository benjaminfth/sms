import { Request, Response, NextFunction } from "express";
import { DiscountService } from "../services/discount.service";
import { DiscountCalculationService } from "../services/discount-calculation.service";
import { AppResponse } from "../utils/response";
import { DiscountType } from "@sms/shared";

export class DiscountController {
  static async listDiscounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const search = req.query.search as string;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;
      const discountType = req.query.discountType as DiscountType;

      const { discounts, pagination } = await DiscountService.getDiscounts({
        page,
        pageSize,
        search,
        isActive,
        discountType,
      });

      AppResponse.paginated(res, discounts, pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getDiscountById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const discountId = req.params.id as string;
      const discount = await DiscountService.getDiscountById(discountId);
      AppResponse.success(res, discount);
    } catch (err) {
      next(err);
    }
  }

  static async createDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const discount = await DiscountService.createDiscount(req.body, req.user?.userId);
      AppResponse.created(res, discount);
    } catch (err) {
      next(err);
    }
  }

  static async updateDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const discountId = req.params.id as string;
      const discount = await DiscountService.updateDiscount(
        discountId,
        req.body,
        req.user?.userId
      );
      AppResponse.success(res, discount);
    } catch (err) {
      next(err);
    }
  }

  static async activateDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const discountId = req.params.id as string;
      const discount = await DiscountService.setDiscountStatus(
        discountId,
        true,
        req.user?.userId
      );
      AppResponse.success(res, discount);
    } catch (err) {
      next(err);
    }
  }

  static async deactivateDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const discountId = req.params.id as string;
      const discount = await DiscountService.setDiscountStatus(
        discountId,
        false,
        req.user?.userId
      );
      AppResponse.success(res, discount);
    } catch (err) {
      next(err);
    }
  }

  static async getDiscountRedemptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const discountId = req.params.id as string;
      const redemptions = await DiscountService.getDiscountRedemptions(discountId);
      AppResponse.success(res, redemptions);
    } catch (err) {
      next(err);
    }
  }

  static async validateDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, customerId, subscriptionId, productIds, items, subtotalMinor } = req.body;
      const result = await DiscountCalculationService.validateAndCalculateDiscount(code, {
        customerId,
        subscriptionId,
        productIds,
        items,
        subtotalMinor: subtotalMinor ? BigInt(subtotalMinor) : 0n,
      });

      AppResponse.success(res, {
        valid: result.valid,
        reason: result.reason,
        discount: result.discount,
        amountDeductedMinor: result.amountDeductedMinor.toString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async attachDiscountToSubscription(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { subscriptionId, discountCode } = req.body;
      const result = await DiscountService.attachDiscountToSubscription(
        { subscriptionId, discountCode },
        req.user?.userId
      );
      AppResponse.created(res, result);
    } catch (err) {
      next(err);
    }
  }
}
