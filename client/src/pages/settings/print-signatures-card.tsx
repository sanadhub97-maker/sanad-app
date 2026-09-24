import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, Loader2, PenLine, Plus, Save, Stamp, Trash2 } from "lucide-react";
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
import { AssetUploadCard } from "./settings-page";

const DOCS: { id: SignatureDocument; ar: string; en: string }[] = [
  { id: "report", ar: "التقارير", en: "Reports" },
  { id: "voucher", ar: "سند الصرف", en: "Payment voucher" },
  { id: "profile", ar: "ملف الموظف", en: "Employee profile" },
];
const MAX_BOXES = 3;

/** Signature boxes, seal text, and the stamp/signature images used at the
 * end of every printed document. */
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
                ? "خانات التوقيع والختم اللي في آخر كل مستند مطبوع. تقدر تغيّر عناوينها لكل نوع مستند، وترفع صورة ختم الشركة وتوقيع المدير."
                : "The signature boxes and seal at the end of every printed document. Rename them per document type, and upload the company stamp and the manager's signature."}
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

        {/* Stamp and signature images */}
        <div className="grid gap-4 sm:grid-cols-2">
          <AssetUploadCard
            badge={isRtl ? "ختم الشركة" : "Company stamp"}
            title={isRtl ? "صورة ختم الشركة" : "Company stamp image"}
            subtitle={isRtl ? "لو رفعتها هتظهر مكان الختم المرسوم في كل المطبوعات" : "Replaces the drawn seal on every print"}
            aspectHint={isRtl ? "صورة PNG بخلفية شفافة" : "PNG with a transparent background"}
            previewType="logo"
            fileId={form.stampFileId}
            module="company-stamp"
            onUploaded={(fid) => update((d) => void (d.stampFileId = fid))}
            onRemoved={() => update((d) => void (d.stampFileId = null))}
            disabled={!canEdit}
            isRtl={isRtl}
          />
          <AssetUploadCard
            badge={isRtl ? "توقيع" : "Signature"}
            title={isRtl ? "صورة توقيع المدير" : "Manager's signature image"}
            subtitle={isRtl ? "بتظهر في آخر خانة توقيع (خانة الاعتماد)" : "Placed in the last (approval) box"}
            aspectHint={isRtl ? "صورة PNG بخلفية شفافة" : "PNG with a transparent background"}
            previewType="logo"
            fileId={form.signatureFileId}
            module="company-signature"
            onUploaded={(fid) => update((d) => void (d.signatureFileId = fid))}
            onRemoved={() => update((d) => void (d.signatureFileId = null))}
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
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
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
