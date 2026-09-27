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
        <button type="button" className={cn(className, on ? "bg-card text-foreground" : "text-dock-muted hover:text-ink-foreground")}>
          <MoreHorizontal className={compact ? "h-[21px] w-[21px]" : "h-[19px] w-[19px]"} />
          <span>{t("nav.dock.more")}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={14} className="w-64 rounded-3xl p-2">
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

  const desktopItem = "flex h-12 items-center gap-2 whitespace-nowrap rounded-full px-[18px] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const mobileItem = "flex h-full flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <>
      <nav
        aria-label={t("nav.dock.home")}
        className="no-print fixed bottom-[26px] left-1/2 z-40 hidden desk:!hidden -translate-x-1/2 gap-1 rounded-full bg-ink p-2 shadow-[0_18px_40px_-16px_rgba(16,39,44,0.55)] lg:flex"
      >
        {docked.map((item) => {
          const Icon = item.icon;
          const on = isActive(path, item.href);
          return (
            <NavLink key={item.href} to={item.href} end={item.href === "/"} className={cn(desktopItem, on ? "bg-card text-foreground" : "text-dock-muted hover:text-ink-foreground")}>
              <Icon className="h-[19px] w-[19px]" />
              <span>{t(item.dockLabel!)}</span>
            </NavLink>
          );
        })}
        <MoreMenu items={more} className={desktopItem} />
      </nav>

      <nav
        aria-label={t("nav.dock.home")}
        className="no-print fixed inset-x-4 bottom-5 z-40 grid h-[68px] grid-cols-5 rounded-full bg-ink p-1.5 shadow-[0_18px_40px_-16px_rgba(16,39,44,0.55)] lg:hidden"
      >
        {mobileMain.map((item) => {
          const Icon = item.icon;
          const on = isActive(path, item.href);
          return (
            <NavLink key={item.href} to={item.href} end={item.href === "/"} className={cn(mobileItem, on ? "bg-card text-foreground" : "text-dock-muted")}>
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
