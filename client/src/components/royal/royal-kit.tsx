import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { tr } from "@/i18n";

/* The unified royal cards (approved in the "royal cards" preview): a double gold frame with
   corner brackets, emblems cast in gold on black coins, bars that keep flowing, a type ledger,
   an activity timeline and the follow-up ledger with a deadline ruler. */

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const seed = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };

function useCount(to: number, delay = 200, ms = 1500) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced()) { setN(to); return; }
    let id = 0;
    const t0 = performance.now() + delay;
    const step = (now: number) => { const k = Math.min(1, Math.max(0, (now - t0) / ms)); setN(to * (1 - Math.pow(1 - k, 3))); if (k < 1) id = requestAnimationFrame(step); };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [to, delay, ms]);
  return n;
}

/** Turns on after the first paint, so widths and rings animate in. */
function useOn() {
  const [on, setOn] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true))); return () => cancelAnimationFrame(id); }, []);
  return on;
}

/** The gold the coins' emblems are cast in; rendered once on the page. */
export function RoyalDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <linearGradient id="rk-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6dc98" /><stop offset=".35" stopColor="#d9b25a" /><stop offset=".55" stopColor="#a87e33" /><stop offset=".75" stopColor="#f0cf7e" /><stop offset="1" stopColor="#8f6a2a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** The emblem cast in polished gold on a black coin. */
export function Coin({ icon: Icon, size = 52, color, k = 0 }: { icon: LucideIcon; size?: number; color?: string; k?: number }) {
  return (
    <span className="rk-coin" style={{ ["--s" as string]: `${size}px`, ["--c" as string]: color ?? "#c9a464", ["--k" as string]: k } as CSSProperties}>
      <Icon stroke="url(#rk-gold)" strokeWidth={1.9} aria-hidden="true" />
    </span>
  );
}

function Corner({ k }: { k: string }) {
  return (
    <svg className={`rk-cn ${k}`} viewBox="0 0 50 50" aria-hidden="true">
      <path d="M1 49V17A16 16 0 0 1 17 1H49" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 49V19A14 14 0 0 1 19 5H49" fill="none" stroke="currentColor" strokeWidth=".7" opacity=".55" />
      <rect x="9.2" y="9.2" width="5.6" height="5.6" transform="rotate(45 12 12)" fill="currentColor" />
    </svg>
  );
}

/** The frame, the corner brackets and the dust every royal card wears; `rosette` for the large ones. */
function Deco({ rosette, dust = 8 }: { rosette?: boolean; dust?: number }) {
  return (
    <>
      {rosette && (
        <svg className="rk-rosette" viewBox="-100 -100 200 200" aria-hidden="true">
          {Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; return <circle key={i} cx={Math.cos(a) * 34} cy={Math.sin(a) * 34} r={62} fill="none" stroke="currentColor" strokeWidth=".35" />; })}
        </svg>
      )}
      <div className="rk-frame" aria-hidden="true" />
      {["a", "b", "c", "d"].map((k) => <Corner key={k} k={k} />)}
      <div className="rk-dust" aria-hidden="true">
        {Array.from({ length: dust }, (_, i) => (
          <i key={i} style={{ left: `${4 + seed(i, 1) * 92}%`, ["--t" as string]: `${8 + seed(i, 2) * 7}s`, ["--d" as string]: `${-seed(i, 3) * 12}s`, ["--x" as string]: `${seed(i, 4) * 40 - 20}px` } as CSSProperties} />
        ))}
      </div>
    </>
  );
}

/** A royal card with a gold-foil head. */
export function RoyalCard({ title, sub, actions, total, i = 0, rosette = true, className, children }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; total?: { label: string; value: number; unit?: string }; i?: number; rosette?: boolean; className?: string; children: ReactNode }) {
  const t = useCount(total?.value ?? 0, 300, 1800);
  return (
    <section className={`rk-card${className ? ` ${className}` : ""}`} style={{ ["--k" as string]: i } as CSSProperties}>
      <Deco rosette={rosette} dust={rosette ? 14 : 8} />
      <div className="rk-body">
        <div className="rk-hd">
          <div>
            <h3>{title}</h3>
            {sub && <small>{sub}</small>}
          </div>
          {total ? (
            <div className="rk-total"><span>{total.label}</span><b>{fmt(t)}{total.unit && <small>{total.unit}</small>}</b></div>
          ) : actions}
        </div>
        <div className="rk-ln" />
        <div className="rk-pad">{children}</div>
      </div>
    </section>
  );
}

/** A flowing bar: stripes that move, a light that runs, a tip that breathes. */
export function FlowBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const on = useOn();
  return (
    <span className="rk-bar" style={{ ["--c" as string]: color } as CSSProperties}>
      <i style={{ width: on ? `${Math.max(0, Math.min(100, pct))}%` : 0, transitionDelay: `${delay}s` }} />
    </span>
  );
}

