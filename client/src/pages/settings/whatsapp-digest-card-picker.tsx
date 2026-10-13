import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppleIcon } from "@/components/common/apple-icon";
import { settingsApi, type DigestCardSetting } from "@/api/settings";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { WhatsappText } from "./whatsapp-text";

const DESIGNS: { id: Exclude<DigestCardSetting, "none">; nameAr: string; nameEn: string; descAr: string; descEn: string }[] = [
  { id: "noir", nameAr: "الملكي الأسود", nameEn: "Royal noir", descAr: "أسود مخملي ودهبي، بنفس تصميم الموقع.", descEn: "Black velvet and gold, as the site." },
  { id: "ivory", nameAr: "العاجي التنفيذي", nameEn: "Ivory", descAr: "ورق عاجي بالكحلي والدهبي، شكل تقرير مطبوع.", descEn: "Ivory paper with navy and gold." },
  { id: "emerald", nameAr: "الزمردي", nameEn: "Emerald", descAr: "أخضر زمردي عميق بلمسات دهبي.", descEn: "Deep emerald with gold." },
  { id: "sapphire", nameAr: "الياقوتي", nameEn: "Sapphire", descAr: "كحلي ليلي بالفضي، هادي ورسمي.", descEn: "Midnight navy with silver." },
];

/** The server's page for one design, drawn at WhatsApp size and shrunk to the column, as tall as its content. */
function Shot({ html, width, maxHeight }: { html: string; width: number; maxHeight?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.3);
  const [height, setHeight] = useState(1800);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  const measure = () => {
    const doc = frame.current?.contentDocument;
    if (doc) setHeight(doc.documentElement.scrollHeight || 1800);
  };
  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-lg" style={{ height: Math.min(height * scale, maxHeight ?? Infinity) }}>
      {/* No scripts in the page; same-origin only so its height can be read. */}
      <iframe
        ref={frame}
        title="preview"
        srcDoc={html}
        sandbox="allow-same-origin"
        scrolling="no"
        onLoad={() => {
          measure();
          setTimeout(measure, 800);
        }}
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width, height, transform: `scale(${scale})` }}
      />
    </div>
  );
}

/** Settings → WhatsApp: the picture of the morning summary, live on today's documents and open tasks. */
export function WhatsappDigestCardPicker({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useQuery({ queryKey: ["settings", "whatsapp", "digest-cards"], queryFn: settingsApi.getWhatsappDigestCards, refetchInterval: 120_000 });
  const [choice, setChoice] = useState<DigestCardSetting | null>(null);
  useEffect(() => {
    if (data && choice === null) setChoice(data.card);
  }, [data, choice]);
  const save = useMutation({
    mutationFn: (card: DigestCardSetting) => settingsApi.updateWhatsappDigestCard(card),
    onSuccess: (res) => {
      queryClient.setQueryData(["settings", "whatsapp", "digest-cards"], (old: typeof data) => old && { ...old, card: res.data.card });
      toast.success(res.message);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
  const dirty = data != null && choice != null && choice !== data.card;
  const shown = DESIGNS.find((d) => d.id === choice) ?? DESIGNS[0];

  return (
    <Card className="overflow-hidden rounded-3xl">
      <CardHeader className="border-b border-border/40">
        <div className="flex flex-wrap items-center gap-3">
          <AppleIcon icon={ImageIcon} tone="amber" size="md" />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-black">{isRtl ? "صورة الملخص اليومي — معاينة حية" : "Daily summary picture — live preview"}</CardTitle>
            <CardDescription className="text-xs">
              {isRtl
                ? "كل صباح الساعة 8 يتبعت الملخص صورة مصممة ومعاها سطرين. المعاينة ببياناتك الحقيقية دلوقتي وبتتحدّث لوحدها."
                : "Each morning at 8 the summary goes out as a designed picture with a short caption. Previewed live on your real data."}
            </CardDescription>
          </div>
          <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            {isRtl ? "تحديث" : "Refresh"}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {data && !data.canSendCards && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">
            {isRtl ? "الصور بتتبعت من الرقم المربوط برمز QR بس؛ مع أي مزوّد تاني بتتبعت الرسالة النصية." : "Pictures go out from the QR-linked number only; other providers send the text."}
          </p>
        )}
        {isLoading || !data ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="radiogroup">
              {DESIGNS.map((d) => {
                const selected = choice === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!canEdit}
                    onClick={() => setChoice(d.id)}
                    className={cn("flex flex-col gap-2 rounded-2xl border p-2.5 text-start transition-all disabled:cursor-default", selected ? "border-amber-400/80 ring-2 ring-amber-400/30" : "border-border/70 hover:border-border")}
                  >
                    <Shot html={data.cards[d.id]} width={data.width} maxHeight={170} />
                    <div className="flex items-center justify-between gap-2 px-1">
                      <span className="text-sm font-black">{isRtl ? d.nameAr : d.nameEn}</span>
                      {data.card === d.id ? (
                        <span className="rounded-full border border-amber-400/40 px-2 py-px text-[10px] font-bold text-amber-300">{isRtl ? "المعتمد" : "In use"}</span>
                      ) : (
                        selected && <Check className="h-4 w-4 text-amber-300" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {choice !== "none" && (
              <div className="rounded-2xl bg-[#0b141a] p-3 sm:p-5" dir="rtl">
                <div className="mx-auto max-w-[520px] rounded-xl rounded-tr-none bg-[#005c4b] p-1 text-[#e9edef] shadow">
                  <Shot html={data.cards[shown.id]} width={data.width} />
                  <div className="whitespace-pre-wrap px-2 pb-1 pt-2 text-[13.5px] leading-[1.6] [unicode-bidi:plaintext]">
                    <WhatsappText text={data.caption} />
                  </div>
                  <div className="px-2 pb-1 text-left text-[10px] opacity-70" dir="ltr">
                    08:00
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div className="flex flex-col-reverse gap-3 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" disabled={!canEdit} onClick={() => setChoice("none")} className={cn("text-start text-xs font-bold", choice === "none" ? "text-amber-300" : "text-muted-foreground hover:text-foreground")}>
            {choice === "none" ? "✓ " : ""}
            {isRtl ? "بدون صورة، ابعت الرسالة النصية بس" : "No picture — send the text only"}
          </button>
          <Button type="button" disabled={!canEdit || !dirty || save.isPending} onClick={() => choice && save.mutate(choice)} className="h-11 shrink-0 rounded-xl px-8 text-xs font-black">
            {save.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Check className="me-2 h-4 w-4" />}
            {isRtl ? "اعتماد التصميم" : "Use this design"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
