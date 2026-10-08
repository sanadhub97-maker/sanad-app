import { api } from "@/lib/api";
import type { Paginated } from "@/types/models";

export type VehicleDate = "INSPECTION" | "INSURANCE" | "REGISTRATION";
export type VehicleState = "all" | "expired" | "soon" | VehicleDate;
export type InsuranceType = "COMPREHENSIVE" | "THIRD_PARTY";

export interface Vehicle {
  id: string;
  plateLetters: string;
  plateNumber: string;
  serialNumber: string | null;
  ownerName: string | null;
  make: string;
  year: number | null;
  color: string | null;
  branchId: string | null;
  driverId: string | null;
  inspectionExpiry: string;
  insuranceExpiry: string;
  registrationExpiry: string | null;
  insurer: string | null;
  insuranceType: InsuranceType | null;
  inspectionFileId: string | null;
  insuranceFileId: string | null;
  registrationFileId: string | null;
  notes: string | null;
  branch: { id: string; name: string; nameEn: string | null; logoFileId: string | null } | null;
  driver: { id: string; fullNameAr: string; fullNameEn: string | null; employeeNumber: string } | null;
  inspectionDays: number;
  insuranceDays: number;
  registrationDays: number | null;
  nearestDays: number;
  renewals?: { id: string; kind: VehicleDate; previous: string | null; next: string; paymentId: string | null; createdAt: string; createdBy: { fullName: string } | null }[];
}

export interface VehicleStats {
  total: number;
  allValid: number;
  expired: number;
  soon: number;
  inspection: number;
  insurance: number;
  registration: number;
}

export interface VehicleInput {
  plateLetters: string;
  plateNumber: string;
  serialNumber?: string;
  ownerName?: string;
  make: string;
  year?: number | "";
  color?: string;
  branchId?: string;
  driverId?: string;
  inspectionExpiry: string;
  insuranceExpiry: string;
  registrationExpiry?: string;
  insurer?: string;
  insuranceType?: InsuranceType | null;
  inspectionFileId?: string | null;
  insuranceFileId?: string | null;
  registrationFileId?: string | null;
  notes?: string;
}

export interface VehicleQuery {
  state?: VehicleState;
  branchId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export const vehiclesApi = {
  list: async (query: VehicleQuery) => (await api.get<Paginated<Vehicle>>("/vehicles", { params: query })).data,
  stats: async () => (await api.get<{ data: VehicleStats }>("/vehicles/stats")).data.data,
  get: async (id: string) => (await api.get<{ data: Vehicle }>(`/vehicles/${id}`)).data.data,
  create: async (input: VehicleInput) => (await api.post<{ data: Vehicle }>("/vehicles", input)).data.data,
  update: async (id: string, input: VehicleInput) => (await api.put<{ data: Vehicle }>(`/vehicles/${id}`, input)).data.data,
  renew: async (id: string, input: { kind: VehicleDate; date: string; amount?: number; method?: string; fileId?: string }) => (await api.post<{ data: Vehicle }>(`/vehicles/${id}/renew`, input)).data.data,
  remove: async (id: string) => api.delete(`/vehicles/${id}`),
};

export const DATE_LOOK: Record<VehicleDate, { ar: string; en: string; span: number }> = {
  INSPECTION: { ar: "الفحص الدوري", en: "Inspection", span: 365 },
  INSURANCE: { ar: "التأمين", en: "Insurance", span: 365 },
  REGISTRATION: { ar: "الاستمارة", en: "Registration", span: 1095 },
};
