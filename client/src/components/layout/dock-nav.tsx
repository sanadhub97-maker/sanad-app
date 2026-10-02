import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ITEMS, type NavItem } from "@/components/layout/nav-config";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

/* The Oasis navigation: a dark pill floating at the bottom of the screen.
   The main sections sit in it; everything else is under "More". Phones get
   a compact version with four sections and "More". */

const MOBILE_COUNT = 4;

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

function MoreMenu({ items, className, compact }: { items: { label: string; href: string; icon: NavItem["icon"] }[]; className: string; compact?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const path = useLocation().pathname;
  const on = items.some((i) => isActive(path, i.href));
  if (!items.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            className,
            on
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]"
              : "text-slate-400 hover:text-white hover:bg-white/10"
          )}
        >
          <MoreHorizontal className={compact ? "h-[21px] w-[21px]" : "h-[19px] w-[19px]"} />
          <span>{t("nav.dock.more")}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={14} className="w-64 rounded-3xl p-2 bg-card/95 dark:bg-[#0c1222]/95 backdrop-blur-2xl border border-white/15 shadow-2xl">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.href}
              onSelect={() => navigate(item.href)}
              className={cn("cursor-pointer gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium", isActive(path, item.href) && "bg-accent text-accent-foreground")}
            >
              <Icon className="h-[18px] w-[18px] text-muted-foreground" />
              {t(item.label)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DockNav() {
  const { t } = useTranslation();
  const path = useLocation().pathname;
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const allowed = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));
  const docked = allowed.filter((i) => i.dockLabel);
  // Menu entries for "More": undocked items, with grouped children listed one by one.
  const flatten = (items: NavItem[]) =>
    items.flatMap((item) => {
      const kids = item.children?.filter((c) => !c.permission || hasPermission(c.permission));
      return kids && kids.length ? kids.map((c) => ({ label: c.label, href: c.href, icon: item.icon })) : [{ label: item.label, href: item.href, icon: item.icon }];
    });
  const more = flatten(allowed.filter((i) => !i.dockLabel));
  const mobileMain = docked.slice(0, MOBILE_COUNT);
  const mobileMore = flatten([...docked.slice(MOBILE_COUNT), ...allowed.filter((i) => !i.dockLabel)]);

  const desktopItem = "flex h-12 items-center gap-2 whitespace-nowrap rounded-full px-[18px] text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const mobileItem = "flex h-full flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <>
      <nav
        aria-label={t("nav.dock.home")}
        className="no-print fixed bottom-[26px] left-1/2 z-40 hidden desk:!hidden -translate-x-1/2 gap-1.5 rounded-full bg-[#0c1222]/85 dark:bg-[#070b14]/85 backdrop-blur-2xl border border-white/20 p-2 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.25)] lg:flex"
      >
        {docked.map((item) => {
          const Icon = item.icon;
          const on = isActive(path, item.href);
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={cn(
                desktopItem,
                on
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="h-[19px] w-[19px]" />
              <span>{t(item.dockLabel!)}</span>
            </NavLink>
          );
        })}
        <MoreMenu items={more} className={desktopItem} />
      </nav>

      <nav
        aria-label={t("nav.dock.home")}
        className="no-print fixed inset-x-4 bottom-5 z-40 grid h-[68px] grid-cols-5 rounded-full bg-[#0c1222]/85 dark:bg-[#070b14]/85 backdrop-blur-2xl border border-white/20 p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.25)] lg:hidden"
      >
        {mobileMain.map((item) => {
          const Icon = item.icon;
          const on = isActive(path, item.href);
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={cn(
                mobileItem,
                on
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Icon className="h-[21px] w-[21px]" />
              <span>{t(item.dockLabel!)}</span>
            </NavLink>
          );
        })}
        <MoreMenu items={mobileMore} className={mobileItem} compact />
      </nav>
    </>
  );
}
