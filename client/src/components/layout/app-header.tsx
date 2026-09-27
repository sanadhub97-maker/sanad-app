import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Globe, LogOut, Moon, Sun, User as UserIcon } from "lucide-react";
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
import { NAV_ITEMS } from "@/components/layout/nav-config";
import { usePageHeaderSlots } from "@/components/layout/page-header-slot";
import { settingsApi } from "@/api/settings";
import { logout as logoutRequest } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { translateRoleName } from "@/lib/role-display";

/** The Oasis top row: the company symbol, the page's title and actions
 * (portalled in by PageHeader), then search, notifications and the account. */
export function AppHeader() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const location = useLocation();
  const navigate = useNavigate();
  const slots = usePageHeaderSlots();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  useUiStore((s) => s.themeMode); // re-render when the theme flips
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const { data: mark } = useQuery({ queryKey: ["settings", "branding", "mark"], queryFn: settingsApi.getBrandingMark, staleTime: 30 * 60_000 });
  const { data: branding } = useQuery({ queryKey: ["settings", "branding"], queryFn: settingsApi.getBranding, staleTime: 5 * 60_000 });
  const companyName = isAr ? branding?.nameAr || branding?.nameEn : branding?.nameEn || branding?.nameAr;

  // Title for pages that don't render a PageHeader: the matching menu item.
  const path = location.pathname;
  const current =
    NAV_ITEMS.find((n) => n.href !== "/" && (path === n.href || path.startsWith(`${n.href}/`))) ??
    NAV_ITEMS.flatMap((n) => n.children ?? []).find((c) => path.startsWith(c.href)) ??
    (path === "/" ? NAV_ITEMS[0] : undefined);

  const initials =
    user?.fullName
      ?.split(" ")
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() ?? "U";
  const role = user?.isSuperAdmin ? "Super Admin" : user?.roles?.[0];

  async function handleLogout() {
    await logoutRequest().catch(() => undefined);
    clearAuth();
    navigate("/login");
  }

  function toggleTheme() {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    setThemeMode(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  const circle =
    "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card text-foreground shadow-[var(--glass-shadow)] transition-colors hover:bg-accent sm:h-12 sm:w-12";

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-[18px]">
      <button type="button" onClick={() => navigate("/")} className="shrink-0 rounded-[14px] desk:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={companyName ?? "SanaD"}>
        <img
          src={mark || "/brand/sanad-mark.png"}
          alt=""
          className="h-11 w-11 rounded-xl object-contain sm:h-[52px] sm:w-[52px] sm:rounded-[14px]"
        />
      </button>

      <div className="min-w-0 flex-1">
        <div ref={slots?.setTitle} className="peer min-w-0" />
        <div className="hidden min-w-0 flex-col gap-0.5 peer-empty:flex">
          <h1 className="truncate font-head text-2xl font-semibold leading-tight sm:text-[30px]">{current ? t(current.label) : companyName}</h1>
          {companyName && <p className="truncate text-[13px] text-muted-foreground sm:text-sm">{companyName}</p>}
        </div>
      </div>

      <div ref={slots?.setActions} className="order-last flex w-full flex-wrap items-center gap-2.5 empty:hidden lg:order-none lg:w-auto" />

      <div className="flex items-center gap-2.5 sm:gap-3">
        <GlobalSearch variant={path === "/" ? "pill" : "icon"} />
        <NotificationBell className={circle} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={isAr ? "الحساب" : "Account"}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-12 sm:w-12"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-3xl p-2">
            <DropdownMenuLabel className="p-2 font-normal">
              <p className="text-sm font-semibold text-foreground">{user?.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              {role && <p className="mt-1 text-xs text-primary">{translateRoleName(role, t)}</p>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/profile")} className="cursor-pointer gap-2 rounded-2xl px-3 py-2.5">
              <UserIcon className="h-4 w-4 text-muted-foreground" /> {t("common.profile")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => i18n.changeLanguage(isAr ? "en" : "ar")} className="cursor-pointer gap-2 rounded-2xl px-3 py-2.5">
              <Globe className="h-4 w-4 text-muted-foreground" /> {isAr ? "English" : "العربية"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={toggleTheme} className="cursor-pointer gap-2 rounded-2xl px-3 py-2.5">
              {isDark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
              {isDark ? (isAr ? "الوضع النهاري" : "Light mode") : isAr ? "الوضع الليلي" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} className="cursor-pointer gap-2 rounded-2xl px-3 py-2.5 text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" /> {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
