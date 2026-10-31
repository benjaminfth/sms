import { Router } from "express";
import { PlanController } from "../controllers/plan.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { Role } from "@sms/shared";
import {
  createPlanSchema,
  updatePlanSchema,
  paginationQuerySchema,
} from "@sms/shared";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(createPlanSchema),
  PlanController.createPlan
);

router.get(
  "/",
  validate(paginationQuerySchema, "query"),
  PlanController.getPlans
);

router.get(
  "/:id",
  PlanController.getPlanById
);

router.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(updatePlanSchema),
  PlanController.updatePlan
);

router.post(
  "/:id/activate",
  requireRole(Role.ADMIN, Role.STAFF),
  PlanController.activatePlan
);

router.post(
  "/:id/deactivate",
  requireRole(Role.ADMIN, Role.STAFF),
  PlanController.deactivatePlan
);

export default router;
