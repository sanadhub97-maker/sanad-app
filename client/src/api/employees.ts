import { api } from "@/lib/api";
import { createResourceApi } from "@/api/createResourceApi";
import type { Employee, EmployeeDocument } from "@/types/models";

export interface EmployeeInput {
  employeeNumber: string;
  fullNameAr: string;
  fullNameEn?: string;
  nationality?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  jobTitle?: string;
  department?: string;
  branchId?: string;
  joiningDate?: string;
  employmentStatus: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
  notes?: string;
  iqamaNumber?: string;
  iqamaIssueDate?: string;
  iqamaExpiryDate?: string;
  iqamaFileId?: string;
  passportNumber?: string;
  passportCountry?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  passportFileId?: string;
}

const baseEmployeesApi = createResourceApi<Employee, EmployeeInput>("/employees");

export const employeesApi = {
  ...baseEmployeesApi,
  getNextNumber: async () => {
    const res = await api.get<{ data: { nextNumber: string } }>("/employees/next-number");
    return res.data.data.nextNumber;
  },
};

export function employeePdfUrl(id: string) {
  return `/employees/${id}/pdf`;
}

export interface EmployeeDocumentInput {
  type: string;
  name?: string;
  documentNumber?: string;
  issuingAuthority?: string;
  issueDate?: string;
  startDate?: string;
  expiryDate?: string;
  fileId?: string;
  notes?: string;
}

export const employeeDocumentsApi = {
  list: async (employeeId: string) => {
    const res = await api.get<{ data: EmployeeDocument[] }>(`/employees/${employeeId}/documents`);
    return res.data.data;
  },
  create: async (employeeId: string, input: EmployeeDocumentInput) => {
    const res = await api.post<{ data: EmployeeDocument; message?: string }>(`/employees/${employeeId}/documents`, input);
    return res.data;
  },
  update: async (employeeId: string, id: string, input: Partial<EmployeeDocumentInput>) => {
    const res = await api.put<{ data: EmployeeDocument; message?: string }>(`/employees/${employeeId}/documents/${id}`, input);
    return res.data;
  },
  remove: async (employeeId: string, id: string) => {
    const res = await api.delete<{ message?: string }>(`/employees/${employeeId}/documents/${id}`);
    return res.data;
  },
};
