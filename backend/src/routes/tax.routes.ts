import { Router } from "express";
import { TaxController } from "../controllers/tax.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  createTaxSchema,
  updateTaxSchema,
  assignProductTaxesSchema,
  Role,
} from "@sms/shared";

const router = Router();

// Public / Authenticated reads
router.get("/", authenticate, TaxController.listTaxes);
router.get("/:id", authenticate, TaxController.getTaxById);

// Admin-only management
router.post(
  "/",
  authenticate,
  requireRole(Role.ADMIN),
  validate(createTaxSchema),
  TaxController.createTax
);

router.patch(
  "/:id",
  authenticate,
  requireRole(Role.ADMIN),
  validate(updateTaxSchema),
  TaxController.updateTax
);

router.delete(
  "/:id",
  authenticate,
  requireRole(Role.ADMIN),
  TaxController.deleteTax
);

// Product Tax routes
router.get("/products/:productId", authenticate, TaxController.getProductTaxes);
router.post(
  "/products/:productId",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  validate(assignProductTaxesSchema),
  TaxController.assignProductTaxes
);
router.delete(
  "/products/:productId/:taxId",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  TaxController.removeProductTax
);

export default router;
