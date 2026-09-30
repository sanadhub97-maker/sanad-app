import i18n from "@/i18n";
import type { DocumentStatus, Employee } from "@/types/models";
import { documentAuthority } from "./authority";
import { EMP_DOC_KINDS } from "./emp-doc-kinds";

/** One of an employee's documents: the iqama and passport kept on the
 * employee record, and every document in the employee's documents list. */
export interface EmpDoc {
  key: string;
  id: string;
  embedded: boolean;
  type: string;
  label: string;
  number?: string | null;
  authority?: string | null;
  issuingAuthority?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  fileId?: string | null;
  notes?: string | null;
  status?: DocumentStatus | null;
  createdAt?: string;
}

const one = (type: string, isAr: boolean) => {
  const k = EMP_DOC_KINDS.find((c) => c.value === type);
  return k ? k.one[isAr ? 0 : 1] : i18n.t(`documentTypes.${type}`, { defaultValue: type });
};

export function employeeDocs(emp: Employee, isAr: boolean): EmpDoc[] {
  const list: EmpDoc[] = [];
  if (emp.iqamaNumber || emp.iqamaExpiryDate)
    list.push({ key: "IQAMA", id: emp.id, embedded: true, type: "IQAMA", label: one("IQAMA", isAr), number: emp.iqamaNumber, authority: documentAuthority({ type: "IQAMA" }, isAr), issueDate: emp.iqamaIssueDate, expiryDate: emp.iqamaExpiryDate, fileId: emp.iqamaFileId, status: emp.iqamaStatus });
  if (emp.passportNumber || emp.passportExpiryDate)
    list.push({ key: "PASSPORT", id: emp.id, embedded: true, type: "PASSPORT", label: one("PASSPORT", isAr), number: emp.passportNumber, authority: documentAuthority({ type: "PASSPORT", passportCountry: emp.passportCountry }, isAr), issueDate: emp.passportIssueDate, expiryDate: emp.passportExpiryDate, fileId: emp.passportFileId, status: emp.passportStatus });
  (emp.documents ?? []).forEach((d) =>
    list.push({
      key: d.id,
      id: d.id,
      embedded: false,
      type: d.type,
      label: d.name && !EMP_DOC_KINDS.some((c) => c.value === d.type) ? d.name : one(d.type, isAr),
      number: d.documentNumber,
      authority: d.issuingAuthority,
      issuingAuthority: d.issuingAuthority,
      issueDate: d.issueDate || d.startDate,
      expiryDate: d.expiryDate,
      fileId: d.fileId,
      notes: d.notes,
      status: d.status,
      createdAt: d.createdAt,
    })
  );
  return list;
}
