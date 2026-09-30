import { BookUser, CreditCard, HeartPulse, Plane, ShieldPlus, Stamp, type LucideIcon } from "lucide-react";
import type { WorkforceDocumentItem } from "@/api/workforceDocuments";

/* The six kinds of employee documents, and where each document's own page lives. */

export const EMP_DOC_KINDS: { value: string; labelAr: string; labelEn: string; one: [string, string]; icon: LucideIcon }[] = [
  { value: "IQAMA", labelAr: "الإقامات", labelEn: "Iqamas", one: ["الإقامة", "Iqama"], icon: CreditCard },
  { value: "PASSPORT", labelAr: "جوازات السفر", labelEn: "Passports", one: ["جواز السفر", "Passport"], icon: BookUser },
  { value: "HEALTH_CERTIFICATE", labelAr: "الشهادات الصحية", labelEn: "Health Certificates", one: ["الشهادة الصحية", "Health certificate"], icon: HeartPulse },
  { value: "MEDICAL_INSURANCE", labelAr: "التأمين الطبي", labelEn: "Medical Insurance", one: ["التأمين الطبي", "Medical insurance"], icon: ShieldPlus },
  { value: "VISA", labelAr: "التأشيرات", labelEn: "Visas", one: ["التأشيرة", "Visa"], icon: Stamp },
  { value: "FLIGHT_TICKET", labelAr: "تذاكر الطيران", labelEn: "Flight Tickets", one: ["تذكرة الطيران", "Flight ticket"], icon: Plane },
];
/** A workforce document's type, folded into the six kinds above. */
export function kindOfDoc(doc: Pick<WorkforceDocumentItem, "type" | "iqamaNumber">) {
  const raw = (doc.type || (doc.iqamaNumber ? "IQAMA" : "PASSPORT")).toUpperCase();
  return { raw, kind: EMP_DOC_KINDS.find((c) => c.value === raw || (raw.includes("VISA") && c.value === "VISA")) };
}
/** Where a workforce document's own page lives: iqamas and passports sit on the employee. */
export const empDocPath = (doc: Pick<WorkforceDocumentItem, "id" | "employeeId" | "type" | "iqamaNumber" | "employee">) => {
  const employeeId = doc.employeeId || doc.employee?.id || doc.id;
  const { raw } = kindOfDoc(doc);
  // Iqamas and passports come as the employee id, or as "iqama-<id>" / "passport-<id>".
  const embedded = doc.id === employeeId || doc.id === `${raw.toLowerCase()}-${employeeId}`;
  return `/employee-documents/${employeeId}/${embedded ? raw : doc.id}`;
};
