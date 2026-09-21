import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function RequirePermission({ permission }: { permission: string | string[] }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const permissions = Array.isArray(permission) ? permission : [permission];
  const allowed = permissions.some((p) => hasPermission(p));

  if (!allowed) return <Navigate to="/403" replace />;
  return <Outlet />;
}
