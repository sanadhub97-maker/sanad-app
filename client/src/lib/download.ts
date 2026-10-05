import { toast } from "sonner";
import { api, extractErrorMessage } from "@/lib/api";
import { tr } from "@/i18n";
import i18n from "@/i18n";
import { useAuthStore } from "@/stores/authStore";

import { usePdfPreviewStore } from "@/stores/pdfPreviewStore";

const pendingExports = new Set<string>();
function exportKey(url: string, params: Record<string, unknown>) {
  return JSON.stringify([useAuthStore.getState().user?.id, i18n.language, url, Object.entries(params).sort(([a], [b]) => a.localeCompare(b))]);
}
function beginExport(key: string) {
  if (pendingExports.has(key)) { toast.info(tr("جاري تجهيز نفس المستند بالفعل، انتظر اكتماله.", "This document is already being prepared. Please wait.")); return false; }
  pendingExports.add(key); return true;
}

function triggerDownload(blobUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function responseFilename(disposition: string | undefined, fallback: string) {
  let name = disposition?.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (name) { try { name = decodeURIComponent(name.trim()); } catch { name = undefined; } }
  name ??= disposition?.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i)?.slice(1).find(Boolean)?.trim();
  return (name ?? fallback).split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, "") || fallback;
}

async function prepareBlob(blob: Blob, pdf: boolean, xlsx = false) {
  if (!blob.size || (pdf && await blob.slice(0, 5).text() !== "%PDF-")) throw new Error(tr("الملف المستلم غير صالح. يرجى إعادة المحاولة.", "The received file is invalid. Please try again."));
  if (xlsx) { const bytes = new Uint8Array(await blob.slice(0, 4).arrayBuffer()); if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) throw new Error(tr("ملف Excel المستلم غير صالح. يرجى إعادة المحاولة.", "The received Excel file is invalid. Please try again.")); }
  return pdf && blob.type !== "application/pdf" ? new Blob([blob], { type: "application/pdf" }) : blob;
}

/** Downloads a binary response (xlsx/pdf/csv) as a real file save — every
 * Export/Template/Print-download button goes through this, never a fake
 * client-only "export". */
export async function downloadFile(
  url: string,
  params: Record<string, unknown> = {},
  filenameFallback = "download"
) {
  const key = exportKey(url, params);
  if (!beginExport(key)) return;
  const toastId = toast.loading(tr("جاري تصدير وتجهيز الملف...", "Preparing your file..."));
  try {
    const res = await api.get(url, { params, responseType: "blob" });
    const disposition = res.headers["content-disposition"] as string | undefined;
    const filename = responseFilename(disposition, filenameFallback);
    const blob = await prepareBlob(res.data as Blob, params.format === "pdf" || /\.pdf$/i.test(filename), params.format === "xlsx" || /\.xlsx$/i.test(filename));

    const blobUrl = window.URL.createObjectURL(blob);
    triggerDownload(blobUrl, filename);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
    toast.success(tr("تم تصدير الملف بنجاح", "File exported"), { id: toastId });
  } catch (err) {
    const errorMsg = await extractErrorMessage(err, tr("تعذر تصدير الملف. يرجى المحاولة مرة أخرى.", "Could not export the file. Please try again."));
    toast.error(errorMsg, { id: toastId });
    throw err;
  } finally {
    pendingExports.delete(key);
  }
}

let previewId = 0;
/** Compatibility name: all existing print buttons now open an in-app preview. */
export async function openPdfInNewTab(
  url: string,
  params: Record<string, unknown> = {},
  fallbackName = "report.pdf"
) {
  const key = exportKey(url, params);
  if (!beginExport(key)) return;
  usePdfPreviewStore.getState().close();
  const id = ++previewId;
  const controller = new AbortController();
  usePdfPreviewStore.setState({ request: { id, url, params, filename: fallbackName, controller } });
  try {
    const res = await api.get(url, { params, responseType: "blob", signal: controller.signal });
    const filename = responseFilename(res.headers["content-disposition"], fallbackName);
    const blob = await prepareBlob(res.data as Blob, true);
    const request = usePdfPreviewStore.getState().request;
    if (request?.id === id) usePdfPreviewStore.setState({ request: { ...request, filename, blob } });
  } catch (err) {
    if (controller.signal.aborted) return;
    const error = await extractErrorMessage(err, err instanceof Error && !('isAxiosError' in err)
      ? err.message : tr("تعذر استخراج تقرير الـ PDF. يرجى المحاولة مرة أخرى.", "Could not generate the PDF. Please try again."));
    const request = usePdfPreviewStore.getState().request;
    if (request?.id === id) usePdfPreviewStore.setState({ request: { ...request, error } });
    toast.error(error);
    throw err;
  } finally { pendingExports.delete(key); }
}
