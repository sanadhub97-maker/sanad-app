import { prisma } from "@/lib/prisma";
import { computeStatus, ExpirationRules } from "@/services/expiration";
import { establishmentNameEn, loadBranchNames } from "@/services/establishmentNames";

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
  label: string; // English; backs the in-app/email notification text
  labelAr: string; // Arabic, for Arabic reports and the WhatsApp alert
  expiryDate: Date;
  employeeId?: string;
  onSponsorship?: boolean | null;
  employeeName?: string; // English name, falling back to Arabic
  employeeNameAr?: string; // Arabic name, falling back to English
  recordId: string;
  // Details for the WhatsApp alert (services/whatsappTemplates).
  documentAr?: string;
  documentEn?: string;
  documentNumber?: string | null;
  branchName?: string | null;
  branchNameEn?: string | null;
  /** EmployeeDocument.type, for employee documents. */
  docType?: string;
  /** What kind of document this is — إقامة, جواز سفر, شهادة صحية, سجل تجاري… */
  kind: string; // IQAMA, PASSPORT, an EmployeeDocument type or a CompanyDocument category
  kindAr: string;
  kindEn: string;
}

/** The kind of every document, as the reports and exports name it. */
export const DOCUMENT_KINDS: Record<string, [string, string]> = {
  IQAMA: ["إقامة", "Iqama"],
  PASSPORT: ["جواز سفر", "Passport"],
  HEALTH_CERTIFICATE: ["شهادة صحية", "Health certificate"],
  MEDICAL_INSURANCE: ["تأمين طبي", "Medical insurance"],
  EMPLOYMENT_CONTRACT: ["عقد عمل", "Employment contract"],
  VISA: ["تأشيرة", "Visa"],
  EXIT_REENTRY_VISA: ["تأشيرة خروج وعودة", "Exit/re-entry visa"],
  FINAL_EXIT_VISA: ["تأشيرة خروج نهائي", "Final exit visa"],
  FLIGHT_TICKET: ["تذكرة طيران", "Flight ticket"],
  DRIVING_LICENSE: ["رخصة قيادة", "Driving license"],
  COMMERCIAL_REGISTRATION: ["سجل تجاري", "Commercial registration"],
  MUNICIPAL_LICENSE: ["رخصة بلدية", "Municipal license"],
  CIVIL_DEFENSE_LICENSE: ["ترخيص الدفاع المدني", "Civil defense license"],
  CIVIL_DEFENSE_REPORT: ["تقرير الدفاع المدني", "Civil defense report"],
  CLEANING_CONTRACT: ["عقد نظافة", "Cleaning contract"],
  LEASE_CONTRACT: ["عقد إيجار", "Lease contract"],
  TWENTY_FOUR_HOUR_PERMIT: ["تصريح 24 ساعة", "24-hour permit"],
  ENTERTAINMENT_AUTHORITY_PERMIT: ["تصريح هيئة الترفيه", "Entertainment authority permit"],
  TOBACCO_LICENSE: ["ترخيص تبغ", "Tobacco license"],
};
const kindOf = (code: string, fallbackAr: string, fallbackEn: string) => {
  const k = DOCUMENT_KINDS[code];
  return { kind: code, kindAr: k?.[0] ?? fallbackAr, kindEn: k?.[1] ?? fallbackEn };
};

const EMPLOYEE_DOCUMENT_NAMES: Record<string, [string, string]> = {
  HEALTH_CERTIFICATE: ["الشهادة الصحية", "Health certificate"],
  MEDICAL_INSURANCE: ["التأمين الطبي", "Medical insurance"],
  EMPLOYMENT_CONTRACT: ["عقد العمل", "Employment contract"],
  VISA: ["التأشيرة", "Visa"],
  EXIT_REENTRY_VISA: ["تأشيرة خروج وعودة", "Exit/re-entry visa"],
  FINAL_EXIT_VISA: ["تأشيرة خروج نهائي", "Final exit visa"],
  FLIGHT_TICKET: ["تذكرة الطيران", "Flight ticket"],
  DRIVING_LICENSE: ["رخصة القيادة", "Driving license"],
  OTHER: ["مستند", "Document"],
};

