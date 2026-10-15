import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ImageIcon, Loader2, RefreshCw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppleIcon } from "@/components/common/apple-icon";
import { settingsApi, type DailyTextId, type DigestCardSetting } from "@/api/settings";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { WhatsappText } from "./whatsapp-text";

export const DESIGNS: { id: Exclude<DigestCardSetting, "none">; nameAr: string; nameEn: string; descAr: string; descEn: string }[] = [
  { id: "noir", nameAr: "الملكي الأسود", nameEn: "Royal noir", descAr: "أسود مخملي ودهبي، بنفس تصميم الموقع.", descEn: "Black velvet and gold, as the site." },
  { id: "ivory", nameAr: "العاجي التنفيذي", nameEn: "Ivory", descAr: "ورق عاجي بالكحلي والدهبي، شكل تقرير مطبوع.", descEn: "Ivory paper with navy and gold." },
  { id: "emerald", nameAr: "الزمردي", nameEn: "Emerald", descAr: "أخضر زمردي عميق بلمسات دهبي.", descEn: "Deep emerald with gold." },
  { id: "sapphire", nameAr: "الياقوتي", nameEn: "Sapphire", descAr: "كحلي ليلي بالفضي، هادي ورسمي.", descEn: "Midnight navy with silver." },
];

/** In the order they are offered: the management designs, then the follow-up ones, then the formal and the short. */
const TEXT_DESIGNS: { id: DailyTextId; icon: string; kind: 0 | 1 | 2; nameAr: string; nameEn: string; descAr: string; descEn: string }[] = [
  { id: "executive", icon: "💡", kind: 0, nameAr: "الملخص التنفيذي", nameEn: "Executive", descAr: "فقرة خلاصة، ثم إجراءات مرقمة حسب الأولوية", descEn: "A one-paragraph summary, then numbered actions" },
  { id: "dashboard", icon: "📊", kind: 0, nameAr: "لوحة المؤشرات", nameEn: "Dashboard", descAr: "أشرطة توضح حجم كل مجموعة، ووثائق مختصرة", descEn: "Bars showing each group, compact documents" },
  { id: "report", icon: "👑", kind: 0, nameAr: "التقرير الملكي", nameEn: "Royal report", descAr: "لوحة بالأعداد، وكل وثيقة في 3 سطور", descEn: "A panel of counts, three lines per document" },
  { id: "timeline", icon: "⏳", kind: 1, nameAr: "الجدول الزمني", nameEn: "Timeline", descAr: "الوثائق بالتاريخ تحت شهر انتهائها", descEn: "Documents by date under the month they end" },
  { id: "grouped", icon: "🗂️", kind: 1, nameAr: "المجمّع", nameEn: "Grouped", descAr: "الوثائق مقسمة حسب الخطورة في قوائم", descEn: "Documents listed under each urgency" },
  { id: "cards", icon: "🪪", kind: 1, nameAr: "البطاقات", nameEn: "Cards", descAr: "كل وثيقة في لوحة بارزة لوحدها", descEn: "Each document in its own panel" },
  { id: "letter", icon: "📜", kind: 2, nameAr: "الخطاب الرسمي", nameEn: "Formal letter", descAr: "تحية، وقائمة مرقمة، وختام رسمي", descEn: "A greeting, a numbered list, a closing" },
  { id: "brief", icon: "⚡", kind: 2, nameAr: "المختصر", nameEn: "Brief", descAr: "الأعداد وأهم 5 وثائق، يتقري من الإشعار", descEn: "Counts and the five most urgent" },
];
const TEXT_KINDS = [
  { ar: "للإدارة", en: "For management" },
  { ar: "للمتابعة", en: "For follow-up" },
  { ar: "رسمي ومختصر", en: "Formal and short" },
];

