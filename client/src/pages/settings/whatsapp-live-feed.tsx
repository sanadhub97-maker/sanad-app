import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCheck, FlaskConical, Radio, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { settingsApi, type WhatsappMessageItem } from "@/api/settings";
import { cn } from "@/lib/utils";

const POLL_MS = 8000;

/** "*bold*" and "_italic_" as WhatsApp renders them; everything else as text. */
function WhatsappText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
          <b key={i}>{p.slice(1, -1)}</b>
        ) : p.startsWith("_") && p.endsWith("_") && p.length > 2 ? (
          <i key={i}>{p.slice(1, -1)}</i>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

function useRelativeTime(isRtl: boolean) {
  // Re-render every 30s so "x minutes ago" stays current between polls.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const rtf = useMemo(() => new Intl.RelativeTimeFormat(isRtl ? "ar" : "en", { numeric: "auto" }), [isRtl]);
  return (iso: string) => {
    const diff = (new Date(iso).getTime() - Date.now()) / 1000;
    const abs = Math.abs(diff);
    if (abs < 60) return rtf.format(Math.round(diff), "second");
    if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
    return rtf.format(Math.round(diff / 86400), "day");
  };
}

/** First meaningful line of a message, without WhatsApp markup, for the ticker. */
function headline(m: WhatsappMessageItem, isRtl: boolean) {
  if (!m.message) return isRtl ? "رسالة تنبيه" : "Alert message";
  const lines = m.message.split("\n").map((l) => l.replace(/[*_]/g, "").trim()).filter(Boolean);
  // Alerts start with a header line; the subject (who/what) is on the next one.
  return (lines[1] && m.kind === "ALERT" ? lines[1] : lines[0]) ?? "";
}

/** Settings → WhatsApp: every message the system sends, live, with a news
 * ticker of the latest ones on top. Polls every few seconds. */
export function WhatsappLiveFeed({ isRtl }: { isRtl: boolean }) {
  const [filter, setFilter] = useState<"ALL" | "SENT" | "FAILED">("ALL");
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["settings", "whatsapp", "messages", filter],
    queryFn: () => settingsApi.getWhatsappMessages(filter === "ALL" ? undefined : filter),
    refetchInterval: POLL_MS,
  });
  const ago = useRelativeTime(isRtl);

  // Messages that arrived since the feed was first shown slide in.
  const seen = useRef<Set<string> | null>(null);
  const fresh = new Set<string>();
  if (data) {
    if (!seen.current) seen.current = new Set(data.items.map((m) => m.id));
    for (const m of data.items) if (!seen.current.has(m.id)) fresh.add(m.id);
  }
  useEffect(() => {
    if (data && seen.current) for (const m of data.items) seen.current.add(m.id);
  }, [data]);

  const items = data?.items ?? [];
  const tickerItems = items.slice(0, 12);
  // Newest on the right, entering first; the track holds two copies to loop.
  const tickerRow = [...tickerItems].reverse();
  const duration = Math.max(25, tickerItems.length * 7);

  return (
    <Card className="specular-border overflow-hidden border-border/80">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">{isRtl ? "رسائل التنبيهات — بث مباشر" : "Alert messages — live"}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {isRtl ? "كل رسالة واتساب بيبعتها النظام، بنصها وحالتها، وبتتحدث لوحدها كل ثواني" : "Every WhatsApp message the system sends, with its text and status — updates by itself"}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1 font-bold">
              {isRtl ? "اتبعت النهارده" : "Sent today"}: {data?.stats.sentToday ?? "—"}
            </span>
            <span className="rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 px-3 py-1 font-bold">
              {isRtl ? "فشل النهارده" : "Failed today"}: {data?.stats.failedToday ?? "—"}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 font-bold text-muted-foreground">
              {isRtl ? "الإجمالي" : "Total"}: {data?.stats.total ?? "—"}
            </span>
          </div>
        </div>
      </CardHeader>

      {/* News ticker */}
      <div className="ticker flex items-stretch bg-slate-950 text-white border-b border-border/40" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex items-center gap-2 bg-rose-600 px-4 py-2 text-xs font-black shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          {isRtl ? "مباشر" : "LIVE"}
        </div>
        <div className="relative flex-1 overflow-hidden" dir="ltr">
          {tickerItems.length === 0 ? (
            <div className="px-4 py-2 text-xs text-slate-300" dir={isRtl ? "rtl" : "ltr"}>
              {isLoading ? (isRtl ? "جاري التحميل..." : "Loading...") : isRtl ? "في انتظار أول رسالة..." : "Waiting for the first message..."}
            </div>
          ) : (
            <div className="ticker-track py-2" style={{ ["--ticker-duration" as string]: `${duration}s` }}>
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
                  {tickerRow.map((m) => (
                    <span key={m.id + copy} className="flex items-center gap-2 px-5 text-xs whitespace-nowrap border-s border-white/10" dir={isRtl ? "rtl" : "ltr"}>
                      {m.status === "SENT" ? <CheckCheck className="h-3.5 w-3.5 text-sky-400" /> : <XCircle className="h-3.5 w-3.5 text-rose-400" />}
                      <b className="font-bold">{m.name || <bdi dir="ltr">{m.to}</bdi>}</b>
                      <span className="text-slate-300">{headline(m, isRtl)}</span>
                      <span className="text-slate-500">· {ago(m.at)}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-muted/50 p-1 text-xs font-bold" role="tablist">
            {(
              [
                ["ALL", isRtl ? "الكل" : "All"],
                ["SENT", isRtl ? "اتبعتت" : "Sent"],
                ["FAILED", isRtl ? "فشلت" : "Failed"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filter === id}
                onClick={() => setFilter(id)}
                className={cn("rounded-lg px-3 py-1.5 transition-colors", filter === id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {dataUpdatedAt ? (isRtl ? "آخر تحديث " : "Updated ") + ago(new Date(dataUpdatedAt).toISOString()) : ""}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            {isLoading
              ? isRtl ? "جاري التحميل..." : "Loading..."
              : isRtl
                ? "لسه مفيش رسائل. أول ما النظام يبعت تنبيه أو تبعت رسالة تجربة، هتظهر هنا لحظياً."
                : "No messages yet. They appear here as soon as the system sends an alert or you send a test."}
          </div>
        ) : (
          <ul className="max-h-[560px] overflow-y-auto space-y-3 pe-1">
            {items.map((m) => (
              <li
                key={m.id}
                className={cn("flex gap-3", fresh.has(m.id) && "animate-in fade-in slide-in-from-top-3 duration-500")}
              >
                <div
                  className={cn(
                    "h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-black",
                    m.status === "SENT" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                  )}
                >
                  {(m.name || "#").trim().charAt(0)}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span className="font-bold text-foreground">{m.name || (isRtl ? "رقم" : "Number")}</span>
                    <bdi dir="ltr" className="font-mono text-muted-foreground">{m.to}</bdi>
                    {m.kind === "TEST" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-400">
                        <FlaskConical className="h-3 w-3" />
                        {isRtl ? "رسالة تجربة" : "Test"}
                      </span>
                    )}
                    <span className="text-muted-foreground ms-auto">{ago(m.at)}</span>
                  </div>
                  <div
                    className={cn(
                      "relative rounded-2xl rounded-ss-sm px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words max-w-xl",
                      m.status === "SENT"
                        ? "bg-[#dcf8c6] text-slate-900 dark:bg-emerald-900/40 dark:text-emerald-50"
                        : "bg-rose-50 text-slate-900 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-50 dark:border-rose-900"
                    )}
                    dir="rtl"
                  >
                    {m.message ? (
                      <WhatsappText text={m.message} />
                    ) : (
                      <span className="text-muted-foreground italic">{isRtl ? "(نص الرسالة مش محفوظ — رسالة قديمة قبل تفعيل السجل)" : "(text not stored — sent before the log existed)"}</span>
                    )}
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                      {new Date(m.at).toLocaleTimeString(isRtl ? "ar-SA" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" })}
                      {m.status === "SENT" ? <CheckCheck className="h-3.5 w-3.5 text-sky-600" /> : <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                    </div>
                  </div>
                  {m.status === "FAILED" && m.error && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">
                      {isRtl ? "سبب الفشل: " : "Reason: "}
                      {m.error}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
