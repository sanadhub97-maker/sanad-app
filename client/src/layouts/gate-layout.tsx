import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";
import { cn } from "@/lib/utils";
import "@/styles/gate.css";

/* The sign-in pages as the SanaD gate (approved in the preview): a sky that
   follows the local time over moving dunes, the SanaD emblem over the rising
   sun with documents orbiting it, and the form on a glass panel. */

const GateContext = createContext<{ night: boolean }>({ night: false });
export const useGate = () => useContext(GateContext);

const isNight = () => {
  const h = new Date().getHours();
  return h < 6 || h >= 18;
};
const v = (o: Record<string, string | number>) => o as CSSProperties;

function Sky() {
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, () => ({
        top: `${(Math.random() * 100).toFixed(1)}%`,
        left: `${(Math.random() * 100).toFixed(1)}%`,
        d: `${(2 + Math.random() * 4).toFixed(1)}s`,
        dl: `-${(Math.random() * 5).toFixed(1)}s`,
        big: Math.random() < 0.2,
      })),
    []
  );
  const sparks = useMemo(
    () =>
      Array.from({ length: 22 }, () => ({
        left: `${(Math.random() * 100).toFixed(1)}%`,
        s: `${(3 + Math.random() * 6).toFixed(1)}px`,
        d: `${(9 + Math.random() * 10).toFixed(1)}s`,
        dl: `-${(Math.random() * 18).toFixed(1)}s`,
        dx: `${(Math.random() * 80 - 40).toFixed(0)}px`,
      })),
    []
  );
  const palm = (
    <>
      <path d="M40 160 C44 120 36 90 46 58" style={{ stroke: "var(--g-dune1)" }} strokeWidth="8" />
      <g style={{ stroke: "#2f8f58" }} strokeWidth="7">
        <path d="M46 58 C26 44 8 48 -6 62" />
        <path d="M46 58 C32 34 16 28 0 32" />
        <path d="M46 58 C60 34 80 30 96 40" />
        <path d="M46 58 C66 48 84 54 96 70" />
        <path d="M46 58 C46 38 52 24 64 16" />
      </g>
    </>
  );
  return (
    <div className="g-sky" aria-hidden="true">
      <div className="g-stars">
        <span className="g-shoot" />
        {stars.map((s, i) => (
          <i key={i} style={v({ top: s.top, left: s.left, "--d": s.d, "--dl": s.dl, ...(s.big ? { width: 3, height: 3 } : {}) })} />
        ))}
      </div>
      <div className="g-cloud" style={v({ top: "10%", width: 150, "--d": "70s", "--dl": "-10s" })} />
      <div className="g-cloud" style={v({ top: "22%", width: 100, "--d": "95s", "--dl": "-50s", opacity: 0.7 })} />
      <div className="g-cloud" style={v({ top: "6%", width: 120, "--d": "120s", "--dl": "-80s", opacity: 0.6 })} />
      <div className="g-dunes">
        <svg className="d1" viewBox="0 0 1440 400" preserveAspectRatio="none">
          <path d="M0 170 C220 110 420 150 640 140 S1080 80 1440 130 V400 H0Z" style={{ fill: "var(--g-dune1)" }} />
        </svg>
        <svg className="d2" viewBox="0 0 1440 400" preserveAspectRatio="none">
          <path d="M0 250 C260 190 520 240 780 225 S1200 190 1440 220 V400 H0Z" style={{ fill: "var(--g-dune2)" }} />
        </svg>
        <svg className="d3" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice">
          <path d="M0 320 C300 270 560 320 860 305 S1260 280 1440 300 V400 H0Z" style={{ fill: "var(--g-dune3)" }} />
          <g className="g-palm" fill="none" strokeLinecap="round" transform="translate(150 150)">
            {palm}
          </g>
        </svg>
      </div>
      <div className="g-sparks">
        {sparks.map((s, i) => (
          <i key={i} style={v({ left: s.left, "--s": s.s, "--d": s.d, "--dl": s.dl, "--dx": s.dx })} />
        ))}
      </div>
    </div>
  );
}

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

