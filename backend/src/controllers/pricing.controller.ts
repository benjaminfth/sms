import { Request, Response, NextFunction } from "express";
import { PricingService } from "../services/pricing.service";
import { AppResponse } from "../utils/response";

export class PricingController {
  static async calculate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PricingService.calculatePricing({
        items: req.body.items,
        discountCode: req.body.discountCode,
        customerId: req.body.customerId,
        currency: req.body.currency,
        isInclusiveTax: req.body.isInclusiveTax,
      });

      AppResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }
}
