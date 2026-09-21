import { prisma } from "@/lib/prisma";

export interface SearchResultItem {
  type: "employee" | "companyDocument" | "payment" | "branch";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

// Global search across identifiers (§30/§61) — Iqama/passport/employee
// numbers, document/license numbers, payment/reference numbers, branch
// codes. Each category capped at 5 for a fast, focused command palette.
export async function globalSearch(q: string): Promise<SearchResultItem[]> {
  const insensitive = { contains: q, mode: "insensitive" as const };

  const [employees, companyDocuments, payments, branches] = await Promise.all([
    prisma.employee.findMany({
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
    }),
    prisma.companyDocument.findMany({
      where: { deletedAt: null, OR: [{ name: insensitive }, { documentNumber: insensitive }, { licenseNumber: insensitive }] },
      take: 5,
    }),
    prisma.payment.findMany({
      where: { deletedAt: null, OR: [{ paymentNumber: insensitive }, { referenceNumber: insensitive }] },
      take: 5,
    }),
    prisma.branch.findMany({
      where: { deletedAt: null, OR: [{ name: insensitive }, { code: insensitive }] },
      take: 5,
    }),
  ]);

  const results: SearchResultItem[] = [];

  for (const e of employees) {
    results.push({
      type: "employee",
      id: e.id,
      title: e.fullNameEn || e.fullNameAr,
      subtitle: `Employee #${e.employeeNumber}${e.iqamaNumber ? ` · Iqama ${e.iqamaNumber}` : ""}`,
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
    results.push({ type: "branch", id: b.id, title: b.name, subtitle: b.code, href: `/branches/${b.id}` });
  }

  return results;
}
