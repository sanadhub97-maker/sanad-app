import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { NAV_ITEMS, type NavItem } from "@/components/layout/nav-config";
import { AppleIcon } from "@/components/common/apple-icon";

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const items = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));

  // Group items by section
  const sections: { sectionKey?: string; items: NavItem[] }[] = [];
  items.forEach((item) => {
    const currentSection = sections[sections.length - 1];
    if (!currentSection || currentSection.sectionKey !== item.section) {
      sections.push({ sectionKey: item.section, items: [item] });
    } else {
      currentSection.items.push(item);
    }
  });

  return (
    <nav className="flex flex-col gap-5 px-3 py-3.5 select-none">
      {sections.map((sec, idx) => (
        <div key={sec.sectionKey ?? idx} className="space-y-1">
          {sec.sectionKey && !collapsed && (
            <div className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400/90 dark:text-slate-500">
              {t(sec.sectionKey)}
            </div>
          )}

          {sec.items.map((item) => {
            const Icon = item.icon;
            const visibleChildren = item.children?.filter((c) => !c.permission || hasPermission(c.permission));
            const isOpen = openGroup === item.href;

            if (visibleChildren && visibleChildren.length > 0 && !collapsed) {
              return (
                <div key={item.href} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setOpenGroup(isOpen ? null : item.href)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition-all duration-200",
                      isOpen
                        ? "bg-slate-100/90 text-slate-900 dark:bg-white/[0.1] dark:text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                    )}
                  >
                    <AppleIcon
                      icon={Icon}
                      tone={item.tone ?? "blue"}
                      size="sm"
                      className="transition-transform duration-200 group-hover:scale-105 shadow-xs"
                    />
                    <span className="flex-1 text-start text-xs sm:text-sm font-semibold tracking-tight">{t(item.label)}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200",
                        isOpen && "rotate-180 text-blue-600 dark:text-cyan-400"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="ms-4 my-1 flex flex-col gap-1 border-s-2 border-blue-500/20 dark:border-white/10 ps-3">
                      {visibleChildren.map((child) => (
                        <NavLink
                          key={child.href}
                          to={child.href}
                          end
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              "relative rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all duration-150",
                              isActive
                                ? "bg-blue-500/10 text-blue-700 font-bold border border-blue-500/20 shadow-xs dark:bg-gradient-to-r dark:from-blue-500/25 dark:to-indigo-500/15 dark:text-white dark:border-blue-400/30 dark:shadow-sm"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                            )
                          }
                        >
                          {t(child.label)}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-blue-50 via-indigo-50/40 to-transparent text-blue-700 font-bold border border-blue-200/80 shadow-xs dark:bg-gradient-to-r dark:from-blue-500/20 dark:via-indigo-500/10 dark:to-transparent dark:text-white dark:border-blue-500/30 dark:shadow-[0_0_18px_-4px_rgba(59,130,246,0.3)] dark:backdrop-blur-md"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white",
                    collapsed && "justify-center px-0 py-2.5"
                  )
                }
                title={collapsed ? t(item.label) : undefined}
              >
                {({ isActive }) => (
                  <>
                    <AppleIcon
                      icon={Icon}
                      tone={item.tone ?? "blue"}
                      size="sm"
                      className={cn(
                        "transition-transform duration-200 group-hover:scale-105 shadow-xs",
                        isActive && "ring-2 ring-blue-500/40 dark:ring-cyan-400/50 shadow-md scale-105"
                      )}
                    />
                    {!collapsed && (
                      <span className="flex-1 truncate text-xs sm:text-sm tracking-tight">
                        {t(item.label)}
                      </span>
                    )}
                    {/* Active accent vertical capsule beacon */}
                    {isActive && !collapsed && (
                      <span className="h-4 w-1 rounded-full bg-blue-600 dark:bg-cyan-400 shadow-[0_0_10px_rgba(37,99,235,0.8)] dark:shadow-[0_0_10px_#38bdf8] shrink-0" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
