import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/* A PDF's first page as a small picture. The PDF library loads only when the
   first thumbnail is needed; each file is drawn once and kept for the session. */
const drawn = new Map<string, Promise<string>>();

async function firstPage(fileId: string): Promise<string> {
  const [pdfjs, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  // As a blob, like the other downloads (the API client hands an empty buffer otherwise).
  const res = await api.get(`/files/${fileId}/download`, { responseType: "blob" });
  const bytes = new Uint8Array(await (res.data as Blob).arrayBuffer());
  const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const view = page.getViewport({ scale: Math.min(2, 360 / base.width) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(view.width);
    canvas.height = Math.ceil(view.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: view }).promise;
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    void doc.destroy();
  }
}

export function PdfThumb({ fileId, alt, className, fallback }: { fileId: string; alt: string; className?: string; fallback: React.ReactNode }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    if (!drawn.has(fileId)) drawn.set(fileId, firstPage(fileId));
    drawn.get(fileId)!.then(
      (url) => live && setSrc(url),
      () => {
        drawn.delete(fileId);
        if (live) setFailed(true);
      }
    );
    return () => {
      live = false;
    };
  }, [fileId]);
  if (failed || !src) return <>{fallback}</>;
  return <img src={src} alt={alt} className={className} />;
}
