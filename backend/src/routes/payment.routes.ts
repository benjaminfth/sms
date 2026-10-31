import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createPaymentSchema, Role } from "@sms/shared";

const router = Router();

router.get("/", authenticate, PaymentController.listPayments);
router.get("/:id", authenticate, PaymentController.getPaymentById);
router.get("/:id/allocations", authenticate, PaymentController.getPaymentAllocations);

router.post(
  "/",
  authenticate,
  validate(createPaymentSchema),
  PaymentController.recordPayment
);

router.post(
  "/:id/verify",
  authenticate,
  requireRole(Role.ADMIN, Role.STAFF),
  PaymentController.verifyPayment
);

export default router;
