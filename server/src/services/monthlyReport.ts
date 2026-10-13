import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { L, withLang } from "@/services/lang";
import { sendWhatsapp } from "@/services/whatsapp";
import { sendMail } from "@/services/email";
import { getActiveRecipients, normalizePhone } from "@/services/whatsappRecipients";
import { getWhatsappScheduleSetting } from "@/services/settingsStore";
import { getBrandingContext } from "@/services/branding";
import { getTrackableItems } from "@/services/expiringItems";
import { paymentCategoryLabel } from "@/constants/paymentCategories";

/* The monthly report: on the first days of a month, last month in one
   message — payments against the month before, the documents that ended and
   what ends next, the tasks done, the violations — on WhatsApp to the
   summary's numbers and by email to the admins. Each goes once a month. */

const HOUR = 60 * 60_000;
const RIYADH = "Asia/Riyadh";
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const CROWN = "✦ ━━━━━━━ ❖ ━━━━━━━ ✦";
const THIN = "┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈";
const ADMIN_ROLES = ["Super Admin", "Admin"];

/** Midnight Riyadh at the start of the month `offset` months from the one `at` falls in. */
function monthStart(at: Date, offset = 0) {
  const r = new Date(at.getTime() + 3 * HOUR);
  return new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + offset, 1) - 3 * HOUR);
}
const monthKey = (start: Date) => new Date(start.getTime() + 3 * HOUR).toISOString().slice(0, 7);
const riyadhDate = (at: Date) => new Date(at.getTime() + 3 * HOUR).getUTCDate();

export interface MonthlyFigures {
  month: string;
  monthName: string;
  company: string;
  payments: { total: number; count: number; previous: number; top: { label: string; total: number }[] };
  documents: { endedInMonth: number; expiredNow: number; endingNextMonth: number; tracked: number };
  tasks: { total: number; done: number };
  violations: { count: number; amount: number };
  employees: { active: number; joined: number };
}

/** Last month's figures, as of `now`. */
export async function monthlyFigures(now = new Date()): Promise<MonthlyFigures> {
  const from = monthStart(now, -1);
  const to = monthStart(now, 0);
  const before = monthStart(now, -2);
  const next = monthStart(now, 1);
  const [paid, prevPaid, byCat, tasks, tasksDone, vio, items, active, joined, branding] = await Promise.all([
    prisma.payment.aggregate({ where: { deletedAt: null, paymentDate: { gte: from, lt: to } }, _sum: { total: true }, _count: true }),
    prisma.payment.aggregate({ where: { deletedAt: null, paymentDate: { gte: before, lt: from } }, _sum: { total: true } }),
    prisma.payment.groupBy({ by: ["category"], where: { deletedAt: null, paymentDate: { gte: from, lt: to } }, _sum: { total: true }, orderBy: { _sum: { total: "desc" } }, take: 3 }),
    prisma.dailyTask.count({ where: { deletedAt: null, date: { gte: from, lt: to } } }),
    prisma.dailyTask.count({ where: { deletedAt: null, date: { gte: from, lt: to }, done: true } }),
    prisma.violation.aggregate({ where: { deletedAt: null, date: { gte: from, lt: to } }, _sum: { amount: true }, _count: true }),
    getTrackableItems(),
    prisma.employee.count({ where: { deletedAt: null, employmentStatus: "ACTIVE" } }),
    prisma.employee.count({ where: { deletedAt: null, createdAt: { gte: from, lt: to } } }),
    getBrandingContext(),
  ]);
  const company = L(branding.company?.nameAr || branding.company?.nameEn || "", branding.company?.nameEn || branding.company?.nameAr || "");
  const t = (d: Date) => d.getTime();
  return {
    month: monthKey(from),
    monthName: new Date(from.getTime() + 3 * HOUR + HOUR).toLocaleDateString(L("ar-EG-u-nu-latn", "en-GB"), { timeZone: RIYADH, month: "long", year: "numeric" }),
    company,
    payments: {
      total: Number(paid._sum.total ?? 0),
      count: paid._count,
      previous: Number(prevPaid._sum.total ?? 0),
      top: byCat.map((c) => ({ label: paymentCategoryLabel(c.category), total: Number(c._sum.total ?? 0) })),
    },
    documents: {
      endedInMonth: items.filter((i) => t(i.expiryDate) >= t(from) && t(i.expiryDate) < t(to)).length,
      expiredNow: items.filter((i) => t(i.expiryDate) < t(now)).length,
      endingNextMonth: items.filter((i) => t(i.expiryDate) >= t(to) && t(i.expiryDate) < t(next)).length,
      tracked: items.length,
    },
    tasks: { total: tasks, done: tasksDone },
    violations: { count: vio._count, amount: Number(vio._sum.amount ?? 0) },
    employees: { active, joined },
  };
}

