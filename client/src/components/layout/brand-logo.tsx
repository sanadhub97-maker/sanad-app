import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  collapsed?: boolean;
  className?: string;
}

export function BrandLogo({ collapsed, className }: BrandLogoProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language !== "en";
  const isAuthenticated = Boolean(useAuthStore((s) => s.user));

  const { data: company } = useQuery({
    queryKey: ["settings", "company"],
    queryFn: settingsApi.getCompany,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const companyName = isRtl
    ? (company?.nameAr || company?.nameEn || t("app.name"))
    : (company?.nameEn || company?.nameAr || t("app.name"));

  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      {/* The SanaD system emblem — fixed on purpose: the company logo from
          Settings is for printed documents and exports, not the app itself. */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center transition-transform hover:scale-105">
        <img
          src="/brand/sanad-mark.png"
          alt="SanaD"
          className="h-full w-full object-contain drop-shadow-[0_2px_6px_rgba(180,130,40,0.35)]"
        />
        {/* Ambient pulse dot */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
      </div>

      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white font-sans">
              SanaD
            </span>
            <span className="rounded-md bg-blue-500/10 dark:bg-gradient-to-r dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-500/20 dark:border-blue-400/30 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">
              {t("app.enterpriseBadge")}
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-300/80 truncate max-w-[170px]" title={companyName}>
            {companyName}
          </span>
        </div>
      )}
    </div>
  );
}
