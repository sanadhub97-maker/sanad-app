import { toast } from "sonner";
import { api, extractErrorMessage } from "@/lib/api";
import { tr, isRtlLanguage } from "@/i18n";
import i18n from "@/i18n";

function triggerDownload(blobUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Downloads a binary response (xlsx/pdf/csv) as a real file save — every
 * Export/Template/Print-download button goes through this, never a fake
 * client-only "export". */
export async function downloadFile(
  url: string,
  params: Record<string, unknown> = {},
  filenameFallback = "download"
) {
  const toastId = toast.loading(tr("جاري تصدير وتجهيز الملف...", "Preparing your file..."));
  try {
    const res = await api.get(url, { params, responseType: "blob" });
    const disposition = res.headers["content-disposition"] as string | undefined;
    const match = disposition?.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? filenameFallback;

    const blobUrl = window.URL.createObjectURL(res.data as Blob);
    triggerDownload(blobUrl, filename);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    toast.success(tr("تم تصدير الملف بنجاح", "File exported"), { id: toastId });
  } catch (err) {
    const errorMsg = await extractErrorMessage(err, tr("تعذر تصدير الملف. يرجى المحاولة مرة أخرى.", "Could not export the file. Please try again."));
    toast.error(errorMsg, { id: toastId });
    throw err;
  }
}

export async function openPdfInNewTab(
  url: string,
  params: Record<string, unknown> = {},
  fallbackName = "report.pdf"
) {
  const toastId = toast.loading(tr("جاري تجهيز تقرير الـ PDF للطباعة والمعاينة...", "Preparing the PDF..."));
  const rtl = isRtlLanguage(i18n.language);

  // Open the tab synchronously to prevent popup blocker, but provide a luxury loading experience
  let newTab: Window | null = null;
  try {
    newTab = window.open("", "_blank");
    if (newTab) {
      newTab.document.write(`<!doctype html>
<html dir="${rtl ? "rtl" : "ltr"}" lang="${rtl ? "ar" : "en"}">
<head>
  <meta charset="utf-8">
  <title>${tr("جاري تحضير التقرير | سند", "Preparing report | SanaD")}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, #0f172a 0%, #050814 100%);
      font-family: 'Segoe UI', Tahoma, -apple-system, sans-serif;
      color: #f8fafc;
      overflow: hidden;
    }
    .spinner-ring {
      width: 50px;
      height: 50px;
      border: 3.5px solid rgba(56, 189, 248, 0.15);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.75s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .title {
      margin-top: 22px;
      font-size: 16px;
      font-weight: 800;
      background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.2px;
    }
    .sub {
      margin-top: 8px;
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="spinner-ring"></div>
  <div class="title">${tr("جاري استخراج وتجهيز التقرير الرسمي...", "Generating the report...")}</div>
  <div class="sub">${tr("سيتم عرض مستند الـ PDF للطباعة والمعاينة مباشرة", "The PDF will open here for preview and printing")}</div>
</body>
</html>`);
    }
  } catch {
    // If opening new window failed directly, continue to fetch and download
  }

  try {
    const res = await api.get(url, { params, responseType: "blob" });
    const disposition = res.headers["content-disposition"] as string | undefined;
    const match = disposition?.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? fallbackName;

    const blobUrl = window.URL.createObjectURL(res.data as Blob);

    let opened = false;
    if (newTab && !newTab.closed) {
      try {
        newTab.location.replace(blobUrl);
        opened = true;
      } catch {
        // location.replace may be blocked by some browser policies
      }
    }

    if (!opened) {
      // Fallback: If new tab was closed or popup was blocked, download directly
      triggerDownload(blobUrl, filename);
    }

    toast.success(tr("تم تجهيز مستند الـ PDF بنجاح", "PDF ready"), { id: toastId });
  } catch (err) {
    if (newTab && !newTab.closed) {
      try {
        newTab.close();
      } catch {}
    }
    const errorMsg = await extractErrorMessage(
      err,
      tr("تعذر استخراج تقرير الـ PDF. يرجى المحاولة مرة أخرى.", "Could not generate the PDF. Please try again.")
    );
    toast.error(errorMsg, { id: toastId });
    throw err;
  }
}
