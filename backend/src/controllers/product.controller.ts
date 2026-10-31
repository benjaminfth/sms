import { Request, Response, NextFunction } from "express";
import { ProductService } from "../services/product.service";
import { AppResponse } from "../utils/response";

export class ProductController {
  static async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.createProduct(
        req.body,
        req.user?.userId
      );
      AppResponse.created(res, product);
    } catch (err) {
      next(err);
    }
  }

  static async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { products, pagination } = await ProductService.getProducts(
        req.query as any
      );
      AppResponse.paginated(res, products, pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const product = await ProductService.getProductById(id);
      AppResponse.success(res, product);
    } catch (err) {
      next(err);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const product = await ProductService.updateProduct(
        id,
        req.body,
        req.user?.userId
      );
      AppResponse.success(res, product);
    } catch (err) {
      next(err);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await ProductService.deleteProduct(
        id,
        req.user?.userId
      );
      AppResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async addVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const variant = await ProductService.addVariant(
        id,
        req.body,
        req.user?.userId
      );
      AppResponse.created(res, variant);
    } catch (err) {
      next(err);
    }
  }

  static async updateVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const variantId = req.params.variantId as string;
      const variant = await ProductService.updateVariant(
        id,
        variantId,
        req.body,
        req.user?.userId
      );
      AppResponse.success(res, variant);
    } catch (err) {
      next(err);
    }
  }
}
