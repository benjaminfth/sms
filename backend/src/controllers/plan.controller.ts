import { Request, Response, NextFunction } from "express";
import { PlanService } from "../services/plan.service";
import { AppResponse } from "../utils/response";

export class PlanController {
  static async createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await PlanService.createPlan(req.body, req.user?.userId);
      AppResponse.created(res, plan);
    } catch (err) {
      next(err);
    }
  }

  static async getPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { plans, pagination } = await PlanService.getPlans(req.query as any);
      AppResponse.paginated(res, plans, pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getPlanById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const plan = await PlanService.getPlanById(id);
      AppResponse.success(res, plan);
    } catch (err) {
      next(err);
    }
  }

  static async updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const plan = await PlanService.updatePlan(
        id,
        req.body,
        req.user?.userId
      );
      AppResponse.success(res, plan);
    } catch (err) {
      next(err);
    }
  }

  static async activatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const plan = await PlanService.activatePlan(id, req.user?.userId);
      AppResponse.success(res, plan);
    } catch (err) {
      next(err);
    }
  }

  static async deactivatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const plan = await PlanService.deactivatePlan(
        id,
        req.user?.userId
      );
      AppResponse.success(res, plan);
    } catch (err) {
      next(err);
    }
  }
}
