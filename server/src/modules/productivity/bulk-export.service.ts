import { ZipArchive } from "archiver";
import type { Response } from "express";
import type { AuthContext } from "@/types/express";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { loadAuthContext } from "@/middleware/auth";
import { getById } from "@/modules/employees/employees.service";
import { getBrandingContext } from "@/services/branding";
import { employeeProfilePdf } from "@/modules/pdf/templates";
import { renderHtmlToPdf } from "@/services/pdf";
import { L } from "@/services/lang";
import { requireAccess } from "./productivity.service";
import { once } from "node:events";

export async function exportEmployeeBatch(auth: AuthContext, ids: string[], res: Response) {
  requireAccess(auth, "employees.view"); requireAccess(auth, "employees.export");
  const rows = await prisma.employee.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true } });
  if (rows.length !== ids.length) throw ApiError.badRequest("Some selected employees no longer exist. Refresh the list.");
  const branding = await getBrandingContext(); const files: { name: string; bytes: Buffer }[] = []; let total = 0;
  // Finish validation/rendering before sending headers so a failed export is a normal API error.
  for (const id of ids) {
    if (res.destroyed) return;
    const employee = await getById(id, auth);
    const bytes = await renderHtmlToPdf(employeeProfilePdf(employee as never, branding), { footerLabel: L("ملف الموظف", "Employee Profile") });
    total += bytes.length; if (total > 64 * 1024 * 1024) throw ApiError.badRequest("Batch export exceeds 64 MB. Select fewer employees.");
    const safeNumber = employee.employeeNumber.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
    files.push({ name: `employee-${safeNumber}-${id}.pdf`, bytes });
  }
  const fresh = await loadAuthContext(auth.userId); if (!fresh) throw ApiError.unauthorized();
  requireAccess(fresh, "employees.view"); requireAccess(fresh, "employees.export");
  // Dossiers may include document/payment sections; prevent revoked-source data from escaping.
  for (const key of ["employeeDocuments.view", "payments.view"]) if (auth.isSuperAdmin || auth.permissions.has("*") || auth.permissions.has(key)) requireAccess(fresh, key);
  await prisma.auditLog.create({ data: { userId: auth.userId, action: "EXPORT", module: "employees", description: `Exported ${ids.length} selected employee dossiers as ZIP`, recordId: ids[0] } });
  const archive = new ZipArchive({ store: true }); archive.on("error", err => res.destroy(err)); res.on("close", () => archive.abort());
  res.setHeader("Content-Type", "application/zip"); res.setHeader("Content-Disposition", 'attachment; filename="employee-dossiers.zip"'); archive.pipe(res);
  for (const file of files) { const done = once(archive, "entry"); archive.append(file.bytes, { name: file.name }); await done; }
  await archive.finalize();
}
