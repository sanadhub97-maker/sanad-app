import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import type { AuthContext } from "@/types/express";
import { hasPermission } from "@/lib/security";
import { Prisma } from "@prisma/client";
export type DocumentSubject = "employee" | "employeeDocument" | "companyDocument";
const docFields = ["name", "type", "category", "documentNumber", "licenseNumber", "issuingAuthority", "issueDate", "startDate", "expiryDate", "fileId", "notes"];
export function revisionGroups(type: DocumentSubject): Record<string, string[]> {
  return type === "employee" ? { IQAMA: ["iqamaNumber", "iqamaIssueDate", "iqamaExpiryDate", "iqamaFileId"], PASSPORT: ["passportNumber", "passportCountry", "passportIssueDate", "passportExpiryDate", "passportFileId"] } : { DOCUMENT: docFields.filter(f => type === "companyDocument" ? f !== "type" : !["category", "licenseNumber"].includes(f)) };
}
const snapshot = (row: any, fields: string[]) => Object.fromEntries(fields.map(key => [key, row[key] instanceof Date ? row[key].toISOString() : row[key] ?? null]));
export async function updateTrackedDocument(type: DocumentSubject, id: string, input: any, auth?: AuthContext, extra: any = {}) {
  return prisma.$transaction(async tx => {
    const table = { employee: "Employee", employeeDocument: "EmployeeDocument", companyDocument: "CompanyDocument" }[type];
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM ${Prisma.raw(`"${table}"`)} WHERE "id" = ${id} AND "deletedAt" IS NULL FOR UPDATE`);
    const model = (tx as any)[type];
    const before = await model.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw ApiError.notFound("Document not found");
    const after = await model.update({ where: { id }, data: input, ...extra });
    for (const [documentKind, fields] of Object.entries(revisionGroups(type))) {
      const previous = snapshot(before, fields!); const next = snapshot(after, fields!);
      if (JSON.stringify(previous) === JSON.stringify(next)) continue;
      await tx.documentRevision.create({ data: { subjectType: type, subjectId: id, subjectName: before.fullNameAr ?? before.name ?? before.documentNumber ?? id, documentKind, actorId: auth?.userId, actorName: auth?.fullName ?? "النظام", before: previous, after: next } });
    }
    return after;
  });
}
export async function listDocumentRevisions(auth: AuthContext, subjectType?: DocumentSubject, subjectId?: string, page = 1) {
  const permitted = ["employee", "employeeDocument", "companyDocument"].filter(t => hasPermission(auth, t === "companyDocument" ? "companyDocuments.view" : t === "employee" ? "employees.view" : "employeeDocuments.view"));
  if (subjectType && !permitted.includes(subjectType)) throw ApiError.forbidden();
  const where = { subjectType: subjectType ?? { in: permitted }, ...(subjectId ? { subjectId } : {}) };
  const [rows, total] = await Promise.all([prisma.documentRevision.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 30, take: 30 }), prisma.documentRevision.count({ where })]);
  return { rows, total };
}

export async function restoreDocumentRevision(auth: AuthContext, id: string, version: "before" | "after") {
  const revision = await prisma.documentRevision.findUnique({ where: { id } });
  if (!revision || !["employee", "employeeDocument", "companyDocument"].includes(revision.subjectType)) throw ApiError.notFound("Document revision not found.");
  const type = revision.subjectType as DocumentSubject;
  const module = type === "companyDocument" ? "companyDocuments" : type === "employee" ? "employees" : "employeeDocuments";
  if (!hasPermission(auth, `${module}.view`) || !hasPermission(auth, `${module}.edit`)) throw ApiError.forbidden();
  const allowed = revisionGroups(type)[revision.documentKind];
  if (!allowed) throw ApiError.badRequest("Invalid revision kind.");
  const source = revision[version] as Record<string, any>, input: Record<string, any> = {};
  for (const field of allowed) if (field in source) {
    const value = source[field];
    if (field.endsWith("FileId") || field === "fileId") { if (value && !await prisma.file.findUnique({ where: { id: value } })) throw ApiError.badRequest("The original attachment is no longer available."); }
    input[field] = field.endsWith("Date") && value ? new Date(value) : value;
  }
  await updateTrackedDocument(type, revision.subjectId, input, auth);
  await prisma.auditLog.create({ data: { userId: auth.userId, action: "UPDATE", module, recordId: revision.subjectId, description: "Restored document revision " + id } });
}
