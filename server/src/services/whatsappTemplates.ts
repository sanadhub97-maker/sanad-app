import type { TrackableItem } from "@/services/expiringItems";
import { daysUntil } from "@/services/expiration";

// The WhatsApp expiry alert, in the design chosen in Settings → WhatsApp.
// WhatsApp text has no colours or fonts: the designs use only its own
// markup (*bold*, _italic_), line layout and emoji, so every provider —
// the QR-linked number, Meta and CallMeBot — delivers them exactly as shown.

export const WHATSAPP_TEMPLATE_IDS = ["classic", "card", "compact", "priority", "bilingual"] as const;
export type WhatsappTemplateId = (typeof WHATSAPP_TEMPLATE_IDS)[number];
export const DEFAULT_WHATSAPP_TEMPLATE: WhatsappTemplateId = "classic";

export function isWhatsappTemplateId(value: unknown): value is WhatsappTemplateId {
  return typeof value === "string" && (WHATSAPP_TEMPLATE_IDS as readonly string[]).includes(value);
}

/** Everything a design can show about one expiring document. */
export interface AlertContext {
  company: string;
  employeeAr?: string;
  employeeEn?: string;
  documentAr: string;
  documentEn: string;
  number?: string | null;
  branch?: string | null;
  expiryDate: Date;
  /** Whole days until expiry; 0 or less means expired. */
  daysLeft: number;
}

const SOURCE_DOCUMENT: Record<TrackableItem["sourceType"], [string, string]> = {
  EMPLOYEE_IQAMA: ["الإقامة", "Iqama"],
  EMPLOYEE_PASSPORT: ["جواز السفر", "Passport"],
  EMPLOYEE_DOCUMENT: ["مستند موظف", "Employee document"],
  COMPANY_DOCUMENT: ["وثيقة المنشأة", "Company document"],
};

/** Trimmed, or undefined when empty: a space before a closing "*" stops
 * WhatsApp from rendering the bold, and stored names sometimes end in one. */
const clean = (value: string | null | undefined) => value?.trim() || undefined;

export function alertContext(item: TrackableItem, company: string | null | undefined): AlertContext {
  const [docAr, docEn] = SOURCE_DOCUMENT[item.sourceType];
  const employeeAr = clean(item.employeeNameAr);
  const employeeEn = clean(item.employeeName);
  return {
    company: clean(company) || "المنشأة",
    employeeAr,
    employeeEn: employeeEn !== employeeAr ? employeeEn : undefined,
    documentAr: clean(item.documentAr) || docAr,
    documentEn: clean(item.documentEn) || docEn,
    number: clean(item.documentNumber),
    branch: clean(item.branchName),
    expiryDate: item.expiryDate,
    daysLeft: daysUntil(item.expiryDate),
  };
}

// ---------- Wording ----------

const RIYADH = "Asia/Riyadh";
const dateStr = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: RIYADH, day: "2-digit", month: "2-digit", year: "numeric" });
const weekdayAr = (d: Date) => d.toLocaleDateString("ar-EG", { timeZone: RIYADH, weekday: "long" });

/** "يوم واحد", "يومان", "7 أيام", "30 يومًا" — the noun agrees with the count. */
export function daysAr(n: number): string {
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  return n <= 10 ? `${n} أيام` : `${n} يومًا`;
}
const daysEn = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

type Level = { emoji: string; square: string; priorityAr: string };
function level(daysLeft: number): Level {
  if (daysLeft <= 0) return { emoji: "🔴", square: "🟥", priorityAr: "عاجل جدًا" };
  if (daysLeft <= 7) return { emoji: "🟠", square: "🟧", priorityAr: "عاجل" };
  if (daysLeft <= 30) return { emoji: "🟡", square: "🟨", priorityAr: "تنبيه مبكر" };
  return { emoji: "🟢", square: "🟩", priorityAr: "للعلم" };
}

function statusAr(daysLeft: number) {
  if (daysLeft < 0) return `منتهية منذ ${daysAr(-daysLeft)}`;
  if (daysLeft === 0) return "تنتهي اليوم";
  return `باقي ${daysAr(daysLeft)}`;
}
function statusEn(daysLeft: number) {
  if (daysLeft < 0) return `Expired ${daysEn(-daysLeft)} ago`;
  if (daysLeft === 0) return "Expires today";
  return `${daysEn(daysLeft)} left`;
}
const actionAr = (daysLeft: number) =>
  daysLeft <= 0 ? "يرجى تجديد الوثيقة في أقرب وقت ممكن." : "يرجى البدء في إجراءات التجديد قبل تاريخ الانتهاء.";

/** Lines that only appear when the document has the data. */
const optional = (...lines: (string | false | null | undefined)[]) => lines.filter((l): l is string => Boolean(l));

