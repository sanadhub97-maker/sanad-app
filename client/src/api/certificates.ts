import { api } from "@/lib/api";
import type { CustodyEmployee } from "@/api/custody";

export interface SavedCertificate {
  id: string;
  kind: "SALARY" | "EXPERIENCE";
  number: string;
  employeeId: string;
  establishment: "employee" | "manual";
  estName?: string | null;
  estNameEn?: string | null;
  estCr?: string | null;
  estCity?: string | null;
  jobTitle?: string | null;
  startDate?: string | null;
  issueDate: string;
  note?: string | null;
  names: string[];
  // Experience fields
  endDate?: string | null;
  stillWorking?: boolean;
  conduct?: boolean;
  // Salary fields
  recipient?: string | null;
  basic?: number;
  housing?: number;
  transport?: number;
  others?: { label: string; amount: number }[];
  totalSalary?: number;
  toBank?: boolean;
  bankName?: string | null;
  iban?: string | null;
  createdAt: string;
  updatedAt: string;
  employee: CustodyEmployee;
}

export interface SaveExperienceInput {
  employeeId: string;
  establishment: "employee" | "manual";
  estName?: string;
  estNameEn?: string;
  estCr?: string;
  estCity?: string;
  jobTitle?: string;
  startDate?: string;
  endDate?: string;
  stillWorking: boolean;
  conduct: boolean;
  note?: string;
  names: string[];
  issueDate: string;
}

export interface SaveSalaryInput {
  employeeId: string;
  establishment: "employee" | "manual";
  estName?: string;
  estNameEn?: string;
  estCr?: string;
  estCity?: string;
  jobTitle?: string;
  startDate?: string;
  recipient?: string;
  basic: number;
  housing: number;
  transport: number;
  others: { label: string; amount: number }[];
  toBank: boolean;
  bankName?: string;
  iban?: string;
  note?: string;
  names: string[];
  issueDate: string;
}

export const certificatesApi = {
  list: async (params: { kind: "SALARY" | "EXPERIENCE"; q?: string; employeeId?: string }) =>
    (await api.get<{ data: SavedCertificate[] }>("/certificates", { params })).data.data,

  createExperience: async (input: SaveExperienceInput) =>
    (await api.post<{ data: SavedCertificate }>("/certificates/experience", input)).data.data,

  updateExperience: async (id: string, input: SaveExperienceInput) =>
    (await api.put<{ data: SavedCertificate }>(`/certificates/experience/${id}`, input)).data.data,

  createSalary: async (input: SaveSalaryInput) =>
    (await api.post<{ data: SavedCertificate }>("/certificates/salary", input)).data.data,

  updateSalary: async (id: string, input: SaveSalaryInput) =>
    (await api.put<{ data: SavedCertificate }>(`/certificates/salary/${id}`, input)).data.data,

  remove: async (id: string) => api.delete(`/certificates/${id}`),
};

