import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { Role } from "@sms/shared";
import {
  createInvoiceSchema,
  voidInvoiceSchema,
  paginationQuerySchema,
} from "@sms/shared";

const router = Router();

router.use(authenticate);

// List invoices (Admin/Staff view all, Customers view their own)
router.get(
  "/",
  validate(paginationQuerySchema, "query"),
  InvoiceController.getInvoices
);

// Create invoice manually (Admin/Staff only)
router.post(
  "/",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(createInvoiceSchema),
  InvoiceController.createInvoice
);

// Get single invoice by ID (Admin/Staff or owner Customer)
router.get(
  "/:id",
  InvoiceController.getInvoiceById
);

// Void invoice (Admin/Staff only)
router.post(
  "/:id/void",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(voidInvoiceSchema),
  InvoiceController.voidInvoice
);

export default router;

