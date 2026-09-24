import { Prisma, EmployeeDocumentType, DocumentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { computeStatus, daysUntil } from "@/services/expiration";
import { getExpirationRules } from "@/services/settingsStore";
import { paginationMeta, skipTake } from "@/utils/pagination";
import type { ListWorkforceQuery } from "@/modules/workforceDocuments/workforceDocuments.schemas";

export interface WorkforceSummaryStats {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
}

// ---------------------------------------------------------------------------
// 1. IQAMAS
// ---------------------------------------------------------------------------
export async function listIqamas(query: ListWorkforceQuery) {
  const { page, pageSize, q, branchId, status } = query;
  const rules = await getExpirationRules();

  const where: Prisma.EmployeeWhereInput = {
    deletedAt: null,
    ...(branchId ? { branchId } : {}),
    OR: [
      { iqamaNumber: { not: null } },
      { iqamaExpiryDate: { not: null } },
    ],
    ...(q
      ? {
          AND: [
            {
              OR: [
                { employeeNumber: { contains: q, mode: "insensitive" } },
                { fullNameAr: { contains: q, mode: "insensitive" } },
                { fullNameEn: { contains: q, mode: "insensitive" } },
                { iqamaNumber: { contains: q, mode: "insensitive" } },
              ],
            },
          ],
        }
      : {}),
  };

  const allEmployees = await prisma.employee.findMany({
    where,
    orderBy: { iqamaExpiryDate: "asc" },
    include: {
      branch: { select: { id: true, name: true, nameEn: true, code: true } },
    },
  });

  const enriched = allEmployees.map((emp) => {
    const computed = computeStatus(emp.iqamaExpiryDate, rules) ?? DocumentStatus.VALID;
    const days = emp.iqamaExpiryDate ? daysUntil(emp.iqamaExpiryDate) : null;
    return {
      id: emp.id,
      employeeId: emp.id,
      employeeNumber: emp.employeeNumber,
      fullNameAr: emp.fullNameAr,
      fullNameEn: emp.fullNameEn,
      jobTitle: emp.jobTitle,
      jobTitleEn: emp.jobTitleEn,
      branch: emp.branch,
      type: "IQAMA",
      documentNumber: emp.iqamaNumber,
      iqamaNumber: emp.iqamaNumber,
      issueDate: emp.iqamaIssueDate,
      expiryDate: emp.iqamaExpiryDate,
      daysRemaining: days,
      fileId: emp.iqamaFileId,
      status: computed,
    };
  });

  const stats: WorkforceSummaryStats = {
    total: enriched.length,
    valid: enriched.filter((i) => i.status === DocumentStatus.VALID).length,
    expiringSoon: enriched.filter((i) => i.status === DocumentStatus.EXPIRING_SOON).length,
    expired: enriched.filter((i) => i.status === DocumentStatus.EXPIRED).length,
  };

  const filtered = status ? enriched.filter((i) => i.status === status) : enriched;
  const { skip, take } = skipTake(page, pageSize);
  const data = filtered.slice(skip, skip + take);

  return {
    data,
    meta: paginationMeta(page, pageSize, filtered.length),
    stats,
  };
}

// ---------------------------------------------------------------------------
// 2. PASSPORTS
// ---------------------------------------------------------------------------
export async function listPassports(query: ListWorkforceQuery) {
  const { page, pageSize, q, branchId, status } = query;
  const rules = await getExpirationRules();

  const where: Prisma.EmployeeWhereInput = {
    deletedAt: null,
    ...(branchId ? { branchId } : {}),
    OR: [
      { passportNumber: { not: null } },
      { passportExpiryDate: { not: null } },
    ],
    ...(q
      ? {
          AND: [
            {
              OR: [
                { employeeNumber: { contains: q, mode: "insensitive" } },
                { fullNameAr: { contains: q, mode: "insensitive" } },
                { fullNameEn: { contains: q, mode: "insensitive" } },
                { passportNumber: { contains: q, mode: "insensitive" } },
                { passportCountry: { contains: q, mode: "insensitive" } },
              ],
            },
          ],
        }
      : {}),
  };

  const allEmployees = await prisma.employee.findMany({
    where,
    orderBy: { passportExpiryDate: "asc" },
    include: {
      branch: { select: { id: true, name: true, nameEn: true, code: true } },
    },
  });

  const enriched = allEmployees.map((emp) => {
    const computed = computeStatus(emp.passportExpiryDate, rules) ?? DocumentStatus.VALID;
    const days = emp.passportExpiryDate ? daysUntil(emp.passportExpiryDate) : null;
    return {
      id: emp.id,
      employeeId: emp.id,
      employeeNumber: emp.employeeNumber,
      fullNameAr: emp.fullNameAr,
      fullNameEn: emp.fullNameEn,
      jobTitle: emp.jobTitle,
      jobTitleEn: emp.jobTitleEn,
      branch: emp.branch,
      type: "PASSPORT",
      documentNumber: emp.passportNumber,
      passportNumber: emp.passportNumber,
      passportCountry: emp.passportCountry,
      issuingAuthority: emp.passportCountry,
      issueDate: emp.passportIssueDate,
      expiryDate: emp.passportExpiryDate,
      daysRemaining: days,
      fileId: emp.passportFileId,
      status: computed,
    };
  });

  const stats: WorkforceSummaryStats = {
    total: enriched.length,
    valid: enriched.filter((i) => i.status === DocumentStatus.VALID).length,
    expiringSoon: enriched.filter((i) => i.status === DocumentStatus.EXPIRING_SOON).length,
    expired: enriched.filter((i) => i.status === DocumentStatus.EXPIRED).length,
  };

  const filtered = status ? enriched.filter((i) => i.status === status) : enriched;
  const { skip, take } = skipTake(page, pageSize);
  const data = filtered.slice(skip, skip + take);

  return {
    data,
    meta: paginationMeta(page, pageSize, filtered.length),
    stats,
  };
}

// ---------------------------------------------------------------------------
// 3. GENERAL EMPLOYEE DOCUMENTS (Health, Insurance, Visas, Flight Tickets)
// ---------------------------------------------------------------------------
export async function listGeneralDocuments(
  types: EmployeeDocumentType[],
  query: ListWorkforceQuery
) {
  const { page, pageSize, q, branchId, status } = query;
  const rules = await getExpirationRules();

  const where: Prisma.EmployeeDocumentWhereInput = {
    deletedAt: null,
    type: { in: types },
    ...(branchId ? { employee: { branchId } } : {}),
    ...(q
      ? {
          OR: [
            { documentNumber: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { issuingAuthority: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
            { employee: { fullNameAr: { contains: q, mode: "insensitive" } } },
            { employee: { fullNameEn: { contains: q, mode: "insensitive" } } },
            { employee: { employeeNumber: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const docs = await prisma.employeeDocument.findMany({
    where,
    orderBy: { expiryDate: "asc" },
    include: {
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          fullNameAr: true,
          fullNameEn: true,
          branch: { select: { id: true, name: true, nameEn: true, code: true } },
        },
      },
    },
  });

  const enriched = docs.map((doc) => {
    const computed = computeStatus(doc.expiryDate, rules) ?? DocumentStatus.VALID;
    const days = doc.expiryDate ? daysUntil(doc.expiryDate) : null;
    return {
      id: doc.id,
      employeeId: doc.employeeId,
      employee: doc.employee,
      type: doc.type,
      name: doc.name,
      documentNumber: doc.documentNumber,
      issuingAuthority: doc.issuingAuthority,
      issueDate: doc.issueDate,
      startDate: doc.startDate,
      expiryDate: doc.expiryDate,
      daysRemaining: days,
      fileId: doc.fileId,
      notes: doc.notes,
      status: computed,
    };
  });

  const stats: WorkforceSummaryStats = {
    total: enriched.length,
    valid: enriched.filter((i) => i.status === DocumentStatus.VALID).length,
    expiringSoon: enriched.filter((i) => i.status === DocumentStatus.EXPIRING_SOON).length,
    expired: enriched.filter((i) => i.status === DocumentStatus.EXPIRED).length,
  };

  const filtered = status ? enriched.filter((i) => i.status === status) : enriched;
  const { skip, take } = skipTake(page, pageSize);
  const data = filtered.slice(skip, skip + take);

  return {
    data,
    meta: paginationMeta(page, pageSize, filtered.length),
    stats,
  };
}

// ---------------------------------------------------------------------------
// 4. UNIFIED ALL WORKFORCE DOCUMENTS & COUNTS
// ---------------------------------------------------------------------------
export async function listAllWorkforceDocuments(query: ListWorkforceQuery & { category?: string }) {
  const { page, pageSize, q, branchId, status, category } = query;
  const rules = await getExpirationRules();

  if (category === "IQAMA") {
    const res = await listIqamas({ page, pageSize, q, branchId, status });
    const mapped = res.data.map((item) => ({
      ...item,
      type: "IQAMA",
      category: "IQAMA",
      // No name/authority: the client labels iqamas in the viewer's language.
      name: null,
      issuingAuthority: null,
    }));
    return { ...res, data: mapped };
  }

  if (category === "PASSPORT") {
    const res = await listPassports({ page, pageSize, q, branchId, status });
    const mapped = res.data.map((item) => ({
      ...item,
      type: "PASSPORT",
      category: "PASSPORT",
      name: null,
      issuingAuthority: (item as any).passportCountry || null,
    }));
    return { ...res, data: mapped };
  }

  if (category === "HEALTH_CERTIFICATE") {
    const res = await listGeneralDocuments([EmployeeDocumentType.HEALTH_CERTIFICATE], { page, pageSize, q, branchId, status });
    const mapped = res.data.map((item) => ({
      ...item,
      category: "HEALTH_CERTIFICATE",
      name: item.name || "شهادة صحية",
    }));
    return { ...res, data: mapped };
  }

  if (category === "MEDICAL_INSURANCE") {
    const res = await listGeneralDocuments([EmployeeDocumentType.MEDICAL_INSURANCE], { page, pageSize, q, branchId, status });
    const mapped = res.data.map((item) => ({
      ...item,
      category: "MEDICAL_INSURANCE",
      name: item.name || "تأمين طبي",
    }));
    return { ...res, data: mapped };
  }

  if (category === "VISA") {
    const res = await listGeneralDocuments(
      [EmployeeDocumentType.VISA, EmployeeDocumentType.EXIT_REENTRY_VISA, EmployeeDocumentType.FINAL_EXIT_VISA],
      { page, pageSize, q, branchId, status }
    );
    const mapped = res.data.map((item) => ({
      ...item,
      category: "VISA",
      name: item.name || "تأشيرة عمل / زيارة / خروج وعودة",
    }));
    return { ...res, data: mapped };
  }

  if (category === "FLIGHT_TICKET") {
    const res = await listGeneralDocuments([EmployeeDocumentType.FLIGHT_TICKET], { page, pageSize, q, branchId, status });
    const mapped = res.data.map((item) => ({
      ...item,
      category: "FLIGHT_TICKET",
      name: item.name || "تذكرة طيران",
    }));
    return { ...res, data: mapped };
  }

  // ALL CATEGORIES (Unified List)
  const empIqamaWhere: Prisma.EmployeeWhereInput = {
    deletedAt: null,
    ...(branchId ? { branchId } : {}),
    OR: [{ iqamaNumber: { not: null } }, { iqamaExpiryDate: { not: null } }],
    ...(q
      ? {
          AND: [
            {
              OR: [
                { employeeNumber: { contains: q, mode: "insensitive" } },
                { fullNameAr: { contains: q, mode: "insensitive" } },
                { fullNameEn: { contains: q, mode: "insensitive" } },
                { iqamaNumber: { contains: q, mode: "insensitive" } },
              ],
            },
          ],
        }
      : {}),
  };

  const empPassportWhere: Prisma.EmployeeWhereInput = {
    deletedAt: null,
    ...(branchId ? { branchId } : {}),
    OR: [{ passportNumber: { not: null } }, { passportExpiryDate: { not: null } }],
    ...(q
      ? {
          AND: [
            {
              OR: [
                { employeeNumber: { contains: q, mode: "insensitive" } },
                { fullNameAr: { contains: q, mode: "insensitive" } },
                { fullNameEn: { contains: q, mode: "insensitive" } },
                { passportNumber: { contains: q, mode: "insensitive" } },
                { passportCountry: { contains: q, mode: "insensitive" } },
              ],
            },
          ],
        }
      : {}),
  };

  const docWhere: Prisma.EmployeeDocumentWhereInput = {
    deletedAt: null,
    ...(branchId ? { employee: { branchId } } : {}),
    ...(q
      ? {
          OR: [
            { documentNumber: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { issuingAuthority: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
            { employee: { fullNameAr: { contains: q, mode: "insensitive" } } },
            { employee: { fullNameEn: { contains: q, mode: "insensitive" } } },
            { employee: { employeeNumber: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [iqamaEmps, passportEmps, generalDocs] = await Promise.all([
    prisma.employee.findMany({
      where: empIqamaWhere,
      include: { branch: { select: { id: true, name: true, nameEn: true, code: true } } },
    }),
    prisma.employee.findMany({
      where: empPassportWhere,
      include: { branch: { select: { id: true, name: true, nameEn: true, code: true } } },
    }),
    prisma.employeeDocument.findMany({
      where: docWhere,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            fullNameAr: true,
            fullNameEn: true,
            branch: { select: { id: true, name: true, nameEn: true, code: true } },
          },
        },
      },
    }),
  ]);

  const allItems: any[] = [];

  for (const emp of iqamaEmps) {
    const computed = computeStatus(emp.iqamaExpiryDate, rules) ?? DocumentStatus.VALID;
    const days = emp.iqamaExpiryDate ? daysUntil(emp.iqamaExpiryDate) : null;
    allItems.push({
      id: `iqama-${emp.id}`,
      employeeId: emp.id,
      employeeNumber: emp.employeeNumber,
      fullNameAr: emp.fullNameAr,
      fullNameEn: emp.fullNameEn,
      jobTitle: emp.jobTitle,
      jobTitleEn: emp.jobTitleEn,
      branch: emp.branch,
      type: "IQAMA",
      category: "IQAMA",
      name: null,
      documentNumber: emp.iqamaNumber,
      issuingAuthority: null,
      issueDate: emp.iqamaIssueDate,
      expiryDate: emp.iqamaExpiryDate,
      daysRemaining: days,
      fileId: emp.iqamaFileId,
      status: computed,
      isStatutory: true,
    });
  }

  for (const emp of passportEmps) {
    const computed = computeStatus(emp.passportExpiryDate, rules) ?? DocumentStatus.VALID;
    const days = emp.passportExpiryDate ? daysUntil(emp.passportExpiryDate) : null;
    allItems.push({
      id: `passport-${emp.id}`,
      employeeId: emp.id,
      employeeNumber: emp.employeeNumber,
      fullNameAr: emp.fullNameAr,
      fullNameEn: emp.fullNameEn,
      jobTitle: emp.jobTitle,
      jobTitleEn: emp.jobTitleEn,
      branch: emp.branch,
      type: "PASSPORT",
      category: "PASSPORT",
      name: null,
      documentNumber: emp.passportNumber,
      issuingAuthority: emp.passportCountry || null,
      issueDate: emp.passportIssueDate,
      expiryDate: emp.passportExpiryDate,
      daysRemaining: days,
      fileId: emp.passportFileId,
      status: computed,
      isStatutory: true,
    });
  }

  for (const doc of generalDocs) {
    const computed = computeStatus(doc.expiryDate, rules) ?? DocumentStatus.VALID;
    const days = doc.expiryDate ? daysUntil(doc.expiryDate) : null;
    const categoryName =
      doc.type === EmployeeDocumentType.VISA ||
      doc.type === EmployeeDocumentType.EXIT_REENTRY_VISA ||
      doc.type === EmployeeDocumentType.FINAL_EXIT_VISA
        ? "VISA"
        : doc.type;

    allItems.push({
      id: doc.id,
      employeeId: doc.employeeId,
      employeeNumber: doc.employee?.employeeNumber,
      fullNameAr: doc.employee?.fullNameAr,
      fullNameEn: doc.employee?.fullNameEn,
      branch: doc.employee?.branch,
      type: doc.type,
      category: categoryName,
      name: doc.name || doc.type,
      documentNumber: doc.documentNumber,
      issuingAuthority: doc.issuingAuthority,
      issueDate: doc.issueDate,
      startDate: doc.startDate,
      expiryDate: doc.expiryDate,
      daysRemaining: days,
      fileId: doc.fileId,
      notes: doc.notes,
      status: computed,
      isStatutory: false,
    });
  }

  const stats: WorkforceSummaryStats = {
    total: allItems.length,
    valid: allItems.filter((i) => i.status === DocumentStatus.VALID).length,
    expiringSoon: allItems.filter((i) => i.status === DocumentStatus.EXPIRING_SOON).length,
    expired: allItems.filter((i) => i.status === DocumentStatus.EXPIRED).length,
  };

  const filtered = status ? allItems.filter((i) => i.status === status) : allItems;

  filtered.sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });

  const { skip, take } = skipTake(page, pageSize);
  const data = filtered.slice(skip, skip + take);

  return {
    data,
    meta: paginationMeta(page, pageSize, filtered.length),
    stats,
  };
}

export async function getWorkforceCategoryCounts() {
  const [iqamaCount, passportCount, docGroups] = await Promise.all([
    prisma.employee.count({
      where: {
        deletedAt: null,
        OR: [{ iqamaNumber: { not: null } }, { iqamaExpiryDate: { not: null } }],
      },
    }),
    prisma.employee.count({
      where: {
        deletedAt: null,
        OR: [{ passportNumber: { not: null } }, { passportExpiryDate: { not: null } }],
      },
    }),
    prisma.employeeDocument.groupBy({
      by: ["type"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const groupMap = Object.fromEntries(docGroups.map((g) => [g.type, g._count._all]));

  const visaCount =
    (groupMap[EmployeeDocumentType.VISA] ?? 0) +
    (groupMap[EmployeeDocumentType.EXIT_REENTRY_VISA] ?? 0) +
    (groupMap[EmployeeDocumentType.FINAL_EXIT_VISA] ?? 0);

  return {
    IQAMA: iqamaCount,
    PASSPORT: passportCount,
    HEALTH_CERTIFICATE: groupMap[EmployeeDocumentType.HEALTH_CERTIFICATE] ?? 0,
    MEDICAL_INSURANCE: groupMap[EmployeeDocumentType.MEDICAL_INSURANCE] ?? 0,
    VISA: visaCount,
    FLIGHT_TICKET: groupMap[EmployeeDocumentType.FLIGHT_TICKET] ?? 0,
  };
}

// ---------------------------------------------------------------------------
// 5. OVERVIEW STATS FOR WORKFORCE SUITE
// ---------------------------------------------------------------------------
export async function getWorkforceOverviewStats() {
  const [iqamasRes, passportsRes, healthRes, insuranceRes, visasRes, ticketsRes] =
    await Promise.all([
      listIqamas({ page: 1, pageSize: 1 }),
      listPassports({ page: 1, pageSize: 1 }),
      listGeneralDocuments([EmployeeDocumentType.HEALTH_CERTIFICATE], { page: 1, pageSize: 1 }),
      listGeneralDocuments([EmployeeDocumentType.MEDICAL_INSURANCE], { page: 1, pageSize: 1 }),
      listGeneralDocuments(
        [EmployeeDocumentType.VISA, EmployeeDocumentType.EXIT_REENTRY_VISA, EmployeeDocumentType.FINAL_EXIT_VISA],
        { page: 1, pageSize: 1 }
      ),
      listGeneralDocuments([EmployeeDocumentType.FLIGHT_TICKET], { page: 1, pageSize: 1 }),
    ]);

  return {
    iqamas: iqamasRes.stats,
    passports: passportsRes.stats,
    healthCertificates: healthRes.stats,
    medicalInsurance: insuranceRes.stats,
    visas: visasRes.stats,
    flightTickets: ticketsRes.stats,
  };
}

// ---------------------------------------------------------------------------
// 6. DOCUMENT MUTATIONS
// ---------------------------------------------------------------------------
export async function createDocument(input: any) {
  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, deletedAt: null },
  });
  if (!employee) throw ApiError.notFound("Employee not found");

  const rules = await getExpirationRules();

  // Iqama/Passport live only on the Employee record's own denormalized fields
  // (see expiringItems.ts's documented architecture) — listIqamas/listPassports
  // read those fields directly, never an EmployeeDocument row. Creating a real
  // EmployeeDocument row here too would leave a duplicate that immediately goes
  // stale (edits only ever touch the Employee fields) and shows up as a phantom,
  // never-updated document on the employee's profile Documents tab.
  if (input.type === EmployeeDocumentType.IQAMA) {
    const updated = await prisma.employee.update({
      where: { id: input.employeeId },
      data: {
        iqamaNumber: input.documentNumber ?? employee.iqamaNumber,
        iqamaIssueDate: input.issueDate ?? employee.iqamaIssueDate,
        iqamaExpiryDate: input.expiryDate ?? employee.iqamaExpiryDate,
        iqamaFileId: input.fileId ?? employee.iqamaFileId,
      },
    });
    return {
      id: updated.id,
      employeeId: updated.id,
      type: "IQAMA",
      documentNumber: updated.iqamaNumber,
      issueDate: updated.iqamaIssueDate,
      expiryDate: updated.iqamaExpiryDate,
      fileId: updated.iqamaFileId,
      status: computeStatus(updated.iqamaExpiryDate, rules),
    };
  }

  if (input.type === EmployeeDocumentType.PASSPORT) {
    const updated = await prisma.employee.update({
      where: { id: input.employeeId },
      data: {
        passportNumber: input.documentNumber ?? employee.passportNumber,
        passportIssueDate: input.issueDate ?? employee.passportIssueDate,
        passportExpiryDate: input.expiryDate ?? employee.passportExpiryDate,
        passportFileId: input.fileId ?? employee.passportFileId,
        passportCountry: input.issuingAuthority ?? employee.passportCountry,
      },
    });
    return {
      id: updated.id,
      employeeId: updated.id,
      type: "PASSPORT",
      documentNumber: updated.passportNumber,
      issueDate: updated.passportIssueDate,
      expiryDate: updated.passportExpiryDate,
      fileId: updated.passportFileId,
      status: computeStatus(updated.passportExpiryDate, rules),
    };
  }

  const doc = await prisma.employeeDocument.create({
    data: {
      employeeId: input.employeeId,
      type: input.type,
      name: input.name,
      documentNumber: input.documentNumber,
      issuingAuthority: input.issuingAuthority,
      issueDate: input.issueDate,
      startDate: input.startDate,
      expiryDate: input.expiryDate,
      fileId: input.fileId,
      notes: input.notes,
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          fullNameAr: true,
          fullNameEn: true,
          branch: { select: { id: true, name: true, nameEn: true } },
        },
      },
    },
  });

  return { ...doc, status: computeStatus(doc.expiryDate, rules) };
}

export async function updateDocument(id: string, input: any) {
  const rules = await getExpirationRules();

  // Handle synthetic IDs for Iqamas
  if (id.startsWith("iqama-")) {
    const empId = id.replace("iqama-", "");
    const updated = await prisma.employee.update({
      where: { id: empId },
      data: {
        iqamaNumber: input.documentNumber !== undefined ? input.documentNumber : undefined,
        iqamaIssueDate: input.issueDate !== undefined ? input.issueDate : undefined,
        iqamaExpiryDate: input.expiryDate !== undefined ? input.expiryDate : undefined,
        iqamaFileId: input.fileId !== undefined ? input.fileId : undefined,
      },
      include: { branch: { select: { id: true, name: true, nameEn: true, code: true } } },
    });
    return {
      id,
      employeeId: updated.id,
      employeeNumber: updated.employeeNumber,
      fullNameAr: updated.fullNameAr,
      fullNameEn: updated.fullNameEn,
      type: "IQAMA",
      documentNumber: updated.iqamaNumber,
      expiryDate: updated.iqamaExpiryDate,
      status: computeStatus(updated.iqamaExpiryDate, rules),
    };
  }

  // Handle synthetic IDs for Passports
  if (id.startsWith("passport-")) {
    const empId = id.replace("passport-", "");
    const updated = await prisma.employee.update({
      where: { id: empId },
      data: {
        passportNumber: input.documentNumber !== undefined ? input.documentNumber : undefined,
        passportIssueDate: input.issueDate !== undefined ? input.issueDate : undefined,
        passportExpiryDate: input.expiryDate !== undefined ? input.expiryDate : undefined,
        passportFileId: input.fileId !== undefined ? input.fileId : undefined,
        passportCountry: input.issuingAuthority !== undefined ? input.issuingAuthority : undefined,
      },
      include: { branch: { select: { id: true, name: true, nameEn: true, code: true } } },
    });
    return {
      id,
      employeeId: updated.id,
      employeeNumber: updated.employeeNumber,
      fullNameAr: updated.fullNameAr,
      fullNameEn: updated.fullNameEn,
      type: "PASSPORT",
      documentNumber: updated.passportNumber,
      expiryDate: updated.passportExpiryDate,
      status: computeStatus(updated.passportExpiryDate, rules),
    };
  }

  const existing = await prisma.employeeDocument.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    // Iqamas/passports are displayed from the Employee record's own denormalized
    // fields (see listIqamas/listPassports), so their "document id" is really the
    // employee's id — there's no EmployeeDocument row to find above. The client
    // always sends `type` so we can tell these two apart; don't guess, since
    // guessing wrong silently overwrites the wrong field on the employee record.
    const emp = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
    if (emp) {
      if (input.type === EmployeeDocumentType.PASSPORT) {
        const updated = await prisma.employee.update({
          where: { id },
          data: {
            passportNumber: input.documentNumber ?? emp.passportNumber,
            passportIssueDate: input.issueDate ?? emp.passportIssueDate,
            passportExpiryDate: input.expiryDate ?? emp.passportExpiryDate,
            passportFileId: input.fileId ?? emp.passportFileId,
            passportCountry: input.issuingAuthority ?? emp.passportCountry,
          },
        });
        return { ...updated, status: computeStatus(updated.passportExpiryDate, rules) };
      } else if (input.type === EmployeeDocumentType.IQAMA) {
        const updated = await prisma.employee.update({
          where: { id },
          data: {
            iqamaNumber: input.documentNumber ?? emp.iqamaNumber,
            iqamaIssueDate: input.issueDate ?? emp.iqamaIssueDate,
            iqamaExpiryDate: input.expiryDate ?? emp.iqamaExpiryDate,
            iqamaFileId: input.fileId ?? emp.iqamaFileId,
          },
        });
        return { ...updated, status: computeStatus(updated.iqamaExpiryDate, rules) };
      }
    }
    throw ApiError.notFound("Document not found");
  }

  const doc = await prisma.employeeDocument.update({
    where: { id },
    data: input,
    include: {
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          fullNameAr: true,
          fullNameEn: true,
          branch: { select: { id: true, name: true, nameEn: true } },
        },
      },
    },
  });

  return { ...doc, status: computeStatus(doc.expiryDate, rules) };
}

export async function removeDocument(id: string, type?: string) {
  if (id.startsWith("iqama-")) {
    const empId = id.replace("iqama-", "");
    await prisma.employee.update({
      where: { id: empId },
      data: { iqamaNumber: null, iqamaIssueDate: null, iqamaExpiryDate: null, iqamaFileId: null },
    });
    return;
  }

  if (id.startsWith("passport-")) {
    const empId = id.replace("passport-", "");
    await prisma.employee.update({
      where: { id: empId },
      data: { passportNumber: null, passportIssueDate: null, passportExpiryDate: null, passportFileId: null, passportCountry: null },
    });
    return;
  }

  const existing = await prisma.employeeDocument.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    // Same bare-employee-id case as updateDocument: don't guess which of
    // Iqama/Passport is meant — clearing both would silently wipe whichever
    // one the caller didn't intend to touch. The caller must say which.
    const emp = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
    if (emp) {
      if (type === EmployeeDocumentType.PASSPORT) {
        await prisma.employee.update({
          where: { id },
          data: { passportNumber: null, passportIssueDate: null, passportExpiryDate: null, passportFileId: null, passportCountry: null },
        });
        return;
      }
      if (type === EmployeeDocumentType.IQAMA) {
        await prisma.employee.update({
          where: { id },
          data: { iqamaNumber: null, iqamaIssueDate: null, iqamaExpiryDate: null, iqamaFileId: null },
        });
        return;
      }
      throw ApiError.badRequest("Document type is required to delete this record");
    }
    throw ApiError.notFound("Document not found");
  }

  await prisma.employeeDocument.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

