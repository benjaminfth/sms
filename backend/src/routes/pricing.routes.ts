import { Router } from "express";
import { PricingController } from "../controllers/pricing.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { calculatePricingSchema } from "@sms/shared";

const router = Router();

router.post(
  "/calculate",
  authenticate,
  validate(calculatePricingSchema),
  PricingController.calculate
);

export default router;
