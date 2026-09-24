import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeStatus } from "@/services/expiration";
import { getExpirationRules } from "@/services/settingsStore";
import { getTrackableItems } from "@/services/expiringItems";
import type { z } from "zod";
import type {
  activityReportQuerySchema,
  documentsReportQuerySchema,
  employeeReportQuerySchema,
  paymentsReportQuerySchema,
} from "@/modules/reports/reports.schemas";

const REPORT_ROW_CAP = 10_000;

export async function employeesReport(query: z.infer<typeof employeeReportQuerySchema>) {
  const rules = await getExpirationRules();
  const where: Prisma.EmployeeWhereInput = {
    deletedAt: null,
    ...(query.branchId ? { branchId: query.branchId } : {}),
    ...(query.department ? { department: query.department } : {}),
    ...(query.employmentStatus ? { employmentStatus: query.employmentStatus } : {}),
  };

  const rows = await prisma.employee.findMany({
    where,
    take: REPORT_ROW_CAP,
    orderBy: { fullNameEn: "asc" },
    include: { branch: { select: { name: true, nameEn: true } } },
  });

  return rows.map((e) => ({
    employeeNumber: e.employeeNumber,
    // Arabic first: the PDF/Excel reports are Arabic. The screen picks by language.
    fullName: e.fullNameAr || e.fullNameEn,
    fullNameEn: e.fullNameEn || e.fullNameAr,
    nationality: e.nationality,
    jobTitle: e.jobTitle,
    department: e.department,
    departmentEn: e.departmentEn,
    branch: e.branch?.name ?? null,
    branchEn: e.branch?.nameEn ?? null,
    employmentStatus: e.employmentStatus,
    mobile: e.mobile,
    email: e.email,
    iqamaNumber: e.iqamaNumber,
    iqamaExpiryDate: e.iqamaExpiryDate,
    iqamaStatus: computeStatus(e.iqamaExpiryDate, rules),
    passportNumber: e.passportNumber,
    passportExpiryDate: e.passportExpiryDate,
    passportStatus: computeStatus(e.passportExpiryDate, rules),
  }));
}

export async function documentsReport(query: z.infer<typeof documentsReportQuerySchema>) {
  const rules = await getExpirationRules();
  let items = await getTrackableItems();

  if (query.sourceType) items = items.filter((i) => i.sourceType === query.sourceType);
  const withStatus = items.map((i) => ({ ...i, status: computeStatus(i.expiryDate, rules) }));
  const filtered = query.status ? withStatus.filter((i) => i.status === query.status) : withStatus;

  return filtered
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
    .slice(0, REPORT_ROW_CAP)
    .map((i) => ({
      label: i.labelAr,
      labelEn: i.label,
      sourceType: i.sourceType,
      employeeName: i.employeeNameAr ?? null,
      employeeNameEn: i.employeeName ?? null,
      expiryDate: i.expiryDate,
      status: i.status,
    }));
}

export async function paymentsReport(query: z.infer<typeof paymentsReportQuerySchema>) {
  const where: Prisma.PaymentWhereInput = {
    deletedAt: null,
    ...(query.branchId ? { branchId: query.branchId } : {}),
    ...(query.category ? { category: query.category as never } : {}),
    ...(query.dateFrom || query.dateTo ? { paymentDate: { gte: query.dateFrom, lte: query.dateTo } } : {}),
  };

  const rows = await prisma.payment.findMany({
    where,
    take: REPORT_ROW_CAP,
    orderBy: { paymentDate: "desc" },
    include: { branch: { select: { name: true, nameEn: true } }, employee: { select: { fullNameAr: true, fullNameEn: true } } },
  });

  return rows.map((p) => ({
    paymentNumber: p.paymentNumber,
    paymentDate: p.paymentDate,
    category: p.category,
    type: p.type,
    method: p.method,
    branch: p.branch?.name ?? null,
    branchEn: p.branch?.nameEn ?? null,
    employee: p.employee ? p.employee.fullNameAr || p.employee.fullNameEn : null,
    amount: Number(p.amount),
    vat: Number(p.vat),
    total: Number(p.total),
  }));
}

export async function activityReport(query: z.infer<typeof activityReportQuerySchema>) {
  const where: Prisma.AuditLogWhereInput = {
    ...(query.module ? { module: query.module } : {}),
    ...(query.dateFrom || query.dateTo ? { createdAt: { gte: query.dateFrom, lte: query.dateTo } } : {}),
  };

  const rows = await prisma.auditLog.findMany({
    where,
    take: REPORT_ROW_CAP,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { fullName: true } } },
  });

  return rows.map((r) => ({
    date: r.createdAt,
    user: r.user?.fullName ?? "System",
    action: r.action,
    module: r.module,
    recordId: r.recordId,
    description: r.description,
  }));
}
