import { Router } from "express";
import { AllocationController } from "../controllers/allocation.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { Role } from "@sms/shared";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  AllocationController.listAllocations
);

router.post(
  "/:id/allocations",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  AllocationController.allocate
);

export default router;
