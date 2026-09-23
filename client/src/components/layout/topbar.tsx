import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe, LogOut, Menu, Moon, Sun, User as UserIcon, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";
import { CompanyBadge } from "@/components/layout/company-badge";
import { LiveCalendarClock } from "@/components/layout/live-calendar-clock";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { logout as logoutRequest } from "@/api/auth";
import { translateRoleName } from "@/lib/role-display";

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const navigate = useNavigate();

  // Dynamically track the actual DOM dark state so "system", "dark", and "light" are always 100% accurate
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const syncDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    syncDark();

    const observer = new MutationObserver(syncDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [themeMode]);

  function handleToggleTheme() {
    const currentlyDark = document.documentElement.classList.contains("dark");
    const nextMode = currentlyDark ? "light" : "dark";
    setThemeMode(nextMode);
    document.documentElement.classList.toggle("dark", nextMode === "dark");
    setIsDark(nextMode === "dark");
  }

  async function handleLogout() {
    await logoutRequest().catch(() => undefined);
    clearAuth();
    navigate("/login");
  }

  function toggleLanguage() {
    const currentLang = i18n.language || "ar";
    const nextLang = currentLang.startsWith("ar") ? "en" : "ar";
    i18n.changeLanguage(nextLang);
  }

  const initials = user?.fullName
    ?.split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() ?? "U";

  const isAr = (i18n.language || "ar").startsWith("ar");
  const primaryRoleRaw = user?.isSuperAdmin ? "Super Admin" : user?.roles?.[0];
  const primaryRole = primaryRoleRaw ? translateRoleName(primaryRoleRaw, t) : t("common.staff");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 sm:gap-3 border-b border-border/80 bg-card/90 dark:bg-[#060913]/90 px-3 sm:px-5 backdrop-blur-2xl transition-colors specular-border shadow-xs">
      {/* 1. Leading Section: Mobile Toggle + Company Badge + Divider + Quick Search */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-muted-foreground hover:text-foreground h-9 w-9 rounded-xl shrink-0"
          onClick={onOpenMobileNav}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <CompanyBadge isDark={isDark} />

        <div className="h-5 w-px bg-border/70 dark:bg-white/10 hidden sm:block shrink-0" />

        {/* Global Search Bar */}
        <div className="w-32 sm:w-44 md:w-52 lg:w-56 shrink min-w-[110px]">
          <GlobalSearch />
        </div>
      </div>

      {/* 2. Center Section: Executive Live Calendar & Digital Clock */}
      <div className="flex items-center justify-center shrink-0 mx-1 sm:mx-2">
        <LiveCalendarClock />
      </div>

      {/* 3. Trailing Section: Language + Theme + Notifications + User Menu */}
      <div className="ms-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Language Switcher Pill */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="h-9 gap-1.5 rounded-xl border-border/80 bg-background/80 dark:bg-white/[0.04] px-2.5 sm:px-3 text-xs font-bold text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all active:scale-95 shadow-2xs"
          title={isAr ? "Switch to English" : "التحويل إلى العربية"}
        >
          <Globe className="h-3.5 w-3.5 text-blue-500" />
          <span>{isAr ? "EN" : "عربي"}</span>
        </Button>

        {/* Theme Mode Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleToggleTheme}
          className="h-9 w-9 rounded-xl border-border/80 bg-background/80 dark:bg-white/[0.04] text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200 active:scale-95 shadow-2xs"
          title={isDark ? (isAr ? "التبديل إلى الوضع النهاري" : "Switch to Light Mode") : (isAr ? "التبديل إلى الوضع الليلي" : "Switch to Dark Mode")}
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-500 transition-transform duration-200 hover:-rotate-12" />
          )}
        </Button>

        {/* Notification Bell */}
        <NotificationBell />

        <div className="h-5 w-px bg-border/70 dark:bg-white/10 mx-0.5 sm:mx-1 hidden sm:block shrink-0" />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/20">
              <div className="relative">
                <Avatar className="h-8 w-8 rounded-xl border border-primary/30 shadow-xs">
                  <AvatarFallback className="bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-xs font-black text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <div className="hidden text-start md:block">
                <p className="text-xs font-bold leading-tight text-foreground">{user?.fullName}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{primaryRole}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-luxury border border-border/80 bg-background/95 backdrop-blur-xl">
            <DropdownMenuLabel className="p-2 font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-foreground leading-none">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <div className="pt-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                    <Shield className="h-3 w-3" /> {primaryRole}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1.5 border-border/60" />
            <DropdownMenuItem
              onSelect={() => navigate("/profile")}
              className="cursor-pointer rounded-xl px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-muted focus:bg-muted"
            >
              <UserIcon className="h-4 w-4 me-2 text-muted-foreground" /> {t("common.profile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5 border-border/60" />
            <DropdownMenuItem
              onSelect={handleLogout}
              className="cursor-pointer rounded-xl px-2.5 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 me-2" /> {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
