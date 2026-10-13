import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppleIcon } from "@/components/common/apple-icon";
import { settingsApi, type DigestCardSetting } from "@/api/settings";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const DESIGNS: { id: Exclude<DigestCardSetting, "none">; nameAr: string; nameEn: string; descAr: string; descEn: string }[] = [
  { id: "royal", nameAr: "الملكي", nameEn: "Royal", descAr: "أسود مخملي وذهب، بنفس تصميم الموقع.", descEn: "Black velvet and gold, as the site." },
  { id: "ivory", nameAr: "العاجي", nameEn: "Ivory", descAr: "ورق عاجي، وكحلي وذهبي، يناسب الطباعة والمشاركة.", descEn: "Ivory paper with navy and gold." },
  { id: "emerald", nameAr: "الزمردي", nameEn: "Emerald", descAr: "أخضر زمردي عميق مع لمسات ذهبية.", descEn: "Deep emerald with gold accents." },
];

/** The server's page for one design, shrunk to the column's width (it is drawn at WhatsApp size). */
function Shot({ html, width, height }: { html: string; width: number; height: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-lg" style={{ height: height * scale }}>
      <iframe
        title="preview"
        srcDoc={html}
        sandbox=""
        scrolling="no"
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width, height, transform: `scale(${scale})` }}
      />
    </div>
  );
}

/** Settings → WhatsApp: the designed picture of the morning summary (documents and open tasks), or none. */
export function WhatsappDigestCardPicker({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings", "whatsapp", "digest-cards"], queryFn: settingsApi.getWhatsappDigestCards });
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

  return (
    <Card className="overflow-hidden rounded-3xl">
      <CardHeader className="border-b border-border/40">
        <div className="flex items-center gap-3">
          <AppleIcon icon={ImageIcon} tone="amber" size="md" />
          <div>
            <CardTitle className="text-base font-black">{isRtl ? "صورة الملخص اليومي" : "Daily summary picture"}</CardTitle>
            <CardDescription className="text-xs">
              {isRtl
                ? "كل صباح يُرسل الملخص صورةً مصمّمة بألوان وأيقونات: الوثائق المنتهية والقريبة، والمهام المفتوحة، ومعها سطران نص. المعاينة على بياناتك الحقيقية اليوم."
                : "Each morning the summary goes out as a designed picture — documents and open tasks — with a two-line caption. Previewed on today's real data."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {data && !data.canSendCards && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">
            {isRtl ? "الصور تُرسل من الرقم المربوط برمز QR فقط؛ مع المزوّدين الآخرين يُرسل التصميم النصي." : "Pictures go out from the QR-linked number only; other providers send the text design."}
          </p>
        )}
        {isLoading || !data ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3" role="radiogroup">
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
                  className={cn("flex flex-col gap-2 rounded-2xl border p-3 text-start transition-all disabled:cursor-default", selected ? "border-amber-400/80 ring-2 ring-amber-400/30" : "border-border/70 hover:border-border")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black">{isRtl ? d.nameAr : d.nameEn}</span>
                        {data.card === d.id && <span className="rounded-full border border-amber-400/40 px-2 py-px text-[10px] font-bold text-amber-300">{isRtl ? "المعتمد" : "In use"}</span>}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{isRtl ? d.descAr : d.descEn}</p>
                    </div>
                    <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-amber-400 bg-amber-400 text-black" : "border-border")}>
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                  </div>
                  <Shot html={data.cards[d.id]} width={data.width} height={data.height} />
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-col-reverse gap-3 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" disabled={!canEdit} onClick={() => setChoice("none")} className={cn("text-start text-xs font-bold", choice === "none" ? "text-amber-300" : "text-muted-foreground hover:text-foreground")}>
            {choice === "none" ? "✓ " : ""}
            {isRtl ? "بدون صورة — أرسل التصميم النصي فقط" : "No picture — send the text design only"}
          </button>
          <Button type="button" disabled={!canEdit || !dirty || save.isPending} onClick={() => choice && save.mutate(choice)} className="h-11 shrink-0 rounded-xl px-8 text-xs font-black">
            {save.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Check className="me-2 h-4 w-4" />}
            {isRtl ? "اعتماد الصورة" : "Use this picture"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
