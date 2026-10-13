import type { TrackableItem } from "@/services/expiringItems";
import { daysUntil } from "@/services/expiration";

// One expiring document, as the daily WhatsApp summary (services/dailySummary
// and services/whatsappDigestCard) shows it, and an open task.

/** Everything a design can show about one expiring document. */
export interface AlertContext {
  company: string;
  companyEn?: string;
  employeeAr?: string;
  employeeEn?: string;
  documentAr: string;
  documentEn: string;
  number?: string | null;
  branch?: string | null;
  branchEn?: string | null;
  expiryDate: Date;
  /** Whole days until expiry; 0 or less means expired. */
  daysLeft: number;
}

const SOURCE_DOCUMENT: Record<TrackableItem["sourceType"], [string, string]> = {
  EMPLOYEE_IQAMA: ["الإقامة", "Iqama"],
  EMPLOYEE_PASSPORT: ["جواز السفر", "Passport"],
  EMPLOYEE_DOCUMENT: ["مستند موظف", "Employee document"],
  COMPANY_DOCUMENT: ["وثيقة المنشأة", "Company document"],
  VEHICLE: ["السيارة", "Vehicle"],
};

/** Trimmed, or undefined when empty: a space before a closing "*" stops
 * WhatsApp from rendering the bold, and stored names sometimes end in one. */
const clean = (value: string | null | undefined) => value?.trim() || undefined;

export function alertContext(item: TrackableItem, company: string | null | undefined, companyEn?: string | null): AlertContext {
  const [docAr, docEn] = SOURCE_DOCUMENT[item.sourceType];
  const employeeAr = clean(item.employeeNameAr);
  const employeeEn = clean(item.employeeName);
  return {
    company: clean(company) || "المنشأة",
    companyEn: clean(companyEn),
    employeeAr,
    employeeEn: employeeEn !== employeeAr ? employeeEn : undefined,
    documentAr: clean(item.documentAr) || docAr,
    documentEn: clean(item.documentEn) || docEn,
    number: clean(item.documentNumber),
    branch: clean(item.branchName),
    branchEn: clean(item.branchNameEn),
    expiryDate: item.expiryDate,
    daysLeft: daysUntil(item.expiryDate),
  };
}

/** "يوم واحد", "يومان", "7 أيام", "30 يومًا" — the noun agrees with the count. */
export function daysAr(n: number): string {
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  return n <= 10 ? `${n} أيام` : `${n} يومًا`;
}
// ---------- An open task, as the daily summary (services/dailySummary) shows it ----------

export interface TaskLine {
  title: string;
  priority: "URGENT" | "HIGH" | "NORMAL";
  time?: string | null;
  assignee?: string | null;
  /** Whole days since the task's day; 0 for today's. */
  daysLate: number;
}