/** A stat card in the royal frame. */
export function RoyalStat({ label, value, unit, icon, color, chip, sub, bar, onClick, i = 0 }: { label: string; value: number; unit?: string; icon: LucideIcon; color: string; chip?: { text: string; tone: "up" | "dn" | "warn" }; sub?: ReactNode; bar?: number; onClick?: () => void; i?: number }) {
  const n = useCount(value, 150 + i * 60, 1300);
  const body = (
    <>
      <Deco dust={5} />
      <div className="rk-body rk-stat-b">
        <div className="r1"><span className="lbl">{label}</span><Coin icon={icon} size={48} color={color} k={i} /></div>
        <b className="val">{fmt(n)}{unit && <small>{unit}</small>}</b>
        <span className="sub">{chip && <span className={`rk-chip ${chip.tone}`}>{chip.text}</span>}{sub}</span>
        <FlowBar pct={bar ?? 0} color={color} delay={0.25 + i * 0.08} />
      </div>
    </>
  );
  const style = { ["--c" as string]: color, ["--k" as string]: i } as CSSProperties;
  return onClick ? <button type="button" className="rk-card rk-stat" style={style} onClick={onClick}>{body}</button> : <div className="rk-card rk-stat" style={style}>{body}</div>;
}

/* ---------------- documents by kind: a share strip, then a ledger ---------------- */

export interface KindRow { key: string; label: string; count: number; color: string; icon: LucideIcon; onOpen?: () => void }

export function KindLedger({ rows }: { rows: KindRow[] }) {
  const on = useOn();
  const tot = rows.reduce((a, r) => a + r.count, 0);
  const C = 2 * Math.PI * 19;
  return (
    <>
      <div className="rk-share" aria-hidden="true">
        {rows.map((r, k) => <i key={r.key} style={{ ["--c" as string]: r.color, ["--k" as string]: k, flexBasis: on && tot ? `calc(${(r.count / tot) * 100}% - 3px)` : 0, transitionDelay: `${0.2 + k * 0.1}s` } as CSSProperties} />)}
      </div>
      <div className="rk-ledger">
        {rows.map((r, k) => {
          const p = tot ? (r.count / tot) * 100 : 0;
          return <KindLine key={r.key} r={r} k={k} p={p} C={C} on={on} />;
        })}
      </div>
    </>
  );
}

function KindLine({ r, k, p, C, on }: { r: KindRow; k: number; p: number; C: number; on: boolean }) {
  const n = useCount(r.count, 200, 1500);
  return (
    <button type="button" className="rk-lg" style={{ ["--c" as string]: r.color, ["--k" as string]: k } as CSSProperties} onClick={r.onOpen}>
      <Coin icon={r.icon} size={50} color={r.color} k={k} />
      <span className="name">{r.label}</span>
      <span className="dots" aria-hidden="true" />
      <b className="cnt">{fmt(n)}</b>
      <span className="pct">
        <svg viewBox="0 0 46 46" aria-hidden="true">
          <circle className="tr" cx="23" cy="23" r="19" fill="none" strokeWidth="3.5" />
          <circle className="vl" cx="23" cy="23" r="19" fill="none" strokeWidth="3.5" strokeDasharray={C} strokeDashoffset={on ? C * (1 - p / 100) : C} style={{ transitionDelay: `${0.3 + k * 0.08}s` }} />
        </svg>
        {Math.round(p)}٪
      </span>
    </button>
  );
}

/* ---------------- the activity timeline ---------------- */

export interface TimelineEvent { id: string; title: string; tag: string; who: string; when: string; color: string; icon: LucideIcon }

export function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="rk-tl">
      {events.map((e, k) => (
        <div key={e.id} className="rk-ev" style={{ ["--c" as string]: e.color, ["--k" as string]: k } as CSSProperties}>
          <Coin icon={e.icon} size={52} color={e.color} k={k} />
          <span className="who"><b>{e.title}</b><span><span className="tag">{e.tag}</span>{e.who}</span></span>
          <time>{e.when}</time>
        </div>
      ))}
    </div>
  );
}

/* ---------------- the follow-up ledger with the deadline ruler ---------------- */

export interface FollowRow { key: string; doc: string; who: string; date: string; days: number; icon: LucideIcon; onOpen?: () => void }

const dueColor = (d: number) => (d < 0 ? "#ef6b5b" : d <= 7 ? "#e39a14" : "#e9c46a");

