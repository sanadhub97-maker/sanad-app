import { Prisma } from "@prisma/client";
import { prisma, type TransactionClient } from "@/lib/prisma";
import type { AuthContext } from "@/types/express";
import { ApiError } from "@/utils/apiError";
import { hasPermission, canViewSource } from "@/lib/security";
import { requireAccess } from "@/modules/productivity/productivity.service";
import { applyTrackedDocumentUpdate } from "@/modules/maintenance/revisions.service";
import { assertFileAccess } from "@/modules/files/files.access";
import * as schemas from "./operations.schemas";
import type { z } from "zod";
type Tx = TransactionClient;
const employeeAccess = (auth: AuthContext, edit = false) => { requireAccess(auth, "employees.view"); if (edit) requireAccess(auth, "employees.edit"); };
const audit = (tx: Tx, auth: AuthContext, recordId: string, description: string, module = "employees") => tx.auditLog.create({ data: { userId: auth.userId, action: "UPDATE", module, recordId, description } });
const assetInclude = { branch: { select: { id: true, name: true } }, handovers: { where: { returnedAt: null }, include: { employee: { select: { id: true, employeeNumber: true, fullNameAr: true, deletedAt: true } } } } } as const;
export async function listAssets(auth: AuthContext, query: z.infer<typeof schemas.list>) {
  employeeAccess(auth); const where: Prisma.ManagedAssetWhereInput = { deletedAt: null, ...(query.q ? { OR: ["code", "name", "serialNumber"].map(key => ({ [key]: { contains: query.q, mode: "insensitive" } })) } : {}) };
  const [rows, total] = await Promise.all([prisma.managedAsset.findMany({ where, include: assetInclude, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * 20, take: 20 }), prisma.managedAsset.count({ where })]);
  return { rows: rows.map(row => ({ ...row, ...(!hasPermission(auth, "payments.view") ? { purchaseValue: undefined } : {}) })), total, page: query.page };
}
export async function createAsset(auth: AuthContext, input: z.infer<typeof schemas.asset>) {
  employeeAccess(auth, true);
  if (input.purchaseValue > 0) requireAccess(auth, "payments.view");
  return prisma.$transaction(async tx => {
    if (input.branchId && !await tx.branch.findFirst({ where: { id: input.branchId, deletedAt: null, status: "ACTIVE" } })) throw ApiError.badRequest("Select an active branch.");
    const row = await tx.managedAsset.create({ data: input }); await audit(tx, auth, row.id, `Asset inventory created: ${row.code}`, "assets"); return row;
  });
}
export async function assignAsset(auth: AuthContext, assetId: string, input: z.infer<typeof schemas.assign>) {
  employeeAccess(auth, true);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "ManagedAsset" WHERE id = ${assetId} FOR UPDATE`;
    const asset = await tx.managedAsset.findFirst({ where: { id: assetId, deletedAt: null } });
    if (!asset) throw ApiError.notFound("Asset not found.");
    if (asset.state !== "AVAILABLE" || await tx.assetHandover.findFirst({ where: { assetId, returnedAt: null } })) throw ApiError.badRequest("Asset is already assigned or unavailable.");
    await tx.$queryRaw`SELECT id FROM "Employee" WHERE id = ${input.employeeId} FOR UPDATE`;
    const employee = await tx.employee.findFirst({ where: { id: input.employeeId, deletedAt: null, employmentStatus: { in: ["ACTIVE", "ON_LEAVE"] } } });
    if (!employee) throw ApiError.badRequest("Select an active employee.");
    if (await tx.employeeOffboarding.findFirst({ where: { employeeId: employee.id, status: "OPEN" } })) throw ApiError.badRequest("Cannot issue new assets during offboarding.");
    const row = await tx.assetHandover.create({ data: { assetId, employeeId: employee.id, recordedById: auth.userId, issuedCondition: input.issuedCondition, notes: input.notes } });
    await tx.managedAsset.update({ where: { id: assetId }, data: { state: "ASSIGNED" } }); await audit(tx, auth, employee.id, `Asset ${asset.code} assigned; handover ${row.id}`, "assets"); return row;
  });
}
export async function returnAsset(auth: AuthContext, handoverId: string, input: z.infer<typeof schemas.returned>) {
  employeeAccess(auth, true);
  return prisma.$transaction(async tx => {
    const found = await tx.assetHandover.findUnique({ where: { id: handoverId } }); if (!found) throw ApiError.notFound("Handover not found.");
    await tx.$queryRaw`SELECT id FROM "ManagedAsset" WHERE id = ${found.assetId} FOR UPDATE`;
    const row = await tx.assetHandover.findUnique({ where: { id: handoverId } }); if (row?.returnedAt) throw ApiError.badRequest("This asset has already been returned.");
    const returned = await tx.assetHandover.update({ where: { id: handoverId }, data: { returnedAt: new Date(), returnedCondition: input.returnedCondition, ...(input.notes ? { notes: [row?.notes, input.notes].filter(Boolean).join("\n") } : {}) } });
    await tx.managedAsset.update({ where: { id: found.assetId }, data: { state: input.state } }); await audit(tx, auth, found.employeeId, `Asset returned; handover ${handoverId}`, "assets"); return returned;
  });
}
export async function setAssetState(auth: AuthContext, assetId: string, state: "AVAILABLE" | "MAINTENANCE" | "RETIRED") {
  employeeAccess(auth, true); return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "ManagedAsset" WHERE id = ${assetId} FOR UPDATE`;
    if (!await tx.managedAsset.findFirst({ where: { id: assetId, deletedAt: null } })) throw ApiError.notFound("Asset not found.");
    if (await tx.assetHandover.findFirst({ where: { assetId, returnedAt: null } })) throw ApiError.badRequest("Return the asset before changing its state.");
    await tx.managedAsset.update({ where: { id: assetId }, data: { state } }); await audit(tx, auth, assetId, `Asset state: ${state}`, "assets");
  });
}
export async function assetHistory(auth: AuthContext, assetId: string) {
  employeeAccess(auth); return prisma.assetHandover.findMany({ where: { assetId }, include: { employee: { select: { fullNameAr: true, employeeNumber: true } }, recordedBy: { select: { fullName: true } } }, orderBy: { issuedAt: "desc" }, take: 100 });
}
export async function listOffboarding(auth: AuthContext, query: z.infer<typeof schemas.list>) {
  employeeAccess(auth); const where: Prisma.EmployeeOffboardingWhereInput = { employee: { deletedAt: null, ...(query.q ? { fullNameAr: { contains: query.q, mode: "insensitive" } } : {}) } };
  const [rows, total] = await Promise.all([prisma.employeeOffboarding.findMany({ where, include: { employee: { select: { id: true, fullNameAr: true, employeeNumber: true, assetHandovers: { where: { returnedAt: null }, include: { asset: { select: { code: true, name: true } } } } } } }, orderBy: { plannedDate: "asc" }, take: 20, skip: (query.page - 1) * 20 }), prisma.employeeOffboarding.count({ where })]); return { rows, total, page: query.page };
}
export async function startOffboarding(auth: AuthContext, input: z.infer<typeof schemas.offboarding>) {
  employeeAccess(auth, true); return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Employee" WHERE id = ${input.employeeId} FOR UPDATE`;
    if (!await tx.employee.findFirst({ where: { id: input.employeeId, deletedAt: null } })) throw ApiError.notFound("Employee not found.");
    const previous = await tx.employeeOffboarding.findUnique({ where: { employeeId: input.employeeId } }); if (previous) throw ApiError.badRequest("An offboarding case already exists for this employee.");
    const row = await tx.employeeOffboarding.create({ data: { employeeId: input.employeeId, plannedDate: new Date(input.plannedDate), reason: input.reason, steps: Object.fromEntries(schemas.clearanceSteps.map(key => [key, false])) } });
    await audit(tx, auth, input.employeeId, `Offboarding started: ${row.id}`); return row;
  });
}
export async function updateClearance(auth: AuthContext, caseId: string, step: string, done: boolean) {
  employeeAccess(auth, true); return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "EmployeeOffboarding" WHERE id = ${caseId} FOR UPDATE`;
    const row = await tx.employeeOffboarding.findFirst({ where: { id: caseId, employee: { deletedAt: null } } }); if (!row) throw ApiError.notFound("Offboarding case not found.");
    if (row.status !== "OPEN") throw ApiError.badRequest("This offboarding case is closed.");
    if (step === "settlement") requireAccess(auth, "payments.view");
    await tx.employeeOffboarding.update({ where: { id: caseId }, data: { steps: { ...(row.steps as Record<string, boolean>), [step]: done } } }); await audit(tx, auth, row.employeeId, `Clearance ${step}: ${done}`);
  });
}
export async function finishOffboarding(auth: AuthContext, caseId: string) {
  employeeAccess(auth, true); requireAccess(auth, "payments.view");
  return prisma.$transaction(async tx => {
    const initial = await tx.employeeOffboarding.findUnique({ where: { id: caseId } }); if (!initial) throw ApiError.notFound("Offboarding case not found.");
    await tx.$queryRaw`SELECT id FROM "Employee" WHERE id = ${initial.employeeId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "EmployeeOffboarding" WHERE id = ${caseId} FOR UPDATE`;
    const row = await tx.employeeOffboarding.findFirst({ where: { id: caseId, employee: { deletedAt: null } } }); if (!row || row.status !== "OPEN") throw ApiError.badRequest("Offboarding is missing or already closed.");
    if (schemas.clearanceSteps.some(key => (row.steps as any)[key] !== true)) throw ApiError.badRequest("Complete all clearance steps first.");
    if (await tx.assetHandover.count({ where: { employeeId: row.employeeId, returnedAt: null } })) throw ApiError.badRequest("Return all employee assets before completing clearance.");
    await tx.employee.update({ where: { id: row.employeeId }, data: { employmentStatus: "TERMINATED" } });
    await tx.employeeOffboarding.update({ where: { id: caseId }, data: { status: "COMPLETED", completedAt: new Date() } }); await audit(tx, auth, row.employeeId, "Clearance completed; employment status set to TERMINATED");
  });
}
export async function resolveRenewal(tx: Tx, auth: AuthContext, sourceType: string, sourceId: string, edit = false) {
  if (!canViewSource(auth, sourceType)) throw ApiError.forbidden();
  const module = sourceType === "COMPANY_DOCUMENT" ? "companyDocuments" : sourceType === "EMPLOYEE_DOCUMENT" ? "employeeDocuments" : "employees";
  if (edit) requireAccess(auth, `${module}.edit`);
  if (sourceType.startsWith("EMPLOYEE_") && sourceType !== "EMPLOYEE_DOCUMENT") {
    const row = await tx.employee.findFirst({ where: { id: sourceId, deletedAt: null } }); if (!row) throw ApiError.notFound("Employee not found.");
    const iq = sourceType === "EMPLOYEE_IQAMA"; return { subject: "employee" as const, title: `${row.fullNameAr} — ${iq ? "الإقامة" : "جواز السفر"}`, expiryDate: iq ? row.iqamaExpiryDate : row.passportExpiryDate, module };
  }
  if (sourceType === "EMPLOYEE_DOCUMENT") { const row = await tx.employeeDocument.findFirst({ where: { id: sourceId, deletedAt: null, employee: { deletedAt: null } }, include: { employee: { select: { fullNameAr: true } } } }); if (!row) throw ApiError.notFound("Document not found."); return { subject: "employeeDocument" as const, title: `${row.employee.fullNameAr} — ${row.name || row.type}`, expiryDate: row.expiryDate, module }; }
  if (sourceType !== "COMPANY_DOCUMENT") throw ApiError.badRequest("Invalid document source.");
  const row = await tx.companyDocument.findFirst({ where: { id: sourceId, deletedAt: null } }); if (!row) throw ApiError.notFound("Document not found."); return { subject: "companyDocument" as const, title: row.name, expiryDate: row.expiryDate, module };
}
export async function listRenewals(auth: AuthContext, query: z.infer<typeof schemas.list>) {
  const sources = schemas.renewalSources.filter(source => canViewSource(auth, source)); const where = { sourceType: { in: [...sources] }, ...(query.q ? { title: { contains: query.q, mode: "insensitive" as const } } : {}) };
  const [rows, total] = await Promise.all([prisma.renewalCase.findMany({ where, include: { owner: { select: { id: true, fullName: true } } }, orderBy: { dueDate: "asc" }, skip: (query.page - 1) * 20, take: 20 }), prisma.renewalCase.count({ where })]); return { rows: rows.map(row => ({ ...row, ...(!hasPermission(auth, "payments.view") ? { estimatedCost: undefined, paymentId: undefined } : {}) })), total, page: query.page };
}
export async function startRenewal(auth: AuthContext, input: z.infer<typeof schemas.renewal>) {
  requireAccess(auth, "tasks.create"); if (input.estimatedCost > 0) requireAccess(auth, "payments.view");
  return prisma.$transaction(async tx => {
    const target = await resolveRenewal(tx, auth, input.sourceType, input.sourceId, true);
    // The document lock serializes attempts to open concurrent renewal cases.
    const table = { employee: "Employee", employeeDocument: "EmployeeDocument", companyDocument: "CompanyDocument" }[target.subject];
    await tx.$queryRaw(Prisma.sql`SELECT id FROM ${Prisma.raw(`"${table}"`)} WHERE id = ${input.sourceId} FOR UPDATE`);
    if (await tx.renewalCase.findFirst({ where: { sourceType: input.sourceType, sourceId: input.sourceId, status: { notIn: ["COMPLETED", "CANCELLED"] } } })) throw ApiError.badRequest("An active renewal already exists for this document.");
    if (!await tx.user.findFirst({ where: { id: input.ownerId, isActive: true, deletedAt: null } })) throw ApiError.badRequest("Select an active responsible user.");
    const task = await tx.dailyTask.create({ data: { date: new Date(input.dueDate), title: `تجديد ${target.title}`, category: "documents", assigneeId: input.ownerId, createdById: auth.userId, priority: "HIGH", notes: input.notes } });
    const row = await tx.renewalCase.create({ data: { ...input, dueDate: new Date(input.dueDate), title: target.title, taskId: task.id } }); await audit(tx, auth, row.id, `Renewal opened for ${input.sourceType}:${input.sourceId}`, target.module); return row;
  });
}
export async function progressRenewal(auth: AuthContext, caseId: string, input: z.infer<typeof schemas.renewalProgress>) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "RenewalCase" WHERE id = ${caseId} FOR UPDATE`;
    const row = await tx.renewalCase.findUnique({ where: { id: caseId } }); if (!row) throw ApiError.notFound("Renewal not found.");
    const target = await resolveRenewal(tx, auth, row.sourceType, row.sourceId, true);
    if (["COMPLETED", "CANCELLED"].includes(row.status)) throw ApiError.badRequest("This renewal is closed.");
    await tx.renewalCase.update({ where: { id: caseId }, data: input });
    if (input.status === "CANCELLED" && row.taskId) await tx.dailyTask.updateMany({ where: { id: row.taskId, deletedAt: null }, data: { done: true, doneAt: new Date(), notes: "Renewal cancelled" } }); await audit(tx, auth, caseId, `Renewal stage: ${input.status}`, target.module);
  });
}
export async function finishRenewal(auth: AuthContext, caseId: string, input: z.infer<typeof schemas.renewalFinish>) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "RenewalCase" WHERE id = ${caseId} FOR UPDATE`;
    const row = await tx.renewalCase.findUnique({ where: { id: caseId } }); if (!row) throw ApiError.notFound("Renewal not found.");
    if (["COMPLETED", "CANCELLED"].includes(row.status)) throw ApiError.badRequest("This renewal is closed.");
    const permitted = await resolveRenewal(tx, auth, row.sourceType, row.sourceId, true);
    const table = { employee: "Employee", employeeDocument: "EmployeeDocument", companyDocument: "CompanyDocument" }[permitted.subject];
    await tx.$queryRaw(Prisma.sql`SELECT id FROM ${Prisma.raw(`"${table}"`)} WHERE id = ${row.sourceId} FOR UPDATE`);
    const target = await resolveRenewal(tx, auth, row.sourceType, row.sourceId, true);
    const expiry = new Date(input.expiryDate); if (target.expiryDate && expiry <= target.expiryDate) throw ApiError.badRequest("New expiry must be later than the previous expiry.");
    if (expiry <= new Date(new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10))) throw ApiError.badRequest("New expiry must be in the future.");
    if (input.fileId) { const file = await tx.file.findUnique({ where: { id: input.fileId } }); if (!file) throw ApiError.notFound("Attachment not found."); assertFileAccess(file, auth); const allowed = target.subject === "companyDocument" ? ["company-document"] : target.subject === "employee" ? ["employee", "employee-documents"] : ["employee-document", "employee-documents"]; if (!allowed.includes(file.module || "")) throw ApiError.badRequest("Select an attachment from the document's module."); }
    if (input.paymentId) { requireAccess(auth, "payments.view"); if (!await tx.payment.findFirst({ where: { id: input.paymentId, deletedAt: null } })) throw ApiError.notFound("Payment not found."); }
    const prefix = row.sourceType === "EMPLOYEE_IQAMA" ? "iqama" : "passport";
    const data = target.subject === "employee" ? { [`${prefix}ExpiryDate`]: expiry, ...(input.issueDate ? { [`${prefix}IssueDate`]: new Date(input.issueDate) } : {}), ...(input.documentNumber ? { [`${prefix}Number`]: input.documentNumber } : {}), ...(input.fileId ? { [`${prefix}FileId`]: input.fileId } : {}) } : { expiryDate: expiry, ...(input.issueDate ? { issueDate: new Date(input.issueDate) } : {}), ...(input.documentNumber ? { documentNumber: input.documentNumber } : {}), ...(input.fileId ? { fileId: input.fileId } : {}) };
    if (target.subject === "employee" && input.documentNumber) { const field = `${prefix}Number`; if (await tx.employee.findFirst({ where: { deletedAt: null, id: { not: row.sourceId }, [field]: input.documentNumber } })) throw ApiError.badRequest("Document number belongs to another employee."); }
    await applyTrackedDocumentUpdate(tx, target.subject, row.sourceId, data, auth);
    await tx.renewalCase.update({ where: { id: caseId }, data: { status: "COMPLETED", completedAt: new Date(), paymentId: input.paymentId } });
    if (row.taskId) await tx.dailyTask.updateMany({ where: { id: row.taskId, deletedAt: null }, data: { done: true, doneAt: new Date() } }); await audit(tx, auth, row.sourceId, `Renewal completed; case ${caseId}`, target.module);
  });
}
