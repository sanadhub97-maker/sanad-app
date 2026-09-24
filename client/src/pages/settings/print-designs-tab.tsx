import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Eye, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppleIcon } from "@/components/common/apple-icon";
import { settingsApi, type PrintThemeId } from "@/api/settings";
import { openPdfInNewTab } from "@/lib/download";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PrintSignaturesCard } from "./print-signatures-card";

type Layout = "classic" | "frame" | "band" | "spine-left" | "lattice" | "slant" | "spine-right";

interface Design {
  id: PrintThemeId;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  paper: string;
  accent: string;
  metal: string;
  layout: Layout;
  ink: 1 | 2 | 3;
}

// Keep in sync with server/src/services/printThemes.ts.
const DESIGNS: Design[] = [
  { id: "classic", nameAr: "الكلاسيكي", nameEn: "Classic", descAr: "التصميم الأصلي: رأس بسيط وجدول كحلي، مناسب للاستخدام اليومي.", descEn: "The original design: a simple header and navy table, for everyday use.", paper: "#ffffff", accent: "#1e293b", metal: "#c59a45", layout: "classic", ink: 1 },
  { id: "royal", nameAr: "الملكي", nameEn: "Royal", descAr: "كحلي ليلي وذهبي، إطار ذهبي مزدوج على كل صفحة، نقش أمان وعلامة مائية.", descEn: "Midnight navy and gold, a double gold frame on every page, security pattern and watermark.", paper: "#fbf8f1", accent: "#0a1a33", metal: "#b08d4c", layout: "frame", ink: 3 },
  { id: "emerald", nameAr: "الزمردي", nameEn: "Emerald", descAr: "أخضر زمردي وذهبي شمباني بزخرفة النجمة الثمانية الإسلامية.", descEn: "Emerald green and champagne gold with the eight-point Islamic star.", paper: "#fdfcf8", accent: "#0b3b33", metal: "#c2a062", layout: "band", ink: 2 },
  { id: "executive", nameAr: "التنفيذي الأسود", nameEn: "Black Executive", descAr: "أسود فحمي وشمباني، عمود جانبي بنقش أمان ورقم كبير ذهبي.", descEn: "Charcoal and champagne, a patterned side column and a large gold figure.", paper: "#ffffff", accent: "#121110", metal: "#c8ab74", layout: "spine-left", ink: 3 },
  { id: "burgundy", nameAr: "العنابي", nameEn: "Burgundy", descAr: "عنابي وذهبي عتيق، شرائط زخرفة متشابكة وميدالية مركزية للشعار.", descEn: "Wine and antique gold, interlaced lattice strips and a centred logo medallion.", paper: "#fcf9f3", accent: "#561022", metal: "#b3924f", layout: "lattice", ink: 2 },
  { id: "sapphire", nameAr: "الياقوتي", nameEn: "Sapphire", descAr: "أزرق ياقوتي وفضي بلاتيني، رأس مائل بشبكة ماسية وبطاقة عنوان عائمة.", descEn: "Sapphire blue and platinum, a slanted diamond-lattice header and a floating title card.", paper: "#ffffff", accent: "#0d2a63", metal: "#aeb7c4", layout: "slant", ink: 3 },
  { id: "bronze", nameAr: "البرونزي", nameEn: "Bronze", descAr: "بني قهوة وبرونزي، عمود مشربية جانبي وشعار في ميدالية برونزية.", descEn: "Espresso and bronze, a mashrabiya side column and a bronze logo medallion.", paper: "#faf6f0", accent: "#2e2019", metal: "#a8683c", layout: "spine-right", ink: 2 },
];

