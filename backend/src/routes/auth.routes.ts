import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authLimiter } from "../middleware/rate-limit";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@sms/shared";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  AuthController.register
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  AuthController.login
);

router.post(
  "/refresh",
  AuthController.refresh
);

router.post(
  "/logout",
  AuthController.logout
);

router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  AuthController.forgotPassword
);

router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  AuthController.resetPassword
);

export default router;