/** The server's page for one design, drawn at WhatsApp size and shrunk to the column, as tall as its content. */
export function Shot({ html, width, maxHeight }: { html: string; width: number; maxHeight?: number }) {
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

/** A WhatsApp chat on its own wallpaper, holding the morning message. */
export function Chat({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 space-y-2 rounded-2xl bg-[#0b141a] p-3 sm:p-4" dir="rtl">
      {children}
    </div>
  );
}
export const Time = ({ at = "08:00" }: { at?: string }) => (
  <div className="px-2 pb-1 text-left text-[10px] opacity-70" dir="ltr">
    {at}
  </div>
);

/** One column's head: picking it picks that form of the message. */
export function Pick({ on, inUse, disabled, onPick, icon: Icon, title, desc, isRtl }: {
  on: boolean; inUse: boolean; disabled: boolean; onPick: () => void; icon: typeof ImageIcon; title: string; desc: string; isRtl: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={disabled}
      onClick={onPick}
      className={cn("flex w-full items-center gap-3 rounded-2xl border p-3.5 text-start transition-all disabled:cursor-default", on ? "border-amber-400/80 bg-amber-400/[0.07] ring-2 ring-amber-400/30" : "border-border/70 hover:border-border")}
    >
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", on ? "bg-amber-400 text-black" : "bg-white/5 text-amber-300")}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="flex flex-wrap items-center gap-2 text-[15px] font-black">
          {title}
          {inUse && <span className="rounded-full border border-amber-400/40 px-2 py-px text-[10px] font-bold text-amber-300">{isRtl ? "المعتمد" : "In use"}</span>}
        </b>
        <span className="mt-0.5 block text-[12px] text-muted-foreground">{desc}</span>
      </span>
      <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", on ? "border-amber-400 bg-amber-400 text-black" : "border-border")}>{on && <Check className="h-3 w-3" />}</span>
    </button>
  );
}

/** Settings → WhatsApp: the morning message in its two forms side by side — the designed picture and the
 * text — each previewed live on today's documents and open tasks; one of them is the one that goes out. */
export function WhatsappDigestCardPicker({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useQuery({ queryKey: ["settings", "whatsapp", "digest-cards"], queryFn: settingsApi.getWhatsappDigestCards, refetchInterval: 120_000 });
  const textQuery = useQuery({ queryKey: ["settings", "whatsapp", "daily-preview"], queryFn: settingsApi.getWhatsappDailyPreview, refetchInterval: 60_000 });
  const [textDesign, setTextDesign] = useState<DailyTextId | null>(null);
  useEffect(() => {
    if (textQuery.data && textDesign === null) setTextDesign(textQuery.data.design);
  }, [textQuery.data, textDesign]);
  const shownText = textDesign ?? textQuery.data?.design ?? "report";
  const [choice, setChoice] = useState<DigestCardSetting | null>(null);
  useEffect(() => {
    if (data && choice === null) setChoice(data.card);
  }, [data, choice]);
  const textDirty = !!textQuery.data && textDesign !== null && textDesign !== textQuery.data.design;
  const cardDirty = data != null && choice != null && choice !== data.card;
  const save = useMutation({
    mutationFn: async () => {
      if (cardDirty && choice) await settingsApi.updateWhatsappDigestCard(choice);
      if (textDirty && textDesign) await settingsApi.updateWhatsappDailyText(textDesign);
    },
    onSuccess: () => {
      if (cardDirty) queryClient.setQueryData(["settings", "whatsapp", "digest-cards"], (old: typeof data) => old && { ...old, card: choice! });
      if (textDirty) queryClient.setQueryData(["settings", "whatsapp", "daily-preview"], (old: typeof textQuery.data) => old && { ...old, design: textDesign! });
      toast.success(isRtl ? "اتحفظ شكل رسالة الصبح" : "Morning message saved");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
  const dirty = cardDirty || textDirty;
  // Switching back to the picture brings back the last design picked.
  const [lastDesign, setLastDesign] = useState<Exclude<DigestCardSetting, "none">>("noir");
  useEffect(() => {
    if (choice && choice !== "none") setLastDesign(choice);
  }, [choice]);
  const asText = choice === "none";
  const shown = DESIGNS.find((d) => d.id === (choice && choice !== "none" ? choice : lastDesign)) ?? DESIGNS[0];
  const textInUse = data?.card === "none";

  return (
    <Card className="overflow-hidden rounded-3xl">
      <CardHeader className="border-b border-border/40">
        <div className="flex flex-wrap items-center gap-3">
          <AppleIcon icon={ImageIcon} tone="amber" size="md" />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-black">{isRtl ? "شكل رسالة الصبح — معاينة حية" : "Morning message — live preview"}</CardTitle>
            <CardDescription className="text-xs">
              {isRtl
                ? "الشكلين جنب بعض ببياناتك الحقيقية دلوقتي: اختار اللي يتبعت كل صباح الساعة 8، واعتمده."
                : "Both forms side by side, on your real data now: pick the one sent each morning at 8."}
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={() => {
              void refetch();
              void textQuery.refetch();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (isFetching || textQuery.isFetching) && "animate-spin")} />
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
        <div className="grid items-start gap-4 lg:grid-cols-2" role="radiogroup" aria-label={isRtl ? "شكل رسالة الصبح" : "Morning message format"}>
          {/* the picture */}
          <div className={cn("flex min-w-0 flex-col gap-3 rounded-3xl border p-3 transition-opacity", asText ? "border-border/40 opacity-60" : "border-amber-400/30")}>
            <Pick
              on={!asText}
              inUse={!!data && !textInUse}
              disabled={!canEdit}
              onPick={() => setChoice(lastDesign)}
              icon={ImageIcon}
              title={isRtl ? "صورة مصممة" : "Designed picture"}
              desc={isRtl ? "تقرير ملوّن بالأيقونات، ومعاه سطرين تحته" : "A coloured report with icons, and a short caption"}
              isRtl={isRtl}
            />
            {isLoading || !data ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={isRtl ? "التصميم" : "Design"}>
                  {DESIGNS.map((d) => {
                    const selected = !asText && choice === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => setChoice(d.id)}
                        aria-pressed={selected}
                        title={isRtl ? d.descAr : d.descEn}
                        className={cn("flex flex-col gap-1.5 rounded-xl border p-1.5 text-center transition-all disabled:cursor-default", selected ? "border-amber-400/80 ring-2 ring-amber-400/30" : "border-border/60 hover:border-border")}
                      >
                        <Shot html={data.cards[d.id]} width={data.width} maxHeight={80} />
                        <span className="truncate text-[11.5px] font-black">{isRtl ? d.nameAr : d.nameEn}</span>
                      </button>
                    );
                  })}
                </div>
                <Chat>
                  <div className="mx-auto max-w-[440px] rounded-xl rounded-tr-none bg-[#005c4b] p-1 text-[#e9edef] shadow">
                    <Shot html={data.cards[shown.id]} width={data.width} />
                    <div className="whitespace-pre-wrap px-2 pb-1 pt-2 text-[13.5px] leading-[1.6] [unicode-bidi:plaintext]">
                      <WhatsappText text={data.caption} />
                    </div>
                    <Time />
                  </div>
                </Chat>
              </>
            )}
          </div>
          {/* the text */}
          <div className={cn("flex min-w-0 flex-col gap-3 rounded-3xl border p-3 transition-opacity", asText ? "border-amber-400/30" : "border-border/40 opacity-60")}>
            <Pick
              on={asText}
              inUse={textInUse}
              disabled={!canEdit}
              onPick={() => setChoice("none")}
              icon={Type}
              title={isRtl ? "رسالة نصية" : "Text message"}
              desc={isRtl ? "نص منسّق بالإيموجي، يتنسخ ويتقري من الإشعار" : "Formatted text, easy to copy and read from the notification"}
              isRtl={isRtl}
            />
            {textQuery.isLoading || !textQuery.data ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3" aria-label={isRtl ? "قالب الرسالة النصية" : "Text design"}>
                  {TEXT_KINDS.map((k, ki) => (
                    <div key={ki} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-[11px] font-black text-amber-300/90">
                        <span>{isRtl ? k.ar : k.en}</span>
                        <span className="h-px flex-1 bg-amber-400/20" />
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {TEXT_DESIGNS.filter((d) => d.kind === ki).map((d) => {
                          const selected = shownText === d.id;
                          return (
                            <button
                              key={d.id}
                              type="button"
                              disabled={!canEdit}
                              onClick={() => {
                                setTextDesign(d.id);
                                setChoice("none");
                              }}
                              aria-pressed={selected}
                              title={isRtl ? d.descAr : d.descEn}
                              className={cn(
                                "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-start transition-all disabled:cursor-default",
                                selected ? "border-amber-400/80 bg-amber-400/[0.07] ring-2 ring-amber-400/30" : "border-border/60 hover:border-border",
                              )}
                            >
                              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-[17px]", selected ? "border-amber-400/50 bg-amber-400/10" : "border-border/60 bg-muted/30")} aria-hidden>
                                {d.icon}
                              </span>
                              <span className="min-w-0">
                                <b className="flex items-center gap-1.5 text-[12.5px] font-black">
                                  <span className="truncate">{isRtl ? d.nameAr : d.nameEn}</span>
                                  {textQuery.data?.design === d.id && <span className="shrink-0 rounded-full bg-amber-400/15 px-1.5 text-[9.5px] text-amber-300">{isRtl ? "المستخدم" : "In use"}</span>}
                                </b>
                                <span className="mt-0.5 line-clamp-2 block text-[10.5px] leading-snug text-muted-foreground">{isRtl ? d.descAr : d.descEn}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              <Chat>
                {(textQuery.data.designs?.[shownText] ?? textQuery.data.messages).map((m, i) => (
                  <div key={i} className="mx-auto max-w-[440px] whitespace-pre-wrap break-words rounded-xl rounded-tr-none bg-[#005c4b] px-3 pt-2 text-[13.5px] leading-[1.65] text-[#e9edef] shadow [unicode-bidi:plaintext]">
                    <WhatsappText text={m} />
                    <Time />
                  </div>
                ))}
              </Chat>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">{isRtl ? "الاختيار بيتطبق من رسالة الصبح الجاية، ومن زرار «اختبار»." : "Applies from the next morning message, and to the Test button."}</span>
          <Button type="button" disabled={!canEdit || !dirty || save.isPending} onClick={() => save.mutate()} className="h-11 shrink-0 rounded-xl px-8 text-xs font-black">
            {save.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Check className="me-2 h-4 w-4" />}
            {isRtl ? "اعتماد الاختيار" : "Use this choice"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
