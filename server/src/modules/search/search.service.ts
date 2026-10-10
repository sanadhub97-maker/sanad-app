import type { AuthContext } from "@/types/express";
import { hasPermission } from "@/lib/security";
import { prisma } from "@/lib/prisma";

export interface SearchResultItem {
  type: "employee" | "employeeDocument" | "companyDocument" | "payment" | "branch" | "task" | "vehicle" | "custody" | "clearance" | "violation";
  id: string;
  title: string; // Arabic where the record has one
  titleEn?: string | null; // shown when the UI is in English
  subtitle?: string;
  href: string;
}

// Global search across identifiers (§30/§61) — Iqama/passport/employee
// numbers, document/license numbers, payment/reference numbers, branch
// codes. Each category capped at 5 for a fast, focused command palette.
export async function globalSearch(q: string, auth: AuthContext): Promise<SearchResultItem[]> {
  const insensitive = { contains: q, mode: "insensitive" as const };

  const compact = q.replace(/s+/g, " ").trim();
  const [employees, companyDocuments, payments, employeeDocuments, tasks, branches, vehicles, handovers, clearances, violations] = await Promise.all([
    hasPermission(auth, "employees.view") ? prisma.employee.findMany({
      where: {
        deletedAt: null,
        OR: [
          { employeeNumber: insensitive },
          { fullNameAr: insensitive },
          { fullNameEn: insensitive },
          { iqamaNumber: insensitive },
          { passportNumber: insensitive },
          { mobile: insensitive },
        ],
      },
      take: 5,
    }) : Promise.resolve([]),
    hasPermission(auth, "companyDocuments.view") ? prisma.companyDocument.findMany({
      where: { deletedAt: null, OR: [{ name: insensitive }, { documentNumber: insensitive }, { licenseNumber: insensitive }] },
      take: 5,
    }) : Promise.resolve([]),
    hasPermission(auth, "payments.view") ? prisma.payment.findMany({
      where: { deletedAt: null, OR: [{ paymentNumber: insensitive }, { referenceNumber: insensitive }, { description: insensitive }, { supplierName: insensitive }, { paidBy: insensitive }] },
      take: 5,
    }) : Promise.resolve([]),
    hasPermission(auth, "employees.view") && hasPermission(auth, "employeeDocuments.view") ? prisma.employeeDocument.findMany({
      where: { deletedAt: null, employee: { deletedAt: null }, OR: [{ name: insensitive }, { documentNumber: insensitive }, { issuingAuthority: insensitive }] }, take: 5,
      include: { employee: { select: { fullNameAr: true, fullNameEn: true } } },
    }) : Promise.resolve([]),
    hasPermission(auth, "tasks.view") ? prisma.dailyTask.findMany({ where: { deletedAt: null, OR: [{ title: insensitive }, { notes: insensitive }] }, take: 5, orderBy: { date: "desc" } }) : Promise.resolve([]),
    hasPermission(auth, "branches.view") ? prisma.branch.findMany({
      where: { deletedAt: null, OR: [{ name: insensitive }, { nameEn: insensitive }, { code: insensitive }] },
      take: 5,
    }) : Promise.resolve([]),
    hasPermission(auth, "vehicles.view") ? prisma.vehicle.findMany({
      where: { deletedAt: null, OR: [{ plateNumber: insensitive }, { plateLetters: { contains: compact, mode: "insensitive" } }, { serialNumber: insensitive }, { ownerName: insensitive }, { make: insensitive }] },
      take: 5,
    }) : Promise.resolve([]),
    hasPermission(auth, "custody.view") ? prisma.custodyHandover.findMany({
      where: { deletedAt: null, OR: [{ number: insensitive }, { items: { some: { OR: [{ serialNumber: insensitive }, { kind: insensitive }] } } }] },
      include: { employee: { select: { fullNameAr: true } } }, take: 5, orderBy: { date: "desc" },
    }) : Promise.resolve([]),
    hasPermission(auth, "custody.view") ? prisma.clearance.findMany({ where: { deletedAt: null, number: insensitive }, include: { employee: { select: { fullNameAr: true } } }, take: 5 }) : Promise.resolve([]),
    hasPermission(auth, "violations.view") ? prisma.violation.findMany({ where: { deletedAt: null, OR: [{ number: insensitive }, { reason: insensitive }] }, take: 5, orderBy: { date: "desc" } }) : Promise.resolve([]),
  ]);

  const results: SearchResultItem[] = [];

  for (const e of employees) {
    results.push({
      type: "employee",
      id: e.id,
      title: e.fullNameAr || e.fullNameEn || "",
      titleEn: e.fullNameEn,
      subtitle: `#${e.employeeNumber}${e.iqamaNumber ? ` · ${e.iqamaNumber}` : ""}`,
      href: `/employees/${e.id}`,
    });
  }
  for (const d of companyDocuments) {
    results.push({ type: "companyDocument", id: d.id, title: d.name, subtitle: d.documentNumber ?? d.licenseNumber ?? undefined, href: `/company-documents/${d.id}` });
  }
  for (const p of payments) {
    results.push({ type: "payment", id: p.id, title: p.paymentNumber, subtitle: p.referenceNumber ?? undefined, href: `/payments/${p.id}` });
  }
  for (const b of branches) {
    results.push({ type: "branch", id: b.id, title: b.name, titleEn: b.nameEn, subtitle: b.code, href: `/branches/${b.id}` });
  }
  for (const d of employeeDocuments) results.push({ type: "employeeDocument", id: d.id, title: d.name || d.type, subtitle: `${d.employee.fullNameAr} · ${d.documentNumber || ""}`, href: `/employee-documents/${d.employeeId}/${d.id}` });
  for (const task of tasks) results.push({ type: "task", id: task.id, title: task.title, subtitle: task.date.toISOString().slice(0, 10), href: `/daily-tasks?date=${task.date.toISOString().slice(0, 10)}` });

  for (const v of vehicles) results.push({ type: "vehicle", id: v.id, title: `${v.make} (${v.plateLetters} ${v.plateNumber})`, subtitle: v.ownerName ?? v.serialNumber ?? undefined, href: `/vehicles?focus=${v.id}` });
  for (const h of handovers) results.push({ type: "custody", id: h.id, title: h.number, subtitle: h.employee.fullNameAr, href: "/custody" });
  for (const c of clearances) results.push({ type: "clearance", id: c.id, title: c.number, subtitle: c.employee.fullNameAr, href: "/clearances" });
  for (const v of violations) results.push({ type: "violation", id: v.id, title: v.reason, subtitle: v.number ?? undefined, href: `/violations/${v.id}` });

  return results;
}
