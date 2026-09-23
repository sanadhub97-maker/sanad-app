import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";

/** Downloads a binary response (xlsx/pdf/csv) as a real file save — every
 * Export/Template/Print-download button goes through this, never a fake
 * client-only "export". */
export async function downloadFile(url: string, params: Record<string, unknown> = {}, filenameFallback = "download") {
  const res = await api.get(url, { params, responseType: "blob" });
  const disposition = res.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? filenameFallback;

  const blobUrl = window.URL.createObjectURL(res.data as Blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function openPdfInNewTab(url: string, params: Record<string, unknown> = {}) {
  // Open the tab synchronously, in the same call stack as the click that
  // triggered this — opening it only after the await below resolves falls
  // outside the user-gesture window most browsers require for window.open,
  // so the tab silently lands on a blank/broken page instead of the PDF.
  const newTab = window.open("", "_blank");
  try {
    const res = await api.get(url, { params, responseType: "blob" });
    const blobUrl = window.URL.createObjectURL(res.data as Blob);
    if (newTab) {
      newTab.location.href = blobUrl;
    } else {
      window.open(blobUrl, "_blank");
    }
  } catch (err) {
    newTab?.close();
    toast.error(getErrorMessage(err));
    throw err;
  }
}
