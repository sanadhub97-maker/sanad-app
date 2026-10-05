import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { tr } from "@/i18n";
import { toast } from "sonner";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
export default function PdfDocument({ blob, filename, onPrinting }: { blob: Blob; filename: string; onPrinting: (value: boolean) => void }) {
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const printFrame = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    let disposed = false;
    let task: pdfjs.PDFDocumentLoadingTask | undefined;
    void blob.arrayBuffer().then(bytes => {
      if (disposed) return;
      task = pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false });
      return task.promise.then(doc => { if (!disposed) setPdf(doc); });
    }).catch(() => { if (!disposed) setError(tr("تعذر عرض محتوى PDF. أعد تجهيز الملف.", "Unable to display the PDF. Prepare it again.")); });
    return () => { disposed = true; void task?.destroy(); printFrame.current?.remove(); onPrinting(false); };
  }, [blob, onPrinting]);
  useEffect(() => {
    if (!pdf) return;
    let disposed = false;
    let render: pdfjs.RenderTask | undefined;
    const target = host.current;
    void pdf.getPage(page).then(p => {
      if (disposed || !target) return;
      const canvas = document.createElement("canvas");
      const view = p.getViewport({ scale: 1.5 });
      canvas.width = Math.ceil(view.width); canvas.height = Math.ceil(view.height);
      canvas.className = "mx-auto max-w-full h-auto bg-white shadow";
      render = p.render({ canvasContext: canvas.getContext("2d")!, viewport: view });
      return render.promise.then(() => { if (!disposed) target.replaceChildren(canvas); });
    }).catch(() => { if (!disposed) setError(tr("تعذر عرض الصفحة.", "Unable to display the page.")); });
    return () => { disposed = true; render?.cancel(); };
  }, [pdf, page]);

  async function print() {
    if (!pdf || busy) return;
    setBusy(true); onPrinting(true);
    // A same-origin hidden frame prints the PDF pages without opening a tab.
    // PDF.js also works where native PDF browser plugins are unavailable.
    const frame = document.createElement("iframe");
    frame.title = tr("مستند الطباعة", "Print document");
    frame.style.cssText = "position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0";
    document.body.appendChild(frame); printFrame.current = frame;
    const cleanup = () => { frame.remove(); if (printFrame.current === frame) printFrame.current = null; setBusy(false); onPrinting(false); };
    try {
      const doc = frame.contentDocument!;
      const style = doc.createElement("style");
      style.textContent = "body{margin:0} section{break-after:page} section:last-child{break-after:auto} img{display:block;width:100%;height:100%}";
      doc.head.appendChild(style);
      doc.title = filename;
      for (let n = 1; n <= pdf.numPages; n++) {
        const p = await pdf.getPage(n);
        const size = p.getViewport({ scale: 1 });
        const view = p.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(view.width); canvas.height = Math.ceil(view.height);
        await p.render({ canvasContext: canvas.getContext("2d")!, viewport: view }).promise;
        style.textContent += `@page sheet${n}{size:${size.width}pt ${size.height}pt;margin:0}`;
        const section = doc.createElement("section");
        section.style.cssText = `page:sheet${n};width:${size.width}pt;height:${size.height}pt`;
        const image = doc.createElement("img"); image.src = canvas.toDataURL("image/png");
        section.appendChild(image); doc.body.appendChild(section);
        await image.decode(); canvas.width = 0; canvas.height = 0;
      }
      frame.contentWindow!.addEventListener("afterprint", cleanup, { once: true });
      frame.contentWindow!.focus(); frame.contentWindow!.print();
    } catch {
      cleanup(); toast.error(tr("تعذر فتح الطباعة. حاول مرة أخرى أو حمّل PDF.", "Unable to start printing. Retry or download the PDF."));
    }
  }
  function download() {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  return <>
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled={!pdf || busy || !!error} onClick={() => void print()}>{busy ? tr("جاري تجهيز الطباعة…", "Preparing print…") : tr("طباعة", "Print")}</Button>
      <Button variant="outline" onClick={download}>{tr("تحميل PDF", "Download PDF")}</Button>
      <Button variant="outline" disabled={page <= 1 || busy} onClick={() => setPage(p => p - 1)}>{tr("السابق", "Previous")}</Button>
      <span>{page} / {pdf?.numPages ?? "…"}</span>
      <Button variant="outline" disabled={!pdf || page >= pdf.numPages || busy} onClick={() => setPage(p => p + 1)}>{tr("التالي", "Next")}</Button>
    </div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div ref={host} className="min-h-0 flex-1 overflow-auto rounded-xl bg-muted p-3" aria-label={tr("معاينة PDF", "PDF preview")} />
  </>;
}
