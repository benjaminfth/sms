import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "../utils/errors";

type RequestLocation = "body" | "query" | "params";

export function validate(schema: ZodSchema, location: RequestLocation = "body") {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req[location]);
      req[location] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return next(new ValidationError("Request validation failed", details));
      }
      next(err);
    }
  };
}

export const validateBody = (schema: ZodSchema) => validate(schema, "body");
export const validateQuery = (schema: ZodSchema) => validate(schema, "query");
export const validateParams = (schema: ZodSchema) => validate(schema, "params");
