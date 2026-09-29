import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Minus, Plus, RotateCw } from "lucide-react";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PrintThemeId } from "@/api/settings";

/* The real PDF of a print design, drawn page by page with pdf.js inside the
   page, so what you see is exactly what prints — on every device, without
   opening a new tab. Each design/document pair is fetched once and kept. */

export type PreviewDoc = "report" | "voucher" | "profile";

type PdfJs = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfJs> | null = null;
function loadPdfJs() {
  pdfjsPromise ??= import("pdfjs-dist").then((m) => {
    m.GlobalWorkerOptions.workerSrc = workerUrl;
    return m;
  });
  return pdfjsPromise;
}

export function usePreviewPdf(theme: PrintThemeId | null, doc: PreviewDoc) {
  return useQuery({
    queryKey: ["print-preview", theme, doc],
    // Kept as a Blob: pdf.js takes over the bytes it is given, so each draw reads a fresh copy.
    queryFn: async () => (await api.get<Blob>("/settings/print-theme/preview", { params: { theme, doc, live: 1 }, responseType: "blob" })).data,
    enabled: Boolean(theme),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
}

export function PrintLivePreview({ theme, doc, isAr }: { theme: PrintThemeId | null; doc: PreviewDoc; isAr: boolean }) {
  const { data, isFetching, isError, refetch } = usePreviewPdf(theme, doc);
  const box = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pages, setPages] = useState(0);
  const [drawing, setDrawing] = useState(false);

  // Follow the panel's width so pages always fit.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // Small changes (a scrollbar coming and going) would redraw forever.
    const ro = new ResizeObserver(() => setWidth((w) => (Math.abs(el.clientWidth - w) > 24 ? el.clientWidth : w)));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!data || !width || !pagesRef.current) return;
    let cancelled = false;
    const host = pagesRef.current;
    setDrawing(true);
    (async () => {
      const pdfjs = await loadPdfJs();
      const bytes = new Uint8Array(await data.arrayBuffer());
      if (cancelled) return;
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      if (cancelled) return;
      setPages(pdf.numPages);
      const cssWidth = Math.max(240, (width - 28) * zoom);
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const canvases: HTMLCanvasElement[] = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${(viewport.height / dpr).toFixed(1)}px`;
        canvas.className = "lu-pv-page";
        canvas.style.setProperty("--k", String(n - 1));
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
        canvases.push(canvas);
        if (n === 1 && !cancelled) host.replaceChildren(canvas);
        else if (!cancelled) host.appendChild(canvas);
      }
      void pdf.destroy();
    })()
      .catch(() => undefined)
      .finally(() => !cancelled && setDrawing(false));
    return () => {
      cancelled = true;
    };
  }, [data, width, zoom]);

  // A different design or document starts at the top.
  useEffect(() => {
    box.current?.scrollTo({ top: 0 });
  }, [theme, doc]);

  const loading = (isFetching && !data) || (drawing && !pagesRef.current?.childElementCount);

  return (
    <div className="lu-pv">
      <div className="lu-pv-bar">
        <span className="lu-pv-state">
          {isFetching || drawing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {isAr ? "جارٍ تجهيز المعاينة الحية…" : "Preparing the live preview…"}
            </>
          ) : pages ? (
            <>
              <i className="live" /> {isAr ? `معاينة حية · ${pages} ${pages === 1 ? "صفحة" : "صفحات"}` : `Live preview · ${pages} page${pages === 1 ? "" : "s"}`}
            </>
          ) : null}
        </span>
        <span className="lu-pv-zoom">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))} aria-label={isAr ? "تصغير" : "Zoom out"}>
            <Minus />
          </button>
          <b className="lu-num">{Math.round(zoom * 100)}%</b>
          <button type="button" onClick={() => setZoom((z) => Math.min(2, +(z + 0.2).toFixed(1)))} aria-label={isAr ? "تكبير" : "Zoom in"}>
            <Plus />
          </button>
        </span>
      </div>
      <div ref={box} className={cn("lu-pv-scroll", zoom > 1 && "zoomed")}>
        {isError ? (
          <div className="lu-pv-empty">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <b>{isAr ? "تعذّر تجهيز المعاينة" : "Couldn't prepare the preview"}</b>
            <button type="button" className="lu-sbtn lt-sky" style={{ flex: "none", padding: "0 16px", color: "var(--c)" }} onClick={() => refetch()}>
              <RotateCw className="h-4 w-4" /> {isAr ? "إعادة المحاولة" : "Try again"}
            </button>
          </div>
        ) : (
          <>
            {loading && (
              <div className="lu-pv-skel" aria-hidden="true">
                <i className="h" />
                <i />
                <i />
                <i className="s" />
                <i />
                <i />
                <i className="s" />
              </div>
            )}
            <div ref={pagesRef} className={cn("lu-pv-pages", loading && "hidden", (isFetching || drawing) && "busy")} />
          </>
        )}
      </div>
    </div>
  );
}
