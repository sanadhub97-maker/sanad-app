import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/security";
import type { AuthContext } from "@/types/express";
import { ApiError } from "@/utils/apiError";

export const FILE_MODULE_PERMISSIONS: Record<string, string> = {
  employee: "employees.view", "employee-document": "employeeDocuments.view", "employee-documents": "employees.view",
  "company-document": "companyDocuments.view", payment: "payments.view",
  "company-logo": "settings.view", "company-favicon": "settings.view", "company-stamp": "settings.view", "company-signature": "settings.view",
  "user-avatar": "users.view", violation: "violations.view",
};

export function assertFileAccess(file: { module: string | null; uploadedById: string | null; relatedId: string | null }, auth: AuthContext | undefined, action: "view" | "download" | "delete" = "view") {
  if (!auth) throw ApiError.unauthorized();
  if (auth.isSuperAdmin) return;
  if (file.module === "scheduled-report") throw ApiError.forbidden("Open scheduled reports from your report schedules.");
  if (file.module === "user-avatar" && file.relatedId === auth.userId) return;
  const permission = file.module ? FILE_MODULE_PERMISSIONS[file.module] : undefined;
  if (permission ? !hasPermission(auth, permission) : !hasPermission(auth, "files.view")) throw ApiError.forbidden("You cannot access this file.");
  if (action === "download") {
    const required = file.module === "company-document" ? "companyDocuments.download" : ["employee-document", "employee-documents"].includes(file.module ?? "") ? "employeeDocuments.download" : undefined;
    if (required && !hasPermission(auth, required)) throw ApiError.forbidden("Document download permission is required.");
  }
  if (action === "delete" && !hasPermission(auth, "files.delete")) throw ApiError.forbidden("You cannot delete this file.");
}

export async function isPublicBrandAsset(file: { id: string; mimeType: string; module?: string | null }) {
  if (!["image/png", "image/jpeg"].includes(file.mimeType)) return false;
  if (!["company-logo", "company-favicon"].includes(file.module ?? "")) return false;
  const company = await prisma.companySettings.findUnique({ where: { id: 1 }, select: { logoFileId: true, logoDarkFileId: true, printLogoFileId: true, faviconFileId: true } });
  return Boolean(company && Object.values(company).includes(file.id));
}

export async function assertBrandFile(id: string | null | undefined, modules: string[]) {
  if (!id) return;
  const file = await prisma.file.findUnique({ where: { id }, select: { module: true, mimeType: true } });
  if (!file || !modules.includes(file.module ?? "") || !["image/png", "image/jpeg"].includes(file.mimeType)) {
    throw ApiError.badRequest("Branding must reference an uploaded branding image.");
  }
}
