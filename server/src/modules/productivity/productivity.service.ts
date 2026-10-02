import { prisma } from "@/lib/prisma";
import { hasPermission, canViewSource } from "@/lib/security";
import { ApiError } from "@/utils/apiError";
import type { AuthContext } from "@/types/express";
import { getTrackableItems } from "@/services/expiringItems";
import { getExpirationRules } from "@/services/settingsStore";
import { computeStatus } from "@/services/expiration";
import { ONBOARDING_STEPS, bulkSchema } from "./productivity.schemas";
import type { z } from "zod";

export function requireAccess(auth: AuthContext, permission: string) {
  if (!hasPermission(auth, permission)) throw ApiError.forbidden(`Missing permission: ${permission}`);
}
export async function alertCenter(auth: AuthContext) {
  const [items, rules, tasks, acknowledgements] = await Promise.all([
    getTrackableItems(), getExpirationRules(), hasPermission(auth, "tasks.view") ? prisma.dailyTask.findMany({ where: { deletedAt: null, done: false, date: { lt: new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" }) + "T00:00:00Z") } }, orderBy: { date: "asc" }, take: 1000 }) : [],
    prisma.alertAcknowledgement.findMany({ where: { userId: auth.userId } }),
  ]);
  const acknowledged = new Set(acknowledgements.map(a => a.key));
  const alerts = items.filter(i => canViewSource(auth, i.sourceType) && computeStatus(i.expiryDate, rules) !== "VALID").map(i => {
    const status = computeStatus(i.expiryDate, rules), key = `${i.key}:${i.expiryDate.toISOString()}`;
    return { key, title: i.labelAr, titleEn: i.label, due: i.expiryDate, severity: status === "EXPIRED" ? "CRITICAL" : "WARNING", category: "document", status,
      acknowledged: acknowledged.has(key), href: i.sourceType === "COMPANY_DOCUMENT" ? `/company-documents/${i.recordId}` : i.sourceType === "EMPLOYEE_DOCUMENT" ? `/employee-documents/${i.employeeId}/${i.recordId}` : `/employees/${i.employeeId}` };
  });
  return [...alerts, ...tasks.map(t => { const key = `task:${t.id}:${t.date.toISOString()}`; return { key, title: t.title, titleEn: t.title, due: t.date, severity: "WARNING", category: "task", status: "OVERDUE", acknowledged: acknowledged.has(key), href: `/daily-tasks?date=${t.date.toISOString().slice(0, 10)}` }; })].sort((a, b) => a.due.getTime() - b.due.getTime());
}
export async function acknowledge(auth: AuthContext, key: string, done: boolean) {
  if (!(await alertCenter(auth)).some(a => a.key === key)) throw ApiError.notFound("Alert not found.");
  if (done) await prisma.alertAcknowledgement.upsert({ where: { userId_key: { userId: auth.userId, key } }, create: { userId: auth.userId, key }, update: { acknowledgedAt: new Date() } });
  else await prisma.alertAcknowledgement.deleteMany({ where: { userId: auth.userId, key } });
}

export type QualityIssue = { key: string; severity: string; title: string; titleEn: string; href: string; records: { id: string; name: string; href: string }[] };
export function detectDuplicates(rows: { id: string; name: string; href: string; values: Record<string, string | null> }[]): QualityIssue[] {
  const groups = new Map<string, typeof rows>();
  for (const row of rows) for (const [field, value] of Object.entries(row.values)) {
    const normalized = value?.normalize("NFKC").trim().toLowerCase().replace(/[\s\-]/g, "");
    if (!normalized) continue;
    const key = `${field}:${normalized}`;
    const group = groups.get(key); if (group) group.push(row); else groups.set(key, [row]);
  }
  return [...groups].filter(([, group]) => new Set(group.map(r => r.id)).size > 1).map(([key, group]) => ({ key, severity: "WARNING", title: `بيانات متكررة (${key.split(":")[0]}): ${group.map(r => r.name).join("، ")}`, titleEn: `Duplicate ${key.split(":")[0]}: ${group.map(r => r.name).join(", ")}`, href: group[0].href, records: group.map(({ id, name, href }) => ({ id, name, href })) }));
}
export async function dataQuality(auth: AuthContext) {
  const [employees, companyDocuments, employeeDocuments] = await Promise.all([
    hasPermission(auth, "employees.view") ? prisma.employee.findMany({ where: { deletedAt: null }, take: 10001 }) : [],
    hasPermission(auth, "companyDocuments.view") ? prisma.companyDocument.findMany({ where: { deletedAt: null }, take: 10001 }) : [],
    hasPermission(auth, "employees.view") && hasPermission(auth, "employeeDocuments.view") ? prisma.employeeDocument.findMany({ where: { deletedAt: null, employee: { deletedAt: null } }, include: { employee: { select: { fullNameAr: true } } }, take: 10001 }) : [],
  ]);
  if ([employees, companyDocuments, employeeDocuments].some(rows => rows.length > 10000)) throw ApiError.badRequest("Quality scan supports up to 10,000 records per category.");
  const issues: QualityIssue[] = detectDuplicates(employees.map(e => ({ id: e.id, name: e.fullNameAr, href: `/employees/${e.id}`, values: { iqama: e.iqamaNumber, passport: e.passportNumber, email: e.email, mobile: e.mobile } })));
  issues.push(...detectDuplicates(companyDocuments.map(d => ({ id: d.id, name: d.name, href: `/company-documents/${d.id}`, values: { [`${d.category} number`]: d.documentNumber || d.licenseNumber } }))));
  issues.push(...detectDuplicates(employeeDocuments.map(d => ({ id: d.id, name: `${d.employee.fullNameAr} — ${d.name || d.type}`, href: `/employee-documents/${d.employeeId}/${d.id}`, values: { [`${d.type} number`]: d.documentNumber } }))));
  const add = (key: string, title: string, titleEn: string, id: string, name: string, href: string) => issues.push({ key, title, titleEn, severity: "INFO", href, records: [{ id, name, href }] });
  for (const e of employees.filter(e => e.employmentStatus === "ACTIVE")) {
    const missing = [!e.branchId && "الفرع / branch", !e.jobTitle && "الوظيفة / job", !e.mobile && "الجوال / mobile", !e.joiningDate && "تاريخ الالتحاق / joining date", e.onSponsorship == null && "الكفالة / sponsorship", e.onSponsorship === true && (!e.iqamaNumber || !e.iqamaExpiryDate) && "الإقامة / iqama"].filter(Boolean);
    if (missing.length) add(`employee:${e.id}`, `${e.fullNameAr}: بيانات ناقصة — ${missing.join("، ")}`, `${e.fullNameEn || e.fullNameAr}: missing — ${missing.join(", ")}`, e.id, e.fullNameAr, `/employees/${e.id}`);
    if ((e.iqamaIssueDate && e.iqamaExpiryDate && e.iqamaIssueDate > e.iqamaExpiryDate) || (e.passportIssueDate && e.passportExpiryDate && e.passportIssueDate > e.passportExpiryDate)) add(`dates:${e.id}`, `${e.fullNameAr}: تاريخ إصدار بعد الانتهاء`, `${e.fullNameAr}: issue date after expiry`, e.id, e.fullNameAr, `/employees/${e.id}`);
  }
  for (const d of companyDocuments) if (!d.expiryDate || !d.fileId || !(d.documentNumber || d.licenseNumber)) add(`document:${d.id}`, `${d.name}: رقم أو تاريخ انتهاء أو مرفق غير مسجل`, `${d.name}: number, expiry or attachment missing`, d.id, d.name, `/company-documents/${d.id}`);
  return { issues, scanned: employees.length + companyDocuments.length + employeeDocuments.length, checkedAt: new Date() };
}

export async function bulkUpdate(auth: AuthContext, input: z.infer<typeof bulkSchema>) {
  requireAccess(auth, "employees.view"); requireAccess(auth, "employees.edit");
  return prisma.$transaction(async tx => {
    const rows = await tx.employee.findMany({ where: { id: { in: input.ids }, deletedAt: null }, select: { id: true, employeeNumber: true } });
    if (rows.length !== input.ids.length) throw ApiError.badRequest("Some selected employees no longer exist. Refresh the list.");
    if (input.changes.branchId && !await tx.branch.findFirst({ where: { id: input.changes.branchId, deletedAt: null, status: "ACTIVE" } })) throw ApiError.badRequest("Select an active branch.");
    const result = await tx.employee.updateMany({ where: { id: { in: input.ids }, deletedAt: null }, data: { ...input.changes, ...(input.changes.department ? { departmentEn: null } : {}) } });
    await tx.auditLog.createMany({ data: rows.map(e => ({ userId: auth.userId, action: "UPDATE" as const, module: "employees", recordId: e.id, description: `Bulk update ${e.employeeNumber}: ${JSON.stringify(input.changes)}` })) });
    return result;
  }, { isolationLevel: "Serializable" });
}

export async function onboarding(auth: AuthContext, q = "", page = 1) {
  requireAccess(auth, "employees.view");
  const where = { deletedAt: null, employmentStatus: "ACTIVE" as const, ...(q ? { OR: [{ fullNameAr: { contains: q, mode: "insensitive" as const } }, { employeeNumber: { contains: q, mode: "insensitive" as const } }] } : {}) };
  const [rows, total] = await Promise.all([prisma.employee.findMany({ where, include: { onboarding: true, ...(hasPermission(auth, "employeeDocuments.view") ? { documents: { where: { deletedAt: null, type: "EMPLOYMENT_CONTRACT" as const } } } : {}) }, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 20 }), prisma.employee.count({ where })]);
  return { total, page, rows: rows.map(e => {
    const manual = (e.onboarding?.steps ?? {}) as Record<string, boolean>;
    const auto = [{ key: "profile", title: "البيانات الأساسية", titleEn: "Basic information", done: Boolean(e.branchId && e.jobTitle && e.mobile && e.joiningDate), automatic: true },
      ...(e.onSponsorship === true ? [{ key: "iqama", title: "الإقامة ومرفقها", titleEn: "Iqama and attachment", done: Boolean(e.iqamaNumber && e.iqamaExpiryDate && e.iqamaFileId), automatic: true }] : []),
      ...(hasPermission(auth, "employeeDocuments.view") ? [{ key: "contract", title: "عقد العمل ومرفقه", titleEn: "Employment contract and attachment", done: Boolean((e as any).documents?.some((d: any) => d.fileId)), automatic: true }] : [])];
    const labels = { orientation: ["التعريف بالشركة", "Orientation"], equipment: ["تسليم العهد", "Equipment"], account: ["تجهيز حساب العمل", "Work account"], training: ["التدريب الأولي", "Initial training"] };
    const steps = [...auto, ...ONBOARDING_STEPS.map(key => ({ key, title: labels[key][0], titleEn: labels[key][1], done: manual[key] === true, automatic: false }))];
    return { id: e.id, name: e.fullNameAr, nameEn: e.fullNameEn, number: e.employeeNumber, steps, completed: steps.filter(s => s.done).length, total: steps.length };
  }) };
}
export async function setOnboarding(auth: AuthContext, employeeId: string, step: string, done: boolean) {
  requireAccess(auth, "employees.view"); requireAccess(auth, "employees.edit");
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Employee" WHERE id = ${employeeId} FOR UPDATE`;
    if (!await tx.employee.findFirst({ where: { id: employeeId, deletedAt: null } })) throw ApiError.notFound("Employee not found.");
    const previous = await tx.employeeOnboarding.findUnique({ where: { employeeId } });
    const steps = { ...(previous?.steps as Record<string, boolean> ?? {}), [step]: done };
    await tx.employeeOnboarding.upsert({ where: { employeeId }, create: { employeeId, steps }, update: { steps } });
    await tx.auditLog.create({ data: { userId: auth.userId, action: "UPDATE", module: "employees", recordId: employeeId, description: `Onboarding ${step}: ${done ? "completed" : "pending"}` } });
  });
}
