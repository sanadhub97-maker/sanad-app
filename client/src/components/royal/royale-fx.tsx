import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/* The Royale motion layer (styles/royale.css): gold motes drifting behind the
   site, a beam of light running round the frame of cards, a spotlight inside
   the card under the pointer (the card stays still), a gold curtain with the
   seal between pages, and the engraved rosette medallion. */

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The cards that get the running beam and the spotlight. */
const FRAMED = ".px-card,.px-stat,.px-welcome,.rc-rp,.rc-lic,.rc-dcard,.tk-card,.vio-card,.cu-card,.cu-kpi,.lu-cc";

/** An engraved rosette: rings of rippled gold lines, turning slowly, like a banknote seal. */
export function Rosette({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const still = reduced();
    let t = 0;
    let id = 0;
    const frame = () => {
      const size = cv.clientWidth * dpr;
      if (!size) {
        id = requestAnimationFrame(frame);
        return;
      }
      if (cv.width !== size) cv.width = cv.height = size;
      const W = cv.width, c = W / 2, R = W * 0.47;
      ctx.clearRect(0, 0, W, W);
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(t);
      const g = ctx.createLinearGradient(-R, -R, R, R);
      g.addColorStop(0, "rgba(138,106,53,.55)");
      g.addColorStop(0.45, "rgba(243,223,174,.85)");
      g.addColorStop(1, "rgba(165,128,63,.55)");
      for (let k = 0; k < 22; k++) {
        ctx.beginPath();
        for (let i = 0; i <= 360; i++) {
          const a = (i / 360) * Math.PI * 2;
          const r = R * (0.62 + 0.07 * Math.sin(16 * a + k * 0.29) + 0.05 * Math.cos(7 * a - k * 0.17));
          const x = r * Math.cos(a), y = r * Math.sin(a);
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = g;
        ctx.lineWidth = 0.6 * dpr;
        ctx.stroke();
      }
      for (const [rr, w] of [[0.985, 1.6], [0.93, 0.7], [0.4, 1.2], [0.36, 0.5]]) {
        ctx.beginPath();
        ctx.arc(0, 0, R * rr, 0, 7);
        ctx.strokeStyle = "rgba(233,204,142,.75)";
        ctx.lineWidth = w * dpr;
        ctx.stroke();
      }
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2, e = i % 6 ? 0.95 : 0.975;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.93, Math.sin(a) * R * 0.93);
        ctx.lineTo(Math.cos(a) * R * e, Math.sin(a) * R * e);
        ctx.strokeStyle = "rgba(233,204,142,.7)";
        ctx.lineWidth = 0.8 * dpr;
        ctx.stroke();
      }
      ctx.restore();
      t += 0.0016;
      if (!still) id = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(id);
  }, []);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

/** Engraved gold waves drifting slowly, behind the welcome band. */
export function Guilloche() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const still = reduced();
    let t = 0;
    let id = 0;
    const frame = () => {
      const w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = dpr;
      ctx.shadowColor = "rgba(243,223,174,.6)";
      ctx.shadowBlur = 6 * dpr;
      for (let k = 0; k < 14; k++) {
        ctx.beginPath();
        for (let i = 0; i <= 200; i++) {
          const u = (i / 200) * w;
          const v = h * (0.62 + 0.2 * Math.sin((u / w) * 6.28 * 1.5 + k * 0.35 + t) * Math.cos((u / w) * 6.28 * 0.7 - k * 0.2));
          if (i) ctx.lineTo(u, v);
          else ctx.moveTo(u, v);
        }
        ctx.strokeStyle = `rgba(233,211,161,${0.08 + (k % 4) * 0.04})`;
        ctx.stroke();
      }
      t += 0.004;
      if (!still && !document.hidden) id = requestAnimationFrame(frame);
      else if (!still) id = window.setTimeout(frame, 500) as unknown as number;
    };
    frame();
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(id);
    };
  }, []);
  return <canvas ref={ref} className="rx-guil" aria-hidden="true" />;
}

/** The medallion: the rosette with a figure or a word in the middle. */
export function Medal({ children, big }: { children: React.ReactNode; big?: boolean }) {
  return (
    <div className={big ? "rx-medal big" : "rx-medal"}>
      <Rosette />
      <b>{children}</b>
    </div>
  );
}

