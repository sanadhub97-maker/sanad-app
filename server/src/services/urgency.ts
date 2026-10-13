import { L } from "@/services/lang";

/* How near a document's end is, as the morning summary groups it: already
   expired, within the week, later this calendar month, or next month (still
   inside the "ending soon" window). Shared by the text designs and the picture. */

export const URGENCY = [
  { dot: "🔴", ar: "منتهية", en: "Expired", longAr: "منتهية — تحتاج تجديدًا الآن", longEn: "Expired — renew now" },
  { dot: "🟠", ar: "خلال هذا الأسبوع", en: "This week", longAr: "تنتهي خلال هذا الأسبوع", longEn: "Ending this week" },
  { dot: "🟡", ar: "خلال هذا الشهر", en: "This month", longAr: "تنتهي خلال هذا الشهر", longEn: "Ending this month" },
  { dot: "🔵", ar: "الشهر القادم", en: "Next month", longAr: "تنتهي الشهر القادم", longEn: "Ending next month" },
] as const;
export type Urgency = 0 | 1 | 2 | 3;

/** Whole days from today (Riyadh) to the last day of this month. */
function daysToMonthEnd(today = new Date()) {
  const r = new Date(today.getTime() + 3 * 60 * 60_000);
  const y = r.getUTCFullYear(), m = r.getUTCMonth(), d = r.getUTCDate();
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate() - d;
}

export function urgency(daysLeft: number, today = new Date()): Urgency {
  if (daysLeft <= 0) return 0;
  if (daysLeft <= 7) return 1;
  if (daysLeft <= daysToMonthEnd(today)) return 2;
  return 3;
}

/** How many documents fall in each group. */
export function urgencyCounts(daysLeft: number[], today = new Date()) {
  const c = [0, 0, 0, 0];
  for (const n of daysLeft) c[urgency(n, today)]++;
  return c;
}

export const urgencyLabel = (u: Urgency, long = false) => (long ? L(URGENCY[u].longAr, URGENCY[u].longEn) : L(URGENCY[u].ar, URGENCY[u].en));
