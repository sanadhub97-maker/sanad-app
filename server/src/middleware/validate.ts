import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "@/utils/apiError";

interface ValidationTargets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidationTargets) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query) as never;
      if (schemas.params) req.params = schemas.params.parse(req.params) as never;
      next();
    } catch (err: unknown) {
      const zodErr = err as { errors?: unknown; issues?: unknown };
      next(ApiError.validation(zodErr.issues ?? zodErr.errors ?? err));
    }
  };
}
