import { Prisma, TaxReturnKind, TaxReturnStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { paginationMeta, skipTake } from "@/utils/pagination";
import { daysUntil } from "@/services/expiration";
import type {
  CreateTaxReturnInput,
  ListTaxReturnsQuery,
  UpdateTaxReturnInput,
} from "@/modules/taxReturns/taxReturns.schemas";

const toDate = (day: string | Date) => {
  if (day instanceof Date) return day;
  return new Date(`${day.slice(0, 10)}T00:00:00.000Z`);
};

const toDay = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

const include = {
  branch: { select: { id: true, name: true, nameEn: true } },
  file: { select: { id: true, originalName: true, mimeType: true, size: true } },
  payment: { select: { id: true, paymentNumber: true, paymentDate: true, total: true } },
  createdBy: { select: { id: true, fullName: true } },
} as const;

type TaxReturnRow = Prisma.TaxReturnGetPayload<{ include: typeof include }>;

function shapeReturn(r: TaxReturnRow) {
  return {
    id: r.id,
    kind: r.kind,
    branchId: r.branchId,
    branch: r.branch,
    year: r.year,
    quarter: r.quarter,
    dueDate: toDay(r.dueDate)!,
    status: r.status,
    salesStandard: Number(r.salesStandard),
    salesZero: Number(r.salesZero),
    salesExports: Number(r.salesExports),
    salesExempt: Number(r.salesExempt),
    purchasesStandard: Number(r.purchasesStandard),
    purchasesImports: Number(r.purchasesImports),
    purchasesZero: Number(r.purchasesZero),
    purchasesExempt: Number(r.purchasesExempt),
    outputVat: Number(r.outputVat),
    inputVat: Number(r.inputVat),
    corrections: Number(r.corrections),
    zakatBase: r.zakatBase !== null ? Number(r.zakatBase) : null,
    amount: Number(r.amount),
    penalty: Number(r.penalty),
    filedDate: toDay(r.filedDate),
    reference: r.reference,
    sadadNumber: r.sadadNumber,
    paymentId: r.paymentId,
    payment: r.payment ? { ...r.payment, total: Number(r.payment.total) } : null,
    fileId: r.fileId,
    file: r.file,
    notes: r.notes,
    createdById: r.createdById,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    daysRemaining: daysUntil(r.dueDate),
  };
}

export async function list(query: ListTaxReturnsQuery) {
  const { page, pageSize, kind, year, quarter, status, branchId, search } = query;

  const where: Prisma.TaxReturnWhereInput = {
    deletedAt: null,
    ...(kind ? { kind } : {}),
    ...(year ? { year } : {}),
    ...(quarter ? { quarter } : {}),
    ...(status ? { status } : {}),
    ...(branchId ? { branchId } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search, mode: "insensitive" } },
            { sadadNumber: { contains: search, mode: "insensitive" } },
            { notes: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.taxReturn.findMany({
      where,
      include,
      orderBy: [{ year: "desc" }, { quarter: "desc" }, { dueDate: "asc" }],
      ...skipTake(page, pageSize),
    }),
    prisma.taxReturn.count({ where }),
  ]);

  return {
    data: rows.map(shapeReturn),
    meta: paginationMeta(page, pageSize, total),
  };
}

export async function getById(id: string) {
  const item = await prisma.taxReturn.findFirst({
    where: { id, deletedAt: null },
    include,
  });
  if (!item) throw ApiError.notFound("Tax return not found");
  return shapeReturn(item);
}

export async function create(input: CreateTaxReturnInput, userId?: string) {
  let outputVat = input.outputVat;
  let inputVat = input.inputVat;
  let amount = input.amount;

  if (input.kind === "VAT") {
    // If outputVat was left 0 and salesStandard provided, compute 15%
    if (outputVat === 0 && input.salesStandard > 0) {
      outputVat = Math.round(input.salesStandard * 0.15 * 100) / 100;
    }
    // If inputVat was left 0 and purchasesStandard provided, compute 15%
    if (inputVat === 0 && input.purchasesStandard > 0) {
      inputVat = Math.round(input.purchasesStandard * 0.15 * 100) / 100;
    }
    // If amount was left 0, compute net VAT: outputVat - inputVat + corrections
    if (amount === 0) {
      amount = Math.round((outputVat - inputVat + (input.corrections || 0)) * 100) / 100;
    }
  } else if (input.kind === "ZAKAT") {
    // If amount was left 0 and zakatBase provided, compute 2.5%
    if (amount === 0 && input.zakatBase && input.zakatBase > 0) {
      amount = Math.round(input.zakatBase * 0.025 * 100) / 100;
    }
  }

  const created = await prisma.taxReturn.create({
    data: {
      kind: input.kind,
      branchId: input.branchId || null,
      year: input.year,
      quarter: input.kind === "VAT" ? input.quarter ?? null : null,
      dueDate: toDate(input.dueDate),
      status: input.status,
      salesStandard: input.salesStandard,
      salesZero: input.salesZero,
      salesExports: input.salesExports,
      salesExempt: input.salesExempt,
      purchasesStandard: input.purchasesStandard,
      purchasesImports: input.purchasesImports,
      purchasesZero: input.purchasesZero,
      purchasesExempt: input.purchasesExempt,
      outputVat,
      inputVat,
      corrections: input.corrections,
      zakatBase: input.zakatBase ?? null,
      amount,
      penalty: input.penalty,
      filedDate: input.filedDate ? toDate(input.filedDate) : null,
      reference: input.reference || null,
      sadadNumber: input.sadadNumber || null,
      fileId: input.fileId || null,
      notes: input.notes || null,
      createdById: userId || null,
    },
    include,
  });

  return shapeReturn(created);
}

