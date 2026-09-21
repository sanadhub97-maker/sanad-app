import { useEffect, useState } from "react";
import { filesApi } from "@/api/files";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

interface AuthedFileImageProps {
  fileId?: string | null;
  alt: string;
  className?: string;
  isPublic?: boolean;
  previewUrl?: string | null;
}

/** Renders an uploaded file as an <img>.
 * Supports public assets (/api/files/public/:id), local file previews,
 * and authenticated downloads converted to persistent Data URLs (immune to CSP & revocation). */
export function AuthedFileImage({
  fileId,
  alt,
  className,
  isPublic = false,
  previewUrl,
}: AuthedFileImageProps) {
  const [src, setSrc] = useState<string | null>(() => {
    if (previewUrl) return previewUrl;
    if (!fileId) return null;
    if (isPublic) return filesApi.getPublicUrl(fileId);
    return null;
  });
  const [failed, setFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !previewUrl && Boolean(fileId));

  useEffect(() => {
    if (previewUrl) {
      setSrc(previewUrl);
      setFailed(false);
      setIsLoading(false);
      return;
    }

    if (!fileId) {
      setSrc(null);
      setFailed(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setFailed(false);

    // If marked public, direct URL is fastest & naturally cached by browser
    if (isPublic) {
      setSrc(filesApi.getPublicUrl(fileId));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Use persistent Data URL for authenticated downloads
    filesApi
      .fetchDataUrl(fileId)
      .then((dataUrl) => {
        if (cancelled) return;
        setSrc(dataUrl);
        setIsLoading(false);
      })
      .catch(() => {
        // Fallback to public route in case asset is public
        if (!cancelled) {
          setSrc(filesApi.getPublicUrl(fileId));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileId, isPublic, previewUrl]);

  if (failed || (!src && !isLoading)) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-2 rounded-lg bg-muted/30 text-muted-foreground border border-dashed border-border/60",
          className
        )}
      >
        <ImageIcon className="h-5 w-5 opacity-40 mb-1 shrink-0" />
        <span className="text-[10px] font-medium text-center line-clamp-1 opacity-70 px-1">{alt}</span>
      </div>
    );
  }

  if (isLoading && !src) {
    return <span className={cn("block animate-pulse rounded bg-muted/60", className)} />;
  }

  return (
    <img
      src={src ?? undefined}
      alt={alt}
      className={className}
      onError={() => {
        // If it was already using the public URL or data URL and failed, mark failed
        if (fileId && src !== filesApi.getPublicUrl(fileId)) {
          setSrc(filesApi.getPublicUrl(fileId));
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
