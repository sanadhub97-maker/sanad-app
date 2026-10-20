import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { isRtlLanguage } from "@/i18n";
import i18n from "@/i18n";
import { cn } from "@/lib/utils";
import { RoyalDonut, RoyalVessels } from "@/components/royal/px-luxe";

/* The pieces of the approved luxury preview (styles/px.css): figure cards with
   a trend line, titled cards, tabs with counts, charts that show their numbers
   on hover, a side panel and the status badge. */

const rtl = () => isRtlLanguage(i18n.language);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** Counts up from zero once, or shows a text value as it is; it glows once when it lands. */
export function Count({ to }: { to: number | string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof to !== "number") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setN(to);
    const t0 = performance.now();
    let id = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 900);
      setN(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [to]);
  const landed = typeof to !== "number" || n === to;
  return <span className={landed ? "rx-landed" : undefined}>{typeof to === "number" ? fmt(n) : to}</span>;
}

/** A small filled trend line; the oldest value on the reading side's start. */
export function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2 || values.every((x) => x === values[0])) return null;
  const W = 200, H = 34, mx = Math.max(...values), mn = Math.min(...values), r = mx - mn || 1;
  const x = (i: number) => (rtl() ? W - (i / (values.length - 1)) * W : (i / (values.length - 1)) * W);
  const y = (v: number) => H - 3 - ((v - mn) / r) * (H - 6);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const id = `pxs${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg className="px-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d}L${x(values.length - 1)} ${H}L${x(0)} ${H}Z`} fill={`url(#${id})`} />
      <path className="l" d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" pathLength={1} />
    </svg>
  );
}

export type ChipTone = "up" | "dn" | "warn" | "mut";
export interface PxStatProps {
  label: string;
  value: ReactNode;
  unit?: string;
  icon: LucideIcon;
  color: string;
  chip?: { text: string; tone: ChipTone };
  sub?: ReactNode;
  spark?: number[];
  onClick?: () => void;
  active?: boolean;
  i?: number;
}
/** A figure card: its label and icon, the number, a change chip and a trend line. */
export function PxStat({ label, value, unit, icon: Icon, color, chip, sub, spark, onClick, active, i = 0 }: PxStatProps) {
  const body = (
    <>
      <span className="h">
        {label}
        <span className="ic">
          <Icon />
        </span>
      </span>
      <b className="v">
        {typeof value === "number" || typeof value === "string" ? <Count to={value} /> : value}
        {unit && <small>{unit}</small>}
      </b>
      <span className="d">
        {chip && <span className={cn("px-chip", chip.tone)}>{chip.text}</span>}
        {sub}
      </span>
      {spark && <Spark values={spark} color={color} />}
      <i className="rx-foot" aria-hidden="true" />
    </>
  );
  const style = { ["--c" as string]: color, ["--i" as string]: i };
  return onClick ? (
    <button type="button" className="px-stat" style={style} onClick={onClick} aria-pressed={active}>
      {body}
    </button>
  ) : (
    <div className="px-stat" style={style}>
      {body}
    </div>
  );
}

/** A card with a title row. */
export function PxCard({ title, sub, actions, children, className, i = 0, body = true }: { title?: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; i?: number; body?: boolean }) {
  return (
    <section className={cn("px-card", className)} style={{ ["--i" as string]: i }}>
      {title && (
        <div className="px-chd">
          <h3>{title}</h3>
          {sub && <small>{sub}</small>}
          {actions && <span className="sp" />}
          {actions}
        </div>
      )}
      {body ? <div className="px-cb">{children}</div> : children}
    </section>
  );
}

/** Tabs with a count on each. */
export function PxTabs<K extends string>({ items, value, onChange, label }: { items: { key: K; label: string; count?: number }[]; value: K; onChange: (k: K) => void; label?: string }) {
  return (
    <div className="px-tabs" role="tablist" aria-label={label}>
      {items.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={value === t.key} aria-pressed={value === t.key} onClick={() => onChange(t.key)}>
          {t.label}
          {t.count !== undefined && <b>{t.count}</b>}
        </button>
      ))}
    </div>
  );
}

