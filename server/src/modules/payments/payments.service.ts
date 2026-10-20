import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { paginationMeta, skipTake } from "@/utils/pagination";
import { PAYMENT_SUBTYPES, MULTI_BRANCH_CATEGORIES, MULTI_EMPLOYEE_CATEGORIES } from "@/constants/paymentCategories";
import type { z } from "zod";
import { getExpirationRules } from "@/services/settingsStore";
import { computeStatus } from "@/services/expiration";
import type { createPaymentSchema, listPaymentsQuerySchema, updatePaymentSchema } from "@/modules/payments/payments.schemas";

type CreateInput = z.infer<typeof createPaymentSchema>;
type UpdateInput = z.infer<typeof updatePaymentSchema>;
type ListQuery = z.infer<typeof listPaymentsQuerySchema>;

const includeRelations = {
  branch: { select: { id: true, name: true, nameEn: true, code: true } },
  employee: { select: { id: true, employeeNumber: true, fullNameAr: true, fullNameEn: true, profession: true, professionEn: true, iqamaNumber: true, sponsorName: true } },
  createdBy: { select: { id: true, fullName: true } },
} as const;

/** The parties a payment is for: several for the categories that take them (the first also in branchId /
 * employeeId, so single-party screens keep working), else just the one. */
function parties(category: string | undefined, input: { branchId?: string | null; employeeId?: string | null; branchIds?: string[]; employeeIds?: string[] }) {
  const out: { branchId?: string | null; employeeId?: string | null; branchIds?: string[]; employeeIds?: string[] } = {};
  if (input.branchIds !== undefined || input.branchId !== undefined || category !== undefined) {
    const ids = category && MULTI_BRANCH_CATEGORIES.includes(category) ? (input.branchIds?.length ? input.branchIds : input.branchId ? [input.branchId] : []) : [];
    if (ids.length) Object.assign(out, { branchIds: ids, branchId: ids[0] });
    else if (input.branchIds !== undefined || category !== undefined) out.branchIds = [];
  }
  if (input.employeeIds !== undefined || input.employeeId !== undefined || category !== undefined) {
    const ids = category && MULTI_EMPLOYEE_CATEGORIES.includes(category) ? (input.employeeIds?.length ? input.employeeIds : input.employeeId ? [input.employeeId] : []) : [];
    if (ids.length) Object.assign(out, { employeeIds: ids, employeeId: ids[0] });
    else if (input.employeeIds !== undefined || category !== undefined) out.employeeIds = [];
  }
  return out;
}

/** A filter on an establishment or employee that also finds the payments shared with it. */
export function partyWhere(branchId?: string, employeeId?: string): Prisma.PaymentWhereInput[] {
  return [
    ...(branchId ? [{ OR: [{ branchId }, { branchIds: { has: branchId } }] }] : []),
    ...(employeeId ? [{ OR: [{ employeeId }, { employeeIds: { has: employeeId } }] }] : []),
  ];
}

/** The names of every establishment and employee a shared payment is for. */
export async function withParties<T extends { branchIds?: string[]; employeeIds?: string[] }>(payment: T) {
  const [branches, employees] = await Promise.all([
    payment.branchIds?.length ? prisma.branch.findMany({ where: { id: { in: payment.branchIds } }, select: { id: true, name: true, nameEn: true, code: true } }) : [],
    payment.employeeIds?.length ? prisma.employee.findMany({ where: { id: { in: payment.employeeIds } }, select: { id: true, employeeNumber: true, fullNameAr: true, fullNameEn: true, iqamaNumber: true, profession: true, professionEn: true } }) : [],
  ]);
  const order = <R extends { id: string }>(ids: string[] | undefined, rows: R[]) => (ids ?? []).map((id) => rows.find((r) => r.id === id)).filter((r): r is R => !!r);
  return { ...payment, branches: order(payment.branchIds, branches), employees: order(payment.employeeIds, employees) };
}

async function generatePaymentNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.payment.count();
    const candidate = `PAY-${String(count + 1 + attempt).padStart(6, "0")}`;
    const exists = await prisma.payment.findUnique({ where: { paymentNumber: candidate } });
    if (!exists) return candidate;
  }
  return `PAY-${Date.now()}`;
}

