import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { paginationMeta, skipTake } from "@/utils/pagination";
import type { z } from "zod";
import type { listAuditLogsQuerySchema } from "@/modules/auditLogs/auditLogs.schemas";

type ListQuery = z.infer<typeof listAuditLogsQuerySchema>;

export async function list(query: ListQuery) {
  const { page, pageSize, module, userId, action, dateFrom, dateTo } = query;

  const where: Prisma.AuditLogWhereInput = {
    ...(module ? { module } : {}),
    ...(userId ? { userId } : {}),
    ...(action ? { action } : {}),
    ...(dateFrom || dateTo ? { createdAt: { gte: dateFrom, lte: dateTo } } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...skipTake(page, pageSize),
      include: { user: { select: { id: true, fullName: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, meta: paginationMeta(page, pageSize, total) };
}
