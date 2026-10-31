import { Request, Response, NextFunction } from "express";
import { TaxService } from "../services/tax.service";
import { AppResponse } from "../utils/response";

export class TaxController {
  static async listTaxes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const search = req.query.search as string;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;

      const { taxes, pagination } = await TaxService.getTaxes({
        page,
        pageSize,
        search,
        isActive,
      });

      AppResponse.paginated(res, taxes, pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getTaxById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taxId = req.params.id as string;
      const tax = await TaxService.getTaxById(taxId);
      AppResponse.success(res, tax);
    } catch (err) {
      next(err);
    }
  }

  static async createTax(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tax = await TaxService.createTax(req.body, req.user?.userId);
      AppResponse.created(res, tax);
    } catch (err) {
      next(err);
    }
  }

  static async updateTax(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taxId = req.params.id as string;
      const tax = await TaxService.updateTax(taxId, req.body, req.user?.userId);
      AppResponse.success(res, tax);
    } catch (err) {
      next(err);
    }
  }

  static async deleteTax(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taxId = req.params.id as string;
      const result = await TaxService.deleteTax(taxId, req.user?.userId);
      AppResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getProductTaxes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = (req.params.productId || req.params.id) as string;
      const taxes = await TaxService.getProductTaxes(productId);
      AppResponse.success(res, taxes);
    } catch (err) {
      next(err);
    }
  }

  static async assignProductTaxes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = (req.params.productId || req.params.id) as string;
      const taxes = await TaxService.assignProductTaxes(
        productId,
        req.body.taxIds,
        req.user?.userId
      );
      AppResponse.success(res, taxes);
    } catch (err) {
      next(err);
    }
  }

  static async removeProductTax(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = (req.params.productId || req.params.id) as string;
      const taxId = req.params.taxId as string;
      const result = await TaxService.removeProductTax(
        productId,
        taxId,
        req.user?.userId
      );
      AppResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }
}
