import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { isRtlLanguage } from "@/i18n";
import i18n from "@/i18n";
import { tr } from "@/i18n";

/* The royal charts: the status dial (a gold bezel, gem segments, a glass dome) and the monthly
   payments as crystal vessels that fill to each month's figure. Colours may be hex or CSS
   variables, so every light and shade is made with color-mix. */

const rtl = () => isRtlLanguage(i18n.language);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const lighter = (c: string, p: number) => `color-mix(in srgb, ${c} ${100 - p}%, #fff)`;
const darker = (c: string, p: number) => `color-mix(in srgb, ${c} ${100 - p}%, #000)`;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** A number that counts up to `to` after `delay` ms. */
function useCountUp(to: number, delay = 0, ms = 1500) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced()) {
      setN(to);
      return;
    }
    let id = 0;
    const t0 = performance.now() + delay;
    const step = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / ms));
      setN(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [to, delay, ms]);
  return n;
}

function Spark({ x, y, r, delay }: { x: number; y: number; r: number; delay: string }) {
  const d = `M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28}Z`;
  return <path className="pxr-spark" d={d} fill="#fff3d6" style={{ animationDelay: delay }} />;
}

/* ---------------------------------------------------------------- the status dial */

export interface DonutPart { label: string; value: number; color: string }

