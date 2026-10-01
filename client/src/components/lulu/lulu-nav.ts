import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { NAV_ITEMS, type NavItem } from "@/components/layout/nav-config";
import { useAuthStore } from "@/stores/authStore";

export type LuluTone = "indigo" | "sky" | "rose" | "amber" | "teal" | "violet" | "green";

/** Each section's colour in the Pearl design (as in the approved preview). */
const TONE_BY_HREF: Record<string, LuluTone> = {
  "/": "sky",
  "/daily-tasks": "green",
  "/employees": "indigo",
  "/employee-documents": "sky",
  "/company-documents": "amber",
  "/branches": "teal",
  "/payments": "violet",
  "/reports": "rose",
  "/import-export": "teal",
  "/files": "sky",
  "/users": "green",
  "/roles": "violet",
  "/audit-logs": "amber",
  "/settings": "indigo",
  "/notifications": "rose",
  "/profile": "indigo",
};

export const toneOf = (href: string): LuluTone => TONE_BY_HREF[href] ?? "sky";

/** Every page's own colour (as in the approved preview): its icon in the menu,
 * the bar across the top while it opens, and the first figure on its page. */
const COLOR_BY_HREF: Record<string, string> = {
  "/": "#2563eb",
  "/daily-tasks": "#059669",
  "/employees": "#4f46e5",
  "/employee-documents": "#0284c7",
  "/company-documents": "#d97706",
  "/branches": "#0d9488",
  "/payments": "#e11d48",
  "/reports": "#9333ea",
  "/import-export": "#65a30d",
  "/files": "#ea580c",
  "/users": "#db2777",
  "/roles": "#c026d3",
  "/audit-logs": "#475569",
  "/settings": "#78716c",
  "/notifications": "#e11d48",
  "/profile": "#4f46e5",
};
/** The colour of the page a path belongs to (a details page takes its list's). */
export const colorOf = (path: string): string => {
  if (COLOR_BY_HREF[path]) return COLOR_BY_HREF[path];
  const hit = Object.keys(COLOR_BY_HREF).filter((h) => h !== "/" && (path === h || path.startsWith(h + "/"))).sort((a, b) => b.length - a.length)[0];
  return hit ? COLOR_BY_HREF[hit] : "#2563eb";
};

export interface LuluNavItem {
  label: string;
  href: string;
  icon: NavItem["icon"];
  tone: LuluTone;
  /** The page's own colour. */
  color: string;
  section?: string;
}

export const isOnPath = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

/** The menu items this user may open, with submenus flattened. */
export function useLuluNav() {
  const { t } = useTranslation();
  const path = useLocation().pathname;
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const items: LuluNavItem[] = NAV_ITEMS.filter((i) => !i.permission || hasPermission(i.permission)).flatMap((item) => {
    const kids = item.children?.filter((c) => !c.permission || hasPermission(c.permission));
    const list = kids && kids.length ? kids.map((c, k) => ({ label: c.label, href: c.href, section: k === 0 ? item.section : undefined })) : [{ label: item.label, href: item.href, section: item.section }];
    return list.map((x) => ({ ...x, label: t(x.label), icon: item.icon, tone: toneOf(x.href), color: colorOf(x.href) }));
  });
  const current = items.find((i) => i.href !== "/" && isOnPath(path, i.href)) ?? (path === "/" ? items[0] : undefined);
  return { items, current, path };
}