/** Gold motes drifting up and twinkling behind the whole site (over its ground, under its content). */
function useMotes(root: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const host = root.current?.parentElement;
    if (!host || !enabled || reduced()) return;
    const cv = document.createElement("canvas");
    cv.className = "rx-motes";
    cv.setAttribute("aria-hidden", "true");
    host.prepend(cv);
    const ctx = cv.getContext("2d");
    if (!ctx) return () => cv.remove();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    let P: { x: number; y: number; r: number; v: number; a: number; s: number }[] = [];
    const size = () => {
      W = cv.width = window.innerWidth * dpr;
      H = cv.height = window.innerHeight * dpr;
      P = Array.from({ length: Math.round(window.innerWidth / 16) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: (Math.random() * 1.6 + 0.3) * dpr,
        v: (Math.random() * 0.2 + 0.04) * dpr,
        a: Math.random() * 6.3,
        s: Math.random() * 0.03 + 0.01,
      }));
    };
    size();
    window.addEventListener("resize", size);
    let id = 0;
    const frame = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.shadowColor = "rgba(243,223,174,.9)";
      ctx.shadowBlur = 10 * dpr;
      for (const p of P) {
        p.y -= p.v;
        p.a += p.s;
        if (p.y < -4) {
          p.y = H + 4;
          p.x = Math.random() * W;
        }
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(p.a * 0.7) * 4, p.y, p.r, 0, 7);
        ctx.fillStyle = `rgba(243,223,174,${0.25 + 0.55 * (0.5 + 0.5 * Math.sin(p.a))})`;
        ctx.fill();
      }
      id = requestAnimationFrame(frame);
    };
    // A hidden tab draws nothing.
    const vis = () => {
      cancelAnimationFrame(id);
      if (!document.hidden) id = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", vis);
    frame();
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", size);
      document.removeEventListener("visibilitychange", vis);
      cv.remove();
    };
  }, [root, enabled]);
}

/** The beam and the spotlight inside every framed card, and the spotlight following the mouse. */
function useFrames(root: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled || reduced()) return;
    const dress = () =>
      el.querySelectorAll<HTMLElement>(FRAMED).forEach((c) => {
        if (c.querySelector(":scope > .rx-beam")) return;
        const beam = document.createElement("i");
        beam.className = "rx-beam";
        beam.setAttribute("aria-hidden", "true");
        const spot = document.createElement("i");
        spot.className = "rx-spot";
        spot.setAttribute("aria-hidden", "true");
        c.append(beam, spot);
      });
    let queued = false;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        dress();
      });
    });
    mo.observe(el, { childList: true, subtree: true });
    dress();
    let last: PointerEvent | null = null;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!last)
        requestAnimationFrame(() => {
          const ev = last;
          last = null;
          const c = (ev?.target as HTMLElement | null)?.closest?.<HTMLElement>(FRAMED);
          if (!ev || !c) return;
          const r = c.getBoundingClientRect();
          c.style.setProperty("--sx", `${ev.clientX - r.left}px`);
          c.style.setProperty("--sy", `${ev.clientY - r.top}px`);
        });
      last = e;
    };
    document.addEventListener("pointermove", move);
    return () => {
      mo.disconnect();
      document.removeEventListener("pointermove", move);
    };
  }, [root, enabled]);
}

/** Between pages: two dark halves meet over the old page with the gold seal, then open on the new one. */
function useCurtain(enabled: boolean) {
  const path = useLocation().pathname;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!enabled || reduced()) return;
    const c = document.createElement("div");
    c.className = "rx-curtain";
    c.setAttribute("aria-hidden", "true");
    c.innerHTML = '<i class="l"></i><i class="r"></i><b>س</b>';
    document.body.appendChild(c);
    const ease = "cubic-bezier(.7,0,.3,1)", D = 720;
    const half = (sign: number) => [{ transform: "translateX(0)" }, { transform: "translateX(0)", offset: 0.25 }, { transform: `translateX(${sign * 101}%)` }];
    c.querySelector(".l")?.animate(half(-1), { duration: D, easing: ease });
    c.querySelector(".r")?.animate(half(1), { duration: D, easing: ease });
    c.querySelector("b")?.animate([{ opacity: 1, transform: "scale(1) rotate(0)" }, { opacity: 1, transform: "scale(1) rotate(0)", offset: 0.25 }, { opacity: 0, transform: "scale(1.5) rotate(40deg)" }], { duration: D, easing: ease });
    const id = window.setTimeout(() => c.remove(), D + 40);
    return () => {
      window.clearTimeout(id);
      c.remove();
    };
  }, [path, enabled]);
}

export function useRoyaleFx(root: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useMotes(root, enabled);
  useFrames(root, enabled);
  useCurtain(enabled);
}
