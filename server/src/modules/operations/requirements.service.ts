import { randomUUID } from "node:crypto";
import { CompanyDocumentCategory, EmployeeDocumentType, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma, type TransactionClient } from "@/lib/prisma";
import type { AuthContext } from "@/types/express";
import { hasPermission } from "@/lib/security";
import { requireAccess } from "@/modules/productivity/productivity.service";
import { ApiError } from "@/utils/apiError";
import { date, id, text } from "./operations.schemas";
const prefix = "document-requirement:";
export const requirementInput = z.object({ name: text, scope: z.enum(["EMPLOYEE", "BRANCH"]), type: text, branchId: id.optional(), sponsorshipOnly: z.boolean().default(false), requireFile: z.boolean().default(true), requireValid: z.boolean().default(true), enabled: z.boolean().default(true) }).refine(v => v.scope === "EMPLOYEE" ? Object.values(EmployeeDocumentType).includes(v.type as EmployeeDocumentType) : Object.values(CompanyDocumentCategory).includes(v.type as CompanyDocumentCategory), "Select a document type matching the scope");
type Rule = z.infer<typeof requirementInput> & { id: string };
export const followupInput = z.object({ ruleId: id, targetId: id, ownerId: id, dueDate: date });
const permitted = (auth: AuthContext, rule: Rule) => rule.scope === "EMPLOYEE" ? hasPermission(auth, "employees.view") && hasPermission(auth, "employeeDocuments.view") : hasPermission(auth, "branches.view") && hasPermission(auth, "companyDocuments.view");
export async function listRequirements(auth: AuthContext) {
  const rows = await prisma.setting.findMany({ where: { key: { startsWith: prefix } }, take: 201 });
  if (rows.length > 200) throw ApiError.badRequest("At most 200 document requirements are supported.");
  return rows.flatMap(row => { const parsed = requirementInput.safeParse(row.value); return parsed.success ? [{ ...parsed.data, id: row.key.slice(prefix.length) }] : []; }).filter(rule => permitted(auth, rule));
}
export async function saveRequirement(auth: AuthContext, input: z.infer<typeof requirementInput>, ruleId?: string) {
  requireAccess(auth, "settings.edit"); const key = prefix + (ruleId || randomUUID());
  return prisma.$transaction(async tx => {
    if (ruleId && !await tx.setting.findUnique({ where: { key } })) throw ApiError.notFound("Requirement not found.");
    if (input.branchId && !await tx.branch.findFirst({ where: { id: input.branchId, deletedAt: null, status: "ACTIVE" } })) throw ApiError.badRequest("Select an active branch.");
    if (!ruleId && await tx.setting.count({ where: { key: { startsWith: prefix } } }) >= 200) throw ApiError.badRequest("Maximum requirement count reached.");
    await tx.setting.upsert({ where: { key }, create: { key, value: input }, update: { value: input } });
    await tx.auditLog.create({ data: { userId: auth.userId, action: ruleId ? "UPDATE" : "CREATE", module: "settings", recordId: key, description: `Document requirement: ${input.name}` } });
    return { ...input, id: key.slice(prefix.length) };
  });
}
export function satisfiesRequirement(rule: { requireFile: boolean; requireValid: boolean }, documents: { fileId: string | null; expiryDate: Date | null }[], today: Date) {
  return documents.some(doc => (!rule.requireFile || Boolean(doc.fileId)) && (!rule.requireValid || !doc.expiryDate || doc.expiryDate >= today));
}
async function targetMissing(tx: TransactionClient, rule: Rule, targetId: string) {
  const today = new Date(new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10));
  if (rule.scope === "EMPLOYEE") {
    const employee = await tx.employee.findFirst({ where: { id: targetId, deletedAt: null, employmentStatus: { in: ["ACTIVE", "ON_LEAVE"] }, ...(rule.branchId ? { branchId: rule.branchId } : {}), ...(rule.sponsorshipOnly ? { onSponsorship: true } : {}) }, include: { documents: { where: { deletedAt: null, type: rule.type as EmployeeDocumentType }, select: { fileId: true, expiryDate: true } } } });
    if (!employee) return null;
    const documents = [...employee.documents];
    if (rule.type === "IQAMA" && employee.iqamaNumber) documents.push({ fileId: employee.iqamaFileId, expiryDate: employee.iqamaExpiryDate });
    if (rule.type === "PASSPORT" && employee.passportNumber) documents.push({ fileId: employee.passportFileId, expiryDate: employee.passportExpiryDate });
    return satisfiesRequirement(rule, documents, today) ? null : { name: employee.fullNameAr, href: `/employees/${employee.id}` };
  }
  if (rule.branchId && rule.branchId !== targetId) return null;
  const branch = await tx.branch.findFirst({ where: { id: targetId, deletedAt: null, status: "ACTIVE" } });
  if (!branch) return null;
  const documents = await tx.companyDocument.findMany({ where: { branchId: branch.id, category: rule.type as CompanyDocumentCategory, deletedAt: null }, select: { fileId: true, expiryDate: true } });
  return satisfiesRequirement(rule, documents, today) ? null : { name: branch.name, href: `/branches/${branch.id}` };
}
export async function missingDocuments(auth: AuthContext, ruleId: string, page: number) {
  const rule = (await listRequirements(auth)).find(r => r.id === ruleId && r.enabled); if (!rule) throw ApiError.notFound("Requirement not found.");
  return prisma.$transaction(async tx => {
    const where = rule.scope === "EMPLOYEE" ? { deletedAt: null, employmentStatus: { in: ["ACTIVE", "ON_LEAVE"] as any }, ...(rule.branchId ? { branchId: rule.branchId } : {}), ...(rule.sponsorshipOnly ? { onSponsorship: true } : {}) } : { deletedAt: null, status: "ACTIVE" as const, ...(rule.branchId ? { id: rule.branchId } : {}) };
    const today = new Date(new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10));
    const missing: { id: string; name: string; href: string; followup: unknown }[] = [];
    if (rule.scope === "EMPLOYEE") {
      const targets = await tx.employee.findMany({ where, select: { id: true, fullNameAr: true, iqamaNumber: true, iqamaFileId: true, iqamaExpiryDate: true, passportNumber: true, passportFileId: true, passportExpiryDate: true, documents: { where: { deletedAt: null, type: rule.type as EmployeeDocumentType }, select: { fileId: true, expiryDate: true } } }, orderBy: { employeeNumber: "asc" }, take: 5001 });
      if (targets.length > 5000) throw ApiError.badRequest("Limit the requirement to a branch to scan at most 5,000 records.");
      for (const target of targets) {
        const documents = [...target.documents];
        if (rule.type === "IQAMA" && target.iqamaNumber) documents.push({ fileId: target.iqamaFileId, expiryDate: target.iqamaExpiryDate });
        if (rule.type === "PASSPORT" && target.passportNumber) documents.push({ fileId: target.passportFileId, expiryDate: target.passportExpiryDate });
        if (!satisfiesRequirement(rule, documents, today)) missing.push({ id: target.id, name: target.fullNameAr, href: `/employees/${target.id}`, followup: null });
      }
    } else {
      const targets = await tx.branch.findMany({ where: where as Prisma.BranchWhereInput, select: { id: true, name: true, companyDocuments: { where: { deletedAt: null, category: rule.type as CompanyDocumentCategory }, select: { fileId: true, expiryDate: true } } }, orderBy: { name: "asc" }, take: 5001 });
      if (targets.length > 5000) throw ApiError.badRequest("Limit the requirement to a branch to scan at most 5,000 records.");
      for (const target of targets) if (!satisfiesRequirement(rule, target.companyDocuments, today)) missing.push({ id: target.id, name: target.name, href: `/branches/${target.id}`, followup: null });
    }
    const visible = missing.slice((page - 1) * 20, page * 20);
    const followups = await tx.setting.findMany({ where: { key: { in: visible.map(row => `missing-followup:${rule.id}:${row.id}`) } } });
    for (const row of visible) row.followup = followups.find(f => f.key === `missing-followup:${rule.id}:${row.id}`)?.value || null;
    return { rule, total: missing.length, rows: visible, page };
  }, { isolationLevel: "RepeatableRead", timeout: 60000 });
}
export async function createMissingFollowup(auth: AuthContext, input: z.infer<typeof followupInput>) {
  requireAccess(auth, "tasks.create"); const rule = (await listRequirements(auth)).find(r => r.id === input.ruleId && r.enabled); if (!rule) throw ApiError.notFound("Requirement not found.");
  const key = `missing-followup:${rule.id}:${input.targetId}`;
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`INSERT INTO "Setting" (key,value,"updatedAt") VALUES (${key},'{}'::jsonb,NOW()) ON CONFLICT (key) DO NOTHING`;
    await tx.$queryRaw`SELECT key FROM "Setting" WHERE key = ${key} FOR UPDATE`;
    const match = await targetMissing(tx, rule, input.targetId); if (!match) throw ApiError.badRequest("The document is no longer missing or this record does not match the requirement.");
    const previous = (await tx.setting.findUnique({ where: { key } }))?.value as any;
    if (previous?.taskId && await tx.dailyTask.findFirst({ where: { id: previous.taskId, deletedAt: null, done: false } })) throw ApiError.badRequest("An open follow-up task already exists.");
    const owner = await tx.user.findFirst({ where: { id: input.ownerId, isActive: true, deletedAt: null } }); if (!owner) throw ApiError.badRequest("Select an active responsible user.");
    const task = await tx.dailyTask.create({ data: { title: `${rule.name} — ${match.name}`, date: new Date(input.dueDate), assigneeId: owner.id, createdById: auth.userId, category: "documents", priority: "HIGH", notes: match.href } });
    const value = { taskId: task.id, ownerId: owner.id, ownerName: owner.fullName, dueDate: input.dueDate, createdAt: new Date().toISOString() };
    await tx.setting.update({ where: { key }, data: { value } }); await tx.auditLog.create({ data: { userId: auth.userId, action: "CREATE", module: "tasks", recordId: task.id, description: "Created missing-document follow-up" } }); return value;
  });
}
