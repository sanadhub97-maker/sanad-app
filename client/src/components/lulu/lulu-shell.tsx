import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, ChevronUp, ChevronsUpDown, Download, ImageUp, PanelLeftClose, PanelRightClose, FileText, Globe, LogOut, Moon, Plus, Search, Sun, User as UserIcon, Users, Wallet, ListChecks } from "lucide-react";
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
import { useLuluEffects, luluSwapTheme, lastPointer } from "@/components/lulu/lulu-effects";
import { openInstall, useCanInstall } from "@/components/lulu/lulu-install";
import { isOnPath, toneOf, useLuluNav, type LuluNavItem } from "@/components/lulu/lulu-nav";
import { settingsApi } from "@/api/settings";
import { tasksApi } from "@/api/tasks";
import { dashboardApi } from "@/api/dashboard";
import { UserAvatar } from "@/components/lulu/user-avatar";
import { AvatarEditor, openAvatarEditor } from "@/components/lulu/avatar-editor";
import { logout as logoutRequest, type AvatarUser } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { translateRoleName } from "@/lib/role-display";
import { cn } from "@/lib/utils";

/* The Pearl shell on every device: a floating glass sidebar (an icon rail on
   tablets), a sticky glass header that holds each page's title and actions,
   and on phones the island at the bottom that opens into every section. */

const docsAr = (n: number) => (n === 1 ? "وثيقة واحدة" : n === 2 ? "وثيقتان" : n <= 10 ? `${n} وثائق` : `${n} وثيقة`);

function useMedia(query: string) {
  const [on, setOn] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const m = window.matchMedia?.(query);
    if (!m) return;
    const f = () => setOn(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [query]);
  return on;
}

function useBranding() {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const { data: mark } = useQuery({ queryKey: ["settings", "branding", "mark"], queryFn: settingsApi.getBrandingMark, staleTime: 30 * 60_000 });
  const { data: branding } = useQuery({ queryKey: ["settings", "branding"], queryFn: settingsApi.getBranding, staleTime: 5 * 60_000 });
  const name = isAr ? branding?.nameAr || branding?.nameEn : branding?.nameEn || branding?.nameAr;
  return { mark: mark || "/brand/sanad-mark.webp", name: name || "SanaD" };
}

