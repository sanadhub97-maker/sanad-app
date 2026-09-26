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
            <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-gold/80">
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
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200",
                      isOpen
                        ? "bg-white/[0.07] text-foreground"
                        : "text-foreground/80 hover:bg-white/[0.06] hover:text-foreground"
                    )}
                  >
                    <AppleIcon
                      icon={Icon}
                      tone={item.tone ?? "blue"}
                      size="sm"
                      className="transition-transform duration-200 group-hover:scale-105 shadow-sm"
                    />
                    <span className="flex-1 text-start text-xs sm:text-sm font-semibold tracking-tight">{t(item.label)}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180 text-primary"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="ms-4 my-1 flex flex-col gap-1 border-s-2 border-border ps-3">
                      {visibleChildren.map((child) => (
                        <NavLink
                          key={child.href}
                          to={child.href}
                          end
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              "relative rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150",
                              isActive
                                ? "nav-active text-foreground font-bold"
                                : "text-foreground/75 hover:bg-white/[0.06] hover:text-foreground"
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
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "nav-active text-foreground font-bold"
                      : "text-foreground/80 hover:bg-white/[0.06] hover:text-foreground",
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
                        "transition-transform duration-200 group-hover:scale-105 shadow-sm",
                        isActive && "scale-105"
                      )}
                    />
                    {!collapsed && (
                      <span className="flex-1 truncate text-xs sm:text-sm tracking-tight">
                        {t(item.label)}
                      </span>
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
