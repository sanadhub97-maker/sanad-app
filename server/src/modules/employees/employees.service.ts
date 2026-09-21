import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { paginationMeta, skipTake } from "@/utils/pagination";
import { computeStatus } from "@/services/expiration";
import { getExpirationRules } from "@/services/settingsStore";
import type { z } from "zod";
import type { createEmployeeSchema, listEmployeesQuerySchema, updateEmployeeSchema } from "@/modules/employees/employees.schemas";

type CreateInput = z.infer<typeof createEmployeeSchema>;
type UpdateInput = z.infer<typeof updateEmployeeSchema>;
type ListQuery = z.infer<typeof listEmployeesQuerySchema>;

const includeBranch = { branch: { select: { id: true, name: true, code: true } } } as const;

async function withComputedStatus<T extends { iqamaExpiryDate: Date | null; passportExpiryDate: Date | null }>(
  employee: T
) {
  const rules = await getExpirationRules();
  return {
    ...employee,
    iqamaStatus: computeStatus(employee.iqamaExpiryDate, rules),
    passportStatus: computeStatus(employee.passportExpiryDate, rules),
  };
}

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
  const { page, pageSize, sortBy, sortDir, q, branchId, employmentStatus, department, expiryStatus } = query;
  const rules = await getExpirationRules();

  const where: Prisma.EmployeeWhereInput = {
    deletedAt: null,
    ...(branchId ? { branchId } : {}),
    ...(employmentStatus ? { employmentStatus } : {}),
    ...(department ? { department } : {}),
    ...(expiryStatus ? { iqamaExpiryDate: expiryStatusDateFilter(expiryStatus, rules.expiringSoonThresholdDays) } : {}),
    ...(q
      ? {
          OR: [
            { employeeNumber: { contains: q, mode: "insensitive" } },
            { fullNameAr: { contains: q, mode: "insensitive" } },
            { fullNameEn: { contains: q, mode: "insensitive" } },
            { iqamaNumber: { contains: q, mode: "insensitive" } },
            { passportNumber: { contains: q, mode: "insensitive" } },
            { mobile: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy = sortBy ? { [sortBy]: sortDir } : { createdAt: "desc" as const };

  const [rows, total] = await Promise.all([
    prisma.employee.findMany({ where, orderBy, ...skipTake(page, pageSize), include: includeBranch }),
    prisma.employee.count({ where }),
  ]);

  const data = await Promise.all(rows.map((row) => withComputedStatus(row)));
  return { data, meta: paginationMeta(page, pageSize, total) };
}

export async function getById(id: string) {
  const employee = await prisma.employee.findFirst({
    where: { id, deletedAt: null },
    include: {
      ...includeBranch,
      documents: { where: { deletedAt: null }, orderBy: { expiryDate: "asc" } },
      payments: { where: { deletedAt: null }, orderBy: { paymentDate: "desc" }, take: 10 },
    },
  });
  if (!employee) throw ApiError.notFound("Employee not found");

  const rules = await getExpirationRules();
  const documents = employee.documents.map((doc) => ({ ...doc, status: computeStatus(doc.expiryDate, rules) }));

  return { ...(await withComputedStatus(employee)), documents };
}

async function assertUniqueIdentifiers(input: Partial<CreateInput>, excludeId?: string) {
  if (input.employeeNumber) {
    const existing = await prisma.employee.findFirst({
      where: { employeeNumber: input.employeeNumber, id: { not: excludeId }, deletedAt: null },
    });
    if (existing) throw ApiError.badRequest("An employee with this employee number already exists.");
  }
  if (input.iqamaNumber) {
    const existing = await prisma.employee.findFirst({ where: { iqamaNumber: input.iqamaNumber, id: { not: excludeId }, deletedAt: null } });
    if (existing) throw ApiError.badRequest("An employee with this Iqama number already exists.");
  }
  if (input.branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: input.branchId, deletedAt: null } });
    if (!branch) throw ApiError.badRequest("Selected branch does not exist.");
  }
}

export async function getNextEmployeeNumber(): Promise<string> {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    select: { employeeNumber: true },
  });

  let maxNum = 0;
  for (const emp of employees) {
    const match = emp.employeeNumber.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `EMP-${String(nextNum).padStart(4, "0")}`;
}

export async function create(input: CreateInput) {
  if (!input.employeeNumber || input.employeeNumber.trim() === "") {
    input.employeeNumber = await getNextEmployeeNumber();
  }
  await assertUniqueIdentifiers(input);
  const employee = await prisma.employee.create({ data: input as Prisma.EmployeeCreateInput, include: includeBranch });
  return withComputedStatus(employee);
}

export async function update(id: string, input: UpdateInput) {
  const existing = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Employee not found");
  await assertUniqueIdentifiers(input, id);
  const employee = await prisma.employee.update({ where: { id }, data: input, include: includeBranch });
  return withComputedStatus(employee);
}

export async function softDelete(id: string) {
  const existing = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Employee not found");
  // employeeNumber has a hard DB-unique constraint, so a soft-deleted row
  // would otherwise permanently block that number from ever being reused —
  // free it by tagging the deleted copy.
  await prisma.employee.update({
    where: { id },
    data: { deletedAt: new Date(), employeeNumber: `${existing.employeeNumber}__deleted_${Date.now()}` },
  });
}
