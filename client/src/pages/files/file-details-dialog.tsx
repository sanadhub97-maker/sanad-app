import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  FileImage,
  FileCode,
  Download,
  ExternalLink,
  Trash2,
  Calendar,
  User,
  HardDrive,
  Copy,
  FileType,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppleIcon } from "@/components/common/apple-icon";
import { filesApi, type FileMetaWithUploader } from "@/api/files";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export function fixFileName(name: string): string {
  try {
    if (/[\u00C0-\u00FF]/.test(name)) {
      const decoded = decodeURIComponent(escape(name));
      if (decoded) return decoded;
    }
  } catch {}
  return name;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileMetaWithUploader | null;
  onDelete?: (file: FileMetaWithUploader) => void;
}

export function FileDetailsDialog({ open, onOpenChange, file, onDelete }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const cleanName = file ? fixFileName(file.originalName) : "";
  const isImage = file?.mimeType?.startsWith("image/");
  const isPdf = file?.mimeType === "application/pdf";

  useEffect(() => {
    let active = true;
    if (open && file && isImage) {
      setIsLoadingPreview(true);
      filesApi
        .fetchBlobUrl(file.id)
        .then((url) => {
          if (active) setPreviewUrl(url);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setIsLoadingPreview(false);
        });
    } else {
      setPreviewUrl(null);
    }
    return () => {
      active = false;
    };
  }, [open, file, isImage]);

  if (!file) return null;

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(isAr ? "تم النسخ للحافظة" : "Copied to clipboard");
  }

  const iconTone = isImage
    ? ("blue" as const)
    : isPdf
    ? ("rose" as const)
    : ("indigo" as const);

  const FileIcon = isImage ? FileImage : isPdf ? FileText : FileCode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl rounded-3xl p-6">
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <AppleIcon icon={FileIcon} tone={iconTone} size="md" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground truncate" dir="auto">
                {cleanName}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
                  {formatSize(file.size)}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {file.mimeType}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Image Preview Box if image */}
          {isImage && (
            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-2 flex items-center justify-center min-h-[160px] max-h-[260px]">
              {isLoadingPreview ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isAr ? "جارٍ تحميل المعاينة..." : "Loading preview..."}
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt={cleanName}
                  className="max-h-[240px] max-w-full rounded-xl object-contain shadow-xs"
                />
              ) : (
                <p className="text-xs text-muted-foreground">{isAr ? "تعذر عرض المعاينة" : "Preview unavailable"}</p>
              )}
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* File Name */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <FileType className="h-3.5 w-3.5 text-primary" />
                  {t("files.table.fileName")}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(cleanName)}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                  title={isAr ? "نسخ اسم الملف" : "Copy name"}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <p className="text-sm font-bold text-foreground break-all" dir="auto">
                {cleanName}
              </p>
            </div>

            {/* File Size */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-blue-500" />
                {t("files.table.size")}
              </span>
              <p className="font-mono text-sm font-bold text-foreground">
                {formatSize(file.size)}
              </p>
            </div>

            {/* MIME Type */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileType className="h-3.5 w-3.5 text-purple-500" />
                {t("files.table.type")}
              </span>
              <p className="font-mono text-xs font-semibold text-foreground truncate">
                {file.mimeType}
              </p>
            </div>

            {/* Uploaded By */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-500" />
                {t("files.table.uploadedBy")}
              </span>
              <p className="text-sm font-semibold text-foreground truncate">
                {file.uploadedBy?.fullName || "—"}
              </p>
            </div>

            {/* Upload Date */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-500" />
                {t("files.table.uploadDate")}
              </span>
              <p className="font-mono text-xs font-semibold text-foreground">
                {formatDateTime(file.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 gap-2">
          {hasPermission("files.delete") && onDelete && (
            <Button
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
                onDelete(file);
              }}
              className="rounded-xl gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive me-auto"
            >
              <Trash2 className="h-4 w-4" />
              {t("common.delete")}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => filesApi.openInNewTab(file.id)}
            className="rounded-xl gap-1.5 font-semibold"
          >
            <ExternalLink className="h-4 w-4" />
            {isAr ? "معاينة / فتح" : "Open / Preview"}
          </Button>

          <Button
            onClick={() => filesApi.download(file.id, cleanName)}
            className="rounded-xl gap-1.5 font-semibold shadow-sm"
          >
            <Download className="h-4 w-4" />
            {t("common.download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
