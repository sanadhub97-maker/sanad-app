import { api } from "@/lib/api";

export interface WorkforceDocumentItem {
  id: string;
  employeeId: string;
  employeeNumber?: string;
  fullNameAr?: string;
  fullNameEn?: string;
  jobTitle?: string;
  branch?: { id: string; name: string; code: string } | null;
  type?: string;
  name?: string | null;
  documentNumber?: string | null;
  issuingAuthority?: string | null;
  iqamaNumber?: string | null;
  passportNumber?: string | null;
  passportCountry?: string | null;
  issueDate?: string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  daysRemaining?: number | null;
  fileId?: string | null;
  notes?: string | null;
  status: "VALID" | "EXPIRING_SOON" | "EXPIRED";
  employee?: {
    id: string;
    employeeNumber: string;
    fullNameAr: string;
    fullNameEn?: string | null;
    branch?: { id: string; name: string; code: string } | null;
  };
}

export interface WorkforceStats {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
}

export interface WorkforceListResponse {
  data: WorkforceDocumentItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  stats: WorkforceStats;
}

export interface WorkforceQueryParams {
  page?: number;
  pageSize?: number;
  q?: string;
  branchId?: string;
  status?: string;
}

export const workforceDocumentsApi = {
  getIqamas: async (params: WorkforceQueryParams = {}) =>
    (await api.get<WorkforceListResponse>("/workforce-documents/iqamas", { params })).data,

  getPassports: async (params: WorkforceQueryParams = {}) =>
    (await api.get<WorkforceListResponse>("/workforce-documents/passports", { params })).data,

  getHealthCertificates: async (params: WorkforceQueryParams = {}) =>
    (await api.get<WorkforceListResponse>("/workforce-documents/health-certificates", { params })).data,

  getMedicalInsurance: async (params: WorkforceQueryParams = {}) =>
    (await api.get<WorkforceListResponse>("/workforce-documents/medical-insurance", { params })).data,

  getVisas: async (params: WorkforceQueryParams = {}) =>
    (await api.get<WorkforceListResponse>("/workforce-documents/visas", { params })).data,

  getFlightTickets: async (params: WorkforceQueryParams = {}) =>
    (await api.get<WorkforceListResponse>("/workforce-documents/flight-tickets", { params })).data,

  getOverviewStats: async () =>
    (await api.get<{ data: Record<string, WorkforceStats> }>("/workforce-documents/overview-stats")).data.data,

  create: async (payload: any) =>
    (await api.post<{ data: WorkforceDocumentItem; message: string }>("/workforce-documents", payload)).data,

  update: async (id: string, payload: any) =>
    (await api.put<{ data: WorkforceDocumentItem; message: string }>(`/workforce-documents/${id}`, payload)).data,

  remove: async (id: string) =>
    (await api.delete<{ message: string }>(`/workforce-documents/${id}`)).data,
};

