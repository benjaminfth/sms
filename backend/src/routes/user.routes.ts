import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { Role } from "@sms/shared";
import {
  createStaffSchema,
  updateUserSchema,
  updateUserRoleSchema,
  paginationQuerySchema,
} from "@sms/shared";

const router = Router();

router.use(authenticate);

router.post(
  "/staff",
  requireRole(Role.ADMIN),
  validate(createStaffSchema),
  UserController.createStaff
);

router.get(
  "/",
  requireRole(Role.ADMIN),
  validate(paginationQuerySchema, "query"),
  UserController.getUsers
);

router.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(updateUserSchema),
  UserController.updateUser
);

router.put(
  "/:id/role",
  requireRole(Role.ADMIN),
  validate(updateUserRoleSchema),
  UserController.updateUserRole
);

export default router;