export async function update(id: string, input: UpdateTaxReturnInput) {
  const existing = await prisma.taxReturn.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Tax return not found");

  const data: Prisma.TaxReturnUpdateInput = {};

  if (input.branchId !== undefined) data.branch = input.branchId ? { connect: { id: input.branchId } } : { disconnect: true };
  if (input.year !== undefined) data.year = input.year;
  if (input.quarter !== undefined) data.quarter = input.quarter;
  if (input.dueDate !== undefined) data.dueDate = toDate(input.dueDate);
  if (input.status !== undefined) data.status = input.status;
  if (input.salesStandard !== undefined) data.salesStandard = input.salesStandard;
  if (input.salesZero !== undefined) data.salesZero = input.salesZero;
  if (input.salesExports !== undefined) data.salesExports = input.salesExports;
  if (input.salesExempt !== undefined) data.salesExempt = input.salesExempt;
  if (input.purchasesStandard !== undefined) data.purchasesStandard = input.purchasesStandard;
  if (input.purchasesImports !== undefined) data.purchasesImports = input.purchasesImports;
  if (input.purchasesZero !== undefined) data.purchasesZero = input.purchasesZero;
  if (input.purchasesExempt !== undefined) data.purchasesExempt = input.purchasesExempt;
  if (input.outputVat !== undefined) data.outputVat = input.outputVat;
  if (input.inputVat !== undefined) data.inputVat = input.inputVat;
  if (input.corrections !== undefined) data.corrections = input.corrections;
  if (input.zakatBase !== undefined) data.zakatBase = input.zakatBase;
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.penalty !== undefined) data.penalty = input.penalty;
  if (input.filedDate !== undefined) data.filedDate = input.filedDate ? toDate(input.filedDate) : null;
  if (input.reference !== undefined) data.reference = input.reference;
  if (input.sadadNumber !== undefined) data.sadadNumber = input.sadadNumber;
  if (input.fileId !== undefined) data.file = input.fileId ? { connect: { id: input.fileId } } : { disconnect: true };
  if (input.notes !== undefined) data.notes = input.notes;

  const updated = await prisma.taxReturn.update({
    where: { id },
    data,
    include,
  });

  return shapeReturn(updated);
}

export async function remove(id: string) {
  const existing = await prisma.taxReturn.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Tax return not found");

  await prisma.taxReturn.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { success: true };
}

