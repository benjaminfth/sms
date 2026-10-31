import { Request, Response, NextFunction } from "express";
import { CustomerService } from "../services/customer.service";
import { AppResponse } from "../utils/response";
import { assertCustomerOwnership } from "../middleware/authorize";

export class CustomerController {
  static async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await CustomerService.createCustomer(
        req.body,
        req.user?.userId
      );
      AppResponse.created(res, customer);
    } catch (err) {
      next(err);
    }
  }

  static async getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { customers, pagination } = await CustomerService.getCustomers(
        req.query as any
      );
      AppResponse.paginated(res, customers, pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.params.id as string;
      assertCustomerOwnership(req, customerId);

      const customer = await CustomerService.getCustomerById(customerId);
      AppResponse.success(res, customer);
    } catch (err) {
      next(err);
    }
  }

  static async updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.params.id as string;
      assertCustomerOwnership(req, customerId);

      const customer = await CustomerService.updateCustomer(
        customerId,
        req.body,
        req.user?.userId
      );
      AppResponse.success(res, customer);
    } catch (err) {
      next(err);
    }
  }
}
