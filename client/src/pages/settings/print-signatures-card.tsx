import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Eye, ImagePlus, Loader2, PenLine, Plus, Save, Stamp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppleIcon } from "@/components/common/apple-icon";
import {
  settingsApi,
  type PrintSignaturesSettings,
  type SignatureDocument,
} from "@/api/settings";
import { openPdfInNewTab } from "@/lib/download";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AuthedFileImage } from "@/components/common/authed-file-image";
import { filesApi } from "@/api/files";
import { AssetUploadCard } from "./settings-page";

const DOCS: { id: SignatureDocument; ar: string; en: string }[] = [
  { id: "report", ar: "التقارير", en: "Reports" },
  { id: "voucher", ar: "سند الصرف", en: "Payment voucher" },
  { id: "profile", ar: "ملف الموظف", en: "Employee profile" },
];
const MAX_BOXES = 3;

/** Upload/replace/remove the image printed on a signature box's name line. */
function NameImagePicker({
  fileId,
  onChange,
  disabled,
  isRtl,
}: {
  fileId?: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  isRtl: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [inputId] = useState(() => `name-img-${Math.random().toString(36).slice(2)}`);

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await filesApi.upload(file, "signature-name");
      onChange(uploaded.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input id={inputId} type="file" accept=".png,.jpg,.jpeg,.svg" className="hidden" disabled={disabled} onChange={(e) => upload(e.target.files?.[0])} />
      {fileId ? (
        <div className="flex h-10 min-w-[96px] max-w-[160px] items-center justify-center rounded-xl border border-border/70 bg-white px-2">
          <AuthedFileImage fileId={fileId} alt={isRtl ? "صورة الاسم" : "Name image"} className="max-h-8 max-w-full object-contain" />
        </div>
      ) : null}
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/50",
          (disabled || uploading) && "pointer-events-none opacity-50"
        )}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
        {fileId ? (isRtl ? "تغيير" : "Replace") : isRtl ? "رفع صورة الاسم" : "Upload name image"}
      </label>
      {fileId && (
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(null)} className="h-10 rounded-xl text-xs text-destructive hover:bg-destructive/10">
          {isRtl ? "إزالة" : "Remove"}
        </Button>
      )}
    </div>
  );
}

/** Signature boxes, seal text, and the stamp image used at the end of every
 * printed document. */
