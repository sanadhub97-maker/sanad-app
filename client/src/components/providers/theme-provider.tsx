import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings";
import { useUiStore, resolveEffectiveTheme } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";

/** Applies the effective light/dark class and, once an admin has saved
 * custom brand colors in Settings → Appearance, overrides the CSS
 * variables at runtime (§5/§34) — falls back to the built-in palette
 * otherwise. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useUiStore((s) => s.themeMode);
  const isAuthenticated = Boolean(useAuthStore((s) => s.user));

  const { data: appearance } = useQuery({
    queryKey: ["settings", "appearance"],
    queryFn: settingsApi.getAppearance,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  // Active theme: user's explicit local choice takes priority if not "system".
  // If "system", check server appearance default, else OS media query.
  const activeMode = themeMode !== "system" ? themeMode : (appearance?.themeMode ?? "system");
  const effective = resolveEffectiveTheme(activeMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", effective === "dark");

    const root = document.documentElement.style;
    const colorKeys = [
      "--primary",
      "--secondary",
      "--accent",
      "--success",
      "--warning",
      "--destructive",
      "--info",
    ];

    // In dark mode, do not let light-mode hex colors override the luxury dark theme variables
    if (effective === "dark") {
      for (const key of colorKeys) {
        root.removeProperty(key);
      }
      return;
    }

    // In light mode, apply custom admin brand colors if provided
    if (appearance) {
      const mapping: Record<string, string | null> = {
        "--primary": hexToHsl(appearance.primaryColor),
        "--secondary": hexToHsl(appearance.secondaryColor),
        "--accent": hexToHsl(appearance.accentColor),
        "--success": hexToHsl(appearance.successColor),
        "--warning": hexToHsl(appearance.warningColor),
        "--destructive": hexToHsl(appearance.dangerColor),
        "--info": hexToHsl(appearance.infoColor),
      };
      for (const [key, value] of Object.entries(mapping)) {
        if (value) {
          root.setProperty(key, value);
        } else {
          root.removeProperty(key);
        }
      }
    }
  }, [effective, appearance]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (activeMode === "system") {
        document.documentElement.classList.toggle("dark", media.matches);
      }
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [activeMode]);

  return <>{children}</>;
}

function hexToHsl(hex: string | undefined): string | null {
  if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex)) return null;
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