export async function getTrackableItems(): Promise<TrackableItem[]> {
  const [employees, employeeDocuments, companyDocuments, branchNames] = await Promise.all([
    prisma.employee.findMany({
      where: { deletedAt: null, OR: [{ iqamaExpiryDate: { not: null } }, { passportExpiryDate: { not: null } }] },
      select: {
        id: true,
        fullNameAr: true,
        fullNameEn: true,
        iqamaExpiryDate: true,
        passportExpiryDate: true,
        iqamaNumber: true,
        onSponsorship: true,
        passportNumber: true,
        branch: { select: { name: true, nameEn: true } },
      },
    }),
    prisma.employeeDocument.findMany({
      where: { deletedAt: null, expiryDate: { not: null }, type: { notIn: ["IQAMA", "PASSPORT"] } },
      include: { employee: { select: { id: true, fullNameAr: true, fullNameEn: true, onSponsorship: true, branch: { select: { name: true, nameEn: true } } } } },
    }),
    prisma.companyDocument.findMany({
      where: { deletedAt: null, expiryDate: { not: null } },
      include: { branch: { select: { name: true, nameEn: true } } },
    }),
    loadBranchNames(),
  ]);

  const items: TrackableItem[] = [];

  for (const emp of employees) {
    const name = emp.fullNameEn || emp.fullNameAr;
    const nameAr = emp.fullNameAr || name;
    if (emp.iqamaExpiryDate) {
      items.push({
        key: `employee-iqama-${emp.id}`,
        sourceType: "EMPLOYEE_IQAMA",
        label: `${name} — Iqama`,
        labelAr: `${nameAr} — إقامة`,
        expiryDate: emp.iqamaExpiryDate,
        employeeId: emp.id,
        onSponsorship: emp.onSponsorship,
        employeeName: name,
        employeeNameAr: nameAr,
        recordId: emp.id,
        documentAr: "الإقامة",
        documentEn: "Iqama",
        documentNumber: emp.iqamaNumber,
        branchName: emp.branch?.name,
        branchNameEn: emp.branch?.nameEn,
        ...kindOf("IQAMA", "إقامة", "Iqama"),
      });
    }
    if (emp.passportExpiryDate) {
      items.push({
        key: `employee-passport-${emp.id}`,
        sourceType: "EMPLOYEE_PASSPORT",
        label: `${name} — Passport`,
        labelAr: `${nameAr} — جواز سفر`,
        expiryDate: emp.passportExpiryDate,
        employeeId: emp.id,
        onSponsorship: emp.onSponsorship,
        employeeName: name,
        employeeNameAr: nameAr,
        recordId: emp.id,
        documentAr: "جواز السفر",
        documentEn: "Passport",
        documentNumber: emp.passportNumber,
        branchName: emp.branch?.name,
        branchNameEn: emp.branch?.nameEn,
        ...kindOf("PASSPORT", "جواز سفر", "Passport"),
      });
    }
  }

  for (const doc of employeeDocuments) {
    if (!doc.expiryDate) continue;
    const name = doc.employee.fullNameEn || doc.employee.fullNameAr;
    const nameAr = doc.employee.fullNameAr || name;
    items.push({
      key: `employee-document-${doc.id}`,
      sourceType: "EMPLOYEE_DOCUMENT",
      label: `${name} — ${doc.name || doc.type}`,
      labelAr: `${nameAr} — ${doc.name || doc.type}`,
      expiryDate: doc.expiryDate,
      employeeId: doc.employeeId,
      onSponsorship: doc.employee.onSponsorship,
      employeeName: name,
      employeeNameAr: nameAr,
      recordId: doc.id,
      documentAr: doc.name || EMPLOYEE_DOCUMENT_NAMES[doc.type]?.[0],
      documentEn: doc.name || EMPLOYEE_DOCUMENT_NAMES[doc.type]?.[1],
      documentNumber: doc.documentNumber,
      branchName: doc.employee.branch?.name,
      branchNameEn: doc.employee.branch?.nameEn,
      docType: doc.type,
      ...kindOf(doc.type, doc.name || "مستند", doc.name || "Document"),
    });
  }

  for (const doc of companyDocuments) {
    if (!doc.expiryDate) continue;
    items.push({
      key: `company-document-${doc.id}`,
      sourceType: "COMPANY_DOCUMENT",
      // A document named after its establishment reads in English as the establishment's English name.
      label: establishmentNameEn(doc.name, branchNames) ?? doc.name,
      labelAr: doc.name,
      expiryDate: doc.expiryDate,
      recordId: doc.id,
      documentAr: doc.name,
      documentEn: doc.name,
      documentNumber: doc.documentNumber || doc.licenseNumber,
      branchName: doc.branch?.name,
      branchNameEn: doc.branch?.nameEn,
      ...kindOf(doc.category, "وثيقة منشأة", "Company document"),
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
