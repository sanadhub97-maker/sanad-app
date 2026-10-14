import { Prisma } from "@prisma/client";
import { ApiError } from "@/utils/apiError";
import { canViewSource, hasPermission } from "@/lib/security";
import type { AuthContext } from "@/types/express";
import { prisma } from "@/lib/prisma";
import { computeStatus } from "@/services/expiration";
import { getExpirationRules } from "@/services/settingsStore";
import { getTrackableItems } from "@/services/expiringItems";
import { isEstablishmentSource } from "@/constants/documentSources";
import { domesticMatcher, insuranceFollowsIqama } from "@/services/domesticInsurance";
import type { z } from "zod";
import type {
  activityReportQuerySchema,
  documentsReportQuerySchema,
  employeeReportQuerySchema,
  paymentsReportQuerySchema,
} from "@/modules/reports/reports.schemas";

const REPORT_ROW_CAP = 10_000;

/** The expired and ending-soon reports: every establishment document, and employees' only when they are on the company's sponsorship. */
export const inSponsoredScope = (item: { sourceType: string; onSponsorship?: boolean | null }) => isEstablishmentSource(item.sourceType) || item.onSponsorship === true;
export async function reportSummary(auth: AuthContext) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [documents, employees, activeEmployees, payments, activity] = await Promise.all([
    ["employees.view", "employeeDocuments.view", "companyDocuments.view"].some(key => hasPermission(auth, key)) ? (async () => {
      const [items, rules] = await Promise.all([getTrackableItems({ linkedInsurance: true }), getExpirationRules()]);
      const visible = items.filter(item => canViewSource(auth, item.sourceType));
      const statuses = visible.map(item => ({ status: computeStatus(item.expiryDate, rules), sponsored: inSponsoredScope(item) }));
      const count = (status: string, sponsoredOnly = false) => statuses.filter(s => s.status === status && (!sponsoredOnly || s.sponsored)).length;
      return { total: visible.length, expired: count("EXPIRED"), soon: count("EXPIRING_SOON"), sponsoredExpired: count("EXPIRED", true), sponsoredSoon: count("EXPIRING_SOON", true) };
    })() : null,
    hasPermission(auth, "employees.view") ? prisma.employee.count({ where: { deletedAt: null } }) : null,
    hasPermission(auth, "employees.view") ? prisma.employee.count({ where: { deletedAt: null, employmentStatus: "ACTIVE" } }) : null,
    hasPermission(auth, "payments.view") ? prisma.payment.aggregate({ where: { deletedAt: null, paymentDate: { gte: since } }, _sum: { total: true }, _count: { _all: true } }) : null,
    hasPermission(auth, "auditLogs.view") ? prisma.auditLog.count({ where: { createdAt: { gte: since } } }) : null,
  ]);
  return { documents, employees: employees === null ? null : { total: employees, active: activeEmployees ?? 0 }, payments: payments ? { total: Number(payments._sum.total ?? 0), count: payments._count._all } : null, activity };
}
function requireCompleteReport<T>(rows: T[]): T[] {
  if (rows.length > REPORT_ROW_CAP) throw ApiError.badRequest("التقرير يتجاوز 10000 سجل. ضيّق نطاق التقرير باستخدام الفلاتر لضمان تصدير جميع البيانات.");
  return rows;
}

/** The employee documents the employees report shows beside the residency permit and the passport, by group; a group shows the one that ends last. */
const DOC_GROUPS = { healthCert: ["HEALTH_CERTIFICATE"], insurance: ["MEDICAL_INSURANCE"], visa: ["VISA", "EXIT_REENTRY_VISA", "FINAL_EXIT_VISA"], iqama: ["IQAMA"], passport: ["PASSPORT"] } as const;
type DocGroup = keyof typeof DOC_GROUPS;

