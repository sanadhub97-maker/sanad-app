import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ImageIcon, Loader2, Moon, RefreshCw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppleIcon } from "@/components/common/apple-icon";
import { settingsApi, type DigestCardSetting, type PaymentTextId } from "@/api/settings";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { WhatsappText } from "./whatsapp-text";
import { Chat, DESIGNS, Pick, Shot, Time } from "./whatsapp-digest-card-picker";

/* Settings → WhatsApp: the evening message (the day's payments, at 9 pm) in its
   two forms side by side, as the morning one: the designed picture in the four
   designs, and the text in six; each previewed live on today's payments (or on
   the latest few on a day without any yet). One of them is the one that goes out. */

const TEXT_DESIGNS: { id: PaymentTextId; icon: string; nameAr: string; nameEn: string; descAr: string; descEn: string }[] = [
  { id: "royal", icon: "💰", nameAr: "الملكي المنظّم", nameEn: "Royal", descAr: "كل دفعة بعنوانها ومبلغها، وتحتها الجهة وطريقة الدفع ورقم السند", descEn: "Each payment titled with its amount, then whom and how it was paid" },
  { id: "receipt", icon: "🧾", nameAr: "الإيصال", nameEn: "Receipt", descAr: "كل دفعة بمبلغها وتفاصيلها، والإجمالي في الآخر", descEn: "Each payment with its details, the total at the end" },
  { id: "ledger", icon: "📒", nameAr: "الدفتر", nameEn: "Ledger", descAr: "قائمة مرقمة بالمبالغ زي دفتر الحسابات", descEn: "A numbered list of amounts, like a ledger" },
  { id: "grouped", icon: "🗂️", nameAr: "حسب البند", nameEn: "By item", descAr: "الدفعات تحت بنودها، ولكل بند إجماليه", descEn: "Payments under their items, each with its total" },
  { id: "executive", icon: "💡", nameAr: "الملخص التنفيذي", nameEn: "Executive", descAr: "فقرة خلاصة، وبعدها الدفعات من الأكبر", descEn: "A summary paragraph, then payments from the largest" },
  { id: "dashboard", icon: "📊", nameAr: "المؤشرات", nameEn: "Dashboard", descAr: "أشرطة توضح نصيب كل بند من الإجمالي", descEn: "Bars showing each item's share of the total" },
  { id: "brief", icon: "⚡", nameAr: "المختصر", nameEn: "Brief", descAr: "الإجمالي وأكبر 3 دفعات، يتقري من الإشعار", descEn: "The total and the three largest" },
];

