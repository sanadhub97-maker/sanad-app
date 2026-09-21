import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings";
import { useAuthStore } from "@/stores/authStore";
import { filesApi } from "@/api/files";
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
      {/* Luxury Geometric Shield / Crown Emblem or Official Company Logo */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1.5px] shadow-lg shadow-blue-500/25 transition-transform hover:scale-105">
        <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950/90 backdrop-blur-sm overflow-hidden p-1">
          {company?.logoFileId ? (
            <img
              src={filesApi.getPublicUrl(company.logoFileId)}
              alt="Logo"
              className="h-full w-full object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-cyan-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
            >
              {/* Geometric luxury stylized "S" / shield */}
              <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" stroke="url(#sanad-grad)" />
              <path d="M9 11.5c.6-.8 1.8-1.5 3-1.5 1.5 0 2.5.8 2.5 2 0 1.5-1.5 2-2.5 2.5s-2.5 1-2.5 2.5c0 1.2 1 2 2.5 2 1.2 0 2.4-.7 3-1.5" stroke="white" />
              <defs>
                <linearGradient id="sanad-grad" x1="3" y1="2" x2="21" y2="25" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#38BDF8" />
                  <stop offset="0.5" stopColor="#6366F1" />
                  <stop offset="1" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </div>
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
