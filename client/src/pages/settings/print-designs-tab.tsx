import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ExternalLink, Eye, Loader2, Printer, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppleIcon } from "@/components/common/apple-icon";
import { settingsApi, type PrintThemeId } from "@/api/settings";
import { openPdfInNewTab } from "@/lib/download";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PrintSignaturesCard } from "./print-signatures-card";
import { PrintLivePreview, type PreviewDoc } from "./print-live-preview";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DESIGNS } from "@/pages/preview/print-design-catalog";

/** The actual print layout, loaded only when its card approaches the viewport. */
function Thumb({ d }: { d: (typeof DESIGNS)[number] }) {
  return <div className="relative mx-auto aspect-[210/297] w-[150px] max-w-full overflow-hidden bg-white shadow-md" aria-hidden><iframe title={d.nameAr} src={`/print-samples/${d.id}-report.html`} sandbox="" loading="lazy" tabIndex={-1} style={{ width: 794, height: 1123, border: 0, position: "absolute", top: 0, left: 0, transform: "scale(.1889)", transformOrigin: "top left", pointerEvents: "none" }} /></div>;
}

function useWide() {
  const q = "(min-width: 1024px)";
  const [wide, setWide] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(q).matches);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const f = () => setWide(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return wide;
}

export function PrintDesignsTab({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const queryClient = useQueryClient();
  const { data: current, isLoading } = useQuery({ queryKey: ["settings", "print-theme"], queryFn: settingsApi.getPrintTheme });
  const [picked, setPicked] = useState<PrintThemeId | null>(null);
  const [doc, setDoc] = useState<PreviewDoc>("report");
  const [filter, setFilter] = useState<"all" | "new">("all");
  const [sheet, setSheet] = useState(false);
  const [opening, setOpening] = useState(false);
  const wide = useWide();
  const shown = picked ?? current ?? "classic";
  const design = DESIGNS.find((x) => x.id === shown) ?? DESIGNS[0];

  const save = useMutation({
    mutationFn: (theme: PrintThemeId) => settingsApi.updatePrintTheme(theme),
    onSuccess: (res) => {
      queryClient.setQueryData(["settings", "print-theme"], res.data.theme);
      const d = DESIGNS.find((x) => x.id === res.data.theme);
      toast.success(isRtl ? `تم اعتماد تصميم الطباعة: ${d?.nameAr}` : `Print design set: ${d?.nameEn}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  async function openPdf() {
    setOpening(true);
    try {
      await openPdfInNewTab("/settings/print-theme/preview", { theme: shown, doc }, `print-design-${shown}.pdf`);
    } catch {
      // openPdfInNewTab already reported it
    } finally {
      setOpening(false);
    }
  }

  function pick(id: PrintThemeId) {
    setPicked(id);
    if (!wide) setSheet(true);
  }

  const docs: [PreviewDoc, string, string][] = [
    ["report", isRtl ? "تقرير" : "Report", "sky"],
    ["voucher", isRtl ? "سند صرف" : "Payment voucher", "violet"],
    ["profile", isRtl ? "ملف موظف" : "Employee profile", "indigo"],
  ];
  const list = DESIGNS.filter((d) => filter === "all" || d.fresh);
  const inUse = current === design.id;

  const head = (
    <div className="lu-pd-head">
      <div className="nm">
        <b>
          {isRtl ? design.nameAr : design.nameEn}
          {inUse && <span className="lu-chip lt-green ms-2 align-middle">{isRtl ? "المعتمد" : "In use"}</span>}
        </b>
        <small>{isRtl ? design.descAr : design.descEn}</small>
      </div>
      <Button variant="outline" className="h-10" onClick={openPdf} disabled={opening}>
        {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />} {isRtl ? "فتح PDF" : "Open PDF"}
      </Button>
      <Button className="h-10" disabled={!canEdit || inUse || save.isPending} onClick={() => save.mutate(design.id)}>
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {inUse ? (isRtl ? "مستخدم حاليًا" : "In use") : isRtl ? "اعتماد التصميم" : "Use this design"}
      </Button>
    </div>
  );
  const docChips = (
    <div className="lu-tools">
      {docs.map(([k, label, tone]) => (
        <button key={k} type="button" className={cn("lu-fchip", `lt-${tone}`, doc === k && "on")} onClick={() => setDoc(k)} aria-pressed={doc === k}>
          <i /> {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* overflow-visible: the preview panel stays pinned beside the list while it scrolls. */}
      <Card className="!overflow-visible rounded-2xl border border-border/80 shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <AppleIcon icon={Printer} tone="indigo" size="sm" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg font-bold">{isRtl ? "تصميم الطباعة" : "Print Design"}</CardTitle>
              <CardDescription className="text-xs">
                {isRtl
                  ? `${DESIGNS.length} تصميمًا لكل المطبوعات الرسمية: التقارير وسند الصرف وملف الموظف. اختر تصميمًا لتراه مطبوعًا ببياناتك الحقيقية في المعاينة الحية، ثم اعتمده.`
                  : `${DESIGNS.length} designs for every official print: reports, payment vouchers and employee profiles. Pick one to see it printed with your real data in the live preview, then use it.`}
              </CardDescription>
            </div>
            <div className="lu-tools">
              <a href="/print-templates" target="_blank" rel="noopener noreferrer" className="lu-fchip lt-sky">
                <Eye className="h-4 w-4" /> {isRtl ? "معرض كل القوالب" : "All templates gallery"}
              </a>
              <button type="button" className={cn("lu-fchip lt-sky", filter === "all" && "on")} onClick={() => setFilter("all")}>
                <i /> {isRtl ? `الكل ${DESIGNS.length}` : `All ${DESIGNS.length}`}
              </button>
              <button type="button" className={cn("lu-fchip lt-violet", filter === "new" && "on")} onClick={() => setFilter("new")}>
                <Sparkles className="h-4 w-4" /> {isRtl ? `الجديدة ${DESIGNS.filter(d => d.fresh).length}` : `New ${DESIGNS.filter(d => d.fresh).length}`}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="lu-pd">
              <div className="lu-pd-list">
                {list.map((d) => (
                  <button key={d.id} type="button" className={cn("lu-pd-card", shown === d.id && "sel")} onClick={() => pick(d.id)} aria-pressed={shown === d.id}>
                    {current === d.id ? <span className="tag use">{isRtl ? "المعتمد" : "In use"}</span> : d.fresh ? <span className="tag">{isRtl ? "جديد" : "New"}</span> : null}
                    <span className="th">
                      <Thumb d={d} />
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <b>{isRtl ? d.nameAr : d.nameEn}</b>
                      <span className="sw" aria-hidden>
                        {[d.accent, d.metal, d.paper].map((c) => (
                          <i key={c} style={{ background: c }} />
                        ))}
                      </span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {isRtl ? "الحبر: " : "Ink: "}
                      <b className="text-[11px] text-foreground">{isRtl ? ["منخفض", "متوسط", "عالٍ"][d.ink - 1] : ["Low", "Medium", "High"][d.ink - 1]}</b>
                      {!wide && (
                        <span className="ms-2 inline-flex items-center gap-1 text-primary">
                          <Eye className="h-3 w-3" /> {isRtl ? "معاينة" : "Preview"}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
              {wide && (
                <aside className="lu-pd-side">
                  {head}
                  {docChips}
                  <PrintLivePreview theme={shown} doc={doc} isAr={isRtl} />
                </aside>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!wide && (
        <Dialog open={sheet} onOpenChange={setSheet}>
          <DialogContent className="flex h-[92dvh] max-w-3xl flex-col gap-3 rounded-[26px] p-4">
            <DialogHeader>
              <DialogTitle className="sr-only">{isRtl ? "معاينة التصميم" : "Design preview"}</DialogTitle>
            </DialogHeader>
            {head}
            {docChips}
            <div className="min-h-0 flex-1">
              <PrintLivePreview theme={shown} doc={doc} isAr={isRtl} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <PrintSignaturesCard canEdit={canEdit} isRtl={isRtl} />
    </div>
  );
}
