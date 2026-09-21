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
}

// Per-viewer UI convenience state (§34). Authoritative appearance defaults
// (colors, sidebar style, animations) come from Settings → Appearance on
// the server — this store just remembers the current user's local toggles
// across reloads.
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      themeMode: "system",
      sidebarCollapsed: false,
      animationsEnabled: true,
      setThemeMode: (mode) => set({ themeMode: mode }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
    }),
    { name: "sanad-ui-preferences" }
  )
);

export function resolveEffectiveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}
