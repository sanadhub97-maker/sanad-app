import { prisma } from "@/lib/prisma";
import { hasPermission, canViewSource } from "@/lib/security";
import { ApiError } from "@/utils/apiError";
import type { AuthContext } from "@/types/express";
import { getTrackableItems } from "@/services/expiringItems";
import { getExpirationRules } from "@/services/settingsStore";
import { computeStatus } from "@/services/expiration";

/** The current alerts on the notifications page: documents ending or ended, and overdue tasks. */
export async function alertCenter(auth: AuthContext) {
  const [items, rules, tasks, acknowledgements] = await Promise.all([
    getTrackableItems(),
    getExpirationRules(),
    hasPermission(auth, "tasks.view")
      ? prisma.dailyTask.findMany({ where: { deletedAt: null, done: false, date: { lt: new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" }) + "T00:00:00Z") } }, orderBy: { date: "asc" }, take: 1000 })
      : [],
    prisma.alertAcknowledgement.findMany({ where: { userId: auth.userId } }),
  ]);
  const acknowledged = new Set(acknowledgements.map((a) => a.key));
  const alerts = items
    .filter((i) => canViewSource(auth, i.sourceType) && computeStatus(i.expiryDate, rules) !== "VALID")
    .map((i) => {
      const status = computeStatus(i.expiryDate, rules);
      const key = `${i.key}:${i.expiryDate.toISOString()}`;
      return {
        key,
        // A car carries three dates: say which one it is.
        title: i.sourceType === "VEHICLE" ? `${i.kindAr} — ${i.labelAr}` : i.labelAr,
        titleEn: i.sourceType === "VEHICLE" ? `${i.kindEn} — ${i.label}` : i.label,
        due: i.expiryDate,
        severity: status === "EXPIRED" ? "CRITICAL" : "WARNING",
        category: "document",
        status,
        acknowledged: acknowledged.has(key),
        href: i.sourceType === "VEHICLE" ? `/vehicles?focus=${i.recordId}` : i.sourceType === "COMPANY_DOCUMENT" ? `/company-documents/${i.recordId}` : i.sourceType === "EMPLOYEE_DOCUMENT" ? `/employee-documents/${i.employeeId}/${i.recordId}` : `/employees/${i.employeeId}`,
      };
    });
  const overdue = tasks.map((t) => {
    const key = `task:${t.id}:${t.date.toISOString()}`;
    return { key, title: t.title, titleEn: t.title, due: t.date, severity: "WARNING", category: "task", status: "OVERDUE", acknowledged: acknowledged.has(key), href: `/daily-tasks?date=${t.date.toISOString().slice(0, 10)}` };
  });
  return [...alerts, ...overdue].sort((a, b) => a.due.getTime() - b.due.getTime());
}

/** Marks an alert as followed up (or not) for this user. */
export async function acknowledge(auth: AuthContext, key: string, done: boolean) {
  if (!(await alertCenter(auth)).some((a) => a.key === key)) throw ApiError.notFound("Alert not found.");
  if (done) await prisma.alertAcknowledgement.upsert({ where: { userId_key: { userId: auth.userId, key } }, create: { userId: auth.userId, key }, update: { acknowledgedAt: new Date() } });
  else await prisma.alertAcknowledgement.deleteMany({ where: { userId: auth.userId, key } });
}
