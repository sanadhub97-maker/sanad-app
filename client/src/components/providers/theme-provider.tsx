import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings";
import { useUiStore, resolveEffectiveTheme } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";

/** Applies the effective light/dark class and the admin's Settings →
 * Appearance: brand colours (in both themes, lightened for dark mode so they
 * stay readable), compact mode, and the sidebar style and animation defaults
 * (applied once per change, so each viewer can still toggle them). The
 * browser-tab icon is the fixed SanaD icon from index.html. */
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
  // If "system", check server appearance default, else fallback to "dark".
  const activeMode = themeMode !== "system" ? themeMode : (appearance?.themeMode ?? "dark");
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

    if (!appearance) {
      for (const key of colorKeys) root.removeProperty(key);
      return;
    }
    const dark = effective === "dark";
    // Brand colours are picked for a light background; on dark, lift their
    // lightness so a deep navy primary doesn't disappear into the page.
    const brand = (hex: string) => hexToHsl(hex, dark ? { min: 60, max: 72 } : undefined);
    const status = (hex: string) => hexToHsl(hex, dark ? { min: 48, max: 64 } : undefined);
    {
      const mapping: Record<string, string | null> = {
        "--primary": brand(appearance.primaryColor),
        "--secondary": dark ? null : brand(appearance.secondaryColor), // dark keeps its own surface tone
        "--accent": dark ? null : brand(appearance.accentColor),
        "--success": status(appearance.successColor),
        "--warning": status(appearance.warningColor),
        "--destructive": status(appearance.dangerColor),
        "--info": status(appearance.infoColor),
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

  // Compact mode scales the whole interface (Tailwind sizes are in rem).
  useEffect(() => {
    document.documentElement.classList.toggle("compact", Boolean(appearance?.compactMode));
  }, [appearance?.compactMode]);

  // Sidebar style and animations: apply the saved default when it changes.
  useEffect(() => {
    if (!appearance) return;
    const ui = useUiStore.getState();
    const applied = ui.appliedAppearance;
    if (appearance.sidebarStyle && applied.sidebarStyle !== appearance.sidebarStyle) {
      ui.setSidebarCollapsed(appearance.sidebarStyle === "collapsed");
      ui.markAppearanceApplied({ sidebarStyle: appearance.sidebarStyle });
    }
    if (typeof appearance.animationsEnabled === "boolean" && applied.animationsEnabled !== appearance.animationsEnabled) {
      ui.setAnimationsEnabled(appearance.animationsEnabled);
      ui.markAppearanceApplied({ animationsEnabled: appearance.animationsEnabled });
    }
  }, [appearance]);

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

/** "#0B1F3A" → "213 68% 14%"; optionally clamps the lightness. */
function hexToHsl(hex: string | undefined, clampL?: { min: number; max: number }): string | null {
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
  let L = Math.round(l * 100);
  if (clampL) L = Math.min(clampL.max, Math.max(clampL.min, L));
  return `${Math.round(h)} ${Math.round(s * 100)}% ${L}%`;
}
