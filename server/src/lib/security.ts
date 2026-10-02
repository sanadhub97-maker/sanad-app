import type { AuthContext } from "@/types/express";
import { ApiError } from "@/utils/apiError";
import type { Prisma } from "@prisma/client";

export const SOURCE_PERMISSIONS: Record<string, string> = {
  EMPLOYEE_IQAMA: "employees.view", EMPLOYEE_PASSPORT: "employees.view", EMPLOYEE_DOCUMENT: "employeeDocuments.view",
  COMPANY_DOCUMENT: "companyDocuments.view", PAYMENT: "payments.view", DAILY_TASK: "tasks.view",
};

export function canViewSource(auth: AuthContext | null | undefined, source: string) {
  return Boolean(auth && hasPermission(auth, SOURCE_PERMISSIONS[source] ?? "auditLogs.view"));
}

export function notificationVisibility(auth: AuthContext): Prisma.NotificationWhereInput {
  const denied = Object.keys(SOURCE_PERMISSIONS).filter((source) => !canViewSource(auth, source));
  return { OR: [{ relatedType: null }, { relatedType: { notIn: denied } }] };
}

export function hasPermission(auth: AuthContext | undefined, key: string): boolean {
  if (key.startsWith("payments.") && auth?.financeAccess === false) return false;
  return Boolean(auth && (auth.isSuperAdmin || auth.permissions.has("*") || auth.permissions.has(key)));
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function requireSuperAdmin(auth: AuthContext | undefined) {
  if (!auth) throw ApiError.unauthorized();
  if (!auth.isSuperAdmin) throw ApiError.forbidden("Only a Super Admin can manage roles and permissions.");
}

// Exact trusted provider hosts: no user-selected ports, credentials, or private hosts.
export function assertPushEndpoint(endpoint: string) {
  let url: URL;
  try { url = new URL(endpoint); } catch { throw ApiError.badRequest("Invalid push endpoint."); }
  const host = url.hostname.toLowerCase();
  const trusted = host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" || host === "web.push.apple.com" || host === "wns2-par02p.notify.windows.com" || /^[a-z0-9-]+\.notify\.windows\.com$/.test(host);
  if (!trusted || url.protocol !== "https:" || (url.port && url.port !== "443") || url.username || url.password || url.hash) {
    throw ApiError.badRequest("Push endpoint must belong to a supported push provider.");
  }
}

export const LOG_REDACTION = {
  paths: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']", "password", "currentPassword", "newPassword", "refreshToken", "accessToken", "apiKey", "passwordEncrypted", "apiKeyEncrypted"],
  censor: "[REDACTED]",
};
export function assertMetaApiUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw ApiError.badRequest("Invalid WhatsApp API URL."); }
  if (url.protocol !== "https:" || url.hostname !== "graph.facebook.com" || url.username || url.password || (url.port && url.port !== "443") || url.search || url.hash || !/^\/v\d+\.\d+\/?$/.test(url.pathname)) {
    throw ApiError.badRequest("WhatsApp Cloud API must use the official HTTPS Graph API endpoint.");
  }
}
