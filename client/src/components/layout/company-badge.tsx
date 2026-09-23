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
    <div className="flex items-center gap-2.5 min-w-0 shrink-0">
      {logoId ? (
        <div className="flex h-9 items-center justify-center rounded-xl bg-card/60 dark:bg-white/[0.04] p-1 border border-border/60 dark:border-white/10 shadow-2xs">
          <img
            key={logoId}
            src={filesApi.getPublicUrl(logoId)}
            alt={name ?? ""}
            className="h-7 w-auto max-w-[120px] object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
          <Building2 className="h-4 w-4" />
        </div>
      )}
      {name && (
        <div className="hidden md:flex flex-col min-w-0">
          <span
            className="text-xs sm:text-sm font-extrabold text-foreground truncate max-w-[200px] lg:max-w-[260px] xl:max-w-[320px] leading-tight"
            title={name}
          >
            {name}
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground truncate">
            {isAr ? "المنشأة المعتمدة" : "Active Organization"}
          </span>
        </div>
      )}
    </div>
  );
}
