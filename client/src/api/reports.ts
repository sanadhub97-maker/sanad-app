import { api } from "@/lib/api";
import { downloadFile } from "@/lib/download";

export type ReportFormat = "json" | "xlsx" | "pdf" | "csv";

async function fetchJson<T>(path: string, params: Record<string, unknown>) {
  const res = await api.get<{ data: T }>(path, { params: { ...params, format: "json" } });
  return res.data.data;
}

function exportFile(path: string, params: Record<string, unknown>, format: ReportFormat, filename: string) {
  return downloadFile(path, { ...params, format }, filename);
}

export const reportsApi = {
  employees: {
    fetch: (params: Record<string, unknown> = {}) => fetchJson("/reports/employees", params),
    export: (params: Record<string, unknown>, format: ReportFormat) =>
      exportFile("/reports/employees", params, format, `employee-report.${format}`),
  },
  documents: {
    fetch: (params: Record<string, unknown> = {}) => fetchJson("/reports/documents", params),
    export: (params: Record<string, unknown>, format: ReportFormat) =>
      exportFile("/reports/documents", params, format, `documents-report.${format}`),
  },
  payments: {
    fetch: (params: Record<string, unknown> = {}) => fetchJson("/reports/payments", params),
    export: (params: Record<string, unknown>, format: ReportFormat) =>
      exportFile("/reports/payments", params, format, `payments-report.${format}`),
  },
  activity: {
    fetch: (params: Record<string, unknown> = {}) => fetchJson("/reports/activity", params),
    export: (params: Record<string, unknown>, format: ReportFormat) =>
      exportFile("/reports/activity", params, format, `activity-report.${format}`),
  },
};
