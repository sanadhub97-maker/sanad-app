import { useRef, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppHeader } from "@/components/layout/app-header";
import { DockNav } from "@/components/layout/dock-nav";
import { PageHeaderSlotProvider } from "@/components/layout/page-header-slot";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";
import { useUiStore } from "@/stores/uiStore";

/** The Oasis layout: no sidebar; the header row (logo, page title, actions,
 * search, notifications, account) scrolls with the page, and the navigation
 * is a dark pill floating at the bottom. */
export function AppShell() {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const animationsEnabled = useUiStore((s) => s.animationsEnabled);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <PageHeaderSlotProvider>
      <div className="relative flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground">
        <RouteProgressBar />
        <main ref={mainRef} className="relative flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[22px] px-4 pb-32 pt-5 sm:px-6 sm:pt-[30px] lg:px-11">
            <AppHeader />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined}
                animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
                exit={animationsEnabled ? { opacity: 0, y: -6 } : undefined}
                transition={{ duration: animationsEnabled ? 0.2 : 0, ease: [0.16, 1, 0.3, 1] }}
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