export async function list(query: ListQuery) {
  const { page, pageSize, sortBy, sortDir, q, category, method, branchId, employeeId, dateFrom, dateTo } = query;

  const where: Prisma.PaymentWhereInput = {
    deletedAt: null,
    ...(category ? { category } : {}),
    ...(method ? { method } : {}),
    AND: partyWhere(branchId, employeeId),
    ...(dateFrom || dateTo ? { paymentDate: { gte: dateFrom, lte: dateTo } } : {}),
    ...(q
      ? {
          OR: [
            { paymentNumber: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { referenceNumber: { contains: q, mode: "insensitive" } },
            { supplierName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy = sortBy ? { [sortBy]: sortDir } : { paymentDate: "desc" as const };

  const [data, total, aggregate] = await Promise.all([
    prisma.payment.findMany({ where, orderBy, ...skipTake(page, pageSize), include: includeRelations }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where, _sum: { amount: true, vat: true, total: true } }),
  ]);

  return {
    data,
    meta: paginationMeta(page, pageSize, total),
    summary: {
      totalAmount: aggregate._sum.amount ?? 0,
      totalVat: aggregate._sum.vat ?? 0,
      grandTotal: aggregate._sum.total ?? 0,
    },
  };
}

export async function getById(id: string) {
  const payment = await prisma.payment.findFirst({ where: { id, deletedAt: null }, include: includeRelations });
  if (!payment) throw ApiError.notFound("Payment not found");
  return withParties(payment);
}

export async function create(input: CreateInput, createdById: string) {
  const amount = new Prisma.Decimal(input.amount);
  const vat = new Prisma.Decimal(input.vat ?? 0);
  const total = amount.plus(vat);

  const paymentNumber = input.paymentNumber || (await generatePaymentNumber());
  if (input.paymentNumber) {
    const existing = await prisma.payment.findFirst({ where: { paymentNumber, deletedAt: null } });
    if (existing) throw ApiError.badRequest("A payment with this number already exists.");
  }

  const data = { ...input, ...parties(input.category, input), fileIds: input.fileIds ?? (input.fileId ? [input.fileId] : []), fileId: input.fileIds ? input.fileIds[0] ?? null : input.fileId, type: PAYMENT_SUBTYPES[input.category] ? input.type : undefined, paymentNumber, amount, vat, total, createdById };
  const months = input.category === "WORK_PERMIT" ? workPermitMonths(input.type) : null;
  if (!months || !input.employeeId) return prisma.payment.create({ data, include: includeRelations });

  // A work permit paid for is recorded on the employee too, ending its length after the payment date.
  const issued = new Date(input.paymentDate as unknown as string | Date);
  const expiry = new Date(issued);
  expiry.setUTCMonth(expiry.getUTCMonth() + months);
  const rules = await getExpirationRules();
  const [payment] = await prisma.$transaction([
    prisma.payment.create({ data, include: includeRelations }),
    prisma.employeeDocument.create({
      data: {
        employeeId: input.employeeId,
        type: "WORK_PERMIT",
        name: `رخصة عمل ${months === 12 ? "12 شهر" : `${months} أشهر`}`,
        issueDate: issued,
        startDate: issued,
        expiryDate: expiry,
        cachedStatus: computeStatus(expiry, rules),
        notes: `سُجّلت من سند الصرف ${paymentNumber}`,
      },
    }),
  ]);
  return payment;
}

/** The months in a work permit's sub-type ("MONTHS_6" is six), or null. */
export function workPermitMonths(type: string | null | undefined) {
  const m = /^MONTHS_(3|6|9|12)$/.exec(type ?? "");
  return m ? Number(m[1]) : null;
}

export async function update(id: string, input: UpdateInput) {
  const existing = await prisma.payment.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Payment not found");

  if (input.paymentNumber && input.paymentNumber !== existing.paymentNumber) {
    const duplicate = await prisma.payment.findFirst({
      where: { paymentNumber: input.paymentNumber, id: { not: id }, deletedAt: null },
    });
    if (duplicate) throw ApiError.badRequest("A payment with this number already exists.");
  }

  const amount = input.amount !== undefined ? new Prisma.Decimal(input.amount) : existing.amount;
  const vat = input.vat !== undefined ? new Prisma.Decimal(input.vat) : existing.vat;
  const total = amount.plus(vat);

  // `type` holds the sub-type (issue/renewal, visa kind…); drop it if the new category has none.
  const type = input.category && !PAYMENT_SUBTYPES[input.category] ? null : input.type;

  const attachments = input.fileIds !== undefined ? { fileIds: input.fileIds, fileId: input.fileIds[0] ?? null } : input.fileId !== undefined ? { fileIds: [input.fileId], fileId: input.fileId } : {};
  return prisma.payment.update({ where: { id }, data: { ...input, ...parties(input.category ?? existing.category, { branchId: input.branchId ?? existing.branchId, employeeId: input.employeeId ?? existing.employeeId, branchIds: input.branchIds, employeeIds: input.employeeIds }), ...attachments, type, amount, vat, total }, include: includeRelations });
}

export async function softDelete(id: string) {
  const existing = await prisma.payment.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Payment not found");
  // paymentNumber has a hard DB-unique constraint, so a soft-deleted row
  // would otherwise permanently block that number from ever being reused —
  // free it by tagging the deleted copy.
  await prisma.payment.update({
    where: { id },
    data: { deletedAt: new Date(), paymentNumber: `${existing.paymentNumber}__deleted_${Date.now()}` },
  });
}