/** `withDocuments`: the health certificate, the medical insurance and the visa too (needs the employee documents permission). */
export async function employeesReport(query: z.infer<typeof employeeReportQuerySchema>, withDocuments = false) {
  const rules = await getExpirationRules();
  const where: Prisma.EmployeeWhereInput = {
    deletedAt: null,
    ...(query.branchId ? { branchId: query.branchId } : {}),
    ...(query.department ? { department: query.department } : {}),
    ...(query.employmentStatus ? { employmentStatus: query.employmentStatus } : {}),
  };

  const rows = await prisma.employee.findMany({
    where,
    take: REPORT_ROW_CAP + 1,
    orderBy: { fullNameEn: "asc" },
    include: { branch: { select: { name: true, nameEn: true } } },
  });
  requireCompleteReport(rows);

  // Each employee's latest document of each group (the iqama and passport only fill in when the employee record has none).
  const docs = withDocuments
    ? await prisma.employeeDocument.findMany({
        where: { deletedAt: null, employeeId: { in: rows.map((e) => e.id) }, type: { in: Object.values(DOC_GROUPS).flat() as never } },
        select: { employeeId: true, type: true, documentNumber: true, expiryDate: true },
      })
    : [];
  const latest = new Map<string, (typeof docs)[number]>();
  for (const d of docs) {
    const group = (Object.keys(DOC_GROUPS) as DocGroup[]).find((g) => (DOC_GROUPS[g] as readonly string[]).includes(d.type))!;
    const key = `${d.employeeId}:${group}`;
    const cur = latest.get(key);
    if (!cur || (d.expiryDate?.getTime() ?? 0) > (cur.expiryDate?.getTime() ?? 0)) latest.set(key, d);
  }
  const doc = (id: string, g: DocGroup) => latest.get(`${id}:${g}`);
  // Domestic workers: the insurance goes with the iqama (services/domesticInsurance).
  const isDomestic = withDocuments ? await domesticMatcher() : () => false;

  return rows.map((e) => ({
    id: e.id,
    employeeNumber: e.employeeNumber,
    // Arabic first: the PDF/Excel reports are Arabic. The screen picks by language.
    fullName: e.fullNameAr || e.fullNameEn,
    fullNameEn: e.fullNameEn || e.fullNameAr,
    nationality: e.nationality,
    nationalityEn: e.nationalityEn || e.nationality,
    jobTitle: e.jobTitle,
    jobTitleEn: e.jobTitleEn || e.jobTitle,
    profession: e.profession,
    professionEn: e.professionEn || e.profession,
    department: e.department,
    departmentEn: e.departmentEn,
    branch: e.branch?.name ?? null,
    branchEn: e.branch?.nameEn || e.branch?.name || null,
    employmentStatus: e.employmentStatus,
    mobile: e.mobile,
    email: e.email,
    iqamaNumber: e.iqamaNumber ?? doc(e.id, "iqama")?.documentNumber ?? null,
    iqamaExpiryDate: e.iqamaExpiryDate ?? doc(e.id, "iqama")?.expiryDate ?? null,
    iqamaStatus: computeStatus(e.iqamaExpiryDate ?? doc(e.id, "iqama")?.expiryDate ?? null, rules),
    passportNumber: e.passportNumber ?? doc(e.id, "passport")?.documentNumber ?? null,
    passportExpiryDate: e.passportExpiryDate ?? doc(e.id, "passport")?.expiryDate ?? null,
    passportStatus: computeStatus(e.passportExpiryDate ?? doc(e.id, "passport")?.expiryDate ?? null, rules),
    ...(withDocuments
      ? {
          healthCertNumber: doc(e.id, "healthCert")?.documentNumber ?? null,
          healthCertExpiryDate: doc(e.id, "healthCert")?.expiryDate ?? null,
          healthCertStatus: doc(e.id, "healthCert") ? computeStatus(doc(e.id, "healthCert")!.expiryDate, rules) : null,
          ...(insuranceFollowsIqama(e, isDomestic)
            ? {
                insuranceWithIqama: true,
                insuranceNumber: null,
                insuranceExpiryDate: e.iqamaExpiryDate ?? doc(e.id, "iqama")?.expiryDate ?? null,
                insuranceStatus: computeStatus(e.iqamaExpiryDate ?? doc(e.id, "iqama")?.expiryDate ?? null, rules),
              }
            : {
                insuranceNumber: doc(e.id, "insurance")?.documentNumber ?? null,
                insuranceExpiryDate: doc(e.id, "insurance")?.expiryDate ?? null,
                insuranceStatus: doc(e.id, "insurance") ? computeStatus(doc(e.id, "insurance")!.expiryDate, rules) : null,
              }),
          visaType: doc(e.id, "visa")?.type ?? null,
          visaNumber: doc(e.id, "visa")?.documentNumber ?? null,
          visaExpiryDate: doc(e.id, "visa")?.expiryDate ?? null,
          visaStatus: doc(e.id, "visa") ? computeStatus(doc(e.id, "visa")!.expiryDate, rules) : null,
        }
      : {}),
  }));
}

