import { Request, Response, NextFunction } from "express";
import { QuotationTemplateService } from "../services/quotation-template.service";
import { AppResponse } from "../utils/response";

export class QuotationTemplateController {
  static async createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await QuotationTemplateService.createTemplate(req.body);
      AppResponse.created(res, template);
    } catch (err) {
      next(err);
    }
  }

  static async getTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { templates, pagination } = await QuotationTemplateService.getTemplates(req.query as any);
      AppResponse.paginated(res, templates, pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getTemplateById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await QuotationTemplateService.getTemplateById(req.params.id as string);
      AppResponse.success(res, template);
    } catch (err) {
      next(err);
    }
  }

  static async updateTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await QuotationTemplateService.updateTemplate(req.params.id as string, req.body);
      AppResponse.success(res, template);
    } catch (err) {
      next(err);
    }
  }

  static async deleteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await QuotationTemplateService.deleteTemplate(req.params.id as string);
      AppResponse.success(res, { message: "Template deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
}

