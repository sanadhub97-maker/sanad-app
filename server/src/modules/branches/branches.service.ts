import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { paginationMeta, skipTake } from "@/utils/pagination";
import type { z } from "zod";
import type { createBranchSchema, listBranchesQuerySchema, updateBranchSchema } from "@/modules/branches/branches.schemas";

type CreateInput = z.infer<typeof createBranchSchema>;
type UpdateInput = z.infer<typeof updateBranchSchema>;
type ListQuery = z.infer<typeof listBranchesQuerySchema>;

export async function list(query: ListQuery) {
  const { page, pageSize, sortBy, sortDir, q, status } = query;

  const where: Prisma.BranchWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy = sortBy ? { [sortBy]: sortDir } : { createdAt: "desc" as const };

  const [data, total] = await Promise.all([
    prisma.branch.findMany({
      where,
      orderBy,
      ...skipTake(page, pageSize),
      include: { manager: { select: { id: true, fullName: true } }, _count: { select: { employees: true } } },
    }),
    prisma.branch.count({ where }),
  ]);

  return { data, meta: paginationMeta(page, pageSize, total) };
}

export async function getById(id: string) {
  const branch = await prisma.branch.findFirst({
    where: { id, deletedAt: null },
    include: { manager: { select: { id: true, fullName: true } } },
  });
  if (!branch) throw ApiError.notFound("Branch not found");
  return branch;
}

export async function create(input: CreateInput) {
  const existing = await prisma.branch.findFirst({ where: { code: input.code, deletedAt: null } });
  if (existing) throw ApiError.badRequest("A branch with this code already exists.");
  return prisma.branch.create({ data: { ...input, email: input.email || undefined } });
}

export async function update(id: string, input: UpdateInput) {
  await getById(id);
  if (input.code) {
    const existing = await prisma.branch.findFirst({ where: { code: input.code, id: { not: id }, deletedAt: null } });
    if (existing) throw ApiError.badRequest("A branch with this code already exists.");
  }
  return prisma.branch.update({ where: { id }, data: { ...input, email: input.email || undefined } });
}

export async function softDelete(id: string) {
  const branch = await getById(id);
  const activeEmployees = await prisma.employee.count({ where: { branchId: id, deletedAt: null } });
  if (activeEmployees > 0) {
    throw ApiError.badRequest("Cannot delete a branch that still has employees assigned to it.");
  }
  // code has a hard DB-unique constraint, so a soft-deleted row would
  // otherwise permanently block that code from ever being reused — free
  // it by tagging the deleted copy.
  return prisma.branch.update({
    where: { id },
    data: { deletedAt: new Date(), code: `${branch.code}__deleted_${Date.now()}` },
  });
}

export async function listAllActive() {
  return prisma.branch.findMany({ where: { deletedAt: null, status: "ACTIVE" }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } });
}
