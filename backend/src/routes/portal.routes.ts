import { Router } from "express";
import { PortalController } from "../controllers/portal.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

// All portal routes require authentication
router.use(authenticate);

// Overview
router.get("/overview", PortalController.getOverview);

// Subscriptions
router.get("/subscriptions", PortalController.getSubscriptions);
router.get("/subscriptions/:id", PortalController.getSubscriptionById);
router.post("/subscriptions/:id/cancel", PortalController.cancelSubscription);

// Quotations
router.get("/quotations", PortalController.getQuotations);
router.get("/quotations/:id", PortalController.getQuotationById);
router.post("/quotations/:id/accept", PortalController.acceptQuotation);
router.post("/quotations/:id/reject", PortalController.rejectQuotation);

// Invoices & Payment Initiation
router.get("/invoices", PortalController.getInvoices);
router.get("/invoices/:id", PortalController.getInvoiceById);
router.post("/invoices/:id/pay", PortalController.payInvoice);

// Payments history
router.get("/payments", PortalController.getPayments);

// Profile
router.get("/profile", PortalController.getProfile);
router.patch("/profile", PortalController.updateProfile);

export default router;
