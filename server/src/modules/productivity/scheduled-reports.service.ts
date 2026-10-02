import { randomUUID } from "node:crypto";
import type { ReportSchedule } from "@prisma/client";
import type { AuthContext } from "@/types/express";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { hasPermission, escapeHtml } from "@/lib/security";
import { loadAuthContext } from "@/middleware/auth";
import { ApiError } from "@/utils/apiError";
import { getBrandingContext } from "@/services/branding";
import { renderHtmlToPdf } from "@/services/pdf";
import { tableReportPdf } from "@/modules/pdf/templates";
import { withLang, L } from "@/services/lang";
import * as reports from "@/modules/reports/reports.service";
import { scheduleSchema } from "./productivity.schemas";
import type { z } from "zod";
import { requireAccess } from "./productivity.service";
import { logger } from "@/lib/logger";
import { restoringSystem } from "@/modules/maintenance/backups.service";
import { actionLabel, moduleLabel } from "@/constants/auditLabels";

export function assertReportAccess(auth: AuthContext, kind: string) {
  requireAccess(auth, "reports.view"); requireAccess(auth, "reports.export");
  const permission = { employees: "employees.view", payments: "payments.view", activity: "auditLogs.view" }[kind];
  if (permission) requireAccess(auth, permission);
  else if (kind !== "documents" || !["employees.view", "employeeDocuments.view", "companyDocuments.view"].some(p => hasPermission(auth, p))) throw ApiError.forbidden("You cannot export this report.");
}
export function reportSourcePermissions(auth: AuthContext, kind: string) {
  const keys = kind === "documents" ? ["employees.view", "employeeDocuments.view", "companyDocuments.view"] : [{ employees: "employees.view", payments: "payments.view", activity: "auditLogs.view" }[kind] || "auditLogs.view"];
  return keys.filter(key => hasPermission(auth, key));
}
export function dueSlot(schedule: Pick<ReportSchedule, "frequency" | "time" | "weekday" | "monthday">, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const p = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  if (`${p.hour}:${p.minute}` < schedule.time) return null;
  if (schedule.frequency === "weekly" && new Date(`${date}T12:00:00Z`).getUTCDay() !== schedule.weekday) return null;
  if (schedule.frequency === "monthly" && Number(p.day) !== schedule.monthday) return null;
  return date;
}
export async function listSchedules(auth: AuthContext) {
  requireAccess(auth, "reports.view");
  const rows = await prisma.reportSchedule.findMany({ where: { userId: auth.userId }, include: { runs: { orderBy: { createdAt: "desc" }, take: 10 } }, orderBy: { createdAt: "desc" } });
  return rows.map(r => ({ ...r, runs: r.runs.map(({ fileId: _fileId, ...run }) => run) }));
}
export async function createSchedule(auth: AuthContext, input: z.infer<typeof scheduleSchema>) {
  assertReportAccess(auth, input.kind);
  if (await prisma.reportSchedule.count({ where: { userId: auth.userId } }) >= 20) throw ApiError.badRequest("Maximum 20 scheduled reports per user.");
  const row = await prisma.reportSchedule.create({ data: { ...input, userId: auth.userId } });
  await prisma.auditLog.create({ data: { userId: auth.userId, action: "CREATE", module: "reports", recordId: row.id, description: "Created report schedule" } });
  return row;
}
export async function ownedSchedule(auth: AuthContext, id: string) {
  const row = await prisma.reportSchedule.findFirst({ where: { id, userId: auth.userId } });
  if (!row) throw ApiError.notFound("Schedule not found.");
  assertReportAccess(auth, row.kind); return row;
}
export async function buildScheduledPdf(kind: string, auth: AuthContext, language: "ar" | "en") {
  assertReportAccess(auth, kind);
  return withLang(language, async () => {
    let rows: Record<string, any>[], fields: [string, string, string][];
    if (kind === "employees") { rows = await reports.employeesReport({ format: "pdf" }); fields = [["employeeNumber", "الرقم الوظيفي", "Employee #"], [language === "ar" ? "fullName" : "fullNameEn", "الموظف", "Employee"], ["branch", "الفرع", "Branch"], ["employmentStatus", "الحالة", "Status"], ["iqamaExpiryDate", "انتهاء الإقامة", "Iqama expiry"]]; }
    else if (kind === "documents") { rows = await reports.documentsReport({ format: "pdf" }, auth); fields = [[language === "ar" ? "kindAr" : "kindEn", "نوع الوثيقة", "Document"], [language === "ar" ? "owner" : "ownerEn", "المالك", "Owner"], ["documentNumber", "الرقم", "Number"], ["expiryDate", "الانتهاء", "Expiry"], ["status", "الحالة", "Status"]]; }
    else if (kind === "payments") { rows = await reports.paymentsReport({ format: "pdf" }); fields = [["paymentNumber", "السند", "Voucher"], ["paymentDate", "التاريخ", "Date"], ["employee", "المستفيد", "Beneficiary"], ["total", "الإجمالي", "Total"]]; }
    else { rows = await reports.activityReport({ format: "pdf" }); fields = [["date", "التاريخ", "Date"], ["user", "المستخدم", "User"], ["action", "الإجراء", "Action"], ["module", "القسم", "Module"], ["description", "التفاصيل", "Details"]]; }
    const titles: Record<string, [string, string]> = { employees: ["تقرير الموظفين المجدول", "Scheduled employee report"], documents: ["تقرير المستندات المجدول", "Scheduled document report"], payments: ["تقرير المدفوعات المجدول", "Scheduled payment report"], activity: ["تقرير العمليات المجدول", "Scheduled activity report"] };
    const statuses: Record<string, [string, string]> = { ACTIVE: ["نشط", "Active"], INACTIVE: ["غير نشط", "Inactive"], ON_LEAVE: ["إجازة", "On leave"], TERMINATED: ["منتهي التعاقد", "Terminated"], VALID: ["ساري", "Valid"], EXPIRING_SOON: ["قارب الانتهاء", "Expiring soon"], EXPIRED: ["منتهي", "Expired"] };
    const columns = fields.map(([key, ar, en]) => ({ header: ar, subHeader: en, render: (row: Record<string, any>) => {
      const value = row[key];
      if ((key === "status" || key === "employmentStatus") && statuses[value]) return escapeHtml(L(...statuses[value]));
      if (key === "action") return escapeHtml(actionLabel(value));
      if (key === "module") return escapeHtml(moduleLabel(value));
      return escapeHtml(value instanceof Date ? value.toISOString().slice(0, 10) : language === "en" && row[`${key}En`] ? row[`${key}En`] : value ?? "—");
    } }));
    const branding = await getBrandingContext();
    return renderHtmlToPdf(tableReportPdf(titles[kind][0], columns, rows, branding, { titleEn: titles[kind][1] }), { footerLabel: L(...titles[kind]) });
  });
}
export async function generateReport(schedule: ReportSchedule, slot: string) {
  let run;
  try { run = await prisma.generatedReport.create({ data: { scheduleId: schedule.id, slot, status: "RUNNING" } }); }
  catch (err) { if ((err as any).code === "P2002") return null; throw err; }
  let storedName: string | undefined, fileId: string | undefined;
  try {
    const auth = await loadAuthContext(schedule.userId);
    if (!auth) throw ApiError.forbidden("Account inactive.");
    const bytes = await buildScheduledPdf(schedule.kind, auth, schedule.language === "en" ? "en" : "ar");
    if (bytes.length > 25 * 1024 * 1024) throw ApiError.badRequest("Report exceeds the 25 MB attachment limit.");
    const permissions = reportSourcePermissions(auth, schedule.kind);
    const fresh = await loadAuthContext(schedule.userId); if (!fresh) throw ApiError.forbidden(); assertReportAccess(fresh, schedule.kind);
    for (const key of permissions) requireAccess(fresh, key);
    const stored = await storage.save(bytes, `${schedule.kind}.pdf`); storedName = stored.storedName;
    const file = await prisma.file.create({ data: { storedName, size: bytes.length, originalName: `${schedule.kind}-${run.createdAt.toISOString().slice(0, 10)}.pdf`, mimeType: "application/pdf", module: "scheduled-report", relatedId: JSON.stringify({ scheduleId: schedule.id, permissions }), uploadedById: schedule.userId } }); fileId = file.id;
    await prisma.generatedReport.update({ where: { id: run.id }, data: { status: "READY", fileId, completedAt: new Date() } });
    await prisma.auditLog.create({ data: { userId: schedule.userId, action: "EXPORT", module: "reports", recordId: run.id, description: `Scheduled ${schedule.kind} PDF generated` } });
    try {
      const lease = await prisma.maintenanceLease.findUnique({ where: { id: "backup" } });
      if (!lease || lease.expiresAt <= new Date()) {
        const old = await prisma.generatedReport.findMany({ where: { scheduleId: schedule.id, status: { not: "RUNNING" } }, orderBy: { createdAt: "desc" }, skip: 60 });
        for (const previous of old) {
          // Each completed backup owns encrypted copies of report attachments.
          if (previous.fileId) { const attachment = await prisma.file.findUnique({ where: { id: previous.fileId } }); if (attachment) { await storage.delete(attachment.storedName); await prisma.file.delete({ where: { id: attachment.id } }); } }
          await prisma.generatedReport.deleteMany({ where: { id: previous.id } });
        }
      }
    } catch (err) { logger.warn({ err, scheduleId: schedule.id }, "Report retention cleanup failed"); }
  } catch (err) {
    if (storedName) await storage.delete(storedName).catch(() => undefined);
    if (fileId) await prisma.file.deleteMany({ where: { id: fileId } }).catch(() => undefined);
    await prisma.generatedReport.update({ where: { id: run.id }, data: { status: "FAILED", fileId: null, error: "تعذر تجهيز التقرير. راجع الصلاحيات والتخزين. / Report generation failed; check permissions and storage.", completedAt: new Date() } });
    logger.error({ err, scheduleId: schedule.id }, "Scheduled report failed");
  }
  return prisma.generatedReport.findUnique({ where: { id: run.id } });
}
let running = false;
export async function runScheduledReports() {
  if (running || restoringSystem) return;
  running = true;
  const token = randomUUID(); let acquired = false;
  try {
    try { await prisma.maintenanceLease.create({ data: { id: "reports", token, expiresAt: new Date(Date.now() + 30 * 60_000) } }); acquired = true; }
    catch (err) { if ((err as any).code !== "P2002") throw err; acquired = (await prisma.maintenanceLease.updateMany({ where: { id: "reports", expiresAt: { lt: new Date() } }, data: { token, expiresAt: new Date(Date.now() + 30 * 60_000) } })).count === 1; }
    if (!acquired) return;
    await prisma.generatedReport.updateMany({ where: { status: "RUNNING", createdAt: { lt: new Date(Date.now() - 30 * 60_000) } }, data: { status: "FAILED", error: "انقطع تشغيل التقرير. / Report execution interrupted.", completedAt: new Date() } });
    for (const schedule of await prisma.reportSchedule.findMany({ where: { enabled: true } })) {
      if (restoringSystem) break;
      await prisma.maintenanceLease.updateMany({ where: { id: "reports", token }, data: { expiresAt: new Date(Date.now() + 30 * 60_000) } });
      const slot = dueSlot(schedule);
      if (slot && !await prisma.generatedReport.findUnique({ where: { scheduleId_slot: { scheduleId: schedule.id, slot } } })) await generateReport(schedule, slot);
    }
  } finally { if (acquired) await prisma.maintenanceLease.deleteMany({ where: { id: "reports", token } }); running = false; }
}
