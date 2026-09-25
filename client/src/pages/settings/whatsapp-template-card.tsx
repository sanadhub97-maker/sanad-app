import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppleIcon } from "@/components/common/apple-icon";
import { settingsApi, type WhatsappPreviewState, type WhatsappTemplateId } from "@/api/settings";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { WhatsappText } from "./whatsapp-text";

const DESIGNS: { id: WhatsappTemplateId; nameAr: string; nameEn: string; descAr: string; descEn: string }[] = [
  {
    id: "classic",
    nameAr: "الرسمي",
    nameEn: "Classic",
    descAr: "خطاب مرتب: كل بيان في سطر، والحالة في النهاية.",
    descEn: "A tidy letter: one detail per line, the status last.",
  },
  {
    id: "card",
    nameAr: "البطاقة",
    nameEn: "Card",
    descAr: "اسم المنشأة داخل إطار، والبيانات تحته في نقاط.",
    descEn: "The company in a frame, the details as a list below.",
  },
  {
    id: "compact",
    nameAr: "المختصر",
    nameEn: "Compact",
    descAr: "ثلاثة أسطر تُقرأ من الإشعار دون فتح الرسالة.",
    descEn: "Three lines, readable straight from the notification.",
  },
  {
    id: "priority",
    nameAr: "حسب الأولوية",
    nameEn: "Priority",
    descAr: "درجة الاستعجال أولاً، وشريط ملوّن يمتلئ كلما اقترب التاريخ.",
    descEn: "Urgency first, with a coloured bar that fills as the date nears.",
  },
  {
    id: "bilingual",
    nameAr: "ثنائي اللغة",
    nameEn: "Bilingual",
    descAr: "عربي وإنجليزي في الرسالة نفسها.",
    descEn: "Arabic and English in the same message.",
  },
];

const STATES: { id: WhatsappPreviewState; ar: string; en: string; dot: string }[] = [
  { id: "expired", ar: "منتهية", en: "Expired", dot: "bg-red-500" },
  { id: "week", ar: "باقي 7 أيام", en: "7 days left", dot: "bg-orange-500" },
  { id: "month", ar: "باقي 30 يومًا", en: "30 days left", dot: "bg-yellow-500" },
];

/** Settings → WhatsApp: the design of the expiry alert, previewed on a real document. */
export function WhatsappTemplateCard({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings", "whatsapp", "template"], queryFn: settingsApi.getWhatsappTemplate });
  const [choice, setChoice] = useState<WhatsappTemplateId | null>(null);
  const [state, setState] = useState<WhatsappPreviewState>("week");
  useEffect(() => {
    if (data) setChoice(data.template);
  }, [data]);

  const save = useMutation({
    mutationFn: (template: WhatsappTemplateId) => settingsApi.updateWhatsappTemplate(template),
    onSuccess: (res) => {
      queryClient.setQueryData(["settings", "whatsapp", "template"], data && { ...data, template: res.data.template });
      const d = DESIGNS.find((x) => x.id === res.data.template);
      toast.success(isRtl ? `تم اعتماد تصميم الرسالة: ${d?.nameAr}` : `Message design set: ${d?.nameEn}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const dirty = data != null && choice != null && choice !== data.template;

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-xl dark:border-white/10">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />
      <CardHeader className="pb-4 border-b border-border/60 bg-muted/20 dark:bg-slate-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AppleIcon icon={MessageSquareText} tone="emerald" size="md" />
            <div>
              <CardTitle className="text-base font-black tracking-tight text-foreground">
                {isRtl ? "تصميم رسالة التنبيه" : "Alert message design"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {data && !data.sampleIsReal
                  ? isRtl
                    ? "المعاينة ببيانات مثال، لأنه لا توجد وثائق مسجلة بعد."
                    : "Previews use example data, as no documents are recorded yet."
                  : isRtl
                    ? "المعاينة على أقرب وثيقة ستنتهي في النظام، كما ستصل على واتساب."
                    : "Previewed on the next document to expire, exactly as WhatsApp will show it."}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label={isRtl ? "حالة الوثيقة في المعاينة" : "Document state in the preview"}>
            <span className="text-[11px] font-bold text-muted-foreground">{isRtl ? "حالة الوثيقة:" : "Document:"}</span>
            <div className="inline-flex rounded-xl border border-border/70 bg-muted/40 p-0.5">
              {STATES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={state === s.id}
                  onClick={() => setState(s.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors",
                    state === s.id ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                  {isRtl ? s.ar : s.en}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {isLoading || !data ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isRtl ? "جاري تحميل المعاينة..." : "Loading previews..."}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-start" role="radiogroup" aria-label={isRtl ? "تصميم الرسالة" : "Message design"}>
            {DESIGNS.map((d) => {
              const selected = choice === d.id;
              const saved = data.template === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!canEdit}
                  onClick={() => setChoice(d.id)}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-2xl border text-start transition-all disabled:cursor-default",
                    selected
                      ? "border-emerald-500/70 ring-2 ring-emerald-500/25 shadow-md shadow-emerald-500/10"
                      : "border-border/70 hover:border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-foreground">{isRtl ? d.nameAr : d.nameEn}</span>
                        {saved && (
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-px text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {isRtl ? "المعتمد" : "In use"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground mt-0.5">{isRtl ? d.descAr : d.descEn}</p>
                    </div>
                    <span
                      className={cn(
                        "mt-0.5 h-5 w-5 shrink-0 rounded-full border flex items-center justify-center",
                        selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                  </div>

                  {/* WhatsApp chat: its own wallpaper and bubble colours in both themes.
                      Each line takes its own direction, as WhatsApp lays out Arabic and English lines. */}
                  <div className="flex-1 border-t border-border/50 bg-[#efeae2] dark:bg-[#0b141a] p-3" dir="rtl">
                    <div className="relative max-w-full rounded-lg rounded-tr-none bg-white dark:bg-[#202c33] px-2.5 pt-1.5 pb-4 text-[12.5px] leading-[1.6] text-[#111b21] dark:text-[#e9edef] shadow-sm whitespace-pre-wrap break-words text-start [unicode-bidi:plaintext]">
                      <WhatsappText text={data.previews[d.id][state]} />
                      <span className="absolute bottom-1 left-2 text-[10px] text-[#667781] dark:text-[#8696a0]" dir="ltr">
                        09:00
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isRtl
              ? "زر «اختبار» بجانب أي رقم في قائمة الأرقام يرسل الرسالة بالتصميم المعتمد. واتساب لا يدعم الألوان في النص، لذلك تظهر الحالة برموز ملونة 🔴🟠🟡."
              : "The Test button next to any number in the list sends the message in the design in use. WhatsApp text has no colours, so the state shows as coloured symbols 🔴🟠🟡."}
          </p>
          <Button
            type="button"
            disabled={!canEdit || !dirty || save.isPending}
            onClick={() => choice && save.mutate(choice)}
            className="rounded-xl h-11 px-8 bg-primary text-primary-foreground font-black text-xs shrink-0"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Check className="h-4 w-4 me-2" />}
            {isRtl ? "اعتماد التصميم" : "Use this design"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
