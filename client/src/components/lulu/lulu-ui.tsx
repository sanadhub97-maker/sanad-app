import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* Small pieces shared by the Pearl pages. */

export function daysArText(n: number) {
  return n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يومًا`;
}

/** Days from today until a date (negative once passed); null without a date. */
export function daysLeft(iso?: string | null) {
  if (!iso) return null;
  const exp = new Date(iso);
  if (Number.isNaN(exp.getTime())) return null;
  const now = new Date();
  return Math.round((Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000);
}

/** A document's colour and wording: rose once expired, amber within 30 days, green after. */
export function docState(days: number | null, isAr: boolean): { tone: "rose" | "amber" | "green" | "sky"; text: string } {
  if (days === null) return { tone: "sky", text: isAr ? "بدون تاريخ" : "No date" };
  if (days < 0) return { tone: "rose", text: isAr ? `منتهية منذ ${daysArText(-days)}` : `Expired ${-days}d ago` };
  if (days === 0) return { tone: "rose", text: isAr ? "تنتهي اليوم" : "Ends today" };
  return { tone: days <= 30 ? "amber" : "green", text: isAr ? `باقي ${daysArText(days)}` : `${days}d left` };
}

/** How much of a year is left, for the thin bars (full once expired). */
export const leftPct = (days: number | null) => (days === null ? 0 : days < 0 ? 100 : Math.max(6, Math.min(100, (days / 365) * 100)));

/** Waits two frames so rings and bars grow from zero. */
export function useArmed() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return on;
}

/** The small ring with the days left (or late) in the middle. */
export function LuMini({ days, isAr }: { days: number | null; isAr: boolean }) {
  const armed = useArmed();
  const R = 27;
  const C = 2 * Math.PI * R;
  const p = days === null ? 0 : days < 0 ? 1 : Math.max(0.06, Math.min(1, days / 365));
  return (
    <div className="lu-mini">
      <svg width="66" height="66" viewBox="0 0 66 66" aria-hidden="true">
        <circle cx="33" cy="33" r={R} fill="none" stroke="var(--l-surface)" strokeWidth="7" />
        {days !== null && <circle className="v" cx="33" cy="33" r={R} fill="none" stroke="var(--c)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${armed ? p * C : 0} 999`} />}
      </svg>
      <span>
        <b className="lu-num">{days === null ? "—" : Math.abs(days)}</b>
        <small>{days === null ? "" : days < 0 ? (isAr ? "يوم تأخير" : "days late") : isAr ? "يوم متبقٍ" : "days left"}</small>
      </span>
    </div>
  );
}

export function LuPager({ page, pages, onChange, isAr }: { page: number; pages: number; onChange: (p: number) => void; isAr: boolean }) {
  if (pages <= 1) return null;
  const Prev = isAr ? ChevronRight : ChevronLeft;
  const Next = isAr ? ChevronLeft : ChevronRight;
  return (
    <div className="lu-pager no-print">
      <button type="button" className="lu-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={isAr ? "السابق" : "Previous"}>
        <Prev />
      </button>
      <span className="lu-num">
        {page} / {pages}
      </span>
      <button type="button" className="lu-btn" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label={isAr ? "التالي" : "Next"}>
        <Next />
      </button>
    </div>
  );
}

export function LuEmpty({ title, text, tone = "sky", action }: { title: string; text?: string; tone?: string; action?: React.ReactNode }) {
  return (
    <div className={`lu-cc lu-rise lt-${tone} px-6 py-12 text-center`}>
      <p className="font-head text-lg font-semibold">{title}</p>
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
