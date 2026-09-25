import { NextFunction, Request, Response } from "express";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface AuditOptions {
  recordId?: (req: Request) => string | undefined;
  description?: (req: Request) => string | undefined;
}

/**
 * Wraps res.json so that any successful (status < 400) mutating response
 * automatically writes an AuditLog row — controllers don't need to
 * hand-write logging calls (§35 / architecture decision in the build plan).
 */
export function auditLog(action: AuditAction, module: string, opts: AuditOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode < 400) {
        const record = body as { id?: string; data?: { id?: string } };
        const recordId = opts.recordId?.(req) ?? record?.id ?? record?.data?.id ?? (req.params?.id as string | undefined);
        prisma.auditLog
          .create({
            data: {
              userId: req.auth?.userId,
              action,
              module,
              recordId,
              description: opts.description?.(req),
              ipAddress: req.ip,
              userAgent: req.headers["user-agent"],
            },
          })
          .catch((err) => logger.error({ err }, "Failed to write audit log"));
      }
      return originalJson(body);
    }) as Response["json"];
    next();
  };
}
