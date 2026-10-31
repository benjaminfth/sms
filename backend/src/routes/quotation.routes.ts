import { Router } from "express";
import { QuotationController } from "../controllers/quotation.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { Role } from "@sms/shared";
import {
  createQuotationSchema,
  updateQuotationSchema,
  paginationQuerySchema,
} from "@sms/shared";

const router = Router();

router.use(authenticate);

// List quotations (Admin/Staff view all, Customers view their own)
router.get(
  "/",
  validate(paginationQuerySchema, "query"),
  QuotationController.getQuotations
);

// Create quotation (Admin/Staff only)
router.post(
  "/",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(createQuotationSchema),
  QuotationController.createQuotation
);

// Get quotation by ID (Admin/Staff or owner Customer)
router.get(
  "/:id",
  QuotationController.getQuotationById
);

// Update draft quotation (Admin/Staff only)
router.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(updateQuotationSchema),
  QuotationController.updateQuotation
);

// Send quotation (Admin/Staff only)
router.post(
  "/:id/send",
  requireRole(Role.ADMIN, Role.STAFF),
  QuotationController.sendQuotation
);

// Accept quotation (Customer or Admin/Staff)
router.post(
  "/:id/accept",
  QuotationController.acceptQuotation
);

// Reject quotation (Customer or Admin/Staff)
router.post(
  "/:id/reject",
  QuotationController.rejectQuotation
);

// Expire quotation (Admin/Staff only)
router.post(
  "/:id/expire",
  requireRole(Role.ADMIN, Role.STAFF),
  QuotationController.expireQuotation
);

// Convert quotation to subscription (Admin/Staff only)
router.post(
  "/:id/convert",
  requireRole(Role.ADMIN, Role.STAFF),
  QuotationController.convertQuotation
);

export default router;

