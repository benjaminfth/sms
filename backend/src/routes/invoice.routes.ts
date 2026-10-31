import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validateBody } from "../middleware/validate";
import { Role, voidInvoiceSchema } from "@sms/shared";

const router = Router();

router.use(authenticate);

// Listing & details (accessible by ADMIN, STAFF, and CUSTOMER with ownership scoping)
router.get("/", InvoiceController.list);
router.get("/:id", InvoiceController.get);

// Staff/Admin actions
router.post("/", requireRole(Role.ADMIN, Role.STAFF), InvoiceController.create);
router.post(
  "/:id/void",
  requireRole(Role.ADMIN, Role.STAFF),
  validateBody(voidInvoiceSchema),
  InvoiceController.void
);

export default router;

