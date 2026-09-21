import { NextFunction, Request, Response } from "express";
import { ApiError } from "@/utils/apiError";
import { logger } from "@/lib/logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Route not found: ${req.method} ${req.path}` },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) logger.error({ err }, "Request failed");
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  const prismaErr = err as { code?: string; meta?: unknown };
  if (prismaErr?.code === "P2002") {
    return res.status(409).json({
      error: { code: "CONFLICT", message: "A record with this value already exists.", details: prismaErr.meta },
    });
  }
  if (prismaErr?.code === "P2025") {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Record not found." } });
  }

  logger.error({ err }, "Unhandled error");
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
}
