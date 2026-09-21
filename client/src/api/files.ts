import { api } from "@/lib/api";
import type { FileMeta, Paginated } from "@/types/models";

export interface FileMetaWithUploader extends FileMeta {
  module?: string | null;
  uploadedBy?: { id: string; fullName: string };
}

export const filesApi = {
  list: async (params: Record<string, unknown> = {}) => {
    const res = await api.get<Paginated<FileMetaWithUploader>>("/files", { params });
    return res.data;
  },
  upload: async (file: File, module?: string, relatedId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (module) formData.append("module", module);
    if (relatedId) formData.append("relatedId", relatedId);
    const res = await api.post<{ data: FileMeta; message: string }>("/files", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },
  downloadUrl: (id: string) => `/api/files/${id}/download`,
  remove: async (id: string) => {
    await api.delete(`/files/${id}`);
  },
};
