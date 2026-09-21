import { api } from "@/lib/api";
import { createResourceApi } from "@/api/createResourceApi";
import type { CompanyDocument } from "@/types/models";

export interface CompanyDocumentInput {
  category: string;
  name: string;
  documentNumber?: string;
  licenseNumber?: string;
  issuingAuthority?: string;
  branchId?: string;
  city?: string;
  issueDate?: string;
  startDate?: string;
  expiryDate?: string;
  fileId?: string;
  notes?: string;
}

function withCategoryCounts(basePath: string) {
  return {
    ...createResourceApi<CompanyDocument, CompanyDocumentInput>(basePath),
    categoryCounts: async () => {
      const res = await api.get<{ data: Record<string, number> }>(`${basePath}/category-counts`);
      return res.data.data;
    },
  };
}

export const companyDocumentsApi = withCategoryCounts("/company-documents");

export const COMPANY_DOCUMENT_CATEGORIES = [
  "COMMERCIAL_REGISTRATION",
  "MUNICIPAL_LICENSE",
  "CIVIL_DEFENSE_LICENSE",
  "CIVIL_DEFENSE_REPORT",
  "CLEANING_CONTRACT",
  "LEASE_CONTRACT",
  "TWENTY_FOUR_HOUR_PERMIT",
  "ENTERTAINMENT_AUTHORITY_PERMIT",
  "TOBACCO_LICENSE",
  "OTHER",
] as const;
