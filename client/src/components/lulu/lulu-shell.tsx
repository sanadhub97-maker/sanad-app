import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronUp, FileText, Globe, LogOut, Moon, Plus, Search, Sparkles, Sun, User as UserIcon, Users, Wallet, ListChecks } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeaderSlotProvider, usePageHeaderSlots } from "@/components/layout/page-header-slot";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";
import { LuluCommand } from "@/components/lulu/lulu-command";
import { LuluNotifications, useNotificationsBell } from "@/components/lulu/lulu-notifications";
import { useLuluEffects, luluSwapTheme } from "@/components/lulu/lulu-effects";
import { isOnPath, toneOf, useLuluNav, type LuluNavItem } from "@/components/lulu/lulu-nav";
import { settingsApi } from "@/api/settings";
import { logout as logoutRequest } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { translateRoleName } from "@/lib/role-display";
import { cn } from "@/lib/utils";

/* The Pearl shell on every device: a floating glass sidebar (an icon rail on
   tablets), a sticky glass header that holds each page's title and actions,
   and on phones the island at the bottom that opens into every section. */

function initialsOf(name?: string | null) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() ?? "U"
  );
}

function useBranding() {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const { data: mark } = useQuery({ queryKey: ["settings", "branding", "mark"], queryFn: settingsApi.getBrandingMark, staleTime: 30 * 60_000 });
  const { data: branding } = useQuery({ queryKey: ["settings", "branding"], queryFn: settingsApi.getBranding, staleTime: 5 * 60_000 });
  const name = isAr ? branding?.nameAr || branding?.nameEn : branding?.nameEn || branding?.nameAr;
  return { mark: mark || "/brand/sanad-mark.png", name: name || "SanaD" };
}

