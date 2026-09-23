import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import { settingsApi } from "@/api/settings";
import { filesApi } from "@/api/files";

/** The company's name and logo for the top bar. The logo follows the theme:
 * the dark-mode logo when the app is dark (falling back to the light one). */
export function CompanyBadge({ isDark }: { isDark: boolean }) {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const { data } = useQuery({
    queryKey: ["settings", "branding"],
    queryFn: settingsApi.getBranding,
    staleTime: 5 * 60_000,
  });

  const name = isAr ? data?.nameAr || data?.nameEn : data?.nameEn || data?.nameAr;
  const logoId = (isDark ? data?.logoDarkFileId : null) || data?.logoFileId;
  if (!name && !logoId) return null;

  return (
    <div className="flex items-center gap-3 min-w-0">
      {logoId ? (
        <div className="flex h-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-white px-1.5 dark:border-white/10 dark:bg-white/[0.06]">
          <img
            key={logoId}
            src={filesApi.getPublicUrl(logoId)}
            alt={name ?? ""}
            className="h-8 w-auto min-w-8 max-w-[116px] object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
      )}
      {name && (
        <div className="hidden xl:flex flex-col min-w-0 leading-tight">
          <span className="truncate text-[14px] font-extrabold text-foreground max-w-[180px] lg:max-w-[240px] 2xl:max-w-[320px]" title={name}>
            {name}
          </span>
          <span className="truncate text-[11px] font-medium text-muted-foreground">
            {isAr ? "المنشأة المعتمدة" : "Active organization"}
          </span>
        </div>
      )}
    </div>
  );
}
