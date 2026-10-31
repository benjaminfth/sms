import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { AppResponse } from "../utils/response";
import { ERROR_CODES, HTTP_STATUS } from "@sms/shared";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Check if error is our known AppError
  if (err instanceof AppError) {
    AppResponse.error(
      res,
      err.code,
      err.message,
      err.details || [],
      err.statusCode
    );
    return;
  }

  // Prisma unique constraint violation (P2002)
  if (err.code === "P2002") {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : "resource";
    AppResponse.error(
      res,
      ERROR_CODES.CONFLICT,
      `A unique constraint violation occurred: ${target} already exists`,
      [{ field: target, message: "Value must be unique" }],
      HTTP_STATUS.CONFLICT
    );
    return;
  }

  // Prisma record not found (P2025)
  if (err.code === "P2025") {
    AppResponse.error(
      res,
      ERROR_CODES.NOT_FOUND,
      "The requested record was not found",
      [],
      HTTP_STATUS.NOT_FOUND
    );
    return;
  }

  // Malformed JSON payload
  if (err instanceof SyntaxError && "body" in err) {
    AppResponse.error(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      "Malformed JSON request body",
      [],
      HTTP_STATUS.BAD_REQUEST
    );
    return;
  }

  // Zod validation error
  if (err?.name === "ZodError" || err?.constructor?.name === "ZodError") {
    const details = err.errors?.map((e: any) => ({
      field: Array.isArray(e.path) ? e.path.join(".") : String(e.path || "field"),
      message: e.message,
    })) || [];
    AppResponse.error(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      "Request validation failed",
      details,
      HTTP_STATUS.BAD_REQUEST
    );
    return;
  }

  // Unexpected / unhandled errors
  console.error("Unhandled Server Error:", err);
  AppResponse.error(
    res,
    ERROR_CODES.INTERNAL_ERROR,
    process.env.NODE_ENV === "production"
      ? "An internal server error occurred"
      : err.message || "An internal server error occurred",
    [],
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
}
