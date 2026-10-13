import { getTrackableItems, type TrackableItem } from "@/services/expiringItems";
import { daysUntil } from "@/services/expiration";
import { getBrandingContext } from "@/services/branding";
import { getExpirationRules, getWhatsappScheduleSetting } from "@/services/settingsStore";
import { whatsappEligible } from "@/services/whatsappDigest";
import { openTasks } from "@/services/openTasks";
import { L, isEn } from "@/services/lang";
import { alertContext, daysAr, type AlertContext, type TaskLine } from "@/services/whatsappTemplates";

/* The morning WhatsApp summary as text, laid out like a report: a heading
   with the company and the day, a framed panel with the count at each level,
   then each document (most urgent first) and the open tasks, with an emoji
   for each kind and *bold*, `monospace` and "> " panels from WhatsApp's own
   markup. The same builder feeds the morning send and the live preview. */

export type DailyDoc = { item: TrackableItem; context: AlertContext };

/** Everything the summary shows today: the due documents (that the viewer may see) and the open tasks. */
export async function gatherDailySummary(canSee: (item: TrackableItem) => boolean = () => true) {
  const [items, rules, branding, { language }, tasks] = await Promise.all([getTrackableItems(), getExpirationRules(), getBrandingContext(), getWhatsappScheduleSetting(), openTasks()]);
  const lang: "ar" | "en" = language === "en" ? "en" : "ar";
  const nameAr = branding.company?.nameAr || branding.company?.nameEn;
  const docs: DailyDoc[] = items
    .filter((item) => canSee(item) && whatsappEligible(item) && daysUntil(item.expiryDate) <= rules.expiringSoonThresholdDays)
    .map((item) => ({ item, context: alertContext(item, nameAr, branding.company?.nameEn) }))
    .sort((a, b) => a.context.daysLeft - b.context.daysLeft);
  const company = (lang === "en" ? branding.company?.nameEn : undefined) || nameAr || "SanaD";
  return { lang, company, docs, tasks };
}

const RIYADH = "Asia/Riyadh";
const RULE = "━━━━━━━━━━━━━━━";
const mono = (s: string) => `\`${s}\``;
const dateStr = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: RIYADH, day: "2-digit", month: "2-digit", year: "numeric" });
const daysEn = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
const level = (days: number) => (days <= 0 ? "🔴" : days <= 7 ? "🟠" : "🟡");
const KIND: Record<TrackableItem["sourceType"], string> = { EMPLOYEE_IQAMA: "🪪", EMPLOYEE_PASSPORT: "🛂", EMPLOYEE_DOCUMENT: "📄", COMPANY_DOCUMENT: "🏢", VEHICLE: "🚗" };

function dayLine(today: Date) {
  const en = isEn();
  const g = today.toLocaleDateString(en ? "en-GB" : "ar-EG-u-nu-latn", { timeZone: RIYADH, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  try {
    const h = today.toLocaleDateString(en ? "en-u-ca-islamic-umalqura" : "ar-SA-u-ca-islamic-umalqura-nu-latn", { timeZone: RIYADH, day: "numeric", month: "long", year: "numeric" });
    return `${g} · ${h}`;
  } catch {
    return g;
  }
}

export function renderDailyHeader(company: string, docs: DailyDoc[], tasks: TaskLine[], today = new Date()) {
  const days = docs.map((d) => d.context.daysLeft);
  const expired = days.filter((n) => n <= 0).length;
  const week = days.filter((n) => n > 0 && n <= 7).length;
  const month = days.length - expired - week;
  return [
    `🌅 _${L("تقرير الصباح", "Morning report")}_`,
    `📋 *${L("الملخص اليومي", "Daily summary")}*`,
    `🏛️ *${company}*`,
    `🗓️ ${dayLine(today)}`,
    RULE,
    `> 🔴 ${L("منتهية", "Expired")}: *${expired}*`,
    `> 🟠 ${L("خلال أسبوع", "This week")}: *${week}*`,
    `> 🟡 ${L("خلال شهر", "This month")}: *${month}*`,
    `> 📌 ${L("مهام مفتوحة", "Open tasks")}: *${tasks.length}*`,
    RULE,
    `📂 *${L("الوثائق", "Documents")}* · ${docs.length}`,
  ].join("\n");
}

const statusText = (n: number) =>
  n < 0 ? L(`منتهية منذ ${daysAr(-n)}`, `Expired ${daysEn(-n)} ago`) : n === 0 ? L("تنتهي اليوم", "Ends today") : L(`باقي ${daysAr(n)}`, `${daysEn(n)} left`);

/** One document: its kind and name, then its number, establishment and date, then its state. */
export function renderDailyEntry({ item, context: c }: DailyDoc) {
  const en = isEn();
  const doc = en ? c.documentEn : c.documentAr;
  const who = en ? c.employeeEn ?? c.employeeAr : c.employeeAr;
  const branch = en ? c.branchEn ?? c.branch : c.branch;
  const meta = [c.number && `🔢 ${mono(c.number)}`, branch && branch !== doc && branch !== who && `📍 ${branch}`, `📅 ${mono(dateStr(c.expiryDate))}`].filter(Boolean).join("  ·  ");
  return [`${level(c.daysLeft)} ${KIND[item.sourceType] ?? "📄"} *${doc}${who ? ` — ${who}` : ""}*`, meta, `⏳ _${statusText(c.daysLeft)}_`].join("\n");
}

export const dailyEmptyText = () => `✅ _${L("كل الوثائق سارية، ولا شيء قريب من الانتهاء.", "Every document is valid; nothing ends soon.")}_`;

const PRIORITY = { URGENT: ["🔴", "عاجلة", "Urgent"], HIGH: ["🟠", "مهمة", "High"], NORMAL: ["⚪", "عادية", "Normal"] } as const;
const SHOWN_TASKS = 25;

/** The open tasks, then the signature; the closing section of the summary. */
export function renderDailyTail(tasks: TaskLine[]) {
  const sign = `_SanaD · ${L("إدارة الوثائق والتراخيص", "Documents & Licenses")}_`;
  if (!tasks.length) return sign;
  const late = tasks.filter((t) => t.daysLate > 0).length;
  const rows = tasks.slice(0, SHOWN_TASKS).map((t) => {
    const [dot, ar, enLabel] = PRIORITY[t.priority];
    const meta = [t.time && `🕘 ${mono(t.time)}`, t.assignee && `👤 ${t.assignee}`, `🏷️ ${L(ar, enLabel)}`].filter(Boolean).join("  ·  ");
    const when = t.daysLate > 0 ? `⏳ _${L(`متأخرة ${daysAr(t.daysLate)}`, `${daysEn(t.daysLate)} late`)}_` : `🟢 _${L("مهمة اليوم", "Due today")}_`;
    return [`${dot} *${t.title}*`, meta, when].join("\n");
  });
  const more = tasks.length - SHOWN_TASKS;
  return [
    `✅ *${L("المهام المفتوحة", "Open tasks")}* · ${tasks.length}`,
    ...(late ? [`_${L(`منها ${late} متأخرة من أيام سابقة`, `${late} carried from earlier days`)}_`] : []),
    "",
    rows.join("\n\n"),
    ...(more > 0 ? ["", `_${L(`و${more} ${more <= 10 ? "مهام" : "مهمة"} أخرى في صفحة المهام اليومية`, `and ${more} more on the Daily tasks page`)}_`] : []),
    "",
    RULE,
    sign,
  ].join("\n");
}
