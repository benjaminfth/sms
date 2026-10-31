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
  renewSubscriptionSchema,
  closeSubscriptionSchema,
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

// Send subscription quotation (Admin/Staff only)
router.post(
  "/:id/send-quotation",
  requireRole(Role.ADMIN, Role.STAFF),
  SubscriptionController.sendSubscriptionQuotation
);

// Confirm subscription (Admin/Staff only)
router.post(
  "/:id/confirm",
  requireRole(Role.ADMIN, Role.STAFF),
  SubscriptionController.confirmSubscription
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

// Close subscription (Admin/Staff only)
router.post(
  "/:id/close",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(closeSubscriptionSchema),
  SubscriptionController.closeSubscription
);

// Cancel subscription (Admin/Staff only)
router.post(
  "/:id/cancel",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(cancelSubscriptionSchema),
  SubscriptionController.cancelSubscription
);

// Renew subscription (Admin/Staff only)
router.post(
  "/:id/renew",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(renewSubscriptionSchema),
  SubscriptionController.renewSubscription
);

export default router;