/** Profile, language, light/dark and sign-out. */
function AccountMenu({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  useUiStore((s) => s.themeMode);
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const role = user?.isSuperAdmin ? "Super Admin" : user?.roles?.[0];
  const canInstall = useCanInstall();

  async function signOut() {
    await logoutRequest().catch(() => undefined);
    clearAuth();
    navigate("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-64 rounded-3xl p-2">
        <DropdownMenuLabel className="flex items-center gap-3 p-2 font-normal">
          <UserAvatar name={user?.fullName} fileId={(user as AvatarUser | null)?.avatarFileId} avatarKey={(user as AvatarUser | null)?.avatarKey} size={44} />
          <span className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{user?.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            {role && <p className="mt-0.5 text-xs text-primary">{translateRoleName(role, t)}</p>}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/profile")} className="cursor-pointer gap-2 rounded-2xl px-3 py-2.5">
          <UserIcon className="h-4 w-4 text-muted-foreground" /> {t("common.profile")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTimeout(openAvatarEditor, 120)} className="cursor-pointer gap-2 rounded-2xl px-3 py-2.5">
          <ImageUp className="h-4 w-4 text-muted-foreground" /> {isAr ? "تغيير الصورة الشخصية" : "Change picture"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => i18n.changeLanguage(isAr ? "en" : "ar")} className="cursor-pointer gap-2 rounded-2xl px-3 py-2.5">
          <Globe className="h-4 w-4 text-muted-foreground" /> {isAr ? "English" : "العربية"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTimeout(() => luluSwapTheme(lastPointer()), 120)} className="cursor-pointer gap-2 rounded-2xl px-3 py-2.5">
          {isDark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          {isDark ? (isAr ? "الوضع النهاري" : "Light mode") : isAr ? "الوضع الليلي" : "Dark mode"}
        </DropdownMenuItem>
        {canInstall && (
          <DropdownMenuItem onSelect={() => setTimeout(openInstall, 120)} className="cursor-pointer gap-2 rounded-2xl px-3 py-2.5">
            <Download className="h-4 w-4 text-muted-foreground" /> {isAr ? "تثبيت التطبيق" : "Install the app"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} className="cursor-pointer gap-2 rounded-2xl px-3 py-2.5 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> {t("common.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function useSectionState() {
  const KEY = "sanad.sidebar.shut";
  const [shut, setShut] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  });
  const toggle = (s: string) =>
    setShut((cur) => {
      const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* private mode: remembered for this visit */
      }
      return next;
    });
  return { shut, toggle };
}

/** Counts shown beside sections: open tasks today, expired documents. */
function useNavBadges() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const { data: tasks } = useQuery({ queryKey: ["tasks", "day", today], queryFn: () => tasksApi.day(today), enabled: hasPermission("tasks.view"), staleTime: 60_000 });
  const { data: summary } = useQuery({ queryKey: ["dashboard", "summary"], queryFn: dashboardApi.summary, staleTime: 60_000 });
  const open = (tasks ?? []).filter((t) => !t.done).length;
  const badges: Record<string, { n: number; tone: string }> = {};
  if (open) badges["/daily-tasks"] = { n: open, tone: "green" };
  // Expired documents in red; when none have expired, the ones ending soon in amber.
  const put = (href: string, c?: { expired: number; expiring: number }) => {
    if (c?.expired) badges[href] = { n: c.expired, tone: "rose" };
    else if (c?.expiring) badges[href] = { n: c.expiring, tone: "amber" };
  };
  put("/employee-documents", summary?.employeeDocuments);
  put("/company-documents", summary?.companyDocuments);
  return badges;
}

function Sidebar({ items }: { items: LuluNavItem[] }) {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const path = useLocation().pathname;
  const user = useAuthStore((s) => s.user) as AvatarUser | null;
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const narrow = useMedia("(max-width: 1179px)");
  const rail = narrow || collapsed;
  const { shut, toggle } = useSectionState();
  const badges = useNavBadges();
  const { data: summary } = useQuery({ queryKey: ["dashboard", "summary"], queryFn: dashboardApi.summary, staleTime: 60_000 });
  const needs = (summary?.expiringDocuments ?? 0) + (summary?.expiredDocuments ?? 0);
  const wrap = useRef<HTMLDivElement>(null);
  const [glide, setGlide] = useState<{ top: number; left: number; width: number; height: number; tone: string } | null>(null);

  // Sections in menu order, each with its items.
  const groups: { key: string; items: LuluNavItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (!last || (item.section && item.section !== last.key)) groups.push({ key: item.section ?? "main", items: [item] });
    else last.items.push(item);
  }

  const measure = useCallback(() => {
    const el = wrap.current?.querySelector<HTMLElement>(".lu-nav.on");
    if (!el || !el.offsetWidth || !el.offsetHeight) return setGlide(null);
    const nav = wrap.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setGlide({ top: r.top - nav.top + wrap.current!.scrollTop, left: r.left - nav.left, width: r.width, height: r.height, tone: el.dataset.tone ?? "sky" });
  }, []);
  useLayoutEffect(measure, [path, items.length, rail, shut, measure]);
  useEffect(() => {
    const id = window.setTimeout(measure, 460);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", measure);
    };
  }, [measure, rail, shut]);

  const role = user?.isSuperAdmin ? (isAr ? "المشرف العام" : "Super Admin") : user?.roles?.[0];
  const collapseLabel = rail ? (isAr ? "توسيع القائمة" : "Expand menu") : isAr ? "تصغير القائمة" : "Collapse menu";

  return (
    <aside className={cn("lu-side no-print", rail && "rail")} aria-label={isAr ? "الأقسام" : "Sections"} onTransitionEnd={(e) => e.target === e.currentTarget && measure()}>
      <div className="lu-side-top">
        {/* The sidebar always shows the system itself; the company branding is for print. */}
        <button type="button" className="lu-brand" onClick={() => navigate("/")} title="SanaD">
          <img src="/brand/sanad-mark.webp" alt="" />
          <span className="min-w-0">
            <b>SanaD</b>
            <small>{isAr ? "الموارد البشرية والوثائق" : "People and documents"}</small>
          </span>
        </button>
        {!narrow && (
          <button type="button" className="lu-collapse" onClick={toggleSidebar} aria-label={collapseLabel} title={collapseLabel}>
            {isAr ? <PanelRightClose /> : <PanelLeftClose />}
          </button>
        )}
      </div>
      <nav ref={wrap} className="lu-navs">
        {glide && (
          <span
            aria-hidden="true"
            className="lu-glide"
            style={{ top: glide.top, left: glide.left, width: glide.width, height: glide.height, ["--gt" as string]: `var(--l-${glide.tone}-t)`, ["--gc" as string]: `var(--l-${glide.tone})` }}
          />
        )}
        {groups.map((g) => {
          const holdsCurrent = g.items.some((i) => isOnPath(path, i.href));
          const isShut = !rail && shut.includes(g.key) && !holdsCurrent;
          const count = g.items.reduce((a, i) => a + (badges[i.href]?.n ?? 0), 0);
          return (
            <div key={g.key} className={cn("lu-grp", isShut && "shut")}>
              <button type="button" className="lu-grp-h" onClick={() => !holdsCurrent && toggle(g.key)} aria-expanded={!isShut}>
                <span>{g.key === "main" ? "" : t(g.key)}</span>
                {isShut && count > 0 && <span className="lu-badge lu-badge-sm">{count}</span>}
                <i className="ln" />
                {!holdsCurrent && <ChevronDown />}
              </button>
              <div className="lu-grp-b">
                <div>
                  {g.items.map((item) => {
                    const Icon = item.icon;
                    const on = isOnPath(path, item.href);
                    const b = badges[item.href];
                    return (
                      <button key={item.href} type="button" data-tone={item.tone} title={item.label} onClick={() => navigate(item.href)} className={cn("lu-nav", `lt-${item.tone}`, on && "on")} aria-current={on ? "page" : undefined}>
                        <span className="i">
                          <Icon />
                        </span>
                        <span className="txt">{item.label}</span>
                        {b && (
                          <span className="lu-badge" style={{ ["--bc" as string]: `var(--l-${b.tone})` }}>
                            {b.n > 99 ? "99+" : b.n}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
      {needs > 0 ? (
        <div className="ry-promo">
          <b>{isAr ? `${docsAr(needs)} تحتاج تجديدًا` : `${needs} documents need renewal`}</b>
          <p>{isAr ? "منتهية أو تنتهي خلال الثلاثين يومًا القادمة." : "Expired or ending within 30 days."}</p>
          <button type="button" onClick={() => navigate("/employee-documents?status=EXPIRING_SOON")}>
            {isAr ? "راجعها الآن" : "Review now"}
          </button>
        </div>
      ) : (
        <AccountMenu>
          <button type="button" className="lu-me" aria-label={isAr ? "الحساب" : "Account"}>
            <span className="relative">
              <UserAvatar name={user?.fullName} fileId={user?.avatarFileId} avatarKey={user?.avatarKey} size={40} ring />
              <i className="on-dot" />
            </span>
            <span className="who">
              <b>{user?.fullName}</b>
              <small>{role}</small>
            </span>
            <span className="more">
              <ChevronsUpDown />
            </span>
          </button>
        </AccountMenu>
      )}
    </aside>
  );
}

/** Light and dark: the sun turns into the moon, and the new colours grow from the button. */
function ThemeSwitch({ isAr }: { isAr: boolean }) {
  useUiStore((s) => s.themeMode);
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return (
    <button
      type="button"
      className="lu-btn lu-theme"
      onClick={(e) => luluSwapTheme(e)}
      aria-label={dark ? (isAr ? "الوضع النهاري" : "Light mode") : isAr ? "الوضع الليلي" : "Dark mode"}
      title={dark ? (isAr ? "الوضع النهاري" : "Light mode") : isAr ? "الوضع الليلي" : "Dark mode"}
      data-dark={dark}
    >
      <Sun className="sun" />
      <Moon className="moon" />
    </button>
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

  const { t, i18n: i18 } = useTranslation();
  const role = user?.isSuperAdmin ? (isAr ? "المشرف العام" : "Super Admin") : user?.roles?.[0] ? translateRoleName(user.roles[0], t) : "";

  return (
    <>
      <header className="lu-top no-print">
        <button type="button" className="lu-btn search" onClick={onSearch} aria-label={isAr ? "بحث" : "Search"}>
          <Search />
          <span className="lbl">{isAr ? "ابحث عن موظف، رقم إقامة، أو وثيقة" : "Search employees, iqamas, documents"}</span>
          <kbd className="lu-kbd k">Ctrl K</kbd>
        </button>
        <span className="sp" />
        <button type="button" className="lu-btn lang" onClick={() => i18.changeLanguage(isAr ? "en" : "ar")} aria-label={isAr ? "English" : "العربية"}>
          {isAr ? "EN" : "ع"}
        </button>
        <ThemeSwitch isAr={isAr} />
        <button type="button" ref={setBell} className="lu-btn" onClick={() => setOpen((v) => !v)} aria-label={isAr ? "الإشعارات" : "Notifications"} aria-expanded={open}>
          <Bell />
          {unread > 0 && <span className="dot">{unread > 9 ? "9+" : unread}</span>}
        </button>
        <AccountMenu>
          <button type="button" className="lu-phone-only rounded-full" aria-label={isAr ? "الحساب" : "Account"}>
            <UserAvatar name={user?.fullName} fileId={(user as AvatarUser | null)?.avatarFileId} avatarKey={(user as AvatarUser | null)?.avatarKey} size={40} ring />
          </button>
        </AccountMenu>
        <AccountMenu>
          <button type="button" className="ry-me" aria-label={isAr ? "الحساب" : "Account"}>
            <UserAvatar name={user?.fullName} fileId={(user as AvatarUser | null)?.avatarFileId} avatarKey={(user as AvatarUser | null)?.avatarKey} size={38} />
            <span>
              <b>{user?.fullName}</b>
              <small>{role}</small>
            </span>
          </button>
        </AccountMenu>
        <LuluNotifications open={open} anchor={bell} onClose={close} />
      </header>
      <div className="ry-head no-print">
        <div className="t">
          <div ref={slots?.setTitle} data-slot="title" className="peer min-w-0" />
          <div className="hidden min-w-0 peer-empty:block">
            <h1>{current?.label ?? brand.name}</h1>
          </div>
        </div>
        <div ref={slots?.setActions} className="acts" />
      </div>
    </>
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
            {/* The new page fades in at once (CSS), without waiting for the old one to leave. */}
            <div key={location.pathname} className="lu-page relative space-y-[22px]">
              <Outlet />
            </div>
          </div>
        </main>
        <Island items={items} current={current} />
        <LuluCommand open={cmd} onClose={() => setCmd(false)} pages={items} />
        <AvatarEditor />
      </div>
    </PageHeaderSlotProvider>
  );
}
