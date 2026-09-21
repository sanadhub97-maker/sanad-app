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
      branch: { select: { id: true, name: true, code: true } },
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
      branch: emp.branch,
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
      branch: { select: { id: true, name: true, code: true } },
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
      branch: emp.branch,
      passportNumber: emp.passportNumber,
      passportCountry: emp.passportCountry,
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
          branch: { select: { id: true, name: true, code: true } },
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
// 4. OVERVIEW STATS FOR WORKFORCE SUITE
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
// 5. DOCUMENT MUTATIONS
// ---------------------------------------------------------------------------
export async function createDocument(input: any) {
  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, deletedAt: null },
  });
  if (!employee) throw ApiError.notFound("Employee not found");

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
          branch: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Sync to primary employee record if IQAMA or PASSPORT
  if (input.type === EmployeeDocumentType.IQAMA) {
    await prisma.employee.update({
      where: { id: input.employeeId },
      data: {
        iqamaNumber: input.documentNumber ?? employee.iqamaNumber,
        iqamaIssueDate: input.issueDate ?? employee.iqamaIssueDate,
        iqamaExpiryDate: input.expiryDate ?? employee.iqamaExpiryDate,
        iqamaFileId: input.fileId ?? employee.iqamaFileId,
      },
    });
  } else if (input.type === EmployeeDocumentType.PASSPORT) {
    await prisma.employee.update({
      where: { id: input.employeeId },
      data: {
        passportNumber: input.documentNumber ?? employee.passportNumber,
        passportIssueDate: input.issueDate ?? employee.passportIssueDate,
        passportExpiryDate: input.expiryDate ?? employee.passportExpiryDate,
        passportFileId: input.fileId ?? employee.passportFileId,
      },
    });
  }

  const rules = await getExpirationRules();
  return { ...doc, status: computeStatus(doc.expiryDate, rules) };
}

export async function updateDocument(id: string, input: any) {
  const existing = await prisma.employeeDocument.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw ApiError.notFound("Document not found");

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
          branch: { select: { id: true, name: true } },
        },
      },
    },
  });

  const rules = await getExpirationRules();
  return { ...doc, status: computeStatus(doc.expiryDate, rules) };
}

export async function removeDocument(id: string) {
  const existing = await prisma.employeeDocument.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw ApiError.notFound("Document not found");

  await prisma.employeeDocument.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

