import { create } from "zustand";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isInitializing: boolean;
  setAuth: (accessToken: string, user: AuthUser) => void;
  clearAuth: () => void;
  setInitializing: (value: boolean) => void;
  hasPermission: (key: string) => boolean;
}

// The access token lives only in memory (never localStorage) — page
// reloads re-authenticate via the httpOnly refresh cookie (see
// AppInitializer / api.ts), which is the safer pattern against XSS token
// theft (§43).
export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isInitializing: true,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
  setInitializing: (value) => set({ isInitializing: value }),
  hasPermission: (key: string) => {
    const user = get().user;
    if (!user) return false;
    return user.isSuperAdmin || user.permissions.includes("*") || user.permissions.includes(key);
  },
}));