function Hero() {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const orbit = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Documents orbit the emblem on an ellipse: behind it at the top, in front at the bottom.
  useEffect(() => {
    const el = orbit.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let id = 0;
    const spin = (t: number) => {
      const chips = Array.from(el.querySelectorAll<HTMLElement>(".g-chip")).filter((c) => c.offsetParent !== null);
      const w = el.clientWidth;
      const h = el.clientHeight;
      const e = el.querySelector<HTMLElement>(".g-emblem")?.clientWidth ?? 200;
      const rx = Math.min(w / 2 - 70, e * 1.02);
      const ry = h * 0.34;
      const a0 = reduce ? 0.6 : ((t - t0) / 1000) * 0.22;
      chips.forEach((c, k) => {
        const a = a0 + (k * Math.PI * 2) / chips.length;
        const front = Math.sin(a);
        c.style.transform = `translate(-50%, -50%) translate(${(Math.cos(a) * rx).toFixed(1)}px, ${(front * ry + h * 0.06).toFixed(1)}px) scale(${(0.86 + (0.14 * (front + 1)) / 2).toFixed(3)})`;
        c.style.zIndex = front > 0 ? "3" : "1";
        c.style.opacity = (0.55 + (0.45 * (front + 1)) / 2).toFixed(2);
      });
      if (!reduce) id = requestAnimationFrame(spin);
    };
    id = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(id);
  }, []);

  const date = (() => {
    const g = now.toLocaleDateString(isAr ? "ar-EG-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
    let hj = "";
    try {
      hj = now.toLocaleDateString(isAr ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-u-ca-islamic-umalqura", { day: "numeric", month: "long" });
    } catch {
      /* no Hijri calendar in this browser */
    }
    return hj ? `${g} · ${hj.replace(/\s*(هـ|AH)$/, "")}` : g;
  })();
  const hh = now.getHours() % 12 || 12;
  const time = `${hh}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() >= 12 ? (isAr ? "م" : "PM") : isAr ? "ص" : "AM"}`;

  const chips: [string, string, string, string, boolean][] = [
    ["g-green", "M3 5h18v14H3zM7 15h4M7 11h2", isAr ? "إقامة" : "Iqama", isAr ? "سارية" : "valid", false],
    ["g-amber", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2", isAr ? "جواز" : "Passport", isAr ? "قريبًا" : "soon", false],
    ["g-rose", "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", isAr ? "رخصة بلدية" : "Municipal licence", isAr ? "جدّدها" : "renew", true],
    ["g-teal", "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z", isAr ? "شهادة صحية" : "Health certificate", isAr ? "محدّثة" : "up to date", true],
  ];

  return (
    <section className="g-hero" aria-label="SanaD HR">
      <div className="g-orbit" ref={orbit}>
        <div className="g-rays" />
        <div className="g-sun">
          <i className="crater" style={{ width: "18%", height: "18%", top: "24%", left: "30%" }} />
          <i className="crater" style={{ width: "11%", height: "11%", top: "56%", left: "58%" }} />
          <i className="crater" style={{ width: "8%", height: "8%", top: "40%", left: "66%" }} />
        </div>
        <div className="g-emblem">
          <img src="/brand/sanad-logo.png" alt="SanaD HR" />
        </div>
        {chips.map(([tone, d, label, state, far]) => (
          <span key={label} className={cn("g-chip", tone, far && "far")}>
            <i>{icon(d)}</i>
            {label} · <em>{state}</em>
          </span>
        ))}
      </div>
      <div className="g-tagline">
        <h1>
          {isAr ? (
            <>
              موظفوك ووثائقك،
              <br />
              <span>تحت السيطرة دائمًا.</span>
            </>
          ) : (
            <>
              Your people and documents,
              <br />
              <span>always under control.</span>
            </>
          )}
        </h1>
        <p>{isAr ? "تنبيه قبل انتهاء أي إقامة أو رخصة — ومهامك جاهزة كل صباح." : "A heads-up before any iqama or licence ends — and your tasks ready every morning."}</p>
        <div className="g-clock">
          {icon("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2")}
          <span>{date}</span> · <b>{time}</b>
        </div>
      </div>
    </section>
  );
}

export function GateLayout() {
  const location = useLocation();
  const app = useRef<HTMLDivElement>(null);
  const [night, setNight] = useState(isNight);
  useEffect(() => {
    const id = setInterval(() => setNight(isNight()), 60_000);
    return () => clearInterval(id);
  }, []);

  // The dunes and the emblem drift with the mouse.
  function move(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const el = app.current;
    if (!el) return;
    el.style.setProperty("--px", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
    el.style.setProperty("--py", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
  }
  function leave() {
    app.current?.style.setProperty("--px", "0");
    app.current?.style.setProperty("--py", "0");
  }

  return (
    <GateContext.Provider value={{ night }}>
      <div ref={app} className={cn("g-app", night && "night")} onPointerMove={move} onPointerLeave={leave}>
        <RouteProgressBar />
        <Sky />
        <div className="g-layout">
          <Hero />
          <section className="g-panel" aria-label="SanaD">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={location.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="g-page">
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </section>
        </div>
      </div>
    </GateContext.Provider>
  );
}
