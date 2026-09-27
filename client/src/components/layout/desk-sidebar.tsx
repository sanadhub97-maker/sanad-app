import { useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-config";
import type { AppleTone } from "@/components/common/apple-icon";
import { settingsApi } from "@/api/settings";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

/* The computer sidebar in the Luxe design: a floating glass panel, squircle
   icons with a specular highlight, and a glass pill that glides to the page
   you are on. */

const TONE: Record<string, [string, string]> = {
  blue: ["#7DD3FC", "#0A7FB5"],
  sky: ["#7DD3FC", "#0A7FB5"],
  cyan: ["#67E8F9", "#0E7490"],
  indigo: ["#8B92F8", "#4F5BD5"],
  purple: ["#C4B5FD", "#7C3AED"],
  emerald: ["#86EFAC", "#1F8A57"],
  teal: ["#5EEAD4", "#0F9D86"],
  amber: ["#FCD34D", "#D97706"],
  orange: ["#FDBA74", "#EA580C"],
  rose: ["#FDA4AF", "#C63C39"],
  red: ["#FCA5A5", "#B91C1C"],
  zinc: ["#D4D4D8", "#52525B"],
  slate: ["#CBD5E1", "#56696D"],
};

export function Squircle({ tone = "blue", children, size = 32 }: { tone?: AppleTone | string; children: React.ReactNode; size?: number }) {
  const [c1, c2] = TONE[tone] ?? TONE.blue;
  return (
    <span
      className="relative grid shrink-0 place-items-center text-white transition-transform duration-300 [transition-timing-function:cubic-bezier(.3,1.6,.5,1)]"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.34,
        background: `linear-gradient(150deg, ${c1}, ${c2})`,
        boxShadow: `0 8px 16px -8px ${c2}, inset 0 1px 0 rgba(255,255,255,.45), inset 0 -2px 4px rgba(0,0,0,.15)`,
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 top-0.5 h-[45%] bg-gradient-to-b from-white/40 to-white/0"
        style={{ borderRadius: `${size * 0.28}px ${size * 0.28}px ${size * 0.44}px ${size * 0.44}px` }}
      />
      <span className="relative">{children}</span>
    </span>
  );
}

export function DeskSidebar() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const path = useLocation().pathname;
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  useUiStore((s) => s.themeMode);
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const { data: mark } = useQuery({ queryKey: ["settings", "branding", "mark"], queryFn: settingsApi.getBrandingMark, staleTime: 30 * 60_000 });
  const { data: branding } = useQuery({ queryKey: ["settings", "branding"], queryFn: settingsApi.getBranding, staleTime: 5 * 60_000 });
  const companyName = isAr ? branding?.nameAr || branding?.nameEn : branding?.nameEn || branding?.nameAr;

  const items = NAV_ITEMS.filter((i) => !i.permission || hasPermission(i.permission)).flatMap((item) => {
    const kids = item.children?.filter((c) => !c.permission || hasPermission(c.permission));
    return kids && kids.length
      ? kids.map((c, k) => ({ ...item, label: c.label, href: c.href, section: k === 0 ? item.section : undefined, children: undefined }))
      : [item];
  });
  const isOn = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

  // The glass pill glides to the active item.
  const wrap = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ y: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>("[data-on='true']");
    setPill(el ? { y: el.offsetTop, h: el.offsetHeight } : null);
  }, [path, items.length]);

  const initials =
    user?.fullName
      ?.split(" ")
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() ?? "U";

  function toggleTheme() {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    setThemeMode(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  let lastSection: string | undefined;

  return (
    <aside className="lux-glass no-print sticky top-[18px] z-20 m-[18px] me-0 hidden h-[calc(100vh-36px)] w-[250px] shrink-0 flex-col rounded-[26px] bg-card px-3 pb-3.5 pt-5 shadow-[var(--glass-shadow)] desk:flex">
      <button type="button" onClick={() => navigate("/")} className="flex items-center gap-3 px-2 pb-4 text-start">
        <img src={mark || "/brand/sanad-mark.png"} alt="" className="h-11 w-11 rounded-[14px] object-contain" />
        <span className="min-w-0">
          <b className="block truncate font-head text-[15px] font-semibold">{companyName ?? "SanaD"}</b>
          <small className="text-xs text-muted-foreground">{isAr ? "نظام SanaD" : "SanaD system"}</small>
        </span>
      </button>

      <div ref={wrap} className="no-scrollbar relative -mx-1 flex-1 overflow-y-auto px-1">
        {pill && (
          <span
            aria-hidden="true"
            className="absolute inset-x-1 rounded-[15px] bg-white/95 shadow-[0_10px_24px_-14px_rgba(10,127,181,.8)] transition-transform duration-500 [transition-timing-function:cubic-bezier(.2,.9,.2,1)] dark:bg-white/[0.12]"
            style={{ transform: `translateY(${pill.y}px)`, height: pill.h, top: 0 }}
          >
            <span className="absolute -start-[10px] bottom-3 top-3 w-1 rounded-full bg-gradient-to-b from-sky-300 to-teal-400 shadow-[0_0_12px_#7dd3fc]" />
          </span>
        )}
        {items.map((item) => {
          const Icon = item.icon;
          const on = isOn(item.href);
          const header = item.section && item.section !== lastSection ? item.section : undefined;
          if (item.section) lastSection = item.section;
          return (
            <div key={item.href}>
              {header && <div className="px-3 pb-1 pt-3 text-[11.5px] text-muted-foreground/80">{t(header)}</div>}
              <NavLink
                to={item.href}
                end={item.href === "/"}
                data-on={on}
                className={cn(
                  "group relative z-[1] flex h-11 items-center gap-3 rounded-[15px] px-2 text-sm transition-colors",
                  on ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("transition-[filter,opacity]", !on && "opacity-85 saturate-[.55] group-hover:saturate-100")}>
                  <Squircle tone={item.tone}>
                    <Icon className="h-4 w-4" />
                  </Squircle>
                </span>
                <span className="truncate">{t(item.label)}</span>
              </NavLink>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-2.5 rounded-[18px] bg-secondary p-2.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full p-[2px]" style={{ background: "conic-gradient(from 200deg,#7DD3FC,#2DD4B0,#E8C58A,#7DD3FC)" }}>
          <span className="grid h-full w-full place-items-center rounded-full bg-[#0A4A6A] text-[13px] font-semibold text-white">{initials}</span>
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[13.5px] font-semibold">{user?.fullName}</b>
          <small className="text-[11.5px] text-muted-foreground">{user?.isSuperAdmin ? (isAr ? "المشرف العام" : "Super Admin") : user?.roles?.[0]}</small>
        </span>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? (isAr ? "الوضع النهاري" : "Light mode") : isAr ? "الوضع الليلي" : "Dark mode"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card transition-transform duration-500 hover:rotate-180"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
