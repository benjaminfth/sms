import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { Role } from "@sms/shared";

const router = Router();

// All dashboard endpoints require ADMIN or STAFF authorization
router.use(authenticate, requireRole(Role.ADMIN, Role.STAFF));

router.get("/overview", DashboardController.getOverview);
router.get("/revenue", DashboardController.getRevenue);
router.get("/subscriptions", DashboardController.getSubscriptions);
router.get("/invoices", DashboardController.getInvoices);
router.get("/payment-methods", DashboardController.getPaymentMethods);

export default router;
