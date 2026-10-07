import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { filesApi } from "@/api/files";
import { getErrorMessage } from "@/lib/api";
import { tr } from "@/i18n";
import { AuthedFileImage } from "@/components/common/authed-file-image";
import { initialsOf } from "@/components/royal/cards";
import "@/styles/custody.css";

/** The establishment's logo in its gold medallion, or its initials when it has none. */
export function BranchMedal({ fileId, name, className }: { fileId?: string | null; name: string; className?: string }) {
  return (
    <span className={`cu-medal ${fileId ? "" : "empty"} ${className ?? ""}`}>
      {fileId ? <AuthedFileImage fileId={fileId} alt={name} className="cu-medal-img" /> : <span className="cu-medal-ini">{initialsOf(name)}</span>}
    </span>
  );
}

/** Uploads the logo the establishment's employees' documents print with. */
export function BranchLogoField({ fileId, name, onChange }: { fileId?: string | null; name: string; onChange: (id: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error(tr("الشعار لازم يكون صورة PNG أو JPG", "The logo must be a PNG or JPG image"));
      return;
    }
    setBusy(true);
    try {
      const uploaded = await filesApi.upload(file, "branch-logo");
      onChange(uploaded.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="cu-logo-field">
      <BranchMedal fileId={fileId} name={name || "؟"} className="lg" />
      <div className="min-w-0 flex-1">
        <b className="block text-sm">{tr("شعار المؤسسة", "Establishment logo")}</b>
        <small className="block text-xs text-muted-foreground">
          {tr("بيتطبع على محاضر تسليم العهد وشهادات إخلاء الطرف لموظفين المؤسسة، ولون الترويسة بيتاخد منه. يفضّل PNG بخلفية شفافة.", "Printed on custody records and clearance certificates of this establishment's employees; the letterhead takes its colour. A PNG with a transparent background works best.")}
        </small>
        <div className="mt-2 flex flex-wrap gap-2">
          <input ref={input} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" className="cu-btn" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {fileId ? tr("تغيير الشعار", "Change logo") : tr("رفع الشعار", "Upload logo")}
          </button>
          {fileId && (
            <button type="button" className="cu-btn ghost" onClick={() => onChange(null)}>
              <Trash2 className="h-4 w-4" />
              {tr("إزالة", "Remove")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
