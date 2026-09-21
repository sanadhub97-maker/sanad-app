import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { paginationMeta, skipTake } from "@/utils/pagination";
import type { z } from "zod";
import type { createPaymentSchema, listPaymentsQuerySchema, updatePaymentSchema } from "@/modules/payments/payments.schemas";

type CreateInput = z.infer<typeof createPaymentSchema>;
type UpdateInput = z.infer<typeof updatePaymentSchema>;
type ListQuery = z.infer<typeof listPaymentsQuerySchema>;

const includeRelations = {
  branch: { select: { id: true, name: true, code: true } },
  employee: { select: { id: true, employeeNumber: true, fullNameAr: true, fullNameEn: true } },
  createdBy: { select: { id: true, fullName: true } },
} as const;

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
    ...(branchId ? { branchId } : {}),
    ...(employeeId ? { employeeId } : {}),
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
  return payment;
}

export async function create(input: CreateInput, createdById: string) {
  const amount = new Prisma.Decimal(input.amount);
  const vat = new Prisma.Decimal(input.vat ?? 0);
  const total = amount.plus(vat);

  const paymentNumber = input.paymentNumber || (await generatePaymentNumber());
  if (input.paymentNumber) {
    const existing = await prisma.payment.findUnique({ where: { paymentNumber } });
    if (existing) throw ApiError.badRequest("A payment with this number already exists.");
  }

  return prisma.payment.create({
    data: { ...input, paymentNumber, amount, vat, total, createdById },
    include: includeRelations,
  });
}

export async function update(id: string, input: UpdateInput) {
  const existing = await prisma.payment.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Payment not found");

  const amount = input.amount !== undefined ? new Prisma.Decimal(input.amount) : existing.amount;
  const vat = input.vat !== undefined ? new Prisma.Decimal(input.vat) : existing.vat;
  const total = amount.plus(vat);

  return prisma.payment.update({ where: { id }, data: { ...input, amount, vat, total }, include: includeRelations });
}

export async function softDelete(id: string) {
  const existing = await prisma.payment.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Payment not found");
  await prisma.payment.update({ where: { id }, data: { deletedAt: new Date() } });
}
