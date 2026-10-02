import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { getErrorMessage, refreshAccessToken } from "@/lib/api";
import { toast } from "sonner";

/** On first load, tries to silently re-authenticate from the httpOnly
 * refresh cookie (if the user has one from a previous session) before
 * rendering the app — avoids flashing the login page for a valid session. */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const setInitializing = useAuthStore((s) => s.setInitializing);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Refresh already returns current user permissions and stores them.
        await refreshAccessToken();
      } catch (error) {
        if (!cancelled) toast.error(getErrorMessage(error));
      } finally {
        if (!cancelled) setInitializing(false);
      }
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