export async function documentsReport(query: z.infer<typeof documentsReportQuerySchema>, auth: AuthContext) {
  const rules = await getExpirationRules();
  let items = (await getTrackableItems({ linkedInsurance: true })).filter((item) => canViewSource(auth, item.sourceType));

  if (query.sourceType) {
    // The employee documents page asks for EMPLOYEE_DOCUMENT with an iqama or passport category.
    const iqamaOrPassport = query.sourceType === "EMPLOYEE_DOCUMENT" && (query.category === "IQAMA" || query.category === "PASSPORT");
    items = items.filter((i) => query.sourceType === "EMPLOYEE" ? i.sourceType.startsWith("EMPLOYEE_") : i.sourceType === query.sourceType || (iqamaOrPassport && i.kind === query.category));
  }
  if (query.category) items = items.filter((i) => i.kind === query.category);
  if (query.scope === "sponsored") items = items.filter(inSponsoredScope);
  const withStatus = items.map((i) => ({ ...i, status: computeStatus(i.expiryDate, rules) }));
  const filtered = query.status ? withStatus.filter((i) => i.status === query.status) : withStatus;

  return requireCompleteReport(filtered)
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
    .map((i) => {
      const company = isEstablishmentSource(i.sourceType);
      return {
        // For the screen to open the record; the exports pick their own columns.
        recordId: i.recordId,
        employeeId: i.employeeId ?? null,
        label: i.labelAr,
        labelEn: i.label,
        sourceType: i.sourceType,
        kind: i.kind,
        kindAr: i.kindAr,
        kindEn: i.kindEn,
        // Whose document it is: the employee's name, or the establishment's.
        owner: company ? i.labelAr : (i.employeeNameAr ?? "—"),
        ownerEn: company ? i.label : (i.employeeName ?? "—"),
        ownerType: company ? "منشأة" : "موظف",
        ownerTypeEn: company ? "Establishment" : "Employee",
        documentNumber: i.documentNumber ?? null,
        branch: i.branchName ?? null,
        branchEn: i.branchNameEn || i.branchName || null,
        employeeName: i.employeeNameAr ?? null,
        employeeNameEn: i.employeeName ?? null,
        onSponsorship: i.onSponsorship ?? null,
        expiryDate: i.expiryDate,
        status: i.status,
      };
    });
}

export async function paymentsReport(query: z.infer<typeof paymentsReportQuerySchema>) {
  const where: Prisma.PaymentWhereInput = {
    deletedAt: null,
    ...(query.branchId ? { OR: [{ branchId: query.branchId }, { branchIds: { has: query.branchId } }] } : {}),
    ...(query.category ? { category: query.category as never } : {}),
    ...(query.dateFrom || query.dateTo ? { paymentDate: { gte: query.dateFrom, lte: query.dateTo } } : {}),
  };

  const rows = await prisma.payment.findMany({
    where,
    take: REPORT_ROW_CAP + 1,
    orderBy: { paymentDate: "desc" },
    include: { branch: { select: { name: true, nameEn: true } }, employee: { select: { fullNameAr: true, fullNameEn: true } } },
  });

  // Shared payments name all their establishments / employees.
  const done = requireCompleteReport(rows);
  const branchIds = [...new Set(done.flatMap((p) => p.branchIds))];
  const employeeIds = [...new Set(done.flatMap((p) => p.employeeIds))];
  const [allBranches, allEmployees] = await Promise.all([
    branchIds.length ? prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true, nameEn: true } }) : [],
    employeeIds.length ? prisma.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true, fullNameAr: true, fullNameEn: true } }) : [],
  ]);
  const names = <R extends { id: string }>(ids: string[], rows: R[], label: (r: R) => string) => ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is R => !!r).map(label).join("، ");
  return done.map((p) => {
    // In one establishment's statement a shared payment counts its equal share.
    const shareOf = query.branchId && p.branchIds.length > 1 ? p.branchIds.length : 1;
    const part = (v: unknown) => Math.round((Number(v) / shareOf) * 100) / 100;
    const many = p.branchIds.length > 1 && !query.branchId;
    const staff = p.employeeIds.length > 1;
    return {
      paymentNumber: p.paymentNumber,
      paymentDate: p.paymentDate,
      category: p.category,
      type: p.type,
      method: p.method,
      description: [p.description, shareOf > 1 ? `حصة 1 من ${shareOf} منشآت` : ""].filter(Boolean).join(" · ") || null,
      branch: many ? names(p.branchIds, allBranches, (b) => b.name) : p.branch?.name ?? null,
      branchEn: many ? names(p.branchIds, allBranches, (b) => b.nameEn || b.name) : p.branch?.nameEn || p.branch?.name || null,
      employee: staff ? names(p.employeeIds, allEmployees, (e) => e.fullNameAr || e.fullNameEn || "") : p.employee ? p.employee.fullNameAr || p.employee.fullNameEn : null,
      employeeEn: staff ? names(p.employeeIds, allEmployees, (e) => e.fullNameEn || e.fullNameAr) : p.employee ? p.employee.fullNameEn || p.employee.fullNameAr : null,
      amount: part(p.amount),
      vat: part(p.vat),
      total: part(p.total),
    };
  });
}

export async function activityReport(query: z.infer<typeof activityReportQuerySchema>) {
  const where: Prisma.AuditLogWhereInput = {
    ...(query.module ? { module: query.module } : {}),
    ...(query.dateFrom || query.dateTo ? { createdAt: { gte: query.dateFrom, lte: query.dateTo } } : {}),
  };

  const rows = await prisma.auditLog.findMany({
    where,
    take: REPORT_ROW_CAP + 1,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { fullName: true } } },
  });

  return requireCompleteReport(rows).map((r) => ({
    date: r.createdAt,
    user: r.user?.fullName ?? "System",
    action: r.action,
    module: r.module,
    recordId: r.recordId,
    description: r.description,
  }));
}
