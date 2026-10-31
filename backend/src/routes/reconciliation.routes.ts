import { Router } from "express";
import { ReconciliationController } from "../controllers/reconciliation.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { Role } from "@sms/shared";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  ReconciliationController.getReport
);

router.get(
  "/unmatched",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  ReconciliationController.getUnmatched
);

router.post(
  "/:paymentId/allocate",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  ReconciliationController.allocate
);

export default router;
