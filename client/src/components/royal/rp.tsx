import type { CSSProperties, ReactNode } from "react";
import { isRtlLanguage } from "@/i18n";
import i18n from "@/i18n";
import { cn } from "@/lib/utils";

/* Small shared pieces of the Royal pages (styles/pages-royal.css): the
   summary band, the day header of every "by day and date" list, the
   time-left pill, and the date words they use. */

export type Tone = "ok" | "warn" | "bad" | "pri" | "vio" | "teal" | "sky" | "gold" | "mut";

const isAr = () => isRtlLanguage(i18n.language);
const locale = () => (isAr() ? "ar-EG-u-nu-latn" : "en-GB");
const hijriLocale = () => (isAr() ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-u-ca-islamic-umalqura");

/** A calendar day (midnight, local) from an ISO date or Date. */
export function dayOf(v: string | Date): Date {
  const d = typeof v === "string" ? new Date(v) : new Date(v);
  // Dates stored as midnight UTC are that calendar day wherever the viewer is.
  if (typeof v === "string" && /T00:00:00(\.000)?Z$/.test(v)) return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => dayOf(new Date());

/** Whole days from today (negative once passed). */
export function daysFromToday(v: string | Date | null | undefined): number | null {
  if (!v) return null;
  return Math.round((dayOf(v).getTime() - today().getTime()) / 86_400_000);
}

function fmt(d: Date, o: Intl.DateTimeFormatOptions, loc = locale()) {
  try {
    return d.toLocaleDateString(loc, o);
  } catch {
    return dmy(d);
  }
}
/** dd/mm/yyyy written out: the Arabic formatter adds direction marks that scramble it. */
export const dmy = (v: string | Date) => {
  const d = dayOf(v);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
export const weekday = (v: string | Date) => fmt(dayOf(v), { weekday: "long" });
export const monthShort = (v: string | Date) => fmt(dayOf(v), { month: "short" });
export const longDate = (v: string | Date) => fmt(dayOf(v), { day: "numeric", month: "long", year: "numeric" });
export const hijri = (v: string | Date) => `${fmt(dayOf(v), { day: "numeric", month: "long", year: "numeric" }, hijriLocale()).replace(/\s*(هـ|AH)$/, "")} ${isAr() ? "هـ" : "AH"}`;

/** "Today", "Yesterday", "3 days ago", "In 5 days". */
export function relDay(v: string | Date) {
  const n = daysFromToday(v) ?? 0;
  if (n === 0) return isAr() ? "اليوم" : "Today";
  if (n === -1) return isAr() ? "أمس" : "Yesterday";
  if (n === 1) return isAr() ? "غدًا" : "Tomorrow";
  return n < 0 ? (isAr() ? `منذ ${-n} يوم` : `${-n} days ago`) : isAr() ? `بعد ${n} يوم` : `In ${n} days`;
}

/** Groups items by calendar day, newest first (or soonest first with ascending). */
export function groupByDay<T>(items: T[], dateOf: (t: T) => string | Date | null | undefined, ascending = false) {
  const map = new Map<string, { day: Date; items: T[] }>();
  for (const it of items) {
    const v = dateOf(it);
    if (!v) continue;
    const d = dayOf(v);
    const k = dayKey(d);
    const g = map.get(k) ?? { day: d, items: [] };
    g.items.push(it);
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => (ascending ? a.day.getTime() - b.day.getTime() : b.day.getTime() - a.day.getTime()));
}

export function DayHeader({ day, right }: { day: Date; right?: ReactNode }) {
  const n = daysFromToday(day) ?? 0;
  return (
    <div className={cn("rp-day", n === 0 && "today", n < 0 && "past")}>
      <div className="rp-cal">
        <small>{monthShort(day)}</small>
        <b>{day.getDate()}</b>
      </div>
      <div className="min-w-0">
        <h4>
          {weekday(day)} <span className="tag">{relDay(day)}</span>
        </h4>
        <p>
          {longDate(day)} · {hijri(day)}
        </p>
      </div>
      {right && <div className="tot">{right}</div>}
    </div>
  );
}

export function Pill({ tone = "mut", dot = true, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return <span className={cn("rp-pill", `rp-${tone}`, !dot && "nodot", className)}>{children}</span>;
}

/** Expired / ending within 30 days / valid, with the days. */
export function leftTone(days: number | null): Tone {
  if (days === null) return "mut";
  return days < 0 ? "bad" : days <= 30 ? "warn" : "ok";
}
export function LeftPill({ days }: { days: number | null }) {
  const ar = isAr();
  if (days === null) return <Pill tone="mut">{ar ? "غير مسجّلة" : "Not recorded"}</Pill>;
  if (days < 0) return <Pill tone="bad">{ar ? `منتهية منذ ${-days} يوم` : `Expired ${-days}d ago`}</Pill>;
  if (days === 0) return <Pill tone="bad">{ar ? "تنتهي اليوم" : "Ends today"}</Pill>;
  if (days <= 30) return <Pill tone="warn">{ar ? `باقي ${days} يوم` : `${days}d left`}</Pill>;
  return <Pill tone="ok">{ar ? `سارية · ${days} يوم` : `Valid · ${days}d`}</Pill>;
}
/** The time-left pill with a bar under it (a year is a full bar). */
export function LeftMeter({ days }: { days: number | null }) {
  const tone = leftTone(days);
  const pct = days === null ? 0 : days < 0 ? 100 : Math.max(4, Math.min(100, (days / 365) * 100));
  return (
    <div className="rp-left">
      <LeftPill days={days} />
      <div className="rp-bar">
        <i className={`rp-${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export type Kpi = { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; hero?: boolean; onClick?: () => void; active?: boolean };
/** The summary band: the first figure on royal blue, the rest beside it. */
export function Kpis({ items, i = 1 }: { items: Kpi[]; i?: number }) {
  return (
    <div className="rp-card rp-kpis rp-rise" style={{ ["--i" as string]: i }}>
      {items.map((k, n) => {
        const cls = cn(k.hero && "hero", k.tone && `rp-${k.tone}`, k.onClick && "rp-kpi");
        const body = (
          <>
            <span className="l">
              <i />
              {k.label}
            </span>
            <span className="v" style={!k.hero && k.tone && k.tone !== "pri" ? ({ ["--vc" as string]: "var(--c)" } as CSSProperties) : undefined}>
              {k.value}
            </span>
            {k.sub && <span className="s">{k.sub}</span>}
          </>
        );
        return k.onClick ? (
          <button key={n} type="button" className={cls} onClick={k.onClick} aria-pressed={k.active}>
            {body}
          </button>
        ) : (
          <div key={n} className={cls}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

const hueOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
/** Two initials on a soft colour picked from the name. */
export function Initials({ name, className }: { name: string; className?: string }) {
  const ini = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.replace(/^ال(?=..)/, "").charAt(0))
    .join(" ");
  return (
    <span className={cn("rp-av", className)} style={{ ["--h" as string]: hueOf(name) }} aria-hidden="true">
      {ini}
    </span>
  );
}

/** A small ring for a share out of 100. */
export function Ring({ pct }: { pct: number }) {
  const C = 2 * Math.PI * 22;
  const c = pct >= 70 ? "var(--l-green)" : pct >= 40 ? "var(--l-amber)" : "var(--l-rose)";
  return (
    <div className="rp-ring">
      <svg viewBox="0 0 54 54" aria-hidden="true">
        <circle cx="27" cy="27" r="22" fill="none" stroke="var(--ry-track, var(--l-line))" strokeWidth="6" />
        <circle cx="27" cy="27" r="22" fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(C * pct) / 100} ${C}`} />
      </svg>
      <b>{pct}%</b>
    </div>
  );
}
