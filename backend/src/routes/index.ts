import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import customerRoutes from "./customer.routes";
import productRoutes from "./product.routes";
import planRoutes from "./plan.routes";
import quotationRoutes from "./quotation.routes";
import quotationTemplateRoutes from "./quotation-template.routes";
import subscriptionRoutes from "./subscription.routes";
import billingRoutes from "./billing.routes";
import invoiceRoutes from "./invoice.routes";
import taxRoutes from "./tax.routes";
import discountRoutes from "./discount.routes";
import pricingRoutes from "./pricing.routes";
import paymentRoutes from "./payment.routes";
import allocationRoutes from "./allocation.routes";
import reconciliationRoutes from "./reconciliation.routes";
import dashboardRoutes from "./dashboard.routes";
import portalRoutes from "./portal.routes";
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
router.use("/quotations", quotationRoutes);
router.use("/quotation-templates", quotationTemplateRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/billing", billingRoutes);
router.use("/invoices", invoiceRoutes);

// Developer 3 Financial & Portal Modules
router.use("/taxes", taxRoutes);
router.use("/discounts", discountRoutes);
router.use("/pricing", pricingRoutes);
router.use("/payments", paymentRoutes);
router.use("/payment-allocations", allocationRoutes);
router.use("/reconciliation", reconciliationRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/portal", portalRoutes);

export default router;
