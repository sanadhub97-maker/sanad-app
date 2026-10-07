import { api } from "@/lib/api";
import type { Paginated } from "@/types/models";

export type ItemCondition = "new" | "good" | "used" | "damaged";
export type ReturnCondition = "good" | "damaged" | "lost";
export type DepartmentKey = "hr" | "fin" | "it" | "store" | "mgr";
export type ClearanceReason = "resignation" | "contractEnd" | "termination" | "transfer" | "retirement" | "other";

export interface CustodyEmployee {
  id: string;
  employeeNumber: string;
  fullNameAr: string;
  fullNameEn: string | null;
  jobTitle: string | null;
  jobTitleEn: string | null;
  iqamaNumber: string | null;
  branchId: string | null;
  branch: { id: string; name: string; nameEn: string | null; logoFileId: string | null } | null;
}

export interface CustodyItem {
  id: string;
  handoverId: string;
  kind: string;
  description: string | null;
  serialNumber: string | null;
  condition: ItemCondition;
  value: number;
  returnedAt: string | null;
  returnCondition: ReturnCondition | null;
  clearanceId: string | null;
  handover?: { id: string; number: string; date: string };
}

export interface CustodyHandover {
  id: string;
  number: string;
  employeeId: string;
  /** YYYY-MM-DD… */
  date: string;
  deliveredBy: string | null;
  notes: string | null;
  signedFileId: string | null;
  employee: CustodyEmployee;
  items: CustodyItem[];
  itemCount: number;
  itemsOut: number;
  totalValue: number;
  valueOut: number;
  createdBy: { id: string; fullName: string } | null;
  createdAt: string;
}

export interface DepartmentSignOff {
  done: boolean;
  by?: string;
  note?: string;
  at?: string;
}

export interface Clearance {
  id: string;
  number: string;
  employeeId: string;
  lastWorkingDay: string;
  reason: ClearanceReason;
  dues: number;
  notes: string | null;
  departments: Record<DepartmentKey, DepartmentSignOff>;
  status: "OPEN" | "ISSUED";
  issuedAt: string | null;
  employee: CustodyEmployee;
  items: CustodyItem[];
  blockers: { itemsOut: number; departmentsPending: DepartmentKey[] };
  createdBy: { id: string; fullName: string } | null;
  createdAt: string;
}

export interface CustodyStats {
  handovers: number;
  itemsOut: number;
  valueOut: number;
  openClearances: number;
  issuedClearances: number;
}

export interface CustodyQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  employeeId?: string;
  branchId?: string;
  state?: "all" | "open" | "returned" | "issued";
}

export interface HandoverInput {
  employeeId: string;
  date: string;
  deliveredBy?: string;
  notes?: string;
  items: { id?: string; kind: string; description?: string; serialNumber?: string; condition: ItemCondition; value: number }[];
}

export interface ClearanceInput {
  employeeId: string;
  lastWorkingDay: string;
  reason: ClearanceReason;
  dues: number;
  notes?: string;
  departments: Partial<Record<DepartmentKey, { done: boolean; by?: string; note?: string }>>;
  returns: { id: string; condition: ReturnCondition | null }[];
}

export const custodyApi = {
  stats: async () => (await api.get<{ data: CustodyStats }>("/custody/stats")).data.data,
  employeeItems: async (employeeId: string) => (await api.get<{ data: CustodyItem[] }>(`/custody/employees/${employeeId}/items`)).data.data,

  handovers: async (query: CustodyQuery) => (await api.get<Paginated<CustodyHandover>>("/custody/handovers", { params: query })).data,
  handover: async (id: string) => (await api.get<{ data: CustodyHandover }>(`/custody/handovers/${id}`)).data.data,
  createHandover: async (input: HandoverInput) => (await api.post<{ data: CustodyHandover }>("/custody/handovers", input)).data.data,
  updateHandover: async (id: string, input: Omit<HandoverInput, "employeeId">) => (await api.put<{ data: CustodyHandover }>(`/custody/handovers/${id}`, input)).data.data,
  returnItems: async (id: string, date: string, items: { id: string; condition: ReturnCondition }[]) => (await api.post<{ data: CustodyHandover }>(`/custody/handovers/${id}/return`, { date, items })).data.data,
  removeHandover: async (id: string) => api.delete(`/custody/handovers/${id}`),

  clearances: async (query: CustodyQuery) => (await api.get<Paginated<Clearance>>("/custody/clearances", { params: query })).data,
  clearance: async (id: string) => (await api.get<{ data: Clearance }>(`/custody/clearances/${id}`)).data.data,
  createClearance: async (input: ClearanceInput) => (await api.post<{ data: Clearance }>("/custody/clearances", input)).data.data,
  updateClearance: async (id: string, input: Omit<ClearanceInput, "employeeId">) => (await api.put<{ data: Clearance }>(`/custody/clearances/${id}`, input)).data.data,
  issueClearance: async (id: string) => (await api.post<{ data: Clearance }>(`/custody/clearances/${id}/issue`)).data.data,
  removeClearance: async (id: string) => api.delete(`/custody/clearances/${id}`),
};

export const CONDITIONS: { value: ItemCondition; ar: string; en: string }[] = [
  { value: "new", ar: "جديدة", en: "New" },
  { value: "good", ar: "سليمة", en: "Good" },
  { value: "used", ar: "مستعملة", en: "Used" },
  { value: "damaged", ar: "تالفة", en: "Damaged" },
];
export const RETURN_CONDITIONS: { value: ReturnCondition; ar: string; en: string }[] = [
  { value: "good", ar: "سليمة", en: "Good" },
  { value: "damaged", ar: "تالفة", en: "Damaged" },
  { value: "lost", ar: "مفقودة", en: "Lost" },
];
export const DEPARTMENTS: { key: DepartmentKey; ar: string; en: string }[] = [
  { key: "hr", ar: "الموارد البشرية", en: "Human resources" },
  { key: "fin", ar: "المالية", en: "Finance" },
  { key: "it", ar: "تقنية المعلومات", en: "IT" },
  { key: "store", ar: "المستودع والعهد", en: "Stores & custody" },
  { key: "mgr", ar: "المدير المباشر", en: "Line manager" },
];
export const REASONS: { value: ClearanceReason; ar: string; en: string }[] = [
  { value: "resignation", ar: "استقالة", en: "Resignation" },
  { value: "contractEnd", ar: "انتهاء العقد", en: "End of contract" },
  { value: "termination", ar: "إنهاء خدمات", en: "Termination" },
  { value: "transfer", ar: "نقل خدمات", en: "Transfer of sponsorship" },
  { value: "retirement", ar: "تقاعد", en: "Retirement" },
  { value: "other", ar: "أخرى", en: "Other" },
];
export const ITEM_KINDS = ["لابتوب", "جوال", "شريحة اتصال", "سيارة", "مفاتيح", "بطاقة دخول", "عدة وأدوات", "زي العمل", "تابلت", "شاشة", "طابعة"];