/** Profile, language, light/dark, the design simulator and sign-out. */
function AccountMenu({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  useUiStore((s) => s.themeMode);
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const role = user?.isSuperAdmin ? "Super Admin" : user?.roles?.[0];

  async function signOut() {
    await logoutRequest().catch(() => undefined);
    clearAuth();
    navigate("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-64 rounded-3xl p-2">
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
        <DropdownMenuItem onSelect={() => setTimeout(() => luluSwapTheme(), 120)} className="cursor-pointer gap-2 rounded-2xl px-3 py-2.5">
          {isDark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          {isDark ? (isAr ? "الوضع النهاري" : "Light mode") : isAr ? "الوضع الليلي" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/preview")} className="cursor-pointer gap-2 rounded-2xl px-3 py-2.5">
          <Sparkles className="h-4 w-4 text-muted-foreground" /> {isAr ? "محاكي أبل" : "Apple Mode"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} className="cursor-pointer gap-2 rounded-2xl px-3 py-2.5 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> {t("common.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Sidebar({ items }: { items: LuluNavItem[] }) {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const path = useLocation().pathname;
  const user = useAuthStore((s) => s.user);
  const brand = useBranding();
  const wrap = useRef<HTMLDivElement>(null);
  const [glide, setGlide] = useState<{ top: number; left: number; width: number; height: number; tone: string } | null>(null);

  const measure = useCallback(() => {
    const el = wrap.current?.querySelector<HTMLElement>(".lu-nav.on");
    if (!el || !el.offsetWidth) return setGlide(null);
    setGlide({ top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight, tone: el.dataset.tone ?? "sky" });
  }, []);
  useLayoutEffect(measure, [path, items.length, measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  let lastSection: string | undefined;
  return (
    <aside className="lu-side no-print" aria-label={isAr ? "الأقسام" : "Sections"}>
      <button type="button" className="lu-brand" onClick={() => navigate("/")}>
        <img src={brand.mark} alt="" />
        <span className="min-w-0">
          <b>{brand.name}</b>
          <small>{isAr ? "نظام SanaD" : "SanaD system"}</small>
        </span>
      </button>
      <nav ref={wrap} className="lu-navs">
        {glide && (
          <span
            aria-hidden="true"
            className="lu-glide"
            style={{ top: glide.top, left: glide.left, width: glide.width, height: glide.height, ["--gt" as string]: `var(--l-${glide.tone}-t)`, ["--gc" as string]: `var(--l-${glide.tone})` }}
          />
        )}
        {items.map((item) => {
          const Icon = item.icon;
          const on = isOnPath(path, item.href);
          const head = item.section && item.section !== lastSection ? item.section : undefined;
          if (item.section) lastSection = item.section;
          return (
            <div key={item.href} className="contents">
              {head && <span className="lu-sec">{t(head)}</span>}
              <button type="button" data-tone={item.tone} title={item.label} onClick={() => navigate(item.href)} className={cn("lu-nav", `lt-${item.tone}`, on && "on")} aria-current={on ? "page" : undefined}>
                <span className="i">
                  <Icon />
                </span>
                <span className="txt">{item.label}</span>
              </button>
            </div>
          );
        })}
      </nav>
      <AccountMenu>
        <button type="button" className="lu-me" aria-label={isAr ? "الحساب" : "Account"}>
          <span className="lu-av">{initialsOf(user?.fullName)}</span>
          <span className="min-w-0">
            <b>{user?.fullName}</b>
            <small>{user?.isSuperAdmin ? (isAr ? "المشرف العام" : "Super Admin") : user?.roles?.[0]}</small>
          </span>
        </button>
      </AccountMenu>
    </aside>
  );
}

function Header({ onSearch, current }: { onSearch: () => void; current?: LuluNavItem }) {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const slots = usePageHeaderSlots();
  const user = useAuthStore((s) => s.user);
  const brand = useBranding();
  const { data } = useNotificationsBell();
  const unread = data?.unreadCount ?? 0;
  const [bell, setBell] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <header className="lu-top no-print">
      <div className="t">
        <div ref={slots?.setTitle} data-slot="title" className="peer min-w-0" />
        <div className="hidden min-w-0 peer-empty:block">
          <h1>{current?.label ?? brand.name}</h1>
          <p>{brand.name}</p>
        </div>
      </div>
      <div ref={slots?.setActions} className="acts" />
      <button type="button" className="lu-btn search" onClick={onSearch} aria-label={isAr ? "بحث" : "Search"}>
        <Search />
        <span className="lbl">{isAr ? "ابحث عن موظف أو إقامة" : "Search employees, iqamas"}</span>
        <kbd className="lu-kbd k">Ctrl K</kbd>
      </button>
      <button type="button" ref={setBell} className="lu-btn" onClick={() => setOpen((v) => !v)} aria-label={isAr ? "الإشعارات" : "Notifications"} aria-expanded={open}>
        <Bell />
        {unread > 0 && <span className="dot">{unread > 9 ? "9+" : unread}</span>}
      </button>
      <AccountMenu>
        <button type="button" className="lu-av lu-phone-only" aria-label={isAr ? "الحساب" : "Account"}>
          {initialsOf(user?.fullName)}
        </button>
      </AccountMenu>
      <LuluNotifications open={open} anchor={bell} onClose={close} />
    </header>
  );
}

/** Phones: the island shows where you are; it opens into every section, and
 * its + into the quick-add choices. */
function Island({ items, current }: { items: LuluNavItem[]; current?: LuluNavItem }) {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const path = useLocation().pathname;
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [mode, setMode] = useState<"closed" | "menu" | "add">("closed");
  useEffect(() => setMode("closed"), [path]);

  const adds = [
    { label: isAr ? "موظف" : "Employee", href: "/employees?new=true", icon: Users, tone: "indigo", ok: hasPermission("employees.create") },
    { label: isAr ? "وثيقة" : "Document", href: "/employee-documents", icon: FileText, tone: "sky", ok: hasPermission("employees.view") },
    { label: isAr ? "دفعة" : "Payment", href: "/payments", icon: Wallet, tone: "violet", ok: hasPermission("payments.view") },
    { label: isAr ? "مهمة" : "Task", href: "/daily-tasks", icon: ListChecks, tone: "green", ok: hasPermission("tasks.view") },
  ].filter((a) => a.ok);
  const tiles = mode === "add" ? adds : items;
  const cur = current ?? items[0];
  const CurIcon = cur?.icon;

  return (
    <>
      <div className={cn("lu-scrim lu-phone-scrim", mode !== "closed" && "open")} onClick={() => setMode("closed")} />
      <div className={cn("lu-island no-print", mode !== "closed" && "open", mode === "add" && "adding")} role="navigation" aria-label={isAr ? "التنقل" : "Navigation"}>
        <div className="lu-il-grid">
          {tiles.map((n, k) => {
            const Icon = n.icon;
            return (
              <button
                key={n.href + k}
                type="button"
                className={cn("lu-il-t", `lt-${n.tone}`, mode === "menu" && isOnPath(path, n.href) && "on")}
                style={{ ["--k" as string]: k }}
                onClick={() => {
                  setMode("closed");
                  navigate(n.href);
                }}
              >
                <span>
                  <Icon />
                </span>
                {n.label}
              </button>
            );
          })}
        </div>
        <div className="lu-il-row">
          <button type="button" className={cn("lu-il-cur", `lt-${cur?.tone ?? toneOf(path)}`)} onClick={() => setMode((m) => (m === "menu" ? "closed" : "menu"))} aria-label={isAr ? "كل الأقسام" : "All sections"}>
            <span className="i" key={cur?.href}>
              {CurIcon && <CurIcon />}
            </span>
            <span className="tx" key={`t${cur?.href}`}>
              <b>{cur?.label}</b>
              <small>{isAr ? "اضغط لكل الأقسام" : "Tap for all sections"}</small>
            </span>
          </button>
          {adds.length > 0 && (
            <button type="button" className="lu-il-btn add" onClick={() => setMode((m) => (m === "add" ? "closed" : "add"))} aria-label={isAr ? "إضافة" : "Add"}>
              <Plus />
            </button>
          )}
          <button type="button" className="lu-il-btn menu" onClick={() => setMode((m) => (m === "menu" ? "closed" : "menu"))} aria-label={isAr ? "كل الأقسام" : "All sections"}>
            <ChevronUp />
          </button>
        </div>
      </div>
    </>
  );
}

export function LuluShell() {
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const animationsEnabled = useUiStore((s) => s.animationsEnabled);
  const { items, current } = useLuluNav();
  const [cmd, setCmd] = useState(false);

  useLuluEffects(main, animationsEnabled);

  useEffect(() => {
    main.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.code === "KeyK" || e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setCmd((v) => !v);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  return (
    <PageHeaderSlotProvider>
      <div className={cn("lu-app font-sans", !animationsEnabled && "lu-still")}>
        <div className="lu-mesh" aria-hidden="true">
          <i className="m1" />
          <i className="m2" />
          <i className="m3" />
          <i className="m4" />
        </div>
        <RouteProgressBar />
        <Sidebar items={items} />
        <main ref={main} className="lu-main">
          <div className="lu-wrap">
            <Header onSearch={() => setCmd(true)} current={current} />
            <AnimatePresence mode="wait" initial={false}>
              {/* No blur filter here: a lingering filter would trap fixed panels (drawers) inside the page. */}
              <motion.div
                key={location.pathname}
                initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined}
                animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
                exit={animationsEnabled ? { opacity: 0, y: -8 } : undefined}
                transition={{ duration: animationsEnabled ? 0.2 : 0, ease: [0.16, 1, 0.3, 1] }}
                className="relative space-y-[22px]"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <Island items={items} current={current} />
        <LuluCommand open={cmd} onClose={() => setCmd(false)} pages={items} />
      </div>
    </PageHeaderSlotProvider>
  );
}
