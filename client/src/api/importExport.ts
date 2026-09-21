import { api } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import type { Paginated } from "@/types/models";

export interface ImportRowError {
  rowNumber: number;
  field?: string;
  message: string;
}

export interface ImportSummary {
  importJobId: string;
  totalRows: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: ImportRowError[];
}

export interface ImportJob {
  id: string;
  module: string;
  fileName: string;
  status: string;
  totalRows: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  createdAt: string;
  createdBy?: { fullName: string };
}

export const importExportApi = {
  downloadEmployeesTemplate: () => downloadFile("/import-export/employees/template", {}, "employees-import-template.xlsx"),

  importEmployees: async (file: File, dryRun: boolean) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<{ data: ImportSummary; message: string }>(
      `/import-export/employees/import?dryRun=${dryRun}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  },

  listJobs: async (params: Record<string, unknown> = {}) => {
    const res = await api.get<Paginated<ImportJob>>("/import-export/jobs", { params });
    return res.data;
  },

  getJob: async (id: string) => {
    const res = await api.get<{ data: ImportJob & { errors: ImportRowError[] } }>(`/import-export/jobs/${id}`);
    return res.data.data;
  },

  downloadJobErrors: (id: string) => downloadFile(`/import-export/jobs/${id}/errors.xlsx`, {}, `import-errors-${id}.xlsx`),
};