export type BadgeTone = "ok" | "warn" | "bad" | "mut";
export const PxBadge = ({ tone, children }: { tone: BadgeTone; children: ReactNode }) => <span className={cn("px-bd", tone)}>{children}</span>;

/* ---------------- charts ---------------- */

type Series = { name: string; color: string; values: number[]; dashed?: boolean };
interface Tip { x: number; y: number; i: number }

function useTip(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const move = (e: React.PointerEvent, xs: number[], ys: number[]) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 100;
    let k = 0;
    xs.forEach((v, i) => {
      if (Math.abs(v - px) < Math.abs(xs[k] - px)) k = i;
    });
    if (k < count) setTip({ x: xs[k], y: ys[k], i: k });
  };
  return { ref, tip, move, leave: () => setTip(null) };
}

/** A smooth area chart (time runs with the reading direction) that shows each month's numbers on hover. */
export function PxArea({ labels, series, unit = "", height = 250 }: { labels: string[]; series: Series[]; unit?: string; height?: number }) {
  const W = 1000, H = height, n = labels.length;
  const max = Math.max(1, ...series.flatMap((s) => s.values)) * 1.15;
  const x = (i: number) => (n === 1 ? W / 2 : rtl() ? W - (i / (n - 1)) * W : (i / (n - 1)) * W);
  const y = (v: number) => H - (v / max) * H;
  const path = (vals: number[]) =>
    vals
      .map((v, i) => {
        if (!i) return `M${x(0)} ${y(v)}`;
        const m = (x(i - 1) + x(i)) / 2;
        return `C${m} ${y(vals[i - 1])} ${m} ${y(v)} ${x(i)} ${y(v)}`;
      })
      .join("");
  const { ref, tip, move, leave } = useTip(n);
  const xs = labels.map((_, i) => ((x(i) + 10) / (W + 20)) * 100);
  const ys = labels.map((_, i) => ((y(series[0]?.values[i] ?? 0) + 10) / (H + 40)) * 100);
  const first = series[0];
  return (
    <div ref={ref} className={cn("px-chw", tip && "on")} onPointerMove={(e) => move(e, xs, ys)} onPointerLeave={leave}>
      {tip && <span className="hl" style={{ left: `${tip.x}%` }} />}
      {tip && (
        <div className="px-tip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>
          <b>{labels[tip.i]}</b>
          {series.map((s) => (
            <div key={s.name}>
              <i style={{ background: s.color }} />
              {s.name}: <b>{fmt(s.values[tip.i] ?? 0)}{unit && ` ${unit}`}</b>
            </div>
          ))}
        </div>
      )}
      <svg className="px-chart" viewBox={`-10 -10 ${W + 20} ${H + 40}`} aria-hidden="true">
        <defs>
          <linearGradient id="pxa" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={first?.color} stopOpacity=".22" />
            <stop offset="1" stopColor={first?.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} className="gl" x1="0" x2={W} y1={H * f} y2={H * f} />
        ))}
        {first && <path className="ar" d={`${path(first.values)}L${x(n - 1)} ${H}L${x(0)} ${H}Z`} fill="url(#pxa)" />}
        {series.map((s, k) => (
          <path key={s.name} className="ln" style={{ animationDelay: `${k * 0.2}s` }} pathLength={1} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={k ? 2 : 2.6} strokeDasharray={s.dashed ? "5 5" : undefined} strokeLinecap="round" />
        ))}
        {first && n > 1 && (
          <circle className="rx-run" r="6" fill="#fff3d6">
            <animateMotion dur="6s" repeatCount="indefinite" path={path(first.values)} />
          </circle>
        )}
        {first?.values.map((v, i) => <circle key={i} className="ar" cx={x(i)} cy={y(v)} r="3.5" fill="var(--l-surface)" stroke={first.color} strokeWidth="2" />)}
        {labels.map((m, i) => (
          <text key={m + i} x={x(i)} y={H + 26} textAnchor="middle">
            {m}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Columns, the last one in the accent, each showing its number on hover. */
/** One steady colour per calendar month (key "YYYY-MM"), so a month keeps its colour in every chart. */
const MONTH_COLORS = ["#4f8df5", "#8b6cf0", "#e0629b", "#ef6b5b", "#f2994a", "#e8c04a", "#9ccb4a", "#3fbf7f", "#2bb5a6", "#29a8d6", "#b07a52", "#8c97a8"];
export const monthColor = (key: string) => MONTH_COLORS[((Number(key.slice(5, 7)) || 1) - 1 + 12) % 12];

/** A hex colour lightened (t > 0) or darkened (t < 0) by that share. */
const shade = (hex: string, t: number) => {
  const n = parseInt(hex.slice(1), 16), to = t < 0 ? 0 : 255, a = Math.abs(t);
  const c = (s: number) => Math.round(((n >> s) & 255) * (1 - a) + to * a);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};

/** Bars; with `colors` (one per bar) they are drawn as the royal crystal vessels. */
export function PxBars(props: { labels: string[]; values: number[]; unit?: string; height?: number; extra?: (i: number) => ReactNode; colors?: string[] }) {
  return props.colors ? <RoyalVessels labels={props.labels} values={props.values} colors={props.colors} unit={props.unit} /> : <PxBarsPlain {...props} />;
}

function PxBarsPlain({ labels, values, unit = "", height = 220, extra, colors }: { labels: string[]; values: number[]; unit?: string; height?: number; extra?: (i: number) => ReactNode; colors?: string[] }) {
  const W = 640, H = height, n = labels.length, slot = W / Math.max(1, n), bw = Math.min(40, slot * 0.5);
  const max = Math.max(1, ...values) * 1.1;
  const cx = (i: number) => (rtl() ? W - (i + 0.5) * slot : (i + 0.5) * slot);
  const uid = useId().replace(/[^A-Za-z0-9]/g, "");
  const { ref, tip, move, leave } = useTip(n);
  const xs = labels.map((_, i) => ((cx(i) + 10) / (W + 20)) * 100);
  const ys = values.map((v) => ((H - (v / max) * H + 24) / (H + 50)) * 100);
  return (
    <div ref={ref} className={cn("px-chw", tip && "on")} onPointerMove={(e) => move(e, xs, ys)} onPointerLeave={leave}>
      {tip && <span className="hl" style={{ left: `${tip.x}%` }} />}
      {tip && (
        <div className="px-tip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>
          <b>{labels[tip.i]}</b>
          <div>
            <i style={{ background: colors?.[tip.i] ?? "var(--lx)" }} />
            <b>{fmt(values[tip.i])}{unit && ` ${unit}`}</b>
          </div>
          {extra?.(tip.i)}
        </div>
      )}
      <svg className="px-chart" viewBox={`-10 -24 ${W + 20} ${H + 50}`} aria-hidden="true">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} className="gl" x1="0" x2={W} y1={H * f} y2={H * f} />
        ))}
        {values.map((v, i) => {
          const bh = (v / max) * H;
          const col = colors?.[i];
          if (col) {
            // a solid bar: a lit front, a shaded side, a bright top and a soft shadow on the floor
            const d = Math.min(12, bw * 0.3), x0 = cx(i) - bw / 2, y0 = H - bh, g = (k: string) => `${uid}${k}${i}`;
            return (
              <g key={i}>
                <defs>
                  <linearGradient id={g("f")} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={shade(col, 0.38)} />
                    <stop offset="0.5" stopColor={col} />
                    <stop offset="1" stopColor={shade(col, -0.4)} />
                  </linearGradient>
                  <linearGradient id={g("s")} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={shade(col, -0.2)} />
                    <stop offset="1" stopColor={shade(col, -0.65)} />
                  </linearGradient>
                  <linearGradient id={g("t")} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor={shade(col, 0.6)} />
                    <stop offset="1" stopColor={shade(col, 0.25)} />
                  </linearGradient>
                  <linearGradient id={g("h")} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <ellipse cx={cx(i) + d / 2} cy={H + 1} rx={bw * 0.75} ry={4.5} fill="#000" opacity="0.38" />
                {bh > 0.5 && (
                  <g className="br" style={{ animationDelay: `${i * 70}ms` }}>
                    <polygon points={`${x0 + bw},${y0} ${x0 + bw + d},${y0 - d} ${x0 + bw + d},${H - d} ${x0 + bw},${H}`} fill={`url(#${g("s")})`} />
                    <rect x={x0} y={y0} width={bw} height={bh} rx="1.5" fill={`url(#${g("f")})`} />
                    <polygon points={`${x0},${y0} ${x0 + d},${y0 - d} ${x0 + bw + d},${y0 - d} ${x0 + bw},${y0}`} fill={`url(#${g("t")})`} />
                    <rect x={x0 + bw * 0.14} y={y0 + 4} width={Math.max(2, bw * 0.15)} height={Math.max(0, bh - 10)} rx="2" fill={`url(#${g("h")})`} opacity="0.55" />
                  </g>
                )}
                {v > 0 && (
                  <text x={cx(i) + d / 2} y={y0 - d - 8} textAnchor="middle" className="vl">
                    {fmt(v)}
                  </text>
                )}
                <text x={cx(i) + d / 2} y={H + 22} textAnchor="middle">
                  {labels[i]}
                </text>
              </g>
            );
          }
          return (
            <g key={i}>
              <rect className="br" x={cx(i) - bw / 2} y={H - bh} width={bw} height={Math.max(0, bh)} rx="6" fill={i === n - 1 ? "var(--lx)" : "color-mix(in srgb, var(--lx) 30%, var(--l-surface))"} style={{ animationDelay: `${i * 70}ms` }} />
              {v > 0 && (
                <text x={cx(i)} y={H - bh - 8} textAnchor="middle" className="vl">
                  {fmt(v)}
                </text>
              )}
              <text x={cx(i)} y={H + 22} textAnchor="middle">
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** A ring split by share, with its total in the middle and a key beside it. */
export function PxDonut({ parts, center, centerLabel }: { parts: { label: string; value: number; color: string }[]; center: ReactNode; centerLabel: string }) {
  return <RoyalDonut parts={parts} center={center} centerLabel={centerLabel} />;
}

/* ---------------- side panel ---------------- */

/** A panel that slides in from the side; Escape or the backdrop closes it. */
export function PxDrawer({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <>
      <div className="px-dv" onClick={onClose} />
      <aside className="px-drawer" role="dialog" aria-modal="true" aria-label={label} dir={rtl() ? "rtl" : "ltr"}>
        <button type="button" className="px-x" onClick={onClose} aria-label={rtl() ? "إغلاق" : "Close"}>
          <X />
        </button>
        {children}
      </aside>
    </>,
    document.body
  );
}

/** "Showing 1 to 20 of 54" and the page numbers, with arrows. */
export function PxPager({ page, pages, total, pageSize, onChange }: { page: number; pages: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const ar = rtl();
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const list = Array.from({ length: pages }, (_, k) => k + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  return (
    <div className="px-pager no-print">
      {ar ? `عرض ${from} إلى ${to} من ${total}` : `Showing ${from} to ${to} of ${total}`}
      <span className="sp" />
      <div className="pg">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={ar ? "السابق" : "Previous"}>
          {ar ? "›" : "‹"}
        </button>
        {list.map((p, k) => (
          <span key={p} className="contents">
            {k > 0 && p - list[k - 1] > 1 && (
              <button type="button" disabled>
                …
              </button>
            )}
            <button type="button" aria-current={p === page ? "page" : undefined} onClick={() => onChange(p)}>
              {p}
            </button>
          </span>
        ))}
        <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label={ar ? "التالي" : "Next"}>
          {ar ? "‹" : "›"}
        </button>
      </div>
    </div>
  );
}