/** A small drawing of the page layout in the design's colours. */
function Thumb({ d }: { d: Design }) {
  const rows = Array.from({ length: 7 });
  const table = (
    <div className="space-y-[3px]">
      <div className="h-[7px] rounded-[1px]" style={{ background: d.accent }} />
      {rows.map((_, i) => (
        <div key={i} className="h-[5px] rounded-[1px]" style={{ background: i % 2 ? `${d.metal}22` : "#00000010" }} />
      ))}
    </div>
  );
  const title = <div className="mx-auto h-[6px] w-1/2 rounded-full" style={{ background: d.accent, opacity: 0.85 }} />;
  const sigs = (
    <div className="flex items-end justify-between gap-2 pt-1">
      <div className="h-[2px] flex-1" style={{ background: d.accent }} />
      <div className="h-4 w-4 rounded-full border-2" style={{ borderColor: d.metal }} />
      <div className="h-[2px] flex-1" style={{ background: d.accent }} />
    </div>
  );
  return (
    <div
      className="relative mx-auto aspect-[210/297] w-full max-w-[150px] overflow-hidden rounded-sm shadow-md ring-1 ring-black/10"
      style={{ background: d.paper }}
      aria-hidden
    >
      {d.layout === "frame" && <div className="absolute inset-[5px] border-[3px] border-double" style={{ borderColor: d.metal }} />}
      {d.layout === "spine-left" && <div className="absolute inset-y-0 left-0 w-[9px]" style={{ background: d.accent, boxShadow: `inset -1px 0 0 ${d.metal}` }} />}
      {d.layout === "spine-right" && <div className="absolute inset-y-0 right-0 w-[13px]" style={{ background: d.accent, boxShadow: `inset 1px 0 0 ${d.metal}` }} />}
      {d.layout === "lattice" && (
        <>
          <div className="absolute inset-x-0 top-0 h-[6px]" style={{ background: d.accent, borderBottom: `1px solid ${d.metal}` }} />
          <div className="absolute inset-x-0 bottom-0 h-[6px]" style={{ background: d.accent, borderTop: `1px solid ${d.metal}` }} />
        </>
      )}
      <div
        className={cn(
          "absolute inset-0 flex flex-col gap-[6px] p-[12px]",
          d.layout === "spine-left" && "pl-[16px]",
          d.layout === "spine-right" && "pr-[20px]"
        )}
      >
        {d.layout === "classic" && (
          <>
            <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${d.accent}, ${d.metal}, ${d.accent})` }} />
            <div className="flex items-center justify-between">
              <div className="h-[5px] w-1/2 rounded-full" style={{ background: d.accent }} />
              <div className="h-[9px] w-[18px] rounded-[2px] border" style={{ borderColor: "#cbd5e1" }} />
            </div>
            <div className="h-[10px] rounded-[2px] border" style={{ borderColor: "#cbd5e1", background: "#f1f5f9" }} />
          </>
        )}
        {(d.layout === "frame" || d.layout === "spine-left" || d.layout === "slant") && (
          <div
            className={cn("-mx-[12px] -mt-[12px] h-[34px]", d.layout === "frame" && "mx-[-4px] mt-[-4px]", d.layout === "spine-left" && "-ml-[7px]")}
            style={{
              background: d.layout === "slant" ? `linear-gradient(135deg, #081a3f, ${d.accent})` : d.accent,
              clipPath: d.layout === "slant" ? "polygon(0 0,100% 0,100% 75%,0 100%)" : undefined,
              borderBottom: d.layout === "frame" ? `2px solid ${d.metal}` : undefined,
            }}
          >
            <div className="flex h-full items-center justify-end gap-1.5 px-2">
              <div className="h-[4px] w-10 rounded-full" style={{ background: d.metal }} />
              <div className="h-3.5 w-3.5 rounded-full" style={{ background: d.metal }} />
            </div>
          </div>
        )}
        {d.layout === "band" && (
          <div className="-mx-[12px] -mt-[12px] flex h-[38px] flex-col items-center justify-center gap-1" style={{ background: d.accent, borderBottom: `2px solid ${d.metal}` }}>
            <div className="h-3 w-3 rotate-45 border" style={{ borderColor: d.metal }} />
            <div className="h-[3px] w-12 rounded-full" style={{ background: d.metal }} />
          </div>
        )}
        {d.layout === "lattice" && (
          <div className="mt-[4px] flex flex-col items-center gap-1">
            <div className="h-5 w-5 rounded-full border-[3px]" style={{ borderColor: d.metal }} />
            <div className="h-[4px] w-14 rounded-full" style={{ background: d.accent }} />
          </div>
        )}
        {d.layout === "spine-right" && (
          <div className="flex items-center justify-between border-b pb-1" style={{ borderColor: `${d.metal}55` }}>
            <div className="h-[5px] w-12 rounded-full" style={{ background: d.accent }} />
            <div className="h-[3px] w-6 rounded-full" style={{ background: d.metal }} />
          </div>
        )}
        {d.layout !== "classic" && title}
        {table}
        <div className="flex-1" />
        {sigs}
      </div>
    </div>
  );
}

