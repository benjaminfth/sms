import { Request, Response, NextFunction } from "express";
import { QuotationTemplateService } from "../services/quotation-template.service";
import { AppResponse } from "../utils/response";

export class QuotationTemplateController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
      const search = req.query.search as string;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;

      const { templates, pagination } = await QuotationTemplateService.listTemplates({
        page,
        pageSize,
        search,
        isActive,
      });

      return AppResponse.paginated(res, templates, pagination);
    } catch (err) {
      return next(err);
    }
  }

  static async get(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const template = await QuotationTemplateService.getTemplateById(req.params.id as string);
      return AppResponse.success(res, template);
    } catch (err) {
      return next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const template = await QuotationTemplateService.createTemplate(
        req.body,
        req.user?.userId
      );
      return AppResponse.created(res, template);
    } catch (err) {
      return next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const updated = await QuotationTemplateService.updateTemplate(
        req.params.id as string,
        req.body,
        req.user?.userId
      );
      return AppResponse.success(res, updated);
    } catch (err) {
      return next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const result = await QuotationTemplateService.deleteTemplate(
        req.params.id as string,
        req.user?.userId
      );
      return AppResponse.success(res, result);
    } catch (err) {
      return next(err);
    }
  }
}
