import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { Role } from "@sms/shared";
import {
  createProductSchema,
  updateProductSchema,
  createProductVariantSchema,
  updateProductVariantSchema,
  paginationQuerySchema,
} from "@sms/shared";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(createProductSchema),
  ProductController.createProduct
);

router.get(
  "/",
  validate(paginationQuerySchema, "query"),
  ProductController.getProducts
);

router.get(
  "/:id",
  ProductController.getProductById
);

router.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(updateProductSchema),
  ProductController.updateProduct
);

router.delete(
  "/:id",
  requireRole(Role.ADMIN, Role.STAFF),
  ProductController.deleteProduct
);

router.post(
  "/:id/variants",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(createProductVariantSchema),
  ProductController.addVariant
);

router.patch(
  "/:id/variants/:variantId",
  requireRole(Role.ADMIN, Role.STAFF),
  validate(updateProductVariantSchema),
  ProductController.updateVariant
);

export default router;
