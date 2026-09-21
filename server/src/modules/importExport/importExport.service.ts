import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { paginationMeta, skipTake } from "@/utils/pagination";
import type { z } from "zod";
import type { listImportJobsQuerySchema } from "@/modules/importExport/importExport.schemas";

type ListQuery = z.infer<typeof listImportJobsQuerySchema>;

export async function listJobs(query: ListQuery) {
  const { page, pageSize, module } = query;
  const where: Prisma.ImportJobWhereInput = module ? { module } : {};

  const [data, total] = await Promise.all([
    prisma.importJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...skipTake(page, pageSize),
      include: { createdBy: { select: { fullName: true } } },
    }),
    prisma.importJob.count({ where }),
  ]);

  return { data, meta: paginationMeta(page, pageSize, total) };
}

export async function getJob(id: string) {
  const job = await prisma.importJob.findUnique({
    where: { id },
    include: { errors: { orderBy: { rowNumber: "asc" } }, createdBy: { select: { fullName: true } } },
  });
  if (!job) throw ApiError.notFound("Import job not found");
  return job;
}
