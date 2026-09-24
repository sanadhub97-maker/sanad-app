import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { paginationMeta, skipTake } from "@/utils/pagination";
import { computeStatus } from "@/services/expiration";
import { getExpirationRules } from "@/services/settingsStore";
import type { z } from "zod";
import type {
  createCompanyDocumentSchema,
  listCompanyDocumentsQuerySchema,
  updateCompanyDocumentSchema,
} from "@/modules/companyDocuments/companyDocuments.schemas";

type CreateInput = z.infer<typeof createCompanyDocumentSchema>;
type UpdateInput = z.infer<typeof updateCompanyDocumentSchema>;
type ListQuery = z.infer<typeof listCompanyDocumentsQuerySchema>;

const includeBranch = { branch: { select: { id: true, name: true, nameEn: true, code: true } } } as const;

function expiryStatusDateFilter(status: "VALID" | "EXPIRING_SOON" | "EXPIRED", thresholdDays: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thresholdDate = new Date(today);
  thresholdDate.setDate(thresholdDate.getDate() + thresholdDays);

  if (status === "EXPIRED") return { lt: today };
  if (status === "EXPIRING_SOON") return { gte: today, lte: thresholdDate };
  return { gt: thresholdDate };
}

export async function list(query: ListQuery) {
  const { page, pageSize, sortBy, sortDir, q, category, branchId, expiryStatus } = query;
  const rules = await getExpirationRules();

  const where: Prisma.CompanyDocumentWhereInput = {
    deletedAt: null,
    ...(category ? { category } : {}),
    ...(branchId ? { branchId } : {}),
    ...(expiryStatus ? { expiryDate: expiryStatusDateFilter(expiryStatus, rules.expiringSoonThresholdDays) } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { documentNumber: { contains: q, mode: "insensitive" } },
            { licenseNumber: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy = sortBy ? { [sortBy]: sortDir } : { expiryDate: "asc" as const };

  const [rows, total] = await Promise.all([
    prisma.companyDocument.findMany({ where, orderBy, ...skipTake(page, pageSize), include: includeBranch }),
    prisma.companyDocument.count({ where }),
  ]);

  const data = rows.map((doc) => ({ ...doc, status: computeStatus(doc.expiryDate, rules) }));
  return { data, meta: paginationMeta(page, pageSize, total) };
}

// Powers the category chip row in the UI (§15) — a count per category so
// users can see volume at a glance before filtering.
export async function categoryCounts() {
  const rows = await prisma.companyDocument.groupBy({
    by: ["category"],
    where: { deletedAt: null },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.category, r._count._all]));
}

export async function getById(id: string) {
  const doc = await prisma.companyDocument.findFirst({ where: { id, deletedAt: null }, include: includeBranch });
  if (!doc) throw ApiError.notFound("Document not found");
  const rules = await getExpirationRules();
  return { ...doc, status: computeStatus(doc.expiryDate, rules) };
}

export async function create(input: CreateInput) {
  if (input.branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: input.branchId, deletedAt: null } });
    if (!branch) throw ApiError.badRequest("Selected branch does not exist.");
  }
  const doc = await prisma.companyDocument.create({ data: input, include: includeBranch });
  const rules = await getExpirationRules();
  return { ...doc, status: computeStatus(doc.expiryDate, rules) };
}

export async function update(id: string, input: UpdateInput) {
  const existing = await prisma.companyDocument.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Document not found");
  const doc = await prisma.companyDocument.update({ where: { id }, data: input, include: includeBranch });
  const rules = await getExpirationRules();
  return { ...doc, status: computeStatus(doc.expiryDate, rules) };
}

export async function softDelete(id: string) {
  const existing = await prisma.companyDocument.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Document not found");
  await prisma.companyDocument.update({ where: { id }, data: { deletedAt: new Date() } });
}