export function RoyalDonut({ parts, center, centerLabel }: { parts: DonutPart[]; center: ReactNode; centerLabel: string }) {
  const uid = useId().replace(/[^A-Za-z0-9]/g, "");
  const [on, setOn] = useState(false);
  const [active, setActive] = useState(-1);
  const ringRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  const C = 80, R = 49, w = 17, L = 2 * Math.PI * R;
  const tot = parts.reduce((s, p) => s + Math.max(0, p.value), 0);
  const live = parts.filter((p) => p.value > 0).length;
  const gap = live > 1 ? 3.2 : 0;
  let off = 0, delay = 0;
  const segs = parts.map((p, i) => {
    const share = tot > 0 ? Math.max(0, p.value) / tot : 0;
    const len = Math.max(0.01, share * L - gap - w);
    const start = off + gap / 2 + w / 2;
    const mid = ((off + (share * L) / 2) / L) * Math.PI * 2;
    const seg = { i, p, share, len, start, vx: Math.sin(mid), vy: -Math.cos(mid), delay };
    delay += 1.4 * share * 0.85;
    off += share * L;
    return seg;
  });
  const ir = R - w / 2 - 3.2;
  const num = typeof center === "number" ? center : null;
  const counted = useCountUp(num ?? 0, 200, 1500);
  const act = active >= 0 ? parts[active] : null;

  const tilt = (e: React.PointerEvent) => {
    if (reduced() || !ringRef.current) return;
    const b = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - b.left) / b.width - 0.5, dy = (e.clientY - b.top) / b.height - 0.5;
    ringRef.current.style.transform = `rotateY(${dx * -16}deg) rotateX(${dy * 16}deg)`;
  };
  const untilt = () => { if (ringRef.current) ringRef.current.style.transform = ""; setActive(-1); };

  return (
    <div className="pxr pxr-donut">
      <div className="pxr-stage" onPointerMove={tilt} onPointerLeave={untilt}>
        <div className="pxr-ring" ref={ringRef}>
          <svg viewBox="0 0 160 160" aria-hidden="true">
            <defs>
              {parts.map((p, i) => (
                <linearGradient key={i} id={`${uid}g${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style={{ stopColor: lighter(p.color, 50) }} />
                  <stop offset=".45" style={{ stopColor: p.color }} />
                  <stop offset="1" style={{ stopColor: darker(p.color, 42) }} />
                </linearGradient>
              ))}
              <linearGradient id={`${uid}gold`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff3d6" /><stop offset=".18" stopColor="#e9c777" /><stop offset=".4" stopColor="#8f6a2a" /><stop offset=".58" stopColor="#f3dfae" /><stop offset=".8" stopColor="#a87e33" /><stop offset="1" stopColor="#fff0c4" />
              </linearGradient>
              <radialGradient id={`${uid}well`} cx=".5" cy=".42" r=".62"><stop offset="0" style={{ stopColor: "var(--pxr-well-a)" }} /><stop offset="1" style={{ stopColor: "var(--pxr-well-b)" }} /></radialGradient>
              <radialGradient id={`${uid}floor`}><stop offset="0" stopColor="#000" stopOpacity=".55" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
              <linearGradient id={`${uid}dome`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".26" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
              <linearGradient id={`${uid}gl`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".95" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
              <linearGradient id={`${uid}band`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
              <clipPath id={`${uid}clip`}><circle cx={C} cy={C} r={ir} /></clipPath>
            </defs>
            <ellipse cx={C} cy={150} rx={56} ry={7.5} fill={`url(#${uid}floor)`} />
            <circle cx={C} cy={C} r={72} fill="var(--pxr-well-b)" stroke={`url(#${uid}gold)`} strokeWidth="3" />
            <circle cx={C} cy={C} r={68.6} fill="none" stroke={`url(#${uid}gold)`} strokeWidth=".7" opacity=".85" />
            <g className="pxr-slow">
              {Array.from({ length: 72 }, (_, t) => {
                const a = (t / 72) * Math.PI * 2, big = t % 6 === 0, r2 = big ? 62.6 : 64.4;
                return <line key={t} className={big ? "pxr-tick big" : "pxr-tick"} x1={C + Math.sin(a) * 66.5} y1={C - Math.cos(a) * 66.5} x2={C + Math.sin(a) * r2} y2={C - Math.cos(a) * r2} />;
              })}
            </g>
            <circle cx={C} cy={C} r={R} fill="none" stroke="var(--pxr-track)" strokeWidth={w} />
            <g transform={`rotate(-90 ${C} ${C})`}>
              {tot > 0 && segs.filter((s) => s.p.value > 0).map((s) => {
                const dash = (len: number) => `${on ? len : 0.001} ${L}`;
                const common = { cx: C, cy: C, fill: "none" as const, strokeLinecap: "round" as const, strokeDashoffset: -s.start, style: { transitionDelay: `${s.delay}s` } as CSSProperties };
                const dim = active >= 0 && active !== s.i;
                return (
                  <g key={s.i} className="pxr-segw" style={{ transform: active === s.i ? `translate(${s.vx * 3.4}px, ${s.vy * 3.4}px)` : undefined }} onPointerEnter={() => setActive(s.i)}>
                    {[5, 3.5, 2].map((dy, k) => (
                      <circle key={dy} {...common} className={`pxr-seg${dim ? " dim" : ""}`} r={R} stroke={darker(s.p.color, 70 - k * 12)} strokeWidth={w} strokeDasharray={dash(s.len)} transform={`translate(0,${dy})`} />
                    ))}
                    <circle {...common} className={`pxr-seg${dim ? " dim" : ""}${s.p.value > 0 && /rose|ef6b5b|e0475b|f57b8b/.test(s.p.color) ? " pxr-pulse" : ""}`} r={R} stroke={`url(#${uid}g${s.i})`} strokeWidth={w} strokeDasharray={dash(s.len)} />
                    <circle {...common} className={`pxr-seg${dim ? " dim" : ""}`} r={R - w * 0.1} stroke={`url(#${uid}band)`} strokeWidth={w * 0.34} strokeOpacity=".85" strokeDasharray={dash(s.len)} />
                    <circle {...common} className={`pxr-seg${dim ? " dim" : ""}`} r={R + w / 2 - 0.9} stroke="#fff" strokeWidth="1" strokeOpacity=".55" strokeDasharray={dash(s.len)} />
                    <circle {...common} className={`pxr-seg${dim ? " dim" : ""}`} r={R - w / 2 + 0.9} stroke="#000" strokeWidth=".8" strokeOpacity=".35" strokeDasharray={dash(s.len)} />
                  </g>
                );
              })}
            </g>
            <g className="pxr-orbit" style={{ pointerEvents: "none" }}>
              <circle cx={C} cy={C} r={R} fill="none" stroke={`url(#${uid}gl)`} strokeWidth={w * 0.5} strokeLinecap="round" strokeDasharray={`30 ${2 * Math.PI * R * 1.2}`} transform={`rotate(-90 ${C} ${C})`} opacity=".55" style={{ mixBlendMode: "overlay" }} />
            </g>
            <circle cx={C} cy={C} r={ir + 2} fill="none" stroke={`url(#${uid}gold)`} strokeWidth="2.4" />
            <circle cx={C} cy={C} r={ir} fill={`url(#${uid}well)`} />
            <circle cx={C} cy={C} r={ir - 3} fill="none" stroke={`url(#${uid}gold)`} strokeWidth=".4" opacity=".6" />
            <g clipPath={`url(#${uid}clip)`} style={{ pointerEvents: "none" }}>
              <ellipse cx={C - 8} cy={C - 17} rx={ir * 0.78} ry={ir * 0.42} fill={`url(#${uid}dome)`} transform={`rotate(-24 ${C} ${C})`} />
            </g>
            <Spark x={24} y={30} r={3.6} delay="0s" /><Spark x={128} y={36} r={2.8} delay="1.1s" /><Spark x={138} y={104} r={3.2} delay="2.2s" /><Spark x={34} y={118} r={2.6} delay="0.6s" /><Spark x={100} y={18} r={2.4} delay="1.8s" />
          </svg>
          <div className="pxr-mid">
            <b style={act ? ({ ["--foil" as string]: `linear-gradient(100deg, ${darker(act.color, 25)}, ${lighter(act.color, 50)} 35%, #fff 50%, ${act.color} 70%, ${darker(act.color, 25)})` } as CSSProperties) : undefined}>
              {act ? fmt(act.value) : num !== null ? fmt(counted) : center}
            </b>
            <span>{act ? act.label : centerLabel}</span>
            <em>{act && tot > 0 ? `${Math.round((act.value / tot) * 100)}٪ ${tr("من الإجمالي", "of the total")}` : ""}</em>
          </div>
        </div>
      </div>
      <div className="pxr-leg" role="list" onPointerLeave={() => setActive(-1)}>
        {parts.map((p, i) => (
          <DonutRow key={p.label} p={p} i={i} tot={tot} on={on} dim={active >= 0 && active !== i} act={active === i} onPick={setActive} delay={i * 0.12} />
        ))}
      </div>
    </div>
  );
}

function DonutRow({ p, i, tot, on, dim, act, onPick, delay }: { p: DonutPart; i: number; tot: number; on: boolean; dim: boolean; act: boolean; onPick: (i: number) => void; delay: number }) {
  const n = useCountUp(p.value, 200, 1500);
  const pct = tot > 0 ? (p.value / tot) * 100 : 0;
  return (
    <div role="listitem" tabIndex={0} className={`pxr-row${act ? " on" : ""}${dim ? " dim" : ""}`} style={{ ["--c" as string]: p.color }} onPointerEnter={() => onPick(i)} onFocus={() => onPick(i)} onBlur={() => onPick(-1)}>
      <span className="gem" />
      <strong>{p.label}</strong>
      <span className="n">{fmt(n)}</span>
      <span className="p">{Math.round(pct)}٪</span>
      <span className="bar"><i style={{ width: on ? `${pct}%` : 0, transitionDelay: `${delay}s` }} /></span>
    </div>
  );
}

/* ---------------------------------------------------------------- the crystal vessels */

const niceMax = (m: number) => {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(m, 1)))), x = m / p;
  return ([1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find((q) => q >= x) ?? 10) * p;
};
const seed = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };

export function RoyalVessels({ labels, values, colors, unit = "" }: { labels: string[]; values: number[]; colors: string[]; unit?: string }) {
  const uid = useId().replace(/[^A-Za-z0-9]/g, "");
  const [hover, setHover] = useState(-1);
  const wrap = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const n = labels.length, W = 700, H = 210, T = 62;
  const max = niceMax(Math.max(1, ...values) * 1.08);
  const slot = (W - 52) / Math.max(1, n), tw = Math.min(60, slot * 0.5), r0 = tw / 2;
  // time runs with the reading direction: the oldest month first on the right in Arabic
  const cx = (i: number) => (rtl() ? (W - 52) - (i + 0.5) * slot : (i + 0.5) * slot);
  const tube = (xl: number, xr: number, yt: number, yb: number) => { const r = (xr - xl) / 2; return `M${xl} ${yb} L${xl} ${yt + r} A${r} ${r} 0 0 1 ${xr} ${yt + r} L${xr} ${yb} Z`; };
  const maxI = values.indexOf(Math.max(...values));
  const vb = { x: -58, y: -22, w: 764, h: 372 };
  const lastI = n - 1;

  const tipPos = (i: number) => {
    const xv = cx(i), yv = T - 56;
    return { left: `${((xv - vb.x) / vb.w) * 100}%`, top: `${Math.max(8, ((yv - vb.y) / vb.h) * 100)}%` };
  };

  return (
    <div className="pxr pxr-vessels" ref={wrap} aria-label={tr("أعمدة المدفوعات الشهرية", "Monthly payments")} onPointerLeave={() => setHover(-1)}>
      <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} role="img" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}gold`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3d6" /><stop offset=".2" stopColor="#e9c777" /><stop offset=".45" stopColor="#8f6a2a" /><stop offset=".62" stopColor="#f3dfae" /><stop offset=".85" stopColor="#a87e33" /><stop offset="1" stopColor="#fff0c4" /></linearGradient>
          <linearGradient id={`${uid}collar`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff3d6" /><stop offset=".4" stopColor="#d6b678" /><stop offset="1" stopColor="#7a5a22" /></linearGradient>
          <linearGradient id={`${uid}collarh`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7a5a22" /><stop offset=".25" stopColor="#f3dfae" /><stop offset=".5" stopColor="#fff3d6" /><stop offset=".75" stopColor="#c9a464" /><stop offset="1" stopColor="#6d4f1c" /></linearGradient>
          <linearGradient id={`${uid}glg`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c9a464" stopOpacity="0" /><stop offset=".12" stopColor="#c9a464" stopOpacity=".5" /><stop offset=".88" stopColor="#c9a464" stopOpacity=".5" /><stop offset="1" stopColor="#c9a464" stopOpacity="0" /></linearGradient>
          <linearGradient id={`${uid}floor`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: "var(--pxr-floor-a)" }} /><stop offset="1" style={{ stopColor: "var(--pxr-floor-b)" }} /></linearGradient>
          <linearGradient id={`${uid}glassv`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".22" /><stop offset=".18" stopColor="#fff" stopOpacity=".04" /><stop offset=".7" stopColor="#fff" stopOpacity=".02" /><stop offset="1" stopColor="#fff" stopOpacity=".16" /></linearGradient>
          <filter id={`${uid}blur`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" /></filter>
          {values.map((_, i) => {
            const c = colors[i] ?? "#c9a464";
            return (
              <g key={i}>
                <linearGradient id={`${uid}lq${i}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" style={{ stopColor: darker(c, 50) }} /><stop offset=".2" style={{ stopColor: lighter(c, 5) }} /><stop offset=".38" style={{ stopColor: lighter(c, 50) }} /><stop offset=".6" style={{ stopColor: c }} /><stop offset=".88" style={{ stopColor: darker(c, 38) }} /><stop offset="1" style={{ stopColor: darker(c, 60) }} />
                </linearGradient>
                <linearGradient id={`${uid}lqv${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".25" /><stop offset=".25" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".45" /></linearGradient>
                <linearGradient id={`${uid}rf${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: c }} stopOpacity=".45" /><stop offset="1" style={{ stopColor: c }} stopOpacity="0" /></linearGradient>
                <linearGradient id={`${uid}bm${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".4" stopColor="#fff" stopOpacity=".1" /><stop offset="1" style={{ stopColor: c }} stopOpacity=".22" /></linearGradient>
                <clipPath id={`${uid}tube${i}`}><path d={tube(cx(i) - r0 + 2.5, cx(i) + r0 - 2.5, T + 2, T + H)} /></clipPath>
              </g>
            );
          })}
        </defs>

        {[1, 2, 3, 4].map((k) => {
          const y = T + H - (H * k) / 4;
          return (
            <g key={k}>
              <line className="pxr-gl" x1={-52} x2={W - 2} y1={y} y2={y} stroke={`url(#${uid}glg)`} />
              <text className="pxr-ax" x={rtl() ? W - 2 : -52} y={y - 6} textAnchor={rtl() ? "end" : "start"}>{fmt((max * k) / 4)}</text>
            </g>
          );
        })}
        <rect x={-52} y={T + H} width={W + 50} height={58} rx={8} fill={`url(#${uid}floor)`} />
        <rect x={-52} y={T + H} width={W + 50} height={3.2} rx={1.6} fill={`url(#${uid}gold)`} />
        <rect x={-52} y={T + H + 0.8} width={W + 50} height={1} fill="#fff" opacity=".6" />

        {values.map((v, i) => {
          const c = colors[i] ?? "#c9a464", X = cx(i), xl = X - r0, bh = (v / max) * H, ly = T + H - bh, cur = i === lastI, d = i * 0.12;
          const dim = hover >= 0 && hover !== i;
          return (
            <g key={i} className={`pxr-col${hover === i ? " on" : ""}${dim ? " dim" : ""}`} style={{ ["--glow" as string]: c }} onPointerEnter={() => setHover(i)}>
              <polygon className="pxr-beam" points={`${X - 10},${T - 28} ${X + 10},${T - 28} ${X + tw * 1.15},${T + H} ${X - tw * 1.15},${T + H}`} fill={`url(#${uid}bm${i})`} />
              {bh > 1 && <rect x={xl + 3} y={T + H + 12} width={tw - 6} height={Math.min(44, bh * 0.5)} fill={`url(#${uid}rf${i})`} filter={`url(#${uid}blur)`} opacity=".95" />}
              <path d={tube(xl, xl + tw, T, T + H)} fill="var(--pxr-glass)" />
              <path d={tube(xl, xl + tw, T, T + H)} fill={`url(#${uid}glassv)`} />
              {bh > 1 && (
                <g clipPath={`url(#${uid}tube${i})`}>
                  <g className="pxr-lift" style={{ ["--bh" as string]: `${bh}px`, animationDelay: `${d}s` }}>
                    <rect x={xl} y={ly} width={tw} height={bh + 4} fill={`url(#${uid}lq${i})`} />
                    <rect x={xl} y={ly} width={tw} height={bh + 4} fill={`url(#${uid}lqv${i})`} />
                    {[0, 1].map((q) => {
                      const ww = tw * 2;
                      let dd = `M${xl - ww} ${ly}`;
                      for (let s = 0; s < 4; s++) dd += ` q${tw / 4} ${q ? 3 : -4.2} ${tw / 2} 0 t${tw / 2} 0`;
                      dd += ` V${ly + 12} H${xl - ww} Z`;
                      return <path key={q} className={q ? "pxr-wave b" : "pxr-wave"} d={dd} fill={q ? lighter(c, 50) : lighter(c, 28)} style={{ ["--ww" as string]: `${ww}px`, animationDelay: `${-q * 1.3}s` }} />;
                    })}
                    <ellipse cx={X} cy={ly + 1} rx={r0 - 3} ry={2.6} fill="#fff" opacity=".38" />
                    {[0, 1, 2, 3].map((b) => (
                      <circle key={b} className="pxr-bub" cx={xl + 8 + seed(i, b) * (tw - 16)} cy={T + H - 6} r={1.1 + seed(b, i) * 1.6} fill="#fff" style={{ ["--rh" as string]: `${Math.max(0, bh - 8)}px`, ["--bt" as string]: `${3.2 + seed(i + 3, b) * 3}s`, ["--bd" as string]: `${d + 1.2 + seed(b, i + 7) * 3}s` }} />
                    ))}
                  </g>
                </g>
              )}
              <rect className="pxr-shim" x={xl + tw * 0.17} y={T + r0 + 4} width={Math.max(3, tw * 0.08)} height={H - r0 - 14} rx={2} fill="#fff" opacity=".45" style={{ animationDelay: `${i * 0.4}s` }} />
              <rect x={xl + tw - 5.5} y={T + r0 + 6} width={1.6} height={H - r0 - 20} rx={0.8} fill="#fff" opacity=".2" />
              <path d={`M${xl} ${T + r0 + 16} L${xl} ${T + r0} A${r0} ${r0} 0 0 1 ${xl + tw} ${T + r0} L${xl + tw} ${T + r0 + 16}`} fill="none" stroke={`url(#${uid}gold)`} strokeWidth="2.4" strokeLinecap="round" />
              <path d={`M${xl} ${T + r0 + 16} L${xl} ${T + H} M${xl + tw} ${T + r0 + 16} L${xl + tw} ${T + H}`} stroke={`url(#${uid}gold)`} strokeWidth=".9" opacity=".7" fill="none" />
              <rect x={xl - 5} y={T + H - 10} width={tw + 10} height={10} rx={2} fill={`url(#${uid}collarh)`} />
              <rect x={xl - 9} y={T + H} width={tw + 18} height={8} rx={2.5} fill={`url(#${uid}collar)`} />
              <rect x={xl - 9} y={T + H + 1} width={tw + 18} height={1.2} fill="#fff" opacity=".6" />
              <rect x={X - 5} y={T - 2.5} width={10} height={6} rx={1.5} fill={`url(#${uid}collarh)`} />
              <rect x={X - 3.2} y={T - 11} width={6.4} height={6.4} transform={`rotate(45 ${X} ${T - 7.8})`} fill={`url(#${uid}gold)`} />
              {bh > 1 && (
                <g className="pxr-pop" style={{ animationDelay: `${d + 1.1}s` }}>
                  <path d={`M${rtl() ? xl + tw + 3 : xl - 3} ${ly} l${rtl() ? 9 : -9} -5 v10 z`} fill={`url(#${uid}gold)`} />
                </g>
              )}
              {v > 0 && <Plaque x={X} y={T - 50} value={v} delay={d} cur={cur} color={c} gold={`url(#${uid}gold)`} />}
              <g>
                <rect x={X - 31} y={T + H + 24} width={62} height={24} rx={12} fill={cur ? `url(#${uid}gold)` : "var(--pxr-plaque)"} stroke={cur ? "none" : "var(--pxr-edge)"} strokeWidth="1" />
                <text className={`pxr-mon${cur ? " cur" : ""}`} x={X} y={T + H + 40.5} textAnchor="middle">{labels[i]}</text>
              </g>
              {i === maxI && bh > 0 && (<><Spark x={X - tw * 0.95} y={T - 30} r={5} delay="0s" /><Spark x={X + tw * 0.9} y={ly - 6} r={3.6} delay="1.3s" /></>)}
            </g>
          );
        })}
      </svg>
      <div className={`pxr-tip${hover >= 0 ? " on" : ""}`} style={hover >= 0 ? { ...tipPos(hover), ["--c" as string]: colors[hover] } : undefined} aria-hidden="true">
        {hover >= 0 && (
          <>
            <b>{labels[hover]}</b>
            <strong>{fmt(values[hover])}<small>{unit}</small></strong>
            {hover > 0 && values[hover - 1] > 0 ? (
              (() => { const ch = Math.round(((values[hover] - values[hover - 1]) / values[hover - 1]) * 100); return <em className={ch > 0 ? "up" : ch < 0 ? "down" : "flat"}>{ch > 0 ? "▲ " : ch < 0 ? "▼ " : ""}{Math.abs(ch)}٪ {tr("عن", "vs")} {labels[hover - 1]}</em>; })()
            ) : (
              <em className="flat">{hover === 0 ? tr("أول شهر في الرسم", "First month shown") : tr("الشهر السابق بدون مدفوعات", "No payments the month before")}</em>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Plaque({ x, y, value, delay, cur, color, gold }: { x: number; y: number; value: number; delay: number; cur: boolean; color: string; gold: string }) {
  const n = useCountUp(value, 500 + delay * 1000, 1500);
  return (
    <g className="pxr-pop" style={{ animationDelay: `${delay + 0.9}s` }}>
      <rect x={x - 33} y={y} width={66} height={25} rx={8} fill="var(--pxr-plaque)" stroke={gold} strokeWidth="1.1" />
      <rect x={x - 31} y={y + 2} width={62} height={10} rx={6} fill="#fff" opacity=".07" />
      <text className={`pxr-val${cur ? " cur" : ""}`} x={x} y={y + 17.5} textAnchor="middle" style={{ ["--vc" as string]: color } as CSSProperties}>{fmt(n)}</text>
    </g>
  );
}

/* ---------------------------------------------------------------- the royal card */

/** The framed card the royal charts sit in. "panel": the double gold frame, corner brackets, the
 * engraved rosette and the dust; "card": the lighter frame with a corner mark. Both have the
 * gold-foil title and a rule under the head. */
export function LuxeCard({ title, sub, total, variant = "panel", i = 0, children }: { title: ReactNode; sub?: ReactNode; total?: { label: string; value: number; unit?: string }; variant?: "panel" | "card"; i?: number; children: ReactNode }) {
  const t = useCountUp(total?.value ?? 0, 300, 1900);
  const panel = variant === "panel";
  return (
    <section className={`px-card pxl ${panel ? "pxl-panel" : "pxl-plain"}`} style={{ ["--i" as string]: i }}>
      {panel && (
        <svg className="pxl-deco pxl-rosette" viewBox="-100 -100 200 200" aria-hidden="true">
          {Array.from({ length: 36 }, (_, k) => { const a = (k / 36) * Math.PI * 2; return <circle key={k} cx={Math.cos(a) * 34} cy={Math.sin(a) * 34} r={62} fill="none" stroke="currentColor" strokeWidth=".35" />; })}
          <circle r={96} fill="none" stroke="currentColor" strokeWidth=".5" />
          <circle r={99} fill="none" stroke="currentColor" strokeWidth=".3" />
        </svg>
      )}
      {panel && <div className="pxl-deco pxl-frame" aria-hidden="true" />}
      {panel && ["a", "b", "c", "d"].map((k) => (
        <svg key={k} className={`pxl-deco pxl-corner ${k}`} viewBox="0 0 50 50" aria-hidden="true">
          <path d="M1 49V17A16 16 0 0 1 17 1H49" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M5 49V19A14 14 0 0 1 19 5H49" fill="none" stroke="currentColor" strokeWidth=".7" opacity=".55" />
          <rect x="9.2" y="9.2" width="5.6" height="5.6" transform="rotate(45 12 12)" fill="currentColor" />
        </svg>
      ))}
      <div className="pxl-deco pxl-dust" aria-hidden="true">
        {Array.from({ length: panel ? 18 : 12 }, (_, k) => (
          <i key={k} style={{ left: `${4 + seed(k, 1) * 92}%`, ["--t" as string]: `${8 + seed(k, 2) * 7}s`, ["--d" as string]: `${-seed(k, 3) * 12}s`, ["--x" as string]: `${seed(k, 4) * 40 - 20}px` } as CSSProperties} />
        ))}
      </div>
      <div className="pxl-hd">
        <div className="pxl-ttl">
          <h3>{title}</h3>
          {sub && <small>{sub}</small>}
        </div>
        {total && (
          <div className="pxl-total">
            <span>{total.label}</span>
            <b>{fmt(t)}<small>{total.unit}</small></b>
          </div>
        )}
      </div>
      <div className="pxl-ln" aria-hidden="true" />
      <div className="pxl-body">{children}</div>
    </section>
  );
}
