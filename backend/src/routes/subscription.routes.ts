import { Router } from "express";
import { SubscriptionController } from "../controllers/subscription.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validateBody } from "../middleware/validate";
import {
  Role,
  createSubscriptionSchema,
  cancelSubscriptionSchema,
} from "@sms/shared";

const router = Router();

router.use(authenticate);

// Listing & details (accessible by ADMIN, STAFF, and CUSTOMER with ownership scoping)
router.get("/", SubscriptionController.list);
router.get("/:id", SubscriptionController.get);

// Staff/Admin management
router.post(
  "/",
  requireRole(Role.ADMIN, Role.STAFF),
  validateBody(createSubscriptionSchema),
  SubscriptionController.create
);

router.post(
  "/:id/activate",
  requireRole(Role.ADMIN, Role.STAFF),
  SubscriptionController.activate
);

router.post(
  "/:id/pause",
  requireRole(Role.ADMIN, Role.STAFF),
  SubscriptionController.pause
);

router.post(
  "/:id/resume",
  requireRole(Role.ADMIN, Role.STAFF),
  SubscriptionController.resume
);

// Cancellation (Customer or Admin/Staff)
router.post(
  "/:id/cancel",
  validateBody(cancelSubscriptionSchema),
  SubscriptionController.cancel
);

export default router;

