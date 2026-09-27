import { useRef, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppHeader } from "@/components/layout/app-header";
import { DockNav } from "@/components/layout/dock-nav";
import { DeskSidebar } from "@/components/layout/desk-sidebar";
import { PageHeaderSlotProvider } from "@/components/layout/page-header-slot";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";
import { useUiStore } from "@/stores/uiStore";
import { useIsDesk } from "@/lib/use-desk";

/** Phones and tablets get the Oasis layout: the header row scrolls with the
 * page and the navigation is a dark pill at the bottom. Computers get Luxe:
 * a floating glass sidebar over a slowly moving light, a spotlight that
 * follows the pointer and tilting stat cards. */
export function AppShell() {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const animationsEnabled = useUiStore((s) => s.animationsEnabled);
  const desk = useIsDesk();

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  // Spotlight and tilt: one pointer listener for the whole page.
  useEffect(() => {
    if (!desk || !animationsEnabled) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    function move(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      const spot = target?.closest?.<HTMLElement>(".lux-spot");
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${e.clientX - r.left}px`);
        spot.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
      const tilt = target?.closest?.<HTMLElement>(".lux-tilt");
      if (tilt && !reduce) {
        const q = tilt.getBoundingClientRect();
        const x = (e.clientX - q.left) / q.width - 0.5;
        const y = (e.clientY - q.top) / q.height - 0.5;
        tilt.style.transform = `perspective(800px) rotateX(${-y * 7}deg) rotateY(${x * 9}deg) translateY(-3px)`;
      }
    }
    function out(e: PointerEvent) {
      const tilt = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(".lux-tilt");
      if (tilt && !tilt.contains(e.relatedTarget as Node | null)) tilt.style.transform = "";
    }
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerout", out);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerout", out);
    };
  }, [desk, animationsEnabled]);

  return (
    <PageHeaderSlotProvider>
      <div className="relative flex h-screen overflow-hidden bg-background font-sans text-foreground">
        {desk && (
          <div className="lux-aurora" aria-hidden="true">
            <i className="b1" />
            <i className="b2" />
            <i className="b3" />
          </div>
        )}
        <RouteProgressBar />
        {desk && <DeskSidebar />}
        <main ref={mainRef} className="relative z-10 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[22px] px-4 pb-32 pt-5 sm:px-6 sm:pt-[30px] lg:px-11 desk:px-6 desk:pb-10 desk:pt-6">
            <AppHeader />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={animationsEnabled ? { opacity: 0, y: 10, filter: desk ? "blur(6px)" : "blur(0px)" } : undefined}
                animate={animationsEnabled ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
                exit={animationsEnabled ? { opacity: 0, y: -6 } : undefined}
                transition={{ duration: animationsEnabled ? (desk ? 0.35 : 0.2) : 0, ease: [0.16, 1, 0.3, 1] }}
                className="relative space-y-[22px]"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <DockNav />
      </div>
    </PageHeaderSlotProvider>
  );
}