export function PrintDesignsTab({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const queryClient = useQueryClient();
  const { data: current, isLoading } = useQuery({ queryKey: ["settings", "print-theme"], queryFn: settingsApi.getPrintTheme });
  const [previewing, setPreviewing] = useState<PrintThemeId | null>(null);

  const save = useMutation({
    mutationFn: (theme: PrintThemeId) => settingsApi.updatePrintTheme(theme),
    onSuccess: (res) => {
      queryClient.setQueryData(["settings", "print-theme"], res.data.theme);
      const d = DESIGNS.find((x) => x.id === res.data.theme);
      toast.success(isRtl ? `تم اعتماد تصميم الطباعة: ${d?.nameAr}` : `Print design set: ${d?.nameEn}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  async function preview(id: PrintThemeId) {
    setPreviewing(id);
    try {
      await openPdfInNewTab("/settings/print-theme/preview", { theme: id }, `print-design-${id}.pdf`);
    } catch {
      // openPdfInNewTab already reported it
    } finally {
      setPreviewing(null);
    }
  }

  return (
    <div className="space-y-6">
    <Card className="rounded-2xl border border-border/80 shadow-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-3">
          <AppleIcon icon={Printer} tone="indigo" size="sm" />
          <div>
            <CardTitle className="text-lg font-bold">{isRtl ? "تصميم الطباعة" : "Print Design"}</CardTitle>
            <CardDescription className="text-xs">
              {isRtl
                ? "اختر شكل كل المطبوعات الرسمية: التقارير وسند الصرف وملف الموظف. كل التصميمات A4 طولي، وزر المعاينة يطبع تقرير المؤسسات الفعلي بالتصميم."
                : "Choose the look of every official print: reports, payment vouchers and employee profiles. All designs are A4 portrait; Preview prints your real establishments report in that design."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {DESIGNS.map((d) => {
              const selected = current === d.id;
              return (
                <div
                  key={d.id}
                  className={cn(
                    "relative flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-shadow",
                    selected ? "border-primary ring-2 ring-primary/30 shadow-md" : "border-border/80 hover:shadow-sm"
                  )}
                >
                  {selected && (
                    <span className="absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      <Check className="h-3 w-3" />
                      {isRtl ? "المعتمد" : "In use"}
                    </span>
                  )}
                  <div className="rounded-xl bg-muted/40 py-4">
                    <Thumb d={d} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-sm">{isRtl ? d.nameAr : d.nameEn}</h3>
                      <div className="flex gap-1" aria-hidden>
                        {[d.accent, d.metal, d.paper].map((c) => (
                          <span key={c} className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{isRtl ? d.descAr : d.descEn}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isRtl ? "استهلاك الحبر: " : "Ink use: "}
                      <span className="font-semibold text-foreground">
                        {isRtl ? ["منخفض", "متوسط", "عالي"][d.ink - 1] : ["Low", "Medium", "High"][d.ink - 1]}
                      </span>
                    </p>
                  </div>
                  <div className="mt-auto flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 rounded-xl text-xs"
                      disabled={previewing !== null}
                      onClick={() => preview(d.id)}
                    >
                      {previewing === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                      {isRtl ? "معاينة PDF" : "Preview PDF"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 gap-1.5 rounded-xl text-xs"
                      disabled={!canEdit || selected || save.isPending}
                      onClick={() => save.mutate(d.id)}
                    >
                      {save.isPending && save.variables === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      {selected ? (isRtl ? "مستخدم حالياً" : "In use") : isRtl ? "اعتماد التصميم" : "Use this design"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
    <PrintSignaturesCard canEdit={canEdit} isRtl={isRtl} />
    </div>
  );
}
