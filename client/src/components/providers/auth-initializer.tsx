import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { refreshAccessToken } from "@/lib/api";
import { fetchMe } from "@/api/auth";

/** On first load, tries to silently re-authenticate from the httpOnly
 * refresh cookie (if the user has one from a previous session) before
 * rendering the app — avoids flashing the login page for a valid session. */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const setInitializing = useAuthStore((s) => s.setInitializing);
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (token) {
        try {
          const user = await fetchMe();
          if (!cancelled) setAuth(token, user);
        } catch {
          // ignore — user stays logged out
        }
      }
      if (!cancelled) setInitializing(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