export function WhatsappPaymentsPicker({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useQuery({ queryKey: ["settings", "whatsapp", "payments-preview"], queryFn: settingsApi.getWhatsappPaymentsPreview, refetchInterval: 120_000 });
  const [card, setCard] = useState<DigestCardSetting | null>(null);
  const [text, setText] = useState<PaymentTextId | null>(null);
  useEffect(() => {
    if (data && card === null) setCard(data.format.card);
    if (data && text === null) setText(data.format.text);
  }, [data, card, text]);
  const [lastDesign, setLastDesign] = useState<Exclude<DigestCardSetting, "none">>("noir");
  useEffect(() => {
    if (card && card !== "none") setLastDesign(card);
  }, [card]);

  const shownCard = card ?? data?.format.card ?? "none";
  const shownText = text ?? data?.format.text ?? "receipt";
  const asText = shownCard === "none";
  const design = DESIGNS.find((d) => d.id === (shownCard !== "none" ? shownCard : lastDesign)) ?? DESIGNS[0];
  const dirty = !!data && (shownCard !== data.format.card || shownText !== data.format.text);

  const save = useMutation({
    mutationFn: () => settingsApi.updateWhatsappPaymentsFormat({ card: shownCard, text: shownText }),
    onSuccess: (res) => {
      queryClient.setQueryData(["settings", "whatsapp", "payments-preview"], (old: typeof data) => old && { ...old, format: res.data });
      toast.success(isRtl ? "اتحفظ شكل رسالة المساء" : "Evening message saved");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const empty = !!data && !data.count;

  return (
    <Card className="overflow-hidden rounded-3xl">
      <CardHeader className="border-b border-border/40">
        <div className="flex flex-wrap items-center gap-3">
          <AppleIcon icon={Moon} tone="amber" size="md" />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-black">{isRtl ? "شكل رسالة المساء — معاينة حية" : "Evening message — live preview"}</CardTitle>
            <CardDescription className="text-xs">
              {isRtl
                ? "رسالة «مدفوعات اليوم» اللي بتتبعت كل يوم الساعة 9 بالليل: الشكلين جنب بعض، اختار اللي يتبعت واعتمده."
                : "The “Today's payments” message sent every evening at 9: both forms side by side; pick the one that goes out."}
            </CardDescription>
          </div>
          <button type="button" onClick={() => void refetch()} className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
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
        {data?.sample && (
          <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-700 dark:text-sky-300">
            {isRtl ? `مفيش مدفوعات النهارده لسه، فالمعاينة على آخر ${data.count} دفعات كمثال.` : `No payments today yet, so the preview uses the latest ${data.count} as an example.`}
          </p>
        )}
        {empty && (
          <p className="rounded-xl border border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
            {data?.canSee ? (isRtl ? "مفيش مدفوعات مسجلة عشان نعرض المعاينة عليها." : "There are no payments to preview on.") : isRtl ? "المعاينة محتاجة صلاحية عرض المدفوعات." : "The preview needs permission to view payments."}
          </p>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-2" role="radiogroup" aria-label={isRtl ? "شكل رسالة المساء" : "Evening message format"}>
          {/* the picture */}
          <div className={cn("flex min-w-0 flex-col gap-3 rounded-3xl border p-3 transition-opacity", asText ? "border-border/40 opacity-60" : "border-amber-400/30")}>
            <Pick
              on={!asText}
              inUse={!!data && data.format.card !== "none"}
              disabled={!canEdit}
              onPick={() => setCard(lastDesign)}
              icon={ImageIcon}
              title={isRtl ? "صورة مصممة" : "Designed picture"}
              desc={isRtl ? "تقرير ملوّن بالإجمالي والبنود، ومعاه سطرين تحته" : "A coloured report with the total and items, and a caption"}
              isRtl={isRtl}
            />
            {isLoading || !data ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : empty ? null : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={isRtl ? "التصميم" : "Design"}>
                  {DESIGNS.map((d) => {
                    const selected = !asText && shownCard === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => setCard(d.id)}
                        aria-pressed={selected}
                        title={isRtl ? d.descAr : d.descEn}
                        className={cn("flex flex-col gap-1.5 rounded-xl border p-1.5 text-center transition-all disabled:cursor-default", selected ? "border-amber-400/80 ring-2 ring-amber-400/30" : "border-border/60 hover:border-border")}
                      >
                        <Shot html={data.cards[d.id] ?? ""} width={data.width} maxHeight={80} />
                        <span className="truncate text-[11.5px] font-black">{isRtl ? d.nameAr : d.nameEn}</span>
                      </button>
                    );
                  })}
                </div>
                <Chat>
                  <div className="mx-auto max-w-[440px] rounded-xl rounded-tr-none bg-[#005c4b] p-1 text-[#e9edef] shadow">
                    <Shot html={data.cards[design.id] ?? ""} width={data.width} />
                    <div className="whitespace-pre-wrap px-2 pb-1 pt-2 text-[13.5px] leading-[1.6] [unicode-bidi:plaintext]">
                      <WhatsappText text={data.caption} />
                    </div>
                    <Time at="21:00" />
                  </div>
                </Chat>
              </>
            )}
          </div>
          {/* the text */}
          <div className={cn("flex min-w-0 flex-col gap-3 rounded-3xl border p-3 transition-opacity", asText ? "border-amber-400/30" : "border-border/40 opacity-60")}>
            <Pick
              on={asText}
              inUse={!!data && data.format.card === "none"}
              disabled={!canEdit}
              onPick={() => setCard("none")}
              icon={Type}
              title={isRtl ? "رسالة نصية" : "Text message"}
              desc={isRtl ? "نص منسّق بالإيموجي، يتنسخ ويتقري من الإشعار" : "Formatted text, easy to copy and read from the notification"}
              isRtl={isRtl}
            />
            {isLoading || !data ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : empty ? null : (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label={isRtl ? "قالب الرسالة النصية" : "Text design"}>
                  {TEXT_DESIGNS.map((d) => {
                    const selected = shownText === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          setText(d.id);
                          setCard("none");
                        }}
                        aria-pressed={selected}
                        title={isRtl ? d.descAr : d.descEn}
                        className={cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-start transition-all disabled:cursor-default", selected ? "border-amber-400/80 bg-amber-400/[0.07] ring-2 ring-amber-400/30" : "border-border/60 hover:border-border")}
                      >
                        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-[17px]", selected ? "border-amber-400/50 bg-amber-400/10" : "border-border/60 bg-muted/30")} aria-hidden>
                          {d.icon}
                        </span>
                        <span className="min-w-0">
                          <b className="flex items-center gap-1.5 text-[12.5px] font-black">
                            <span className="truncate">{isRtl ? d.nameAr : d.nameEn}</span>
                            {data.format.text === d.id && <span className="shrink-0 rounded-full bg-amber-400/15 px-1.5 text-[9.5px] text-amber-300">{isRtl ? "المستخدم" : "In use"}</span>}
                          </b>
                          <span className="mt-0.5 line-clamp-2 block text-[10.5px] leading-snug text-muted-foreground">{isRtl ? d.descAr : d.descEn}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <Chat>
                  {(data.designs[shownText] ?? []).map((m, i) => (
                    <div key={i} className="mx-auto max-w-[440px] whitespace-pre-wrap break-words rounded-xl rounded-tr-none bg-[#005c4b] px-3 pt-2 text-[13.5px] leading-[1.65] text-[#e9edef] shadow [unicode-bidi:plaintext]">
                      <WhatsappText text={m} />
                      <Time at="21:00" />
                    </div>
                  ))}
                </Chat>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">{isRtl ? "الاختيار بيتطبق من رسالة المساء الجاية." : "Applies from the next evening message."}</span>
          <Button type="button" disabled={!canEdit || !dirty || save.isPending} onClick={() => save.mutate()} className="h-11 shrink-0 rounded-xl px-8 text-xs font-black">
            {save.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Check className="me-2 h-4 w-4" />}
            {isRtl ? "اعتماد الاختيار" : "Use this choice"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
