import { Router } from "express";
import { BillingController } from "../controllers/billing.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validateBody } from "../middleware/validate";
import { Role, runBillingSchema } from "@sms/shared";

const router = Router();

router.use(authenticate);

// Manual execution: strictly ADMIN only
router.post(
  "/run",
  requireRole(Role.ADMIN),
  validateBody(runBillingSchema),
  BillingController.runBilling
);

// Runs & Attempts: ADMIN and STAFF
router.get("/runs", requireRole(Role.ADMIN, Role.STAFF), BillingController.listRuns);
router.get("/runs/:id", requireRole(Role.ADMIN, Role.STAFF), BillingController.getRun);
router.get("/attempts", requireRole(Role.ADMIN, Role.STAFF), BillingController.listAttempts);

export default router;

