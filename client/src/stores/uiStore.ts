import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface UiState {
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
  animationsEnabled: boolean;
  /** The site's accent colour (hex), chosen from the account menu. */
  accent: string;
  setAccent: (hex: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  /** The admin's Settings → Appearance values last applied in this browser. A
   * saved change is applied once; after that the viewer's own toggles win. */
  appliedAppearance: { sidebarStyle?: string; animationsEnabled?: boolean };
  markAppearanceApplied: (patch: { sidebarStyle?: string; animationsEnabled?: boolean }) => void;
}

// Per-viewer UI convenience state (§34). Authoritative appearance defaults
// (colors, sidebar style, animations) come from Settings → Appearance on
// the server — this store just remembers the current user's local toggles
// across reloads. The theme is the exception: every visit starts on the
// admin's appearance default (the light Oasis theme unless changed), and a
// switch from the top bar lasts until the page is reloaded.
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      themeMode: "system",
      sidebarCollapsed: false,
      animationsEnabled: true,
      accent: "#a8792f",
      setAccent: (hex) => set({ accent: hex }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
      appliedAppearance: {},
      markAppearanceApplied: (patch) => set((s) => ({ appliedAppearance: { ...s.appliedAppearance, ...patch } })),
    }),
    {
      name: "sanad-ui-preferences",
      partialize: ({ themeMode: _theme, ...rest }) => rest,
      // Ignore a theme saved by older versions, so every visit starts on the default.
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<UiState>), themeMode: current.themeMode }),
    }
  )
);

export function resolveEffectiveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "light") {
    return "light";
  }
  return "dark";
}
