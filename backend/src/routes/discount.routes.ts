import { Router } from "express";
import { DiscountController } from "../controllers/discount.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  createDiscountSchema,
  updateDiscountSchema,
  validateDiscountSchema,
  Role,
} from "@sms/shared";

const router = Router();

// Validate discount (authenticated users or customers calculating pricing)
router.post(
  "/validate",
  authenticate,
  validate(validateDiscountSchema),
  DiscountController.validateDiscount
);

// Discount listing & retrieval (Admin & Staff)
router.get(
  "/",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  DiscountController.listDiscounts
);

router.get(
  "/:id",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  DiscountController.getDiscountById
);

router.get(
  "/:id/redemptions",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  DiscountController.getDiscountRedemptions
);

// Create and update (Admin & Staff)
router.post(
  "/",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  validate(createDiscountSchema),
  DiscountController.createDiscount
);

router.patch(
  "/:id",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  validate(updateDiscountSchema),
  DiscountController.updateDiscount
);

router.post(
  "/:id/activate",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  DiscountController.activateDiscount
);

router.post(
  "/:id/deactivate",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  DiscountController.deactivateDiscount
);

export default router;
