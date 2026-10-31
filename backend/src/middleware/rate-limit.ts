import rateLimit from "express-rate-limit";
import { AppResponse } from "../utils/response";
import { ERROR_CODES } from "@sms/shared";

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    AppResponse.error(
      res,
      ERROR_CODES.UNPROCESSABLE_ENTITY,
      "Too many requests from this IP, please try again after 15 minutes",
      [],
      429
    );
  },
});

// Stricter limiter for sensitive auth routes (login, register, forgot-password)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    AppResponse.error(
      res,
      ERROR_CODES.UNPROCESSABLE_ENTITY,
      "Too many authentication attempts, please try again later",
      [],
      429
    );
  },
});
