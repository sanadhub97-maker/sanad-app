import { create } from "zustand";

export interface PdfPreviewRequest {
  id: number;
  url: string;
  params: Record<string, unknown>;
  filename: string;
  controller: AbortController;
  blob?: Blob;
  error?: string;
}
export const usePdfPreviewStore = create<{ request: PdfPreviewRequest | null; close: () => void }>((set, get) => ({
  request: null,
  close: () => { get().request?.controller.abort(); set({ request: null }); },
}));
