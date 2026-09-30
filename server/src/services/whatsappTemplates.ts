import type { TrackableItem } from "@/services/expiringItems";
import { daysUntil } from "@/services/expiration";
import { L, isEn } from "@/services/lang";

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
  companyEn?: string;
  employeeAr?: string;
  employeeEn?: string;
  documentAr: string;
  documentEn: string;
  number?: string | null;
  branch?: string | null;
  branchEn?: string | null;
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

export function alertContext(item: TrackableItem, company: string | null | undefined, companyEn?: string | null): AlertContext {
  const [docAr, docEn] = SOURCE_DOCUMENT[item.sourceType];
  const employeeAr = clean(item.employeeNameAr);
  const employeeEn = clean(item.employeeName);
  return {
    company: clean(company) || "المنشأة",
    companyEn: clean(companyEn),
    employeeAr,
    employeeEn: employeeEn !== employeeAr ? employeeEn : undefined,
    documentAr: clean(item.documentAr) || docAr,
    documentEn: clean(item.documentEn) || docEn,
    number: clean(item.documentNumber),
    branch: clean(item.branchName),
    branchEn: clean(item.branchNameEn),
    expiryDate: item.expiryDate,
    daysLeft: daysUntil(item.expiryDate),
  };
}

// ---------- Wording ----------

const RIYADH = "Asia/Riyadh";
const dateStr = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: RIYADH, day: "2-digit", month: "2-digit", year: "numeric" });
const weekdayAr = (d: Date) => d.toLocaleDateString(isEn() ? "en-GB" : "ar-EG", { timeZone: RIYADH, weekday: "long" });

/** "يوم واحد", "يومان", "7 أيام", "30 يومًا" — the noun agrees with the count. */
export function daysAr(n: number): string {
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  return n <= 10 ? `${n} أيام` : `${n} يومًا`;
}
const daysEn = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

type Level = { emoji: string; square: string; priorityAr: string };
function level(daysLeft: number): Level {
  if (daysLeft <= 0) return { emoji: "🔴", square: "🟥", priorityAr: L("عاجل جدًا", "Very urgent") };
  if (daysLeft <= 7) return { emoji: "🟠", square: "🟧", priorityAr: L("عاجل", "Urgent") };
  if (daysLeft <= 30) return { emoji: "🟡", square: "🟨", priorityAr: L("تنبيه مبكر", "Early notice") };
  return { emoji: "🟢", square: "🟩", priorityAr: L("للعلم", "For your information") };
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
  daysLeft <= 0
    ? L("يرجى تجديد الوثيقة في أقرب وقت ممكن.", "Please renew the document as soon as possible.")
    : L("يرجى البدء في إجراءات التجديد قبل تاريخ الانتهاء.", "Please start the renewal before the expiry date.");
/** The status in the alert's language. */
const statusL = (daysLeft: number) => (isEn() ? statusEn(daysLeft) : statusAr(daysLeft));
/** The alert's names in its language: English falls back to Arabic when there is no English name. */
function view(c: AlertContext) {
  const en = isEn();
  return {
    company: en ? c.companyEn ?? c.company : c.company,
    employee: en ? c.employeeEn ?? c.employeeAr : c.employeeAr,
    document: en ? c.documentEn : c.documentAr,
    branch: en ? c.branchEn ?? c.branch : c.branch,
  };
}

/** Lines that only appear when the document has the data. */
const optional = (...lines: (string | false | null | undefined)[]) => lines.filter((l): l is string => Boolean(l));

// ---------- Designs ----------

const RENDER: Record<WhatsappTemplateId, (c: AlertContext) => string[]> = {
  // Headed letter: every field on its own line, the status last.
  classic: (c) => {
    const lv = level(c.daysLeft);
    const v = view(c);
    return [
      `🔔 *${c.daysLeft <= 0 ? L("تنبيه: وثيقة منتهية الصلاحية", "Alert: document expired") : L("تنبيه قرب انتهاء وثيقة", "Alert: document ending soon")}*`,
      `*${v.company}*`,
      "",
      ...optional(
        v.employee && `👤 ${L("الموظف", "Employee")}: *${v.employee}*`,
        `📄 ${L("الوثيقة", "Document")}: *${v.document}*`,
        c.number && `🔢 ${L("الرقم", "Number")}: *${c.number}*`,
        v.branch && `📍 ${L("الفرع", "Branch")}: *${v.branch}*`
      ),
      `📅 ${L("تاريخ الانتهاء", "Expiry date")}: *${weekdayAr(c.expiryDate)} ${dateStr(c.expiryDate)}*`,
      `${lv.emoji} ${L("الحالة", "Status")}: *${statusL(c.daysLeft)}*`,
      "",
      actionAr(c.daysLeft),
      L("_نظام SanaD لإدارة الوثائق والتراخيص_", "_SanaD · Documents & Licenses_"),
    ];
  },

  // A framed card: company banner, then aligned fields.
  card: (c) => {
    const lv = level(c.daysLeft);
    const v = view(c);
    const rule = "━━━━━━━━━━━━━━━";
    return [
      rule,
      `🏢 *${v.company}*`,
      rule,
      `${lv.emoji} *${c.daysLeft <= 0 ? L("وثيقة منتهية الصلاحية", "Document expired") : L("وثيقة قاربت على الانتهاء", "Document ending soon")}*`,
      "",
      ...optional(
        v.employee && `▫️ *${L("الموظف", "Employee")}:* ${v.employee}`,
        `▫️ *${L("الوثيقة", "Document")}:* ${v.document}`,
        c.number && `▫️ *${L("الرقم", "Number")}:* ${c.number}`,
        v.branch && `▫️ *${L("الفرع", "Branch")}:* ${v.branch}`
      ),
      `▫️ *${L("الانتهاء", "Expires")}:* ${dateStr(c.expiryDate)}`,
      `▫️ *${L("الحالة", "Status")}:* ${statusL(c.daysLeft)}`,
      rule,
      L("_SanaD · إدارة الوثائق والتراخيص_", "_SanaD · Documents & Licenses_"),
    ];
  },

  // Three lines: readable straight from the phone's notification.
  compact: (c) => {
    const lv = level(c.daysLeft);
    const v = view(c);
    return [
      `${lv.emoji} *${v.document}${v.employee ? ` — ${v.employee}` : ""}*`,
      `${statusL(c.daysLeft)} · ${dateStr(c.expiryDate)}`,
      `_${v.company}_`,
    ];
  },

  // Urgency first: a coloured bar that fills as the date gets closer.
  priority: (c) => {
    const lv = level(c.daysLeft);
    const v = view(c);
    const filled = c.daysLeft <= 0 ? 10 : Math.min(10, Math.max(1, Math.round(10 * (1 - c.daysLeft / 30))));
    return [
      `${lv.emoji} *${lv.priorityAr} — ${statusL(c.daysLeft)}*`,
      lv.square.repeat(filled) + "⬜".repeat(10 - filled),
      "",
      `*${v.employee ?? v.document}*`,
      ...optional(
        v.employee && `📄 ${v.document}${c.number ? ` · ${c.number}` : ""}`,
        !v.employee && c.number && `🔢 ${c.number}`,
        v.branch && `📍 ${v.branch}`
      ),
      `📅 ${weekdayAr(c.expiryDate)} ${dateStr(c.expiryDate)}`,
      "",
      `_${v.company} · SanaD_`,
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
