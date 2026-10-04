import type { AuthContext } from "@/types/express";
import { hasPermission } from "@/lib/security";

export function visiblePaymentLink<T extends { payment?: unknown; paymentId?: unknown }>(record: T, auth: AuthContext | undefined): T {
  return hasPermission(auth, "payments.view") ? record : { ...record, payment: null, paymentId: null };
}