/** The report as one WhatsApp message, in the summary's language. */
export function monthlyText(f: MonthlyFigures) {
  const cur = L("ر.س", "SAR");
  const change = f.payments.previous > 0 ? Math.round(((f.payments.total - f.payments.previous) / f.payments.previous) * 100) : null;
  const trend = change === null ? "" : change === 0 ? L(" · مثل الشهر السابق", " · same as the month before") : change > 0 ? L(` · ▲ ${change}% عن الشهر السابق`, ` · ▲ ${change}% on the month before`) : L(` · ▼ ${-change}% عن الشهر السابق`, ` · ▼ ${-change}% on the month before`);
  const pct = f.tasks.total ? Math.round((f.tasks.done / f.tasks.total) * 100) : 0;
  return [
    CROWN,
    `📊 *${L("التقرير الشهري", "Monthly report")}*`,
    `🏛️ *${f.company}*`,
    `🗓️ _${L(`عن شهر ${f.monthName}`, `For ${f.monthName}`)}_`,
    CROWN,
    "",
    `💰 *${L("المدفوعات", "Payments")}*`,
    `> ${L("الإجمالي", "Total")} ┈┈ *${money(f.payments.total)} ${cur}*${trend}`,
    `> ${L("عدد الدفعات", "Payments")} ┈┈ *${f.payments.count}*`,
    ...f.payments.top.map((c) => `- ${c.label}: ${money(c.total)} ${cur}`),
    "",
    `📄 *${L("الوثائق", "Documents")}*`,
    `> 🔴 ${L("انتهت خلال الشهر", "Ended during the month")} ┈┈ *${f.documents.endedInMonth}*`,
    `> 🔴 ${L("منتهية الآن", "Expired now")} ┈┈ *${f.documents.expiredNow}*`,
    `> 🔵 ${L("تنتهي الشهر الحالي", "Ending this month")} ┈┈ *${f.documents.endingNextMonth}*`,
    "",
    `📌 *${L("المهام", "Tasks")}*`,
    `> ${L(`أُنجز ${f.tasks.done} من ${f.tasks.total} مهمة`, `${f.tasks.done} of ${f.tasks.total} done`)} ┈┈ *${pct}%*`,
    "",
    `⚖️ *${L("المخالفات", "Violations")}*`,
    `> ${L("مخالفات جديدة", "New violations")} ┈┈ *${f.violations.count}*${f.violations.amount ? `  ·  ${money(f.violations.amount)} ${cur}` : ""}`,
    "",
    `👥 *${L("الموظفون", "Employees")}*`,
    `> ${L("على رأس العمل", "Active")} ┈┈ *${f.employees.active}*${f.employees.joined ? L(`  ·  أُضيف ${f.employees.joined} خلال الشهر`, `  ·  ${f.employees.joined} added`) : ""}`,
    "",
    THIN,
    `🔱 *SanaD* · _${L("إدارة الوثائق والتراخيص", "Documents & Licenses")}_`,
  ].join("\n");
}

