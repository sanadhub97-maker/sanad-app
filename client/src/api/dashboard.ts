import { api } from "@/lib/api";

export interface DashboardSummary {
  totalEmployees: number;
  activeEmployees: number;
  totalCompanyDocuments: number;
  totalTrackedDocuments: number;
  validDocuments: number;
  expiringDocuments: number;
  expiredDocuments: number;
  totalPaymentsAmount: number;
  monthlyPaymentsAmount: number;
}

export interface ExpirationWidget {
  expired: number;
  today: number;
  within7: number;
  within30: number;
  within60: number;
  within90: number;
}

export interface DashboardCharts {
  employeesByStatus: { status: string; count: number }[];
  employeesByDepartment: { department: string; count: number }[];
  documentsByStatus: { status: string; count: number }[];
  paymentsByCategory: { category: string; total: number }[];
  paymentsByBranch: { branch: string; total: number }[];
  monthlyPayments: { month: string; total: number }[];
}

export interface DashboardAttentionItem {
  key: string;
  sourceType: "EMPLOYEE_IQAMA" | "EMPLOYEE_PASSPORT" | "EMPLOYEE_DOCUMENT" | "COMPANY_DOCUMENT";
  recordId: string;
  employeeId: string | null;
  nameAr: string;
  nameEn: string;
  documentAr: string;
  documentEn: string;
  documentNumber: string | null;
  branchName: string | null;
  /** Days until expiry; negative once expired. */
  days: number;
  /** A daily task was already made from this item. */
  taskAdded: boolean;
}

export interface DashboardOverview {
  /** Expiries per day (YYYY-MM-DD) from a week back to two weeks ahead. */
  expiriesByDate: Record<string, number>;
  expired: number;
  endingIn30: number;
  attention: DashboardAttentionItem[];
  attentionTotal: number;
  /** Expiries in this month and the five after it; month is YYYY-MM. */
  upcoming: { month: string; count: number }[];
  /** IQAMA, PASSPORT, HEALTH_CERTIFICATE, MEDICAL_INSURANCE, COMPANY, OTHER */
  byType: Record<string, number>;
  branches: { total: number; active: number; cities: number };
}

export const dashboardApi = {
  overview: async () => (await api.get<{ data: DashboardOverview }>("/dashboard/overview")).data.data,
  summary: async () => (await api.get<{ data: DashboardSummary }>("/dashboard/summary")).data.data,
  expirationWidget: async () => (await api.get<{ data: ExpirationWidget }>("/dashboard/expiration-widget")).data.data,
  charts: async () => (await api.get<{ data: DashboardCharts }>("/dashboard/charts")).data.data,
  recentActivity: async () => (await api.get("/dashboard/recent-activity")).data.data,
};
