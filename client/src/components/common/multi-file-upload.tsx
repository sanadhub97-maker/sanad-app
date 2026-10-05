import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "./file-upload";
import { filesApi } from "@/api/files";
import { getErrorMessage } from "@/lib/api";
import { tr } from "@/i18n";
import { toast } from "sonner";

export function MultiFileUpload({ fileIds, onChange, onBusyChange }: { fileIds: string[]; onChange: (ids: string[]) => void; onBusyChange: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  async function upload(files: File[]) {
    if (!files.length || busy) return;
    if (fileIds.length + files.length > 20) { toast.error(tr("الحد الأقصى 20 مرفقًا", "Maximum 20 attachments")); return; }
    setBusy(true); onBusyChange(true);
    const ids = [...fileIds];
    try {
      for (const file of files) {
        const uploaded = await filesApi.upload(file, "payment");
        ids.push(uploaded.id);
        setNames(previous => ({ ...previous, [uploaded.id]: uploaded.originalName }));
        onChange([...ids]);
      }
      toast.success(tr("تم رفع المرفقات", "Attachments uploaded"));
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setBusy(false); onBusyChange(false); if (input.current) input.current.value = ""; }
  }
  return <div className="space-y-2">
    {fileIds.map((id, index) => <div key={id} className={busy ? "pointer-events-none opacity-70" : ""}><FileUpload fileId={id} fileName={names[id] ?? tr(`مرفق ${index + 1}`, `Attachment ${index + 1}`)} onUploaded={() => undefined} onRemoved={() => onChange(fileIds.filter(value => value !== id))} /></div>)}
    <input ref={input} type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={event => void upload(Array.from(event.target.files ?? []))} />
    <Button type="button" variant="outline" size="sm" disabled={busy || fileIds.length >= 20} onClick={() => input.current?.click()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{tr("إضافة مرفقات", "Add attachments")}</Button>
    <p className="text-xs text-muted-foreground">{fileIds.length} / 20 · {tr("يمكن اختيار عدة ملفات مرة واحدة", "Select multiple files at once")}</p>
  </div>;
}
