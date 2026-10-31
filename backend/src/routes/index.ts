import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import customerRoutes from "./customer.routes";
import productRoutes from "./product.routes";
import planRoutes from "./plan.routes";
import quotationTemplateRoutes from "./quotation-template.routes";
import quotationRoutes from "./quotation.routes";
import subscriptionRoutes from "./subscription.routes";
import billingRoutes from "./billing.routes";
import invoiceRoutes from "./invoice.routes";
import { AppResponse } from "../utils/response";

const router = Router();

router.get("/health", (_req, res) => {
  return AppResponse.success(res, {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "brightloop-sms-api",
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/customers", customerRoutes);
router.use("/products", productRoutes);
router.use("/plans", planRoutes);
router.use("/quotation-templates", quotationTemplateRoutes);
router.use("/quotations", quotationRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/billing", billingRoutes);
router.use("/invoices", invoiceRoutes);

export default router;
