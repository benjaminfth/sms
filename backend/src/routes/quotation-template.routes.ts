import { Router } from "express";
import { QuotationTemplateController } from "../controllers/quotation-template.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { Role } from "@sms/shared";
import {
  createQuotationTemplateSchema,
  updateQuotationTemplateSchema,
  paginationQuerySchema,
} from "@sms/shared";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(paginationQuerySchema, "query"),
  QuotationTemplateController.getTemplates
);

router.post(
  "/",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(createQuotationTemplateSchema),
  QuotationTemplateController.createTemplate
);

router.get(
  "/:id",
  requireRole(Role.ADMIN, Role.STAFF),
  QuotationTemplateController.getTemplateById
);

router.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(updateQuotationTemplateSchema),
  QuotationTemplateController.updateTemplate
);

router.delete(
  "/:id",
  requireRole(Role.ADMIN, Role.STAFF),
  QuotationTemplateController.deleteTemplate
);

export default router;

