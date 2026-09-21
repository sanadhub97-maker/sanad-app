import { api } from "@/lib/api";
import type { FileMeta, Paginated } from "@/types/models";

export interface FileMetaWithUploader extends FileMeta {
  module?: string | null;
  uploadedBy?: { id: string; fullName: string };
}

const dataUrlCache = new Map<string, string>();

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
  /** Direct public URL for branding assets like logos and favicons */
  getPublicUrl: (id: string) => `/api/files/public/${id}`,

  /** Downloads authenticated file and converts to a persistent Base64 Data URL.
   * Unlike blob URLs, Data URLs cannot be revoked by React StrictMode,
   * work across all browsers regardless of CSP blob: policy, and can be safely cached. */
  fetchDataUrl: async (id: string): Promise<string> => {
    if (dataUrlCache.has(id)) {
      return dataUrlCache.get(id)!;
    }
    const res = await api.get(`/files/${id}/download`, { responseType: "blob" });
    const blob = res.data as Blob;
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          dataUrlCache.set(id, reader.result);
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read file as data URL"));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
      reader.readAsDataURL(blob);
    });
  },

  // Downloads require the Bearer access token; a plain <img src> or <a href>
  // can't attach it, so the endpoint 401s. Fetch the bytes through the
  // authenticated `api` client instead and hand back an object URL — for
  // inline previews (see AuthedFileImage) and "view file" links alike.
  fetchBlobUrl: async (id: string) => {
    const res = await api.get(`/files/${id}/download`, { responseType: "blob" });
    return window.URL.createObjectURL(res.data as Blob);
  },
  openInNewTab: async (id: string) => {
    const blobUrl = await filesApi.fetchBlobUrl(id);
    window.open(blobUrl, "_blank");
  },
  download: async (id: string, filename: string) => {
    const blobUrl = await filesApi.fetchBlobUrl(id);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  },
  remove: async (id: string) => {
    await api.delete(`/files/${id}`);
  },
};