export function PrintSignaturesCard({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings", "print-signatures"], queryFn: settingsApi.getPrintSignatures });
  const [form, setForm] = useState<PrintSignaturesSettings | null>(null);
  const [doc, setDoc] = useState<SignatureDocument>("report");
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (data) setForm(structuredClone(data));
  }, [data]);

  const dirty = !!form && !!data && JSON.stringify(form) !== JSON.stringify(data);

  const save = useMutation({
    mutationFn: (input: PrintSignaturesSettings) => settingsApi.updatePrintSignatures(input),
    onSuccess: (res) => {
      queryClient.setQueryData(["settings", "print-signatures"], res.data);
      toast.success(res.message);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading || !form) {
    return (
      <Card className="rounded-2xl border border-border/80 shadow-sm">
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const current = form.signatures[doc];
  const update = (fn: (draft: PrintSignaturesSettings) => void) =>
    setForm((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });

  async function preview() {
    setPreviewing(true);
    try {
      // The preview is a report, rendered with the saved settings.
      const theme = await settingsApi.getPrintTheme();
      await openPdfInNewTab("/settings/print-theme/preview", { theme }, "print-signatures.pdf");
    } catch {
      // openPdfInNewTab already reported it
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <Card className="rounded-2xl border border-border/80 shadow-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-3">
          <AppleIcon icon={Stamp} tone="amber" size="sm" />
          <div>
            <CardTitle className="text-lg font-bold">{isRtl ? "التوقيعات والختم" : "Signatures & Seal"}</CardTitle>
            <CardDescription className="text-xs">
              {isRtl
                ? "خانات التوقيع والختم اللي في آخر كل مستند مطبوع. تقدر تغيّر عناوينها وترفع صورة الاسم لكل خانة، وترفع صورة ختم الشركة. التوقيع بيتعمل بخط اليد، والتاريخ بيتكتب تلقائياً بتاريخ يوم الطباعة."
                : "The signature boxes and seal at the end of every printed document. Rename each box and upload its name image, and upload the company stamp. Signatures are signed by hand; the date is filled in with the print date."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Show / hide */}
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["showSignatures", isRtl ? "إظهار خانات التوقيع" : "Show signature boxes", isRtl ? "خانات الاسم والتوقيع والتاريخ" : "Name, signature and date boxes"],
              ["showSeal", isRtl ? "إظهار الختم" : "Show the seal", isRtl ? "الختم المرسوم أو صورة ختم الشركة" : "The drawn seal or the uploaded stamp"],
            ] as const
          ).map(([key, label, hint]) => (
            <label key={key} htmlFor={`sig-${key}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 cursor-pointer">
              <div>
                <div className="text-sm font-bold">{label}</div>
                <div className="text-xs text-muted-foreground">{hint}</div>
              </div>
              <Switch
                id={`sig-${key}`}
                checked={form.signatures[key]}
                disabled={!canEdit}
                onCheckedChange={(v) => update((d) => void (d.signatures[key] = v))}
              />
            </label>
          ))}
        </div>

        {/* Stamp image */}
        <div className="grid gap-4">
          <AssetUploadCard
            badge={isRtl ? "ختم الشركة" : "Company stamp"}
            title={isRtl ? "صورة ختم الشركة" : "Company stamp image"}
            subtitle={isRtl ? "لو رفعتها هتظهر مكان الختم المرسوم في كل المطبوعات" : "Replaces the drawn seal on every print"}
            aspectHint={isRtl ? "صورة PNG بخلفية شفافة" : "PNG with a transparent background"}
            previewType="logo"
            fileId={form.stampFileId}
            module="company-stamp"
            isPublic={false}
            onUploaded={(fid) => update((d) => void (d.stampFileId = fid))}
            onRemoved={() => update((d) => void (d.stampFileId = null))}
            disabled={!canEdit}
            isRtl={isRtl}
          />
        </div>

        {/* Per-document texts */}
        <div className="space-y-4 rounded-2xl border border-border/70 p-4">
          <div className="flex flex-wrap gap-2" role="tablist">
            {DOCS.map((d) => (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={doc === d.id}
                onClick={() => setDoc(d.id)}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors",
                  doc === d.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {isRtl ? d.ar : d.en}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <PenLine className="h-4 w-4 text-muted-foreground" />
              {isRtl ? "خانات التوقيع" : "Signature boxes"}
              <span className="text-xs font-normal text-muted-foreground">
                {isRtl ? `(حتى ${MAX_BOXES} خانات، والختم بيتحط قبل آخر خانة)` : `(up to ${MAX_BOXES}; the seal sits before the last one)`}
              </span>
            </div>
            {current.boxes.map((b, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end rounded-xl border border-border/60 p-3">
                <div className="space-y-1">
                  <Label htmlFor={`box-${doc}-${i}-ar`} className="text-xs">{isRtl ? `الخانة ${i + 1} (عربي)` : `Box ${i + 1} (Arabic)`}</Label>
                  <Input
                    id={`box-${doc}-${i}-ar`}
                    value={b.ar}
                    disabled={!canEdit}
                    onChange={(e) => update((d) => void (d.signatures[doc].boxes[i].ar = e.target.value))}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`box-${doc}-${i}-en`} className="text-xs">{isRtl ? "بالإنجليزي (اختياري)" : "English (optional)"}</Label>
                  <Input
                    id={`box-${doc}-${i}-en`}
                    dir="ltr"
                    value={b.en}
                    disabled={!canEdit}
                    onChange={(e) => update((d) => void (d.signatures[doc].boxes[i].en = e.target.value))}
                    className="h-10 rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!canEdit}
                  onClick={() => update((d) => void d.signatures[doc].boxes.splice(i, 1))}
                  className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10"
                  aria-label={isRtl ? "حذف الخانة" : "Remove box"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="space-y-1 sm:col-span-3">
                  <span className="text-xs text-muted-foreground">{isRtl ? "صورة الاسم (بتظهر في سطر الاسم)" : "Name image (printed on the name line)"}</span>
                  <NameImagePicker
                    fileId={b.nameFileId}
                    disabled={!canEdit}
                    isRtl={isRtl}
                    onChange={(id) => update((d) => void (d.signatures[doc].boxes[i].nameFileId = id))}
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canEdit || current.boxes.length >= MAX_BOXES}
              onClick={() => update((d) => void d.signatures[doc].boxes.push({ ar: isRtl ? "اعتماد" : "Approval", en: "" }))}
              className="gap-1.5 rounded-xl text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {isRtl ? "إضافة خانة توقيع" : "Add a signature box"}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`seal-${doc}-ar`} className="text-xs">{isRtl ? "نص الختم (عربي)" : "Seal text (Arabic)"}</Label>
              <Input
                id={`seal-${doc}-ar`}
                value={current.sealAr.replace(/\n/g, " / ")}
                disabled={!canEdit}
                onChange={(e) => update((d) => void (d.signatures[doc].sealAr = e.target.value.replace(/\s*\/\s*/g, "\n")))}
                className="h-10 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">{isRtl ? "استخدم / لتقسيم النص على سطرين" : "Use / to split it over two lines"}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`seal-${doc}-en`} className="text-xs">{isRtl ? "نص الختم بالإنجليزي (اختياري)" : "Seal text in English (optional)"}</Label>
              <Input
                id={`seal-${doc}-en`}
                dir="ltr"
                value={current.sealEn}
                disabled={!canEdit}
                onChange={(e) => update((d) => void (d.signatures[doc].sealEn = e.target.value))}
                className="h-10 rounded-xl"
              />
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {isRtl ? "سطر التاريخ بيتكتب تلقائياً بتاريخ يوم الطباعة، وسطر التوقيع فاضي للتوقيع بخط اليد." : "The date line is filled in with the print date; the signature line is left blank for signing by hand."}
          </p>
          {form.stampFileId && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {isRtl ? "نص الختم مش هيظهر لأنك رافع صورة ختم الشركة، والصورة هي اللي بتتطبع." : "The seal text is not printed while a stamp image is uploaded."}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" className="gap-1.5 rounded-xl" disabled={previewing || dirty} onClick={preview} title={dirty ? (isRtl ? "احفظ الأول عشان تعاين" : "Save first to preview") : undefined}>
            {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            {isRtl ? "معاينة على تقرير" : "Preview on a report"}
          </Button>
          <Button
            type="button"
            className="gap-1.5 rounded-xl"
            disabled={!canEdit || !dirty || save.isPending || DOCS.some((d) => form.signatures[d.id].boxes.some((b) => !b.ar.trim()))}
            onClick={() => save.mutate(form)}
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isRtl ? "حفظ التوقيعات والختم" : "Save signatures & seal"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
