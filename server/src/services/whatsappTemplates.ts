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
  VEHICLE: ["السيارة", "Vehicle"],
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
// WhatsApp's own markup, so each provider shows them as designed: *bold*,
// _italic_, `monospace` for numbers, "> " for a quoted block (drawn as a
// framed panel in the chat) and "- " for a bulleted list.

/** A number in monospace, so its digits never mix with the Arabic around it. */
const mono = (s: string) => `\`${s}\``;
const fullDate = (d: Date) => `${weekdayAr(d)} ${dateStr(d)}`;
/** Of ten steps, how many are filled: more as the date nears, all once it has passed. */
const filled = (daysLeft: number) => (daysLeft <= 0 ? 10 : Math.min(10, Math.max(1, Math.round(10 * (1 - daysLeft / 30)))));
const bar = (daysLeft: number, on = "▰", off = "▱") => on.repeat(filled(daysLeft)) + off.repeat(10 - filled(daysLeft));
const headline = (c: AlertContext) =>
  c.daysLeft <= 0 ? L("وثيقة منتهية الصلاحية", "Document expired") : c.daysLeft <= 7 ? L("وثيقة تنتهي خلال أيام", "Document ending within days") : L("وثيقة تقترب من الانتهاء", "Document ending soon");
const signature = () => L("_SanaD · إدارة الوثائق والتراخيص_", "_SanaD · Documents & Licenses_");

const RENDER: Record<WhatsappTemplateId, (c: AlertContext) => string[]> = {
  // A formal letter: the company, the status in a framed panel, the details, the request.
  classic: (c) => {
    const lv = level(c.daysLeft);
    const v = view(c);
    return [
      `🔔 *${headline(c)}*`,
      `_${v.company}_`,
      "",
      `> ${lv.emoji} *${statusL(c.daysLeft)}*`,
      `> 📅 ${fullDate(c.expiryDate)}`,
      "",
      ...optional(
        v.employee && `👤 ${L("الموظف", "Employee")}: *${v.employee}*`,
        `📄 ${L("الوثيقة", "Document")}: *${v.document}*`,
        c.number && `🔢 ${L("الرقم", "Number")}: ${mono(c.number)}`,
        v.branch && `📍 ${L("الفرع", "Branch")}: ${v.branch}`
      ),
      "",
      actionAr(c.daysLeft),
      signature(),
    ];
  },

  // The whole alert inside one framed panel, like a card in the chat.
  card: (c) => {
    const lv = level(c.daysLeft);
    const v = view(c);
    return [
      `🏢 *${v.company}*`,
      "",
      `> ${lv.emoji} *${v.document}* · ${statusL(c.daysLeft)}`,
      ...optional(v.employee && `> 👤 *${v.employee}*`),
      ...optional(c.number && `> 🔢 ${mono(c.number)}`, v.branch && `> 📍 ${v.branch}`),
      `> 📅 ${fullDate(c.expiryDate)}`,
      `> ${bar(c.daysLeft)}`,
      "",
      signature(),
    ];
  },

  // Two lines that read whole in the phone's notification.
  compact: (c) => {
    const lv = level(c.daysLeft);
    const v = view(c);
    return [`${lv.emoji} *${v.document}${v.employee ? ` · ${v.employee}` : ""}* — ${statusL(c.daysLeft)}`, `📅 ${dateStr(c.expiryDate)} · _${v.company}_`];
  },

  // Urgency first: the level, a bar that fills as the date nears, then the details as a list.
  priority: (c) => {
    const lv = level(c.daysLeft);
    const v = view(c);
    return [
      `${lv.emoji} *${lv.priorityAr}* · ${statusL(c.daysLeft)}`,
      bar(c.daysLeft, lv.square, "⬜"),
      "",
      `*${v.employee ?? v.document}*`,
      ...optional(
        v.employee && `- ${v.document}${c.number ? ` · ${mono(c.number)}` : ""}`,
        !v.employee && c.number && `- ${mono(c.number)}`,
        v.branch && `- ${v.branch}`
      ),
      `- ${fullDate(c.expiryDate)}`,
      "",
      `_${v.company}_`,
    ];
  },

  // An Arabic panel, then the same in English. Each line stays in one
  // language: a line mixing both reads out of order in a right-to-left chat.
  bilingual: (c) => {
    const lv = level(c.daysLeft);
    const employeeEn = c.employeeEn ?? c.employeeAr;
    return [
      `🔔 *${c.company}*`,
      "",
      `> ${lv.emoji} *${statusAr(c.daysLeft)}*`,
      ...optional(c.employeeAr && `> 👤 ${c.employeeAr}`),
      `> 📄 ${c.documentAr}${c.number ? ` · ${mono(c.number)}` : ""}`,
      `> 📅 ${dateStr(c.expiryDate)}`,
      "",
      `> ${lv.emoji} *${statusEn(c.daysLeft)}*`,
      ...optional(employeeEn && `> 👤 ${employeeEn}`),
      `> 📄 ${c.documentEn}`,
      "",
      "_SanaD · Documents & Licenses_",
    ];
  },
};

export function renderWhatsappAlert(template: WhatsappTemplateId, context: AlertContext): string {
  return RENDER[template](context).join("\n");
}

// ---------- An open task, as the daily summary (services/dailySummary) shows it ----------

export interface TaskLine {
  title: string;
  priority: "URGENT" | "HIGH" | "NORMAL";
  time?: string | null;
  assignee?: string | null;
  /** Whole days since the task's day; 0 for today's. */
  daysLate: number;
}
