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
    <header className="sticky top-0 z-30 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3 lg:gap-6 border-b border-[var(--glass-edge)] bg-card/40 px-3 sm:px-6 backdrop-blur-2xl backdrop-saturate-150 transition-colors">
      {/* Start: menu (mobile) + company identity */}
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-muted-foreground hover:text-foreground h-9 w-9 rounded-xl shrink-0"
          onClick={onOpenMobileNav}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <CompanyBadge isDark={isDark} />
      </div>

      {/* Middle: search takes the free space */}
      <div className="flex justify-center min-w-0">
        <div className="w-full min-w-0 sm:min-w-[150px] max-w-xl">
          <GlobalSearch />
        </div>
      </div>

      {/* End: date & time, quick actions, account */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden xl:block">
          <LiveCalendarClock />
        </div>

        <div className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-muted/40 p-1 dark:border-white/10 dark:bg-white/[0.04]">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="h-8 gap-1.5 rounded-lg px-2 sm:px-2.5 text-xs font-bold text-muted-foreground hover:bg-background hover:text-foreground dark:hover:bg-white/[0.08]"
            title={isAr ? "Switch to English" : "التحويل إلى العربية"}
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{isAr ? "EN" : "عربي"}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleTheme}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground dark:hover:bg-white/[0.08]"
            title={isDark ? (isAr ? "التبديل إلى الوضع النهاري" : "Switch to Light Mode") : (isAr ? "التبديل إلى الوضع الليلي" : "Switch to Dark Mode")}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <NotificationBell />
        </div>

        {/* Account */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-xl py-1 ps-1 pe-2 transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9 rounded-xl">
                  <AvatarFallback className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-black text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
              <div className="hidden text-start lg:block leading-tight">
                <p className="max-w-[140px] truncate text-[13px] font-bold text-foreground">{user?.fullName}</p>
                <p className="text-[11px] font-medium text-muted-foreground">{primaryRole}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground lg:block" />
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
