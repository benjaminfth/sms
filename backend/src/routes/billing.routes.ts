import { Router } from "express";
import { BillingController } from "../controllers/billing.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { Role } from "@sms/shared";
import {
  triggerBillingRunSchema,
  paginationQuerySchema,
} from "@sms/shared";

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.ADMIN)); // Billing engine execution & audit logs are strictly ADMIN

// Run billing engine
router.post(
  "/run",
  validate(triggerBillingRunSchema),
  BillingController.executeBillingRun
);

// List billing runs
router.get(
  "/runs",
  validate(paginationQuerySchema, "query"),
  BillingController.getBillingRuns
);

// Get single billing run details
router.get(
  "/runs/:id",
  BillingController.getBillingRunById
);

// List billing attempts
router.get(
  "/attempts",
  validate(paginationQuerySchema, "query"),
  BillingController.getBillingAttempts
);

export default router;

