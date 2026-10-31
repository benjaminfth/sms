import { Router } from "express";
import { SettingsController } from "../controllers/settings.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { Role } from "@sms/shared";

const router = Router();

// Strict RBAC: All settings endpoints require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole(Role.ADMIN));

// System Health Probe
router.get("/system/health", SettingsController.getSystemHealth);

// Company Logo Management
router.post("/company/logo", SettingsController.uploadCompanyLogo);
router.delete("/company/logo", SettingsController.deleteCompanyLogo);

// Notifications Test Email
router.post("/notifications/test-email", SettingsController.sendTestEmail);

// Category-specific and Bulk Settings
router.get("/", SettingsController.getAllSettings);
router.get("/:category", SettingsController.getCategorySettings);
router.put("/:category", SettingsController.updateCategorySettings);

export default router;
