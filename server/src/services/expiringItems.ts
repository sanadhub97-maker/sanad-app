import { prisma } from "@/lib/prisma";
import { computeStatus, ExpirationRules } from "@/services/expiration";

// Normalizes every expiry-tracked record in the system into one shape, so
// the dashboard, reports, and the daily cron scan (§21/§41) share a single
// source of truth instead of three divergent queries.
//
// Employee.iqamaExpiryDate / passportExpiryDate are the quick-access fields
// shown on the employee list/profile (§12/§13); EmployeeDocument rows cover
// every other document type (§14). To avoid double-counting the same Iqama
// or Passport, EmployeeDocument rows of type IQAMA/PASSPORT are excluded
// here — see README "Architecture Decisions".
export interface TrackableItem {
  key: string; // stable id used for notification dedupe keys
  sourceType: "EMPLOYEE_IQAMA" | "EMPLOYEE_PASSPORT" | "EMPLOYEE_DOCUMENT" | "COMPANY_DOCUMENT";
  label: string;
  expiryDate: Date;
  employeeId?: string;
  employeeName?: string;
  recordId: string;
}

export async function getTrackableItems(): Promise<TrackableItem[]> {
  const [employees, employeeDocuments, companyDocuments] = await Promise.all([
    prisma.employee.findMany({
      where: { deletedAt: null, OR: [{ iqamaExpiryDate: { not: null } }, { passportExpiryDate: { not: null } }] },
      select: { id: true, fullNameAr: true, fullNameEn: true, iqamaExpiryDate: true, passportExpiryDate: true },
    }),
    prisma.employeeDocument.findMany({
      where: { deletedAt: null, expiryDate: { not: null }, type: { notIn: ["IQAMA", "PASSPORT"] } },
      include: { employee: { select: { id: true, fullNameAr: true, fullNameEn: true } } },
    }),
    prisma.companyDocument.findMany({
      where: { deletedAt: null, expiryDate: { not: null } },
    }),
  ]);

  const items: TrackableItem[] = [];

  for (const emp of employees) {
    const name = emp.fullNameEn || emp.fullNameAr;
    if (emp.iqamaExpiryDate) {
      items.push({
        key: `employee-iqama-${emp.id}`,
        sourceType: "EMPLOYEE_IQAMA",
        label: `${name} — Iqama`,
        expiryDate: emp.iqamaExpiryDate,
        employeeId: emp.id,
        employeeName: name,
        recordId: emp.id,
      });
    }
    if (emp.passportExpiryDate) {
      items.push({
        key: `employee-passport-${emp.id}`,
        sourceType: "EMPLOYEE_PASSPORT",
        label: `${name} — Passport`,
        expiryDate: emp.passportExpiryDate,
        employeeId: emp.id,
        employeeName: name,
        recordId: emp.id,
      });
    }
  }

  for (const doc of employeeDocuments) {
    if (!doc.expiryDate) continue;
    const name = doc.employee.fullNameEn || doc.employee.fullNameAr;
    items.push({
      key: `employee-document-${doc.id}`,
      sourceType: "EMPLOYEE_DOCUMENT",
      label: `${name} — ${doc.name || doc.type}`,
      expiryDate: doc.expiryDate,
      employeeId: doc.employeeId,
      employeeName: name,
      recordId: doc.id,
    });
  }

  for (const doc of companyDocuments) {
    if (!doc.expiryDate) continue;
    items.push({
      key: `company-document-${doc.id}`,
      sourceType: "COMPANY_DOCUMENT",
      label: doc.name,
      expiryDate: doc.expiryDate,
      recordId: doc.id,
    });
  }

  return items;
}

export function bucketByStatus(items: TrackableItem[], rules: ExpirationRules) {
  const buckets = { VALID: 0, EXPIRING_SOON: 0, EXPIRED: 0 };
  for (const item of items) {
    const status = computeStatus(item.expiryDate, rules);
    if (status) buckets[status]++;
  }
  return buckets;
}

export function bucketByWindow(items: TrackableItem[]) {
  const now = new Date();
  const dayMs = 86_400_000;
  const daysUntil = (d: Date) => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / dayMs);

  const buckets = { expired: 0, today: 0, within7: 0, within30: 0, within60: 0, within90: 0 };
  for (const item of items) {
    const days = daysUntil(item.expiryDate);
    if (days < 0) buckets.expired++;
    else if (days === 0) buckets.today++;
    else if (days <= 7) buckets.within7++;
    else if (days <= 30) buckets.within30++;
    else if (days <= 60) buckets.within60++;
    else if (days <= 90) buckets.within90++;
  }
  return buckets;
}
