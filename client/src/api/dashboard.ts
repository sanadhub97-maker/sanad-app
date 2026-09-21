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

export const dashboardApi = {
  summary: async () => (await api.get<{ data: DashboardSummary }>("/dashboard/summary")).data.data,
  expirationWidget: async () => (await api.get<{ data: ExpirationWidget }>("/dashboard/expiration-widget")).data.data,
  charts: async () => (await api.get<{ data: DashboardCharts }>("/dashboard/charts")).data.data,
  recentActivity: async () => (await api.get("/dashboard/recent-activity")).data.data,
};
