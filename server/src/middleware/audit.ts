import { NextFunction, Request, Response } from "express";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface AuditOptions {
  recordId?: (req: Request) => string | undefined;
  description?: (req: Request) => string | undefined;
  /** Write at most one row per user and record in this many ms (a file shown as a thumbnail is fetched again and again). */
  oncePer?: number;
}

/**
 * Records successful JSON and binary responses when the response finishes.
 */
export function auditLog(action: AuditAction, module: string, opts: AuditOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on("finish", () => {
      if (res.statusCode < 400) {
        const recordId = opts.recordId?.(req) ?? res.locals.auditRecordId ?? (req.params?.id as string | undefined);
        const recent = opts.oncePer && recordId
          ? prisma.auditLog.findFirst({ where: { userId: req.auth?.userId, action, module, recordId, createdAt: { gte: new Date(Date.now() - opts.oncePer) } }, select: { id: true } })
          : Promise.resolve(null);
        recent
          .then((already) => already ? null : prisma.auditLog.create({
            data: {
              userId: req.auth?.userId,
              action,
              module,
              recordId,
              description: opts.description?.(req),
              ipAddress: req.ip,
              userAgent: req.headers["user-agent"],
            },
          }))
          .catch((err) => logger.error({ err }, "Failed to write audit log"));
      }
    });
    const originalJson = res.json.bind(res);
    res.json = ((body: { id?: string; data?: { id?: string } }) => {
      res.locals.auditRecordId = body?.id ?? body?.data?.id;
      return originalJson(body);
    }) as Response["json"];
    next();
  };
}
