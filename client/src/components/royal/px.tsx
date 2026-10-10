import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { isRtlLanguage } from "@/i18n";
import i18n from "@/i18n";
import { cn } from "@/lib/utils";

/* The pieces of the approved luxury preview (styles/px.css): figure cards with
   a trend line, titled cards, tabs with counts, charts that show their numbers
   on hover, a side panel and the status badge. */

const rtl = () => isRtlLanguage(i18n.language);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** Counts up from zero once, or shows a text value as it is. */
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
  return <>{typeof to === "number" ? fmt(n) : to}</>;
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
  value: number | string;
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
        <Count to={value} />
        {unit && <small>{unit}</small>}
      </b>
      <span className="d">
        {chip && <span className={cn("px-chip", chip.tone)}>{chip.text}</span>}
        {sub}
      </span>
      {spark && <Spark values={spark} color={color} />}
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
export function PxBars({ labels, values, unit = "", height = 220, extra }: { labels: string[]; values: number[]; unit?: string; height?: number; extra?: (i: number) => ReactNode }) {
  const W = 640, H = height, n = labels.length, slot = W / Math.max(1, n), bw = Math.min(40, slot * 0.5);
  const max = Math.max(1, ...values) * 1.1;
  const cx = (i: number) => (rtl() ? W - (i + 0.5) * slot : (i + 0.5) * slot);
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
            <i style={{ background: "var(--lx)" }} />
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
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  const R = 52, L = 2 * Math.PI * R, tot = parts.reduce((s, p) => s + p.value, 0);
  let off = 0;
  return (
    <div className="px-donut">
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--l-ground)" strokeWidth="16" />
        {tot > 0 &&
          parts.map((p) => {
            const len = Math.max(0, (p.value / tot) * L - (parts.filter((q) => q.value > 0).length > 1 ? 2 : 0));
            const c = (
              <circle key={p.label} className="seg" cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${on ? len : 0} ${L}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" />
            );
            off += (p.value / tot) * L;
            return p.value > 0 ? c : null;
          })}
        <text x="70" y="68" textAnchor="middle" className="c">
          {center}
        </text>
        <text x="70" y="88" textAnchor="middle" className="cl">
          {centerLabel}
        </text>
      </svg>
      <div className="k">
        {parts.map((p) => (
          <div key={p.label} style={{ ["--c" as string]: p.color }}>
            <i />
            {p.label}
            <b>{fmt(p.value)}</b>
          </div>
        ))}
      </div>
    </div>
  );
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
