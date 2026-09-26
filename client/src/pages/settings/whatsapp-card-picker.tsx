import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Expand, ImageIcon, Loader2, MessageSquareText, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppleIcon } from "@/components/common/apple-icon";
import { settingsApi, type WhatsappCardId, type WhatsappCardSetting, type WhatsappPreviewState } from "@/api/settings";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

type Design = { id: WhatsappCardId; nameAr: string; nameEn: string; descAr: string; descEn: string };

const CLASSIC: Design[] = [
  { id: "pass", nameAr: "بطاقة المحفظة", nameEn: "Wallet pass", descAr: "بلون الشركة، والحالة في لوح أبيض.", descEn: "Company colour, status on a white panel." },
  { id: "ios", nameAr: "قائمة iOS", nameEn: "iOS list", descAr: "حلقة عدّ تنازلي وقائمة بأيقونات.", descEn: "Countdown ring and an icon list." },
  { id: "bento", nameAr: "الداكن", nameEn: "Dark bento", descAr: "رقم كبير بلون الحالة ومربعات بيانات.", descEn: "Big status-coloured number, data tiles." },
  { id: "health", nameAr: "ملخص صحة", nameEn: "Health summary", descAr: "جملة واضحة ورقم كبير وشريط.", descEn: "A clear sentence, big number and bar." },
  { id: "lock", nameAr: "إشعار الشاشة", nameEn: "Lock screen", descAr: "شاشة قفل بإشعار زجاجي بالشعار.", descEn: "Lock screen with a glass notification." },
  { id: "letter", nameAr: "الخطاب الرسمي", nameEn: "Letterhead", descAr: "ورقة رسمية بالشعار وجدول بيانات.", descEn: "Official paper, logo and a data table." },
];
const LUXURY: Design[] = [
  { id: "titanium", nameAr: "التيتانيوم", nameEn: "Titanium", descAr: "معدن مصقول وشعار محفور.", descEn: "Brushed metal, etched logo." },
  { id: "whitecard", nameAr: "البطاقة البيضاء", nameEn: "White card", descAr: "بياض هادئ ورقم رفيع كبير.", descEn: "Quiet white, a large thin number." },
  { id: "ultra", nameAr: "ساعة Ultra", nameEn: "Ultra dial", descAr: "مينا 30 يومًا تضيء بلون الحالة.", descEn: "A 30-day dial lit in the status colour." },
  { id: "vision", nameAr: "زجاج Vision", nameEn: "Vision glass", descAr: "نافذة زجاجية فوق ألوان الشركة.", descEn: "A glass window over company colours." },
  { id: "pearl", nameAr: "اللؤلؤي", nameEn: "Pearl", descAr: "خلفية لؤلؤية وورقة بيضاء.", descEn: "Pearl gradient under a white sheet." },
];

const STATES: { id: WhatsappPreviewState; ar: string; en: string; dot: string }[] = [
  { id: "expired", ar: "منتهية", en: "Expired", dot: "bg-red-500" },
  { id: "week", ar: "باقي 7 أيام", en: "7 days left", dot: "bg-orange-500" },
  { id: "month", ar: "باقي 30 يومًا", en: "30 days left", dot: "bg-yellow-500" },
];

const FONTS_HREF = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap";

/** One card, drawn live from the server's markup. A shadow root keeps its
 * stylesheet and the app's from touching each other. */
