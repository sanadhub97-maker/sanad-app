import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useUiStore } from "@/stores/uiStore";

/* The Maison pieces the shell draws (styles/maison.css): the turning gold
   emblem behind each page's icon, gold dust in the title band, the curtain
   between pages, the light following the pointer and the rolling figures. */

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const useMotion = () => useUiStore((s) => s.animationsEnabled) && !reduced();

const starPts = (cx: number, cy: number, r: number, rot: number) =>
  Array.from({ length: 4 }, (_, i) => {
    const a = rot + (i * Math.PI) / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

let gid = 0;
function Face() {
  const [id] = useState(() => `mzg${++gid}`);
  return (
    <svg className="mz-face" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b38b4a" />
          <stop offset=".35" stopColor="#fff6dd" />
          <stop offset=".55" stopColor="#cfae6c" />
          <stop offset=".8" stopColor="#f6e7c4" />
          <stop offset="1" stopColor="#a07c3e" />
        </linearGradient>
      </defs>
      <polygon points={starPts(50, 50, 47, 0)} fill="none" stroke={`url(#${id})`} strokeWidth="2.2" />
      <polygon points={starPts(50, 50, 47, Math.PI / 4)} fill="none" stroke={`url(#${id})`} strokeWidth="2.2" />
      <circle cx="50" cy="50" r="33" fill="none" stroke={`url(#${id})`} strokeWidth="1" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={`url(#${id})`} strokeWidth=".5" strokeDasharray="1 3" />
    </svg>
  );
}

/** The gold star that turns in 3D behind a page's icon. */
export function Emblem() {
  return (
    <>
      <span className="mz-emblem" aria-hidden="true">
        <Face />
        <Face />
      </span>
      <span className="mz-core" aria-hidden="true" />
    </>
  );
}

/** Gold dust drifting up through the title band. */
export function GoldDust() {
  const ref = useRef<HTMLCanvasElement>(null);
  const motion = useMotion();
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    let W = 0, H = 0, raf = 0;
    let dots: { x: number; y: number; r: number; v: number; a: number }[] = [];
    const size = () => {
      const r = cv.getBoundingClientRect();
      W = cv.width = r.width * dpr;
      H = cv.height = r.height * dpr;
      dots = Array.from({ length: Math.round(r.width / 11) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.5 + 0.3) * dpr, v: Math.random() * 0.22 + 0.05, a: Math.random() * 6.3 }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        if (motion) { d.y -= d.v * dpr; d.a += 0.02; }
        if (d.y < -5) { d.y = H + 5; d.x = Math.random() * W; }
        ctx.beginPath();
        ctx.arc(d.x + Math.sin(d.a) * 3, d.y, d.r, 0, 7);
        ctx.fillStyle = `rgba(243, 223, 174, ${0.45 + Math.sin(d.a) * 0.25})`;
        ctx.shadowColor = "rgba(243, 223, 174, .9)";
        ctx.shadowBlur = 8 * dpr;
        ctx.fill();
      }
      if (motion && !document.hidden) raf = requestAnimationFrame(draw);
    };
    size();
    draw();
    const restart = () => { cancelAnimationFrame(raf); if (!document.hidden) draw(); };
    window.addEventListener("resize", size);
    document.addEventListener("visibilitychange", restart);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", size); document.removeEventListener("visibilitychange", restart); };
  }, [motion]);
  return <canvas ref={ref} className="mz-dust" aria-hidden="true" />;
}

/** The curtain that closes and opens on a gold seal between pages. */
export function PageCurtain() {
  const { pathname } = useLocation();
  const motion = useMotion();
  const first = useRef(true);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!motion) return;
    setKey((k) => k + 1);
    const t = setTimeout(() => setKey(0), 1000);
    return () => clearTimeout(t);
  }, [pathname, motion]);
  if (!key) return null;
  return (
    <div key={key} className="mz-curtain" aria-hidden="true">
      <i className="l" />
      <i className="r" />
      <span className="seal">
        <Face />
        <span className="mz-core" />
      </span>
    </div>
  );
}

/** A soft light that follows the pointer over the page ground. */
export function useCursorLight(el: React.RefObject<HTMLElement | null>) {
  const motion = useMotion();
  useEffect(() => {
    const node = el.current;
    if (!node || !motion) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { node.style.setProperty("--mx", `${e.clientX}px`); node.style.setProperty("--my", `${e.clientY}px`); });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", move); };
  }, [el, motion]);
}

/** A figure whose digits roll into place like an old odometer. Anything that is not a plain number shows as is. */
export function Odometer({ value }: { value: ReactNode }) {
  const motion = useMotion();
  const text = typeof value === "number" ? value.toLocaleString("en-US") : typeof value === "string" ? value : null;
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(t);
  }, [text]);
  if (!motion || text === null || !/^[\d,.\s]+$/.test(text) || !/\d/.test(text)) return <>{value}</>;
  let n = 0;
  return (
    <span className="mz-odo" aria-label={text}>
      {[...text].map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="dg" aria-hidden="true">
            <span className="col" style={{ transform: on ? `translateY(-${Number(ch) * 1.15}em)` : undefined, transitionDelay: `${n++ * 90}ms` }}>
              {Array.from({ length: 10 }, (_, d) => <span key={d} className="d">{d}</span>)}
            </span>
          </span>
        ) : (
          <span key={i} className="sep" aria-hidden="true">{ch}</span>
        )
      )}
    </span>
  );
}
