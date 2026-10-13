import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppleIcon } from "@/components/common/apple-icon";
import { settingsApi } from "@/api/settings";
import { cn } from "@/lib/utils";
import { WhatsappText } from "./whatsapp-text";

/** Settings → WhatsApp: the morning summary exactly as it goes out, message by message, on today's real
 * documents and open tasks — refreshed every minute, so a new task or a renewal shows at once. */
export function WhatsappDailyPreview({ isRtl }: { isRtl: boolean }) {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["settings", "whatsapp", "daily-preview"],
    queryFn: settingsApi.getWhatsappDailyPreview,
    refetchInterval: 60_000,
  });
  const time = data ? new Date(data.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <Card className="overflow-hidden rounded-3xl">
      <CardHeader className="border-b border-border/40">
        <div className="flex flex-wrap items-center gap-3">
          <AppleIcon icon={CalendarClock} tone="amber" size="md" />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-black">{isRtl ? "الملخص اليومي النصي — معاينة حية" : "Daily summary text — live preview"}</CardTitle>
            <CardDescription className="text-xs">
              {isRtl
                ? "الرسالة النصية اللي بتتبعت لو اخترت «بدون صورة»، أو لو الصورة ما اتبعتتش. ببياناتك الحقيقية دلوقتي، وبتتحدّث كل دقيقة."
                : "The message that goes out at 8 am, exactly, on your real data right now: due documents and open tasks. Refreshed every minute."}
            </CardDescription>
          </div>
          <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            {isRtl ? "تحديث" : "Refresh"}
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading || !data ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 px-5 pt-4 text-[11px] font-bold text-muted-foreground">
              <span className="rounded-full border border-border/70 px-2.5 py-0.5">{isRtl ? `${data.documents} وثيقة` : `${data.documents} documents`}</span>
              <span className="rounded-full border border-border/70 px-2.5 py-0.5">{isRtl ? `${data.tasks} مهمة مفتوحة` : `${data.tasks} open tasks`}</span>
              <span className="rounded-full border border-border/70 px-2.5 py-0.5">{isRtl ? `${data.messages.length} رسالة` : `${data.messages.length} message(s)`}</span>
            </div>
            {/* A WhatsApp chat: its own wallpaper and bubbles; each line takes its own direction, as in the app. */}
            <div className="m-4 mt-3 max-h-[760px] space-y-2 overflow-y-auto rounded-2xl bg-[#efeae2] p-3 dark:bg-[#0b141a] sm:p-5" dir={data.language === "en" ? "ltr" : "rtl"}>
              {data.messages.map((m, i) => (
                <div key={i} className="relative mx-auto max-w-[560px] whitespace-pre-wrap break-words rounded-lg rounded-tr-none bg-white px-3 pb-5 pt-2 text-start text-[13.5px] leading-[1.65] text-[#111b21] shadow-sm [unicode-bidi:plaintext] dark:bg-[#202c33] dark:text-[#e9edef]">
                  <WhatsappText text={m} />
                  <span className="absolute bottom-1 left-2 text-[10px] text-[#667781] dark:text-[#8696a0]" dir="ltr">
                    08:00
                  </span>
                </div>
              ))}
            </div>
            <p className="px-5 pb-4 text-[11px] text-muted-foreground">{isRtl ? `آخر تحديث للمعاينة: ${time}` : `Preview updated at ${time}`}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
