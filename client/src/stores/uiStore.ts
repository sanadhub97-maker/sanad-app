import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface UiState {
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
  animationsEnabled: boolean;
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
// across reloads.
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      themeMode: "dark",
      sidebarCollapsed: false,
      animationsEnabled: true,
      setThemeMode: (mode) => set({ themeMode: mode }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
      appliedAppearance: {},
      markAppearanceApplied: (patch) => set((s) => ({ appliedAppearance: { ...s.appliedAppearance, ...patch } })),
    }),
    { name: "sanad-ui-preferences" }
  )
);

export function resolveEffectiveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "light") {
    return "light";
  }
  return "dark";
}