export async function getStatsAndAlerts(yearParam?: number, branchId?: string) {
  const todayDate = new Date();
  const currentYear = yearParam || todayDate.getFullYear();

  const where: Prisma.TaxReturnWhereInput = {
    deletedAt: null,
    year: currentYear,
    ...(branchId ? { branchId } : {}),
  };

  const records = await prisma.taxReturn.findMany({
    where,
    include,
    orderBy: [{ quarter: "asc" }, { dueDate: "asc" }],
  });

  const shaped = records.map(shapeReturn);

  // Separate VAT and Zakat
  const vatReturns = shaped.filter((r) => r.kind === "VAT");
  const zakatReturns = shaped.filter((r) => r.kind === "ZAKAT");

  // Summary Metrics
  const vatTotalSales = vatReturns.reduce((sum, r) => sum + r.salesStandard + r.salesZero + r.salesExports + r.salesExempt, 0);
  const vatTotalPurchases = vatReturns.reduce((sum, r) => sum + r.purchasesStandard + r.purchasesImports + r.purchasesZero + r.purchasesExempt, 0);
  const vatTotalOutput = vatReturns.reduce((sum, r) => sum + r.outputVat, 0);
  const vatTotalInput = vatReturns.reduce((sum, r) => sum + r.inputVat, 0);
  const vatTotalNet = vatReturns.reduce((sum, r) => sum + r.amount, 0);

  const zakatTotalBase = zakatReturns.reduce((sum, r) => sum + (r.zakatBase || 0), 0);
  const zakatTotalAmount = zakatReturns.reduce((sum, r) => sum + r.amount, 0);

  const paidCount = shaped.filter((r) => r.status === "PAID").length;
  const filedCount = shaped.filter((r) => r.status === "FILED").length;
  const draftCount = shaped.filter((r) => r.status === "DRAFT").length;

  // Build quarterly structure [Q1, Q2, Q3, Q4] for charts & tracking
  const quarterSchedule = [
    { quarter: 1, nameAr: "الربع الأول (Q1)", nameEn: "Q1 (Jan - Mar)", defaultDueDate: `${currentYear}-04-30` },
    { quarter: 2, nameAr: "الربع الثاني (Q2)", nameEn: "Q2 (Apr - Jun)", defaultDueDate: `${currentYear}-07-31` },
    { quarter: 3, nameAr: "الربع الثالث (Q3)", nameEn: "Q3 (Jul - Sep)", defaultDueDate: `${currentYear}-10-31` },
    { quarter: 4, nameAr: "الربع الرابع (Q4)", nameEn: "Q4 (Oct - Dec)", defaultDueDate: `${currentYear + 1}-01-31` },
  ];

  const quarters = quarterSchedule.map((q) => {
    const existing = vatReturns.find((r) => r.quarter === q.quarter);
    const dueDate = existing ? existing.dueDate : q.defaultDueDate;
    const days = daysUntil(new Date(`${dueDate}T00:00:00.000Z`), todayDate);

    return {
      quarter: q.quarter,
      nameAr: q.nameAr,
      nameEn: q.nameEn,
      dueDate,
      daysRemaining: days,
      hasRecord: Boolean(existing),
      recordId: existing?.id || null,
      status: existing?.status || "NOT_STARTED",
      salesStandard: existing?.salesStandard || 0,
      purchasesStandard: existing?.purchasesStandard || 0,
      totalSales: existing ? existing.salesStandard + existing.salesZero + existing.salesExports + existing.salesExempt : 0,
      totalPurchases: existing ? existing.purchasesStandard + existing.purchasesImports + existing.purchasesZero + existing.purchasesExempt : 0,
      outputVat: existing?.outputVat || 0,
      inputVat: existing?.inputVat || 0,
      netVat: existing?.amount || 0,
      sadadNumber: existing?.sadadNumber || null,
      reference: existing?.reference || null,
    };
  });

  // Calculate upcoming VAT deadline alert
  // Next quarter needing filing (either overdue or upcoming)
  let nextVatAlert = quarters.find((q) => q.status !== "PAID" && q.daysRemaining >= 0);
  if (!nextVatAlert) {
    // If all future are paid or past, find any overdue unfiled
    nextVatAlert = quarters.find((q) => q.status !== "PAID" && q.daysRemaining < 0) || quarters[0];
  }

  // Zakat schedule for the year
  const defaultZakatDue = `${currentYear + 1}-04-30`;
  const existingZakat = zakatReturns[0] || null;
  const zakatDueDate = existingZakat ? existingZakat.dueDate : defaultZakatDue;
  const zakatDaysRemaining = daysUntil(new Date(`${zakatDueDate}T00:00:00.000Z`), todayDate);

  const zakatAlert = {
    year: currentYear,
    dueDate: zakatDueDate,
    daysRemaining: zakatDaysRemaining,
    hasRecord: Boolean(existingZakat),
    recordId: existingZakat?.id || null,
    status: existingZakat?.status || "NOT_STARTED",
    zakatBase: existingZakat?.zakatBase || 0,
    amount: existingZakat?.amount || 0,
    sadadNumber: existingZakat?.sadadNumber || null,
    reference: existingZakat?.reference || null,
    isUrgent: zakatDaysRemaining <= 30 && zakatDaysRemaining >= 0,
    isOverdue: zakatDaysRemaining < 0 && existingZakat?.status !== "PAID",
  };

  // Quarterly alert object
  const quarterlyVatAlert = {
    quarter: nextVatAlert.quarter,
    nameAr: nextVatAlert.nameAr,
    nameEn: nextVatAlert.nameEn,
    year: currentYear,
    dueDate: nextVatAlert.dueDate,
    daysRemaining: nextVatAlert.daysRemaining,
    status: nextVatAlert.status,
    isUrgent: nextVatAlert.daysRemaining <= 15 && nextVatAlert.daysRemaining >= 0,
    isOverdue: nextVatAlert.daysRemaining < 0 && nextVatAlert.status !== "PAID",
  };

  return {
    year: currentYear,
    kpis: {
      vatTotalSales,
      vatTotalPurchases,
      vatTotalOutput,
      vatTotalInput,
      vatTotalNet,
      zakatTotalBase,
      zakatTotalAmount,
      paidCount,
      filedCount,
      draftCount,
      totalReturns: shaped.length,
    },
    quarters,
    quarterlyVatAlert,
    zakatAlert,
    recentReturns: shaped.slice(0, 10),
  };
}
