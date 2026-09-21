import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { filesApi } from "@/api/files";
import { getErrorMessage } from "@/lib/api";
import { toast } from "sonner";

interface FileUploadProps {
  fileId?: string | null;
  fileName?: string | null;
  module?: string;
  onUploaded: (fileId: string, fileName: string) => void;
  onRemoved: () => void;
}

export function FileUpload({ fileId, fileName, module, onUploaded, onRemoved }: FileUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setIsUploading(true);
    try {
      const uploaded = await filesApi.upload(file, module);
      onUploaded(uploaded.id, uploaded.originalName);
      toast.success("File uploaded successfully.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  if (fileId) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <a href={filesApi.downloadUrl(fileId)} target="_blank" rel="noreferrer" className="flex-1 truncate text-accent hover:underline">
          {fileName ?? "View file"}
        </a>
        <Button type="button" variant="ghost" size="icon" onClick={onRemoved}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {t("common.import", { defaultValue: "Upload file" })}
      </Button>
    </div>
  );
}
