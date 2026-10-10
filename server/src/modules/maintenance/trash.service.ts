import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/security";
import type { AuthContext } from "@/types/express";
import { ApiError } from "@/utils/apiError";
export const TRASH_KINDS = ["employee", "companyDocument", "employeeDocument", "payment", "branch", "user", "vehicle", "custodyHandover", "clearance", "violation"] as const;
export type TrashKind = typeof TRASH_KINDS[number];
const permissions: Record<TrashKind, string> = { employee: "employees", companyDocument: "companyDocuments", employeeDocument: "employeeDocuments", payment: "payments", branch: "branches", user: "users", vehicle: "vehicles", custodyHandover: "custody", clearance: "custody", violation: "violations" };
/** How each newer kind names its rows in the recycle bin: [fields to read, name, reference]. */
const LABELS: Partial<Record<TrashKind, [string[], (r: any) => string, (r: any) => string]>> = {
  vehicle: [["make", "plateLetters", "plateNumber", "ownerName"], (r) => `${r.make} (${r.plateLetters} ${r.plateNumber})`, (r) => r.ownerName ?? ""],
  custodyHandover: [["number"], (r) => r.number, () => ""],
  clearance: [["number"], (r) => r.number, () => ""],
  violation: [["reason", "number"], (r) => r.reason, (r) => r.number ?? ""],
};
export function assertTrashPermission(auth: AuthContext, kind: TrashKind, restore = false) {
  if (kind === "user" && !auth.isSuperAdmin) throw ApiError.forbidden("Only the super administrator can restore deleted accounts.");
  const module = permissions[kind];
  if (!hasPermission(auth, `${module}.view`) || !hasPermission(auth, `${module}.delete`) || (restore && !hasPermission(auth, `${module}.edit`))) throw ApiError.forbidden("You cannot access or restore these deleted records.");
}
export async function listTrash(auth: AuthContext, kind: TrashKind, page: number) {
  assertTrashPermission(auth, kind);
  const model = (prisma as any)[kind];
  const select: Record<string, boolean> = { id: true, deletedAt: true };
  const label = LABELS[kind];
  if (label) {
    const pick: Record<string, unknown> = { id: true, deletedAt: true };
    for (const field of label[0]) pick[field] = true;
    if (kind === "custodyHandover" || kind === "clearance") pick.employee = { select: { fullNameAr: true } };
    const where = { deletedAt: { not: null } };
    const [rows, total] = await Promise.all([model.findMany({ where, select: pick, orderBy: { deletedAt: "desc" }, skip: (page - 1) * 30, take: 30 }), model.count({ where })]);
    return { rows: rows.map((r: any) => ({ id: r.id, name: label[1](r), reference: r.employee?.fullNameAr ?? label[2](r), deletedAt: r.deletedAt })), total };
  }
  for (const field of kind === "employee" ? ["fullNameAr", "employeeNumber"] : kind === "user" ? ["fullName", "email"] : kind === "payment" ? ["paymentNumber", "description"] : ["name"]) select[field] = true;
  const where = { deletedAt: { not: null } };
  const [rows, total] = await Promise.all([model.findMany({ where, select, orderBy: { deletedAt: "desc" }, skip: (page - 1) * 30, take: 30 }), model.count({ where })]);
  return { rows: rows.map((r: any) => ({ id: r.id, name: String(r.fullNameAr ?? r.fullName ?? r.name ?? r.paymentNumber ?? "وثيقة").replace(/__deleted_\d+$/, ""), reference: String(r.employeeNumber ?? r.email ?? r.description ?? "").replace(/__deleted_\d+$/, ""), deletedAt: r.deletedAt })), total };
}
export async function restoreTrash(auth: AuthContext, kind: TrashKind, id: string) {
  assertTrashPermission(auth, kind, true);
  await prisma.$transaction(async tx => {
    const model = (tx as any)[kind];
    const row = await model.findFirst({ where: { id, deletedAt: { not: null } } });
    if (!row) throw ApiError.notFound("Deleted record not found.");
    for (const [field, parent] of [["branchId", "branch"], ["employeeId", "employee"]] as const) {
      if (row[field] && !await (tx as any)[parent].findFirst({ where: { id: row[field], deletedAt: null } })) throw ApiError.badRequest("Restore the parent branch or employee first.");
    }
    if (row.driverId && !await tx.employee.findFirst({ where: { id: row.driverId, deletedAt: null } })) throw ApiError.badRequest("Restore the parent branch or employee first.");
    if (kind === "vehicle" && await tx.vehicle.findFirst({ where: { id: { not: id }, deletedAt: null, plateLetters: row.plateLetters, plateNumber: row.plateNumber } })) throw ApiError.badRequest("A vehicle with this plate is already registered.");
    if (kind === "clearance" && row.status === "OPEN" && await tx.clearance.findFirst({ where: { id: { not: id }, deletedAt: null, status: "OPEN", employeeId: row.employeeId } })) throw ApiError.badRequest("This employee already has an open clearance.");
    if (kind === "employee" && row.iqamaNumber && await tx.employee.findFirst({ where: { id: { not: id }, iqamaNumber: row.iqamaNumber, deletedAt: null } })) throw ApiError.badRequest("An employee with this Iqama number already exists.");
    const uniqueField = ({ employee: "employeeNumber", payment: "paymentNumber", branch: "code", user: "email" } as Record<string, string>)[kind];
    const restoredIdentifier = uniqueField ? String(row[uniqueField]).replace(/__deleted_\d+$/, "") : undefined;
    if (uniqueField && await model.findFirst({ where: { id: { not: id }, [uniqueField]: restoredIdentifier } })) throw ApiError.badRequest("The original identifier is now used by another record. Restore cannot replace it.");
    const claimed = await model.updateMany({ where: { id, deletedAt: { not: null } }, data: { deletedAt: null, ...(uniqueField ? { [uniqueField]: restoredIdentifier } : {}) } });
    if (claimed.count !== 1) throw ApiError.badRequest("Record was already restored.");
    await tx.auditLog.create({ data: { userId: auth.userId, action: "UPDATE", module: permissions[kind], recordId: id, description: "Restored from recycle bin" } });
  }, { isolationLevel: "Serializable" });
}
