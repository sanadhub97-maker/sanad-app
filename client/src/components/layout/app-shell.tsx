import { useState, useRef, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { BrandLogo } from "@/components/layout/brand-logo";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";
import { useUiStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { translateRoleName } from "@/lib/role-display";

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const mainRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const animationsEnabled = useUiStore((s) => s.animationsEnabled);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname]);

  const initials = user?.fullName
    ?.split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() ?? "U";

  const primaryRoleRaw = user?.isSuperAdmin ? "Super Admin" : user?.roles?.[0];
  const primaryRole = primaryRoleRaw ? translateRoleName(primaryRoleRaw, t) : t("common.staff");

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Desktop Luxury Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 260 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="hidden lg:flex flex-col bg-card/95 dark:bg-[#070C18]/95 text-foreground dark:text-white shrink-0 border-e border-border/80 dark:border-white/[0.08] relative z-20 shadow-sm dark:shadow-2xl dark:shadow-black/50 backdrop-blur-xl transition-colors"
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

        {/* User Profile Footer Card */}
        <div className="p-3 border-t border-border/80 dark:border-white/[0.08] bg-muted/30 dark:bg-black/25">
          <button
            onClick={() => navigate("/profile")}
            className="group flex w-full items-center gap-3 rounded-xl p-2 transition-all duration-200 hover:bg-muted/80 dark:hover:bg-white/[0.08] text-start"
            title={collapsed ? user?.fullName : undefined}
          >
            <div className="relative shrink-0">
              <Avatar className="h-8 w-8 rounded-lg border border-primary/30 ring-1 ring-border/50 dark:ring-white/10">
                <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card dark:ring-[#070C18]" />
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground dark:text-white truncate group-hover:text-primary dark:group-hover:text-cyan-300 transition-colors">
                  {user?.fullName ?? "Admin"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block rounded bg-primary/10 dark:bg-blue-500/20 px-1.5 py-0.2 text-[10px] font-medium text-primary dark:text-blue-300">
                    {primaryRole}
                  </span>
                </div>
              </div>
            )}
          </button>
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
          <div className="p-3 border-t border-border/80 dark:border-white/[0.08] bg-muted/30 dark:bg-black/25">
            <div className="flex items-center gap-3 p-2">
              <Avatar className="h-8 w-8 rounded-lg border border-primary/30">
                <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground dark:text-white truncate">{user?.fullName}</p>
                <p className="text-[10px] text-muted-foreground dark:text-blue-300">{primaryRole}</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main App Container */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background relative">
        <RouteProgressBar />
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main
          ref={mainRef}
          className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-background via-background to-muted/15"
        >
          {/* Ambient Background Breathing Glows */}
          <div className="pointer-events-none absolute -top-40 right-10 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px] animate-ambient-pulse dark:bg-blue-600/15" />
          <div className="pointer-events-none absolute top-1/3 -left-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px] animate-ambient-pulse-slow dark:bg-indigo-600/10" />
          <div className="pointer-events-none absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-emerald-500/5 blur-[90px] animate-ambient-pulse dark:bg-cyan-600/10" />

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