// ---------- Designs ----------

const RENDER: Record<WhatsappTemplateId, (c: AlertContext) => string[]> = {
  // Headed letter: every field on its own line, the status last.
  classic: (c) => {
    const lv = level(c.daysLeft);
    return [
      `🔔 *${c.daysLeft <= 0 ? "تنبيه: وثيقة منتهية الصلاحية" : "تنبيه قرب انتهاء وثيقة"}*`,
      `*${c.company}*`,
      "",
      ...optional(
        c.employeeAr && `👤 الموظف: *${c.employeeAr}*`,
        `📄 الوثيقة: *${c.documentAr}*`,
        c.number && `🔢 الرقم: *${c.number}*`,
        c.branch && `📍 الفرع: *${c.branch}*`
      ),
      `📅 تاريخ الانتهاء: *${weekdayAr(c.expiryDate)} ${dateStr(c.expiryDate)}*`,
      `${lv.emoji} الحالة: *${statusAr(c.daysLeft)}*`,
      "",
      actionAr(c.daysLeft),
      "_نظام SanaD لإدارة الوثائق والتراخيص_",
    ];
  },

  // A framed card: company banner, then aligned fields.
  card: (c) => {
    const lv = level(c.daysLeft);
    const rule = "━━━━━━━━━━━━━━━";
    return [
      rule,
      `🏢 *${c.company}*`,
      rule,
      `${lv.emoji} *${c.daysLeft <= 0 ? "وثيقة منتهية الصلاحية" : "وثيقة قاربت على الانتهاء"}*`,
      "",
      ...optional(
        c.employeeAr && `▫️ *الموظف:* ${c.employeeAr}`,
        `▫️ *الوثيقة:* ${c.documentAr}`,
        c.number && `▫️ *الرقم:* ${c.number}`,
        c.branch && `▫️ *الفرع:* ${c.branch}`
      ),
      `▫️ *الانتهاء:* ${dateStr(c.expiryDate)}`,
      `▫️ *الحالة:* ${statusAr(c.daysLeft)}`,
      rule,
      "_SanaD · إدارة الوثائق والتراخيص_",
    ];
  },

  // Three lines: readable straight from the phone's notification.
  compact: (c) => {
    const lv = level(c.daysLeft);
    return [
      `${lv.emoji} *${c.documentAr}${c.employeeAr ? ` — ${c.employeeAr}` : ""}*`,
      `${statusAr(c.daysLeft)} · ${dateStr(c.expiryDate)}`,
      `_${c.company}_`,
    ];
  },

  // Urgency first: a coloured bar that fills as the date gets closer.
  priority: (c) => {
    const lv = level(c.daysLeft);
    const filled = c.daysLeft <= 0 ? 10 : Math.min(10, Math.max(1, Math.round(10 * (1 - c.daysLeft / 30))));
    return [
      `${lv.emoji} *${lv.priorityAr} — ${statusAr(c.daysLeft)}*`,
      lv.square.repeat(filled) + "⬜".repeat(10 - filled),
      "",
      `*${c.employeeAr ?? c.documentAr}*`,
      ...optional(
        c.employeeAr && `📄 ${c.documentAr}${c.number ? ` · ${c.number}` : ""}`,
        !c.employeeAr && c.number && `🔢 ${c.number}`,
        c.branch && `📍 ${c.branch}`
      ),
      `📅 ${weekdayAr(c.expiryDate)} ${dateStr(c.expiryDate)}`,
      "",
      `_${c.company} · SanaD_`,
    ];
  },

  // An Arabic block, then the same in English. Each line stays in one
  // language: a line mixing both reads out of order in a right-to-left chat.
  bilingual: (c) => {
    const lv = level(c.daysLeft);
    const employeeEn = c.employeeEn ?? c.employeeAr;
    return [
      "🔔 *تنبيه انتهاء وثيقة*",
      `*${c.company}*`,
      ...optional(c.employeeAr && `👤 ${c.employeeAr}`),
      `📄 ${c.documentAr}`,
      ...optional(c.number && `🔢 ${c.number}`),
      `📅 ${dateStr(c.expiryDate)}`,
      `${lv.emoji} ${statusAr(c.daysLeft)}`,
      "───────────────",
      "🔔 *Document Expiry Alert*",
      ...optional(employeeEn && `👤 ${employeeEn}`),
      `📄 ${c.documentEn}`,
      `📅 ${dateStr(c.expiryDate)}`,
      `${lv.emoji} ${statusEn(c.daysLeft)}`,
      "",
      "_SanaD · Documents & Licenses_",
    ];
  },
};

export function renderWhatsappAlert(template: WhatsappTemplateId, context: AlertContext): string {
  return RENDER[template](context).join("\n");
}
