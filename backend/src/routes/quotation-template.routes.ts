import { Router } from "express";
import { QuotationTemplateController } from "../controllers/quotation-template.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validateBody } from "../middleware/validate";
import {
  Role,
  createQuotationTemplateSchema,
  updateQuotationTemplateSchema,
} from "@sms/shared";

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.ADMIN, Role.STAFF));

router.get("/", QuotationTemplateController.list);
router.get("/:id", QuotationTemplateController.get);
router.post("/", validateBody(createQuotationTemplateSchema), QuotationTemplateController.create);
router.patch("/:id", validateBody(updateQuotationTemplateSchema), QuotationTemplateController.update);
router.delete("/:id", QuotationTemplateController.delete);

export default router;

