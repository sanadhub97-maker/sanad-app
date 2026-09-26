import { useState, useRef, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { BrandLogo } from "@/components/layout/brand-logo";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";
import { useUiStore } from "@/stores/uiStore";

export function AppShell() {
  const location = useLocation();
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const mainRef = useRef<HTMLDivElement>(null);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const animationsEnabled = useUiStore((s) => s.animationsEnabled);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden text-foreground font-sans relative">
      {/* The aurora is the body background (index.css); everything here is glass over it. */}
      {/* Desktop sidebar: a floating glass panel */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 260 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="hidden lg:flex flex-col m-3 me-0 rounded-[28px] bg-card text-foreground shrink-0 border border-[var(--glass-edge)] relative z-20 shadow-[var(--glass-shadow)] backdrop-blur-2xl backdrop-saturate-150 overflow-hidden transition-colors"
      >
        {/* Top Brand Header */}
        <div className="flex h-16 items-center justify-between px-3.5">
          <BrandLogo collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-muted ms-auto h-8 w-8 rounded-xl"
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <SidebarNav collapsed={collapsed} />
        </div>
      </motion.aside>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side={isAr ? "right" : "left"} className="w-72 text-foreground p-0 flex flex-col transition-colors">
          <div className="flex h-16 items-center px-4">
            <BrandLogo />
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main App Container */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <RouteProgressBar />
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main
          ref={mainRef}
          className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-transparent z-10"
        >

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={
                animationsEnabled
                  ? { opacity: 0, y: 12, filter: "blur(4px)" }
                  : undefined
              }
              animate={
                animationsEnabled
                  ? { opacity: 1, y: 0, filter: "blur(0px)" }
                  : undefined
              }
              exit={
                animationsEnabled
                  ? { opacity: 0, y: -10, filter: "blur(3px)" }
                  : undefined
              }
              transition={{
                duration: animationsEnabled ? 0.22 : 0,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative z-10 mx-auto max-w-7xl space-y-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