/** The same report for email. */
function monthlyHtml(f: MonthlyFigures) {
  const row = (k: string, v: string) => `<tr><td style="padding:7px 0;color:#7a6c55">${k}</td><td style="padding:7px 0;text-align:left;font-weight:700">${v}</td></tr>`;
  const sec = (title: string, rows: string) => `<h3 style="margin:18px 0 6px;color:#8a6a35;font-size:16px">${title}</h3><table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>`;
  return `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:560px;margin:auto;color:#1f1a10;line-height:1.7">
<div style="border-bottom:2px solid #c9a464;padding-bottom:10px"><div style="color:#8a6a35;font-size:13px">التقرير الشهري</div><h2 style="margin:2px 0;font-size:22px">${f.company}</h2><div style="color:#7a6c55">عن شهر ${f.monthName}</div></div>
${sec("المدفوعات", row("الإجمالي", `${money(f.payments.total)} ر.س`) + row("عدد الدفعات", String(f.payments.count)) + row("الشهر السابق", `${money(f.payments.previous)} ر.س`) + f.payments.top.map((c) => row(c.label, `${money(c.total)} ر.س`)).join(""))}
${sec("الوثائق", row("انتهت خلال الشهر", String(f.documents.endedInMonth)) + row("منتهية الآن", String(f.documents.expiredNow)) + row("تنتهي الشهر الحالي", String(f.documents.endingNextMonth)))}
${sec("المهام", row("المنجزة", `${f.tasks.done} من ${f.tasks.total}`))}
${sec("المخالفات", row("مخالفات جديدة", String(f.violations.count)) + row("قيمتها", `${money(f.violations.amount)} ر.س`))}
${sec("الموظفون", row("على رأس العمل", String(f.employees.active)) + row("أُضيفوا خلال الشهر", String(f.employees.joined)))}
<p style="margin-top:22px;color:#a89a80;font-size:12px">نظام سند · إدارة الوثائق والتراخيص</p></div>`;
}

/** Sends last month's report if it has not gone out yet; only in the first three days of a month. */
export async function runMonthlyReport(now = new Date()) {
  if (riyadhDate(now) > 3) return { sent: 0 };
  const { language } = await getWhatsappScheduleSetting();
  const lang = language === "en" ? "en" : "ar";
  const figures = await withLang(lang, () => monthlyFigures(now));
  const text = withLang(lang, () => monthlyText(figures));
  let sent = 0;

  const wa = await prisma.whatsappSettings.findUnique({ where: { id: 1 }, select: { enabled: true } });
  const phones = wa?.enabled ? [...new Set((await getActiveRecipients()).map((r) => normalizePhone(r.phone)).filter(Boolean))] : [];
  for (const phone of phones) {
    const dedupeKey = `monthly:${figures.month}:WHATSAPP:${phone}`;
    if ((await prisma.notificationLog.findUnique({ where: { dedupeKey } }))?.status === "SENT") continue;
    const meta = { recipient: phone, message: text, templateCode: "MONTHLY" };
    try {
      const result = await sendWhatsapp(phone, text);
      if (!result.sent) throw new Error(result.reason ?? "Send failed");
      await prisma.notificationLog.upsert({ where: { dedupeKey }, update: { ...meta, status: "SENT", sentAt: new Date(), errorMessage: null }, create: { ...meta, dedupeKey, channel: "WHATSAPP", status: "SENT", sentAt: new Date() } });
      sent++;
    } catch (err) {
      logger.error({ err, dedupeKey }, "Monthly report WhatsApp failed");
      await prisma.notificationLog.upsert({ where: { dedupeKey }, update: { ...meta, status: "FAILED", errorMessage: (err as Error).message }, create: { ...meta, dedupeKey, channel: "WHATSAPP", status: "FAILED", errorMessage: (err as Error).message } }).catch(() => undefined);
    }
  }

  const admins = await prisma.user.findMany({ where: { deletedAt: null, isActive: true, userRoles: { some: { role: { name: { in: ADMIN_ROLES } } } } }, select: { id: true, email: true } });
  const html = withLang("ar", () => monthlyHtml(withLang("ar", () => figures)));
  for (const a of admins) {
    if (!a.email) continue;
    const dedupeKey = `monthly:${figures.month}:EMAIL:${a.id}`;
    if ((await prisma.notificationLog.findUnique({ where: { dedupeKey } }))?.status === "SENT") continue;
    const result = await sendMail({ to: a.email, subject: `التقرير الشهري — ${figures.monthName}`, html }).catch((err) => ({ sent: false, reason: (err as Error).message }));
    // Not set up is not a failure to retry every morning: it is noted as skipped.
    const status = result.sent ? "SENT" : result.reason === "EMAIL_NOT_CONFIGURED" ? "SKIPPED" : "FAILED";
    await prisma.notificationLog.upsert({ where: { dedupeKey }, update: { status, sentAt: result.sent ? new Date() : null, errorMessage: result.reason ?? null }, create: { dedupeKey, channel: "EMAIL", status, recipient: a.email, templateCode: "MONTHLY", sentAt: result.sent ? new Date() : null, errorMessage: result.reason ?? null } }).catch(() => undefined);
    if (result.sent) sent++;
  }
  return { sent };
}
