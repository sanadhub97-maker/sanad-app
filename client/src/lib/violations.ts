import type { ViolationEvent, ViolationState } from "@/api/violations";
import type { Tone } from "@/components/royal/rp";

/* The authorities a violation can come from (kept in sync with
   server/src/constants/violations.ts), with a colour and a short tag for
   their tile, the staff penalties, and how each status looks. */

export const AUTHORITIES: { key: string; ar: string; en: string; short: string; color: string }[] = [
  { key: "labor", ar: "مكتب العمل (الموارد البشرية)", en: "Labour office (HRSD)", short: "عمل", color: "#2563eb" },
  { key: "jawazat", ar: "المديرية العامة للجوازات", en: "Jawazat (Passports)", short: "جواز", color: "#0d9488" },
  { key: "baladiya", ar: "الأمانة / البلدية", en: "Municipality", short: "بلد", color: "#d97706" },
  { key: "civil", ar: "الدفاع المدني", en: "Civil Defence", short: "دفاع", color: "#dc2626" },
  { key: "traffic", ar: "الإدارة العامة للمرور", en: "Traffic department", short: "مرور", color: "#475569" },
  { key: "sfda", ar: "هيئة الغذاء والدواء", en: "Food & Drug Authority", short: "غذاء", color: "#16a34a" },
  { key: "zatca", ar: "هيئة الزكاة والضريبة والجمارك", en: "Zakat, Tax & Customs", short: "زكاة", color: "#7c3aed" },
  { key: "gosi", ar: "التأمينات الاجتماعية", en: "GOSI", short: "تأمين", color: "#0284c7" },
  { key: "commerce", ar: "وزارة التجارة", en: "Ministry of Commerce", short: "تجارة", color: "#9333ea" },
  { key: "other", ar: "جهة أخرى", en: "Other authority", short: "جهة", color: "#64748b" },
];
export const authorityOf = (key?: string | null) => AUTHORITIES.find((a) => a.key === key) ?? AUTHORITIES[AUTHORITIES.length - 1];

export const STAFF_PENALTIES = ["تنبيه شفهي", "إنذار كتابي", "إنذار نهائي", "خصم من الراتب", "إيقاف عن العمل", "حرمان من العلاوة", "فصل"];

export const VIOLATIONS_COLOR = "#b91c1c";

export const STATE_LOOK: Record<ViolationState, { ar: string; en: string; tone: Tone; c: string }> = {
  NEW: { ar: "جديدة", en: "New", tone: "pri", c: "var(--pri)" },
  OBJECTION: { ar: "تحت الاعتراض", en: "Objection filed", tone: "vio", c: "var(--vio)" },
  ACCEPTED: { ar: "أُلغيت بالاعتراض", en: "Cancelled on objection", tone: "mut", c: "var(--muted)" },
  REJECTED: { ar: "رُفض الاعتراض", en: "Objection rejected", tone: "bad", c: "var(--bad)" },
  PAID: { ar: "مسددة", en: "Paid", tone: "ok", c: "var(--ok)" },
  OVERDUE: { ar: "متأخرة السداد", en: "Overdue", tone: "bad", c: "var(--bad)" },
  OPEN: { ar: "قائم", en: "Open", tone: "warn", c: "var(--warn)" },
  APPLIED: { ar: "اتطبّق", en: "Applied", tone: "ok", c: "var(--ok)" },
};

export const EVENT_LOOK: Record<ViolationEvent["type"], { ar: string; en: string; c: string }> = {
  created: { ar: "سُجّلت المخالفة", en: "Recorded", c: "var(--pri)" },
  objection: { ar: "قُدّم اعتراض", en: "Objection filed", c: "var(--vio)" },
  accepted: { ar: "قُبل الاعتراض وأُلغيت المخالفة", en: "Objection accepted, cancelled", c: "var(--ok)" },
  rejected: { ar: "رُفض الاعتراض", en: "Objection rejected", c: "var(--bad)" },
  paid: { ar: "اتسددت", en: "Paid", c: "var(--ok)" },
  applied: { ar: "اتطبّق الجزاء", en: "Penalty applied", c: "var(--ok)" },
  edited: { ar: "اتعدّلت البيانات", en: "Details edited", c: "var(--muted)" },
};

export const daysAr = (n: number) => {
  const a = Math.abs(n);
  return a === 0 ? "اليوم" : a === 1 ? "يوم" : a === 2 ? "يومين" : a <= 10 ? `${a} أيام` : `${a} يومًا`;
};

/** The deadline that matters now: the objection's while it can still be filed, then the payment's. */
export function nextDeadline(v: { status: string; open: boolean; daysToObject: number | null; daysToPay: number | null; objectionDeadline: string | null; payDeadline: string | null }) {
  if (!v.open) return null;
  if (v.status === "NEW" && v.daysToObject !== null && v.daysToObject >= 0) return { which: "objection" as const, days: v.daysToObject, date: v.objectionDeadline };
  if (v.daysToPay !== null) return { which: "pay" as const, days: v.daysToPay, date: v.payDeadline };
  return null;
}

/** A day plus n days, as YYYY-MM-DD. */
export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
