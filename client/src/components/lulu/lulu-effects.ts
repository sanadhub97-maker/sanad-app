import { useEffect, type RefObject } from "react";
import { flushSync } from "react-dom";
import { useUiStore } from "@/stores/uiStore";

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

const RIPPLE = ".lu-btn,.lu-do,.lu-sbtn,.lu-act,.lu-fchip,.lu-il-t,.lu-il-btn,.lux-cta";

/** Confetti from the middle of an element (a finished task, an added item). */
export function luluPop(el: Element | null, color = "var(--l-green)") {
  if (!el || reduced()) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    s.className = "lu-pop";
    const a = Math.random() * Math.PI * 2;
    const d = 24 + Math.random() * 26;
    s.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${i % 3 ? color : "var(--l-amber)"};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 8}px`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 720);
  }
}

/** Light and dark: the new colours grow in a circle from where you tapped. */
export function luluSwapTheme(e?: { clientX: number; clientY: number }) {
  const apply = () => {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    flushSync(() => useUiStore.getState().setThemeMode(next));
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || reduced()) {
    apply();
    return;
  }
  const x = e?.clientX || window.innerWidth / 2;
  const y = e?.clientY || 40;
  const t = doc.startViewTransition(apply);
  t.ready
    .then(() => {
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 700, easing: "cubic-bezier(.2,.9,.2,1)", pseudoElement: "::view-transition-new(root)" }
      );
    })
    .catch(() => undefined);
}

/** Ripples on buttons, the light that follows the pointer over cards, the tilt
 * of stat cards (mouse only), and cards rising in as they scroll into view. */
export function useLuluEffects(scroller: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const main = scroller.current;
    if (!main) return;
    const still = !enabled || reduced();
    const fine = finePointer();

    function down(e: PointerEvent) {
      if (still) return;
      const b = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(RIPPLE);
      if (!b) return;
      const r = b.getBoundingClientRect();
      const k = b.offsetWidth / (r.width || 1);
      const d = Math.max(b.offsetWidth, b.offsetHeight) * 2.2;
      const s = document.createElement("span");
      s.className = "lu-rip";
      s.style.cssText = `width:${d}px;height:${d}px;left:${(e.clientX - r.left) * k - d / 2}px;top:${(e.clientY - r.top) * k - d / 2}px`;
      b.appendChild(s);
      setTimeout(() => s.remove(), 650);
    }
    // Touch has no hover light; the mouse updates at most once a frame.
    let queuedMove: PointerEvent | null = null;
    function move(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      if (!queuedMove)
        requestAnimationFrame(() => {
          const last = queuedMove;
          queuedMove = null;
          if (last) applyMove(last);
        });
      queuedMove = e;
    }
    function applyMove(e: PointerEvent) {
      const c = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(".lu-cc,.lux-spot");
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", `${e.clientX - r.left}px`);
      c.style.setProperty("--my", `${e.clientY - r.top}px`);
      if (fine && !still && c.classList.contains("lu-tilt")) {
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(900px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg) translateY(-4px)`;
      }
    }
    function out(e: PointerEvent) {
      const c = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(".lu-cc,.lux-spot");
      if (c && !c.contains(e.relatedTarget as Node | null)) {
        c.style.transform = "";
        c.style.setProperty("--mx", "-999px");
      }
    }

    // Cards on screen start at once; the rest wait for the observer (its
    // callbacks can lag under load, so it is not trusted for the first view).
    const io =
      "IntersectionObserver" in window && !still
        ? new IntersectionObserver(
            (es) =>
              es.forEach((en) => {
                if (en.isIntersecting) {
                  en.target.classList.add("in");
                  io?.unobserve(en.target);
                }
              }),
            { root: main, threshold: 0.06 }
          )
        : null;
    function reveal() {
      const m = main!.getBoundingClientRect();
      main!.querySelectorAll<HTMLElement>(".lu-rise:not(.in)").forEach((c) => {
        const r = c.getBoundingClientRect();
        if (!io || (r.top < m.bottom && r.bottom > m.top)) c.classList.add("in");
        else io.observe(c);
      });
    }
    let queued = false;
    const soon = () => {
      if (queued) return;
      queued = true;
      setTimeout(() => {
        queued = false;
        reveal();
      }, 30);
    };
    const mo = new MutationObserver(soon);
    mo.observe(main, { childList: true, subtree: true });
    reveal();

    document.addEventListener("pointerdown", down);
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerout", out);
    main.addEventListener("scroll", soon, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerout", out);
      main.removeEventListener("scroll", soon);
      mo.disconnect();
      io?.disconnect();
    };
  }, [scroller, enabled]);
}
