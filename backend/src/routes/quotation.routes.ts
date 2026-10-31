import { Router } from "express";
import { QuotationController } from "../controllers/quotation.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validateBody } from "../middleware/validate";
import {
  Role,
  createQuotationSchema,
  updateQuotationSchema,
  convertQuotationSchema,
  rejectQuotationSchema,
} from "@sms/shared";

const router = Router();

router.use(authenticate);

// Listing & details (accessible by ADMIN, STAFF, and CUSTOMER with ownership scoping)
router.get("/", QuotationController.list);
router.get("/:id", QuotationController.get);

// Staff/Admin management
router.post(
  "/",
  requireRole(Role.ADMIN, Role.STAFF),
  validateBody(createQuotationSchema),
  QuotationController.create
);

router.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.STAFF),
  validateBody(updateQuotationSchema),
  QuotationController.update
);

router.post(
  "/:id/send",
  requireRole(Role.ADMIN, Role.STAFF),
  QuotationController.send
);

router.post(
  "/:id/expire",
  requireRole(Role.ADMIN, Role.STAFF),
  QuotationController.expire
);

router.post(
  "/:id/convert",
  requireRole(Role.ADMIN, Role.STAFF),
  validateBody(convertQuotationSchema),
  QuotationController.convert
);

// Actions permitted for Customer (or Staff/Admin on customer behalf)
router.post("/:id/accept", QuotationController.accept);
router.post("/:id/reject", validateBody(rejectQuotationSchema), QuotationController.reject);

export default router;

