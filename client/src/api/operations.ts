import { api } from "@/lib/api";
export interface Handover { id: string; issuedAt: string; returnedAt: string | null; issuedCondition: string; returnedCondition: string | null; employee: { id?: string; fullNameAr: string; employeeNumber: string }; asset?: { code: string; name: string } }
export interface Asset { id: string; code: string; name: string; category: string; state: string; serialNumber: string | null; purchaseValue: string; handovers: Handover[] }
export interface Clearance { id: string; plannedDate: string; reason: string; status: string; steps: Record<string, boolean>; employee: { id: string; fullNameAr: string; employeeNumber: string; assetHandovers: Handover[] } }
export interface Renewal { id: string; sourceType: string; title: string; dueDate: string; status: string; estimatedCost?: string; owner: { fullName: string }; taskId: string | null }
export interface Candidate { sourceType: string; sourceId: string; title: string; expiryDate: string }
const get = async <T,>(path: string, params?: Record<string, unknown>) => (await api.get<{ data: T }>(`/operations${path}`, { params })).data.data;
export const operationsApi = {
  assets: (q: string, page: number) => get<{ rows: Asset[]; total: number }>("/assets", { q, page }),
  clearances: (q: string, page: number) => get<{ rows: Clearance[]; total: number }>("/offboarding", { q, page }),
  renewals: (q: string, page: number) => get<{ rows: Renewal[]; total: number }>("/renewals", { q, page }),
  candidates: () => get<Candidate[]>("/renewal-candidates"),
  owners: () => get<{ id: string; fullName: string }[]>("/responsible-users"),
  history: (id: string) => get<Handover[]>(`/assets/${id}/history`),
  save: (path: string, body: Record<string, unknown>) => api.post(`/operations${path}`, body),
  update: (path: string, body: Record<string, unknown>) => api.put(`/operations${path}`, body),
};
