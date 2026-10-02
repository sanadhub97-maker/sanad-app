import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/modules/productivity/productivity.service";
import type { AuthContext } from "@/types/express";
import { ApiError } from "@/utils/apiError";
import { z } from "zod";
import { date } from "./operations.schemas";
export const financeQuery = z.object({ from: date, to: date, branchId: z.string().min(1).max(150).optional() }).refine(v => v.from <= v.to && new Date(v.to).getTime() - new Date(v.from).getTime() <= 366 * 86400000, "Select a period of at most one year");
const normalized = (value: string | null) => (value || "").normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
export function duplicatePaymentGroups<T extends { id: string; paymentDate: Date; total: unknown; referenceNumber: string | null; supplierName: string | null; employeeId: string | null; branchId: string | null; category: string }>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const counterparty = row.employeeId || normalized(row.supplierName);
    // A bare amount/date match is not enough to flag legitimate unrelated payments.
    if (!counterparty && !normalized(row.referenceNumber)) continue;
    const key = JSON.stringify([row.paymentDate.toISOString().slice(0, 10), String(row.total), normalized(row.referenceNumber), counterparty, row.branchId, row.category]);
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.values()].filter(group => group.length > 1);
}
export async function financeOverview(auth: AuthContext, input: z.infer<typeof financeQuery>) {
  requireAccess(auth, "payments.view");
  const from = new Date(input.from), to = new Date(`${input.to}T23:59:59.999Z`), length = to.getTime() - from.getTime() + 1;
  const previousFrom = new Date(from.getTime() - length), previousTo = new Date(from.getTime() - 1);
  const where = { deletedAt: null, ...(input.branchId ? { branchId: input.branchId } : {}), paymentDate: { gte: previousFrom, lte: to } };
  return prisma.$transaction(async tx => {
    if (await tx.payment.count({ where }) > 20000) throw ApiError.badRequest("Narrow the reporting period; it contains more than 20,000 payments.");
    const rows = await tx.payment.findMany({ where, include: { branch: { select: { name: true } }, employee: { select: { fullNameAr: true } } }, orderBy: { paymentDate: "desc" }, take: 20000 });
    const current = rows.filter(r => r.paymentDate >= from), previous = rows.filter(r => r.paymentDate < from);
    const cents = (v: unknown) => Math.round(Number(v) * 100);
    const total = (values: typeof rows) => values.reduce((sum, row) => sum + cents(row.total), 0) / 100;
    function grouped(key: "branchId" | "employeeId" | "category") {
      const buckets = new Map<string, { id: string; name: string; current: number; previous: number; count: number }>();
      for (const row of rows) {
        const id = row[key] || "unassigned", label = key === "branchId" ? row.branch?.name : key === "employeeId" ? row.employee?.fullNameAr : row.category;
        const bucket = buckets.get(id) || { id, name: label || "—", current: 0, previous: 0, count: 0 };
        if (row.paymentDate >= from) { bucket.current += cents(row.total); bucket.count++; } else bucket.previous += cents(row.total);
        buckets.set(id, bucket);
      }
      return [...buckets.values()].map(b => ({ ...b, current: b.current / 100, previous: b.previous / 100 })).sort((a, b) => b.current - a.current);
    }
    const months = new Map<string, number>(); for (const row of current) { const key = row.paymentDate.toISOString().slice(0, 7); months.set(key, (months.get(key) || 0) + cents(row.total)); }
    const duplicates = duplicatePaymentGroups(current).map(group => group.map(row => ({ id: row.id, number: row.paymentNumber, date: row.paymentDate, total: String(row.total), reference: row.referenceNumber, supplier: row.supplierName })));
    return { from: input.from, to: input.to, previousFrom: previousFrom.toISOString().slice(0, 10), previousTo: previousTo.toISOString().slice(0, 10), count: current.length, total: total(current), previousTotal: total(previous), branches: grouped("branchId"), employees: grouped("employeeId"), categories: grouped("category"), months: [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, total: value / 100 })), duplicates };
  }, { isolationLevel: "RepeatableRead", timeout: 30000 });
}
