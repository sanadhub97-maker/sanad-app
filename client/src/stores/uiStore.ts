import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface UiState {
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
  animationsEnabled: boolean;
  /** Speed in seconds for the royal alerts ribbon continuous scroll (60s, 90s, 140s). */
  tickerSpeed: number;
  setTickerSpeed: (sec: number) => void;
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
// across reloads, the light/dark choice from the top bar among them.
/** Older saved preferences brought up to date: v1 opens the side menu once; v2 drops a saved theme, so it starts dark. */
export function migrateUiPrefs(persisted: unknown, from: number): Partial<UiState> {
  const p = { ...(persisted as Partial<UiState>) };
  if (from < 1) p.sidebarCollapsed = false;
  if (from < 2) delete p.themeMode;
  if (!p.tickerSpeed || p.tickerSpeed < 40) p.tickerSpeed = 90;
  return p;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      themeMode: "dark",
      sidebarCollapsed: false,
      animationsEnabled: true,
      tickerSpeed: 90,
      setTickerSpeed: (sec) => set({ tickerSpeed: sec }),
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
      // Version 1, the luxury edition: the side menu opens expanded once, as in the approved preview.
      // Version 2: the light/dark choice is remembered; an older saved theme is dropped, so it starts dark.
      version: 2,
      migrate: (persisted, from) => migrateUiPrefs(persisted, from) as UiState,
    }
  )
);

export function resolveEffectiveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "light") {
    return "light";
  }
  return "dark";
}
