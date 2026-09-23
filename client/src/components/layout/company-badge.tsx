import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
      {logoId && (
        <img
          key={logoId}
          src={filesApi.getPublicUrl(logoId)}
          alt={name ?? ""}
          className="h-9 w-auto max-w-[120px] object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
      {name && (
        <span className="hidden md:block text-sm font-bold text-foreground truncate max-w-[220px]" title={name}>
          {name}
        </span>
      )}
    </div>
  );
}
