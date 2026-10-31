import { Router } from "express";
import { CustomerController } from "../controllers/customer.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { Role } from "@sms/shared";
import {
  createCustomerSchema,
  updateCustomerSchema,
  paginationQuerySchema,
} from "@sms/shared";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(createCustomerSchema),
  CustomerController.createCustomer
);

router.get(
  "/",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(paginationQuerySchema, "query"),
  CustomerController.getCustomers
);

router.get(
  "/:id",
  CustomerController.getCustomerById
);

router.patch(
  "/:id",
  validate(updateCustomerSchema),
  CustomerController.updateCustomer
);

export default router;
