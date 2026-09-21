import { useEffect, useState } from "react";
import { filesApi } from "@/api/files";
import { cn } from "@/lib/utils";

interface AuthedFileImageProps {
  fileId: string;
  alt: string;
  className?: string;
}

/** Renders an uploaded file as an <img> — file downloads require the Bearer
 * access token, which a plain <img src> can't send, so this fetches the
 * bytes through the authenticated API client first (see filesApi.fetchBlobUrl). */
export function AuthedFileImage({ fileId, alt, className }: AuthedFileImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let blobUrl: string | null = null;
    let cancelled = false;
    setFailed(false);
    setSrc(null);

    filesApi
      .fetchBlobUrl(fileId)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        blobUrl = url;
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [fileId]);

  if (failed) {
    return <span className={cn("text-xs text-destructive", className)}>—</span>;
  }
  if (!src) {
    return <span className={cn("block animate-pulse rounded bg-muted", className)} />;
  }
  return <img src={src} alt={alt} className={className} />;
}
