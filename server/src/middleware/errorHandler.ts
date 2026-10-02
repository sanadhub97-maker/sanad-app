import { NextFunction, Request, Response } from "express";
import { ApiError } from "@/utils/apiError";
import { logger } from "@/lib/logger";
import { ZodError } from "zod";
import { MulterError } from "multer";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Route not found: ${req.method} ${req.path}` },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request input" } });
  if (err instanceof MulterError) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: { code: "UPLOAD_ERROR", message: "Upload exceeded the allowed limits or is malformed." } });
  const parserError = err as { type?: string; status?: number };
  if (["entity.too.large", "entity.parse.failed", "parameters.too.many"].includes(parserError?.type ?? "")) return res.status(parserError.status === 413 ? 413 : 400).json({ error: { code: "INVALID_BODY", message: "Invalid or oversized request body." } });
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
