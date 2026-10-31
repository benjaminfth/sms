import { Router } from "express";
import { SubscriptionController } from "../controllers/subscription.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { Role } from "@sms/shared";
import {
  createSubscriptionSchema,
  cancelSubscriptionSchema,
  pauseSubscriptionSchema,
  paginationQuerySchema,
} from "@sms/shared";

const router = Router();

router.use(authenticate);

// List subscriptions (Admin/Staff view all, Customers view their own)
router.get(
  "/",
  validate(paginationQuerySchema, "query"),
  SubscriptionController.getSubscriptions
);

// Create subscription manually (Admin/Staff only)
router.post(
  "/",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(createSubscriptionSchema),
  SubscriptionController.createSubscription
);

// Get subscription by ID (Admin/Staff or owner Customer)
router.get(
  "/:id",
  SubscriptionController.getSubscriptionById
);

// Activate subscription (Admin/Staff only)
router.post(
  "/:id/activate",
  requireRole(Role.ADMIN, Role.STAFF),
  SubscriptionController.activateSubscription
);

// Pause subscription (Admin/Staff only)
router.post(
  "/:id/pause",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(pauseSubscriptionSchema),
  SubscriptionController.pauseSubscription
);

// Resume subscription (Admin/Staff only)
router.post(
  "/:id/resume",
  requireRole(Role.ADMIN, Role.STAFF),
  SubscriptionController.resumeSubscription
);

// Cancel subscription (Admin/Staff only)
router.post(
  "/:id/cancel",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(cancelSubscriptionSchema),
  SubscriptionController.cancelSubscription
);

export default router;

