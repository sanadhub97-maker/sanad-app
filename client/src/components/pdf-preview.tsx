import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePdfPreviewStore } from "@/stores/pdfPreviewStore";
import { useAuthStore } from "@/stores/authStore";
import { openPdfInNewTab } from "@/lib/download";
import { tr } from "@/i18n";

const PdfDocument = lazy(() => import("./pdf-preview-document"));
export function PdfPreview() {
  const { request, close } = usePdfPreviewStore();
  const userId = useAuthStore(s => s.user?.id);
  const previousUser = useRef(userId);
  useEffect(() => {
    if (previousUser.current !== userId) close();
    previousUser.current = userId;
  }, [userId, close]);
  const [printing, setPrinting] = useState(false);
  return <Dialog open={!!request} onOpenChange={open => { if (!open && !printing) close(); }}>
    <DialogContent className="flex h-[90vh] w-[96vw] max-w-6xl flex-col overflow-hidden" onEscapeKeyDown={e => { if (printing) e.preventDefault(); }}>
      <DialogTitle className="pe-8">{tr("معاينة وطباعة المستند", "Document preview & print")}</DialogTitle>
      <DialogDescription>{request?.filename}</DialogDescription>
      {request?.error ? <div role="alert" className="space-y-4 p-6 text-destructive"><p>{request.error}</p><Button variant="outline" onClick={() => void openPdfInNewTab(request.url, request.params, request.filename).catch(() => undefined)}>{tr("إعادة المحاولة", "Retry")}</Button></div>
        : request?.blob ? <Suspense fallback={<Loading />}><PdfDocument key={request.id} blob={request.blob} filename={request.filename} onPrinting={setPrinting} /></Suspense>
          : <Loading />}
    </DialogContent>
  </Dialog>;
}
function Loading() {
  return <div role="status" className="flex flex-1 items-center justify-center gap-3"><Loader2 className="h-5 w-5 animate-spin" />{tr("جاري تجهيز المستند…", "Preparing document…")}</div>;
}