export function FollowLedger({ rows, isAr }: { rows: FollowRow[]; isAr: boolean }) {
  const on = useOn();
  return (
    <div className="rk-scroll">
      <table className="rk-led">
        <thead>
          <tr>
            <th>{tr("الوثيقة", "Document")}</th>
            <th>{tr("تاريخ الانتهاء", "Expiry date")}</th>
            <th>{tr("الموعد", "Deadline")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, k) => {
            const late = r.days < 0;
            const pos = late ? 100 : Math.max(4, 100 - (Math.min(r.days, 30) / 30) * 100);
            const n = Math.abs(r.days);
            return (
              <tr key={r.key} className={r.onOpen ? "click" : undefined} style={{ ["--c" as string]: dueColor(r.days), ["--k" as string]: k } as CSSProperties} onClick={r.onOpen}>
                <td>
                  <span className="doc"><Coin icon={r.icon} size={40} color={dueColor(r.days)} k={k} /><span><b>{r.doc}</b><small>{r.who}</small></span></span>
                </td>
                <td className="date">{r.date}</td>
                <td>
                  <div className={`rk-due${late ? " late" : ""}`}>
                    <b>{n}</b>
                    <span className="lbl">
                      <em>{late ? (isAr ? "يوم متأخرة" : "days late") : isAr ? "يوم باقي" : "days left"}</em>
                      <span>{late ? (isAr ? "انتهت، تحتاج تجديد فورًا" : "expired, renew now") : r.days === 0 ? (isAr ? "تنتهي اليوم" : "ends today") : isAr ? "قبل الانتهاء" : "before expiry"}</span>
                    </span>
                    <div className="rk-trk"><i style={{ insetInlineStart: on ? `${pos}%` : "0%", transitionDelay: `${0.3 + k * 0.08}s` }} /></div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- a royal area chart: a gold line that draws itself, plaques with each figure ---------------- */

export function RoyalArea({ labels, values, rtl }: { labels: string[]; values: number[]; rtl: boolean }) {
  const W = 1000, H = 250, T = 46, B = 196, padX = 46, n = values.length;
  const max = Math.max(1, ...values) * 1.15;
  const step = n > 1 ? (W - padX * 2) / (n - 1) : 0;
  const x = (i: number) => (n === 1 ? W / 2 : rtl ? W - padX - i * step : padX + i * step);
  const y = (v: number) => B - (v / max) * (B - T);
  const pts = values.map((v, i) => [x(i), y(v)] as const);
  const line = pts.map((p, i) => { if (!i) return `M${p[0]} ${p[1]}`; const q = pts[i - 1]; const mx = (q[0] + p[0]) / 2; return `C${mx} ${q[1]} ${mx} ${p[1]} ${p[0]} ${p[1]}`; }).join(" ");
  const area = n ? `${line} L${pts[n - 1][0]} ${B} L${pts[0][0]} ${B} Z` : "";
  const on = useOn();
  return (
    <div className="rk-area">
      <svg viewBox={`0 0 ${W} ${H + 40}`} aria-hidden="true">
        <defs>
          <linearGradient id="rk-area-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e9c777" stopOpacity=".38" /><stop offset="1" stopColor="#e9c777" stopOpacity="0" /></linearGradient>
          <linearGradient id="rk-area-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8f6a2a" /><stop offset=".3" stopColor="#f3dfae" /><stop offset=".5" stopColor="#fff3d6" /><stop offset=".7" stopColor="#f3dfae" /><stop offset="1" stopColor="#8f6a2a" /></linearGradient>
          <filter id="rk-area-glow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="4" /></filter>
        </defs>
        {[0, 1, 2, 3].map((k) => <line key={k} className="gl" x1={padX - 20} x2={W - padX + 20} y1={T + ((B - T) * k) / 3} y2={T + ((B - T) * k) / 3} />)}
        <rect x={padX - 26} y={B} width={W - padX * 2 + 52} height={3} rx={1.5} fill="url(#rk-gold)" />
        <path d={area} fill="url(#rk-area-f)" className={on ? "fill on" : "fill"} />
        <path id="rk-area-path" d={line} fill="none" stroke="url(#rk-area-l)" strokeWidth="7" opacity=".45" filter="url(#rk-area-glow)" className={on ? "ln on" : "ln"} pathLength={1} />
        <path d={line} fill="none" stroke="url(#rk-area-l)" strokeWidth="3" strokeLinecap="round" className={on ? "ln on" : "ln"} pathLength={1} />
        {n > 1 && !reduced() && (
          <circle r="5" fill="#fff8e6" className="spark-run">
            <animateMotion dur="5s" repeatCount="indefinite" rotate="auto"><mpath href="#rk-area-path" /></animateMotion>
          </circle>
        )}
        {pts.map((p, i) => {
          const cur = i === 0;
          return (
            <g key={i} className="node" style={{ ["--k" as string]: i } as CSSProperties}>
              <line x1={p[0]} x2={p[0]} y1={p[1] + 10} y2={B} stroke="#c9a464" strokeOpacity=".4" strokeDasharray="3 4" />
              <rect x={p[0] - 7} y={p[1] - 7} width={14} height={14} transform={`rotate(45 ${p[0]} ${p[1]})`} fill="url(#rk-gold)" stroke="#0b0906" strokeWidth="2" />
              <g className="plq">
                <rect x={p[0] - 26} y={p[1] - 44} width={52} height={26} rx={8} className="plq-bg" stroke="url(#rk-gold)" strokeWidth="1.2" />
                <text x={p[0]} y={p[1] - 26} textAnchor="middle" className="v">{fmt(values[i])}</text>
              </g>
              <rect x={p[0] - 40} y={B + 14} width={80} height={26} rx={13} className={cur ? "mon-bg cur" : "mon-bg"} />
              <text x={p[0]} y={B + 32} textAnchor="middle" className={cur ? "mon cur" : "mon"}>{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
