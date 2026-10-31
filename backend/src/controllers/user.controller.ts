import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";
import { AppResponse } from "../utils/response";

export class UserController {
  static async createStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.createStaff(req.body, req.user?.userId);
      AppResponse.created(res, user);
    } catch (err) {
      next(err);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { users, pagination } = await UserService.getUsers(req.query as any);
      AppResponse.paginated(res, users, pagination);
    } catch (err) {
      next(err);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = await UserService.updateUser(
        id,
        req.body,
        req.user?.userId
      );
      AppResponse.success(res, user);
    } catch (err) {
      next(err);
    }
  }

  static async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = await UserService.updateUserRole(
        id,
        req.body.role,
        req.user?.userId
      );
      AppResponse.success(res, user);
    } catch (err) {
      next(err);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await UserService.deleteUser(id, req.user?.userId);
      AppResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }
}
