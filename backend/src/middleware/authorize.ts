import { Request, Response, NextFunction } from "express";
import { Role } from "@sms/shared";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";

export function requireAuth() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }
    next();
  };
}

export function requireRole(...allowedRoles: (Role | string)[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: requires role [${allowedRoles.join(", ")}]`
        )
      );
    }

    next();
  };
}

/**
 * Utility to verify whether the requesting user is allowed to access
 * data for the given customer ID.
 * Admins and Staff can access all customer records.
 * Customers can ONLY access their own customer record.
 */
export function assertCustomerOwnership(
  req: Request,
  targetCustomerId: string
): void {
  if (!req.user) {
    throw new UnauthorizedError("Authentication required");
  }

  // Admin and Staff have organization-level operational access
  if (req.user.role === Role.ADMIN || req.user.role === Role.STAFF) {
    return;
  }

  // Customer must match their linked customer record
  if (req.user.role === Role.CUSTOMER) {
    if (!req.user.customerId || req.user.customerId !== targetCustomerId) {
      throw new ForbiddenError("Cannot access records belonging to another customer");
    }
    return;
  }

  throw new ForbiddenError("Unauthorized access to customer resource");
}

/**
 * Express middleware for verifying customer ownership from request params
 */
export function requireCustomerOwnership(customerIdParamName = "id") {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const targetCustomerId = req.params[customerIdParamName];
      if (!targetCustomerId) {
        return next();
      }
      assertCustomerOwnership(req, targetCustomerId);
      next();
    } catch (err) {
      next(err);
    }
  };
}