function CardPreview({ css, markup }: { css: string; markup: string }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const root = el.shadowRoot ?? el.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${css}</style><div class="cardbox">${markup}</div>`;
  }, [css, markup]);
  // The card sizes itself from its width (cqw), so the host must be given one.
  return <div ref={host} dir="rtl" className="block w-full min-w-0 overflow-hidden rounded-md" />;
}

/** Settings → WhatsApp: the picture sent with each alert, or none. */
export function WhatsappCardPicker({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<WhatsappPreviewState>("week");
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["settings", "whatsapp", "cards", state],
    queryFn: () => settingsApi.getWhatsappCards(state),
    placeholderData: keepPreviousData,
  });
  const [choice, setChoice] = useState<WhatsappCardSetting | null>(null);
  const [enlarged, setEnlarged] = useState<Design | null>(null);

  useEffect(() => {
    if (data && choice === null) setChoice(data.card);
  }, [data, choice]);

  // The cards use this font; a shadow root can't load it for itself.
  useEffect(() => {
    if (document.getElementById("whatsapp-card-fonts")) return;
    const link = Object.assign(document.createElement("link"), { id: "whatsapp-card-fonts", rel: "stylesheet", href: FONTS_HREF });
    document.head.appendChild(link);
  }, []);

  const save = useMutation({
    mutationFn: (card: WhatsappCardSetting) => settingsApi.updateWhatsappCard(card),
    onSuccess: (res) => {
      queryClient.setQueriesData({ queryKey: ["settings", "whatsapp", "cards"] }, (old: typeof data) => old && { ...old, card: res.data.card });
      const d = [...CLASSIC, ...LUXURY].find((x) => x.id === res.data.card);
      toast.success(
        res.data.card === "none"
          ? isRtl ? "التنبيهات ستُرسل نصًا فقط" : "Alerts will be text only"
          : isRtl ? `تم اعتماد البطاقة: ${d?.nameAr}` : `Card set: ${d?.nameEn}`
      );
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const dirty = data != null && choice != null && choice !== data.card;

  const option = (d: Design) => {
    const selected = choice === d.id;
    return (
      <div
        key={d.id}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl border bg-background/60 transition-all",
          selected ? "border-sky-500/80 ring-2 ring-sky-500/25 shadow-md shadow-sky-500/10" : "border-border/70 hover:border-border"
        )}
      >
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={!canEdit}
          onClick={() => setChoice(d.id)}
          className="flex w-full flex-col text-start disabled:cursor-default"
        >
          <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-foreground">{isRtl ? d.nameAr : d.nameEn}</span>
                {data?.card === d.id && (
                  <span className="rounded-full bg-sky-500/10 border border-sky-500/25 px-2 py-px text-[10px] font-bold text-sky-600 dark:text-sky-400">
                    {isRtl ? "المعتمدة" : "In use"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{isRtl ? d.descAr : d.descEn}</p>
            </div>
            <span
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0 rounded-full border flex items-center justify-center",
                selected ? "border-sky-500 bg-sky-500 text-white" : "border-border"
              )}
            >
              {selected && <Check className="h-3 w-3" />}
            </span>
          </div>
          <div className="w-full px-3 pb-3">{data && <CardPreview css={data.css} markup={data.cards[d.id]} />}</div>
        </button>
        <button
          type="button"
          onClick={() => setEnlarged(d)}
          title={isRtl ? "تكبير" : "Enlarge"}
          className="absolute bottom-5 left-5 h-8 w-8 rounded-full bg-black/55 text-white backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          <Expand className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-xl dark:border-white/10">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-600" />
      <CardHeader className="pb-4 border-b border-border/60 bg-muted/20 dark:bg-slate-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AppleIcon icon={ImageIcon} tone="sky" size="md" />
            <div>
              <CardTitle className="text-base font-black tracking-tight text-foreground">
                {isRtl ? "البطاقة المصوّرة مع التنبيه" : "Picture card with each alert"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {isRtl
                  ? "صورة بشعار المنشأة تُرسل مع كل تنبيه، ومعها سطران من النص. المعاينة على أقرب وثيقة ستنتهي."
                  : "A picture with the company logo sent with every alert, plus two lines of text. Previewed on the next document to expire."}
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
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {data && !data.canSendCards && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
            <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {isRtl
                ? "البطاقات تُرسل من رقم مربوط بكود QR فقط. مع طريقة الإرسال الحالية تُرسل الرسالة النصية المختارة بدلها."
                : "Cards are sent only from a QR-linked number. With the current provider the chosen text message is sent instead."}
            </span>
          </div>
        )}

        {isLoading || !data ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isRtl ? "جاري تحميل المعاينة..." : "Loading previews..."}
          </div>
        ) : (
          <div className="space-y-5" role="radiogroup" aria-label={isRtl ? "البطاقة المصوّرة" : "Picture card"}>
            <button
              type="button"
              role="radio"
              aria-checked={choice === "none"}
              disabled={!canEdit}
              onClick={() => setChoice("none")}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition-all disabled:cursor-default",
                choice === "none" ? "border-sky-500/80 ring-2 ring-sky-500/25" : "border-border/70 hover:border-border"
              )}
            >
              <AppleIcon icon={MessageSquareText} tone="zinc" size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black">{isRtl ? "بدون بطاقة — رسالة نصية فقط" : "No card — text message only"}</span>
                  {data.card === "none" && (
                    <span className="rounded-full bg-sky-500/10 border border-sky-500/25 px-2 py-px text-[10px] font-bold text-sky-600 dark:text-sky-400">
                      {isRtl ? "المعتمد" : "In use"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">{isRtl ? "تُرسل الرسالة بالتصميم النصي المختار أعلاه." : "Sends the text design chosen above."}</p>
              </div>
              <span
                className={cn(
                  "h-5 w-5 shrink-0 rounded-full border flex items-center justify-center",
                  choice === "none" ? "border-sky-500 bg-sky-500 text-white" : "border-border"
                )}
              >
                {choice === "none" && <Check className="h-3 w-3" />}
              </span>
            </button>

            <div>
              <h4 className="text-xs font-black text-muted-foreground mb-2.5">{isRtl ? "الأساسية" : "Classic"}</h4>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-start">{CLASSIC.map(option)}</div>
            </div>
            <div>
              <h4 className="text-xs font-black text-muted-foreground mb-2.5">{isRtl ? "الفاخرة" : "Luxury"}</h4>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-start">{LUXURY.map(option)}</div>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isRtl
              ? "زر «اختبار» بجانب أي رقم في قائمة الأرقام يرسل البطاقة المعتمدة لهذا الرقم فقط."
              : "The Test button next to a number in the list sends the card in use to that number only."}
          </p>
          <Button
            type="button"
            disabled={!canEdit || !dirty || save.isPending}
            onClick={() => choice && save.mutate(choice)}
            className="rounded-xl h-11 px-8 bg-primary text-primary-foreground font-black text-xs shrink-0"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Check className="h-4 w-4 me-2" />}
            {isRtl ? "اعتماد البطاقة" : "Use this card"}
          </Button>
        </div>
      </CardContent>

      <Dialog open={enlarged !== null} onOpenChange={(open) => !open && setEnlarged(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{enlarged && (isRtl ? enlarged.nameAr : enlarged.nameEn)}</DialogTitle>
            <DialogDescription>{enlarged && (isRtl ? enlarged.descAr : enlarged.descEn)}</DialogDescription>
          </DialogHeader>
          {enlarged && data && <CardPreview css={data.css} markup={data.cards[enlarged.id]} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
