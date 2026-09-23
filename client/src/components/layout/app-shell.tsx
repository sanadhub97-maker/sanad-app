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
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans relative">
      {/* 🕸️ Subtle Isometric Grid Overlay (Matches Login Cockpit) */}
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern bg-grid-glow opacity-30 z-0" />

      {/* 🌌 Deep Cosmos Ambient Glow Orbs - Fixed across entire viewport */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-[700px] w-[700px] rounded-full bg-blue-600/20 blur-[150px] animate-ambient-pulse z-0" />
      <div className="pointer-events-none fixed -bottom-40 -right-40 h-[700px] w-[700px] rounded-full bg-indigo-600/20 blur-[160px] animate-ambient-pulse-slow z-0" />
      <div className="pointer-events-none fixed top-1/3 right-1/4 h-[550px] w-[550px] rounded-full bg-cyan-500/15 blur-[130px] animate-ambient-pulse z-0" />
      <div className="pointer-events-none fixed bottom-10 left-1/3 h-[450px] w-[450px] rounded-full bg-emerald-500/12 blur-[120px] z-0" />

      {/* Desktop Luxury Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 260 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="hidden lg:flex flex-col bg-card/90 dark:bg-[#060913]/90 text-foreground dark:text-white shrink-0 border-e border-border/70 dark:border-white/[0.08] relative z-20 shadow-sm dark:shadow-2xl dark:shadow-black/50 backdrop-blur-2xl transition-colors specular-border"
      >
        {/* Top Brand Header */}
        <div className="flex h-16 items-center justify-between px-3.5 border-b border-border/80 dark:border-white/[0.08] bg-muted/20 dark:bg-black/10">
          <BrandLogo collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.08] ms-auto h-8 w-8 rounded-lg"
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
        <SheetContent side={isAr ? "right" : "left"} className="w-72 bg-card dark:bg-[#070C18] text-foreground dark:text-white p-0 border-border/80 dark:border-white/[0.08] flex flex-col transition-colors">
          <div className="flex h-16 items-center px-4 border-b border-border/80 dark:border-white/[0.08] bg-muted/20 dark:bg-black/10">
            <BrandLogo />
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main App Container */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background relative">
        <RouteProgressBar />
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main
          ref={mainRef}
          className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-transparent selection:bg-cyan-500/30 selection:text-cyan-200 z-10"
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

