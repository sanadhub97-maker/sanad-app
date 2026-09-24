import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCheck,
  FlaskConical,
  Radio,
  XCircle,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Clock,
  Search,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Layers,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { settingsApi, type WhatsappMessageItem } from "@/api/settings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const POLL_MS = 8000;

/** Format "*bold*" and "_italic_" as WhatsApp renders them with modern styling. */
function WhatsappText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
          <b key={i} className="font-bold text-foreground drop-shadow-2xs">
            {p.slice(1, -1)}
          </b>
        ) : p.startsWith("_") && p.endsWith("_") && p.length > 2 ? (
          <i key={i} className="italic text-muted-foreground">
            {p.slice(1, -1)}
          </i>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

function useRelativeTime(isRtl: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const rtf = useMemo(
    () => new Intl.RelativeTimeFormat(isRtl ? "ar" : "en", { numeric: "auto" }),
    [isRtl]
  );

  return (iso: string) => {
    const diff = (new Date(iso).getTime() - Date.now()) / 1000;
    const abs = Math.abs(diff);
    if (abs < 60) return isRtl ? "منذ لحظات" : "just now";
    if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
    return rtf.format(Math.round(diff / 86400), "day");
  };
}

/** First meaningful headline of a message for the live ticker */
function headline(m: WhatsappMessageItem, isRtl: boolean) {
  if (!m.message) return isRtl ? "إشعار تنبيه تلقائي" : "Automatic alert notification";
  const lines = m.message
    .split("\n")
    .map((l) => l.replace(/[*_]/g, "").trim())
    .filter(Boolean);
  return (lines[1] && m.kind === "ALERT" ? lines[1] : lines[0]) ?? "";
}

/** Formats standard mobile numbers cleanly */
function formatPhoneNumber(num?: string | null) {
  if (!num) return "—";
  const clean = num.replace(/[^\d+]/g, "");
  if (clean.startsWith("+966") && clean.length === 13) {
    return `+966 ${clean.slice(4, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`;
  }
  if (clean.startsWith("+20") && clean.length === 13) {
    return `+20 ${clean.slice(3, 5)} ${clean.slice(5, 9)} ${clean.slice(9)}`;
  }
  return clean;
}

/**
 * 💎 Luxury Executive WhatsApp Live Feed Component
 * Fully styled with Obsidian Glassmorphism, live status indicators,
 * WhatsApp-style luxury chat bubbles, and real-time streaming counters.
 */
export function WhatsappLiveFeed({ isRtl }: { isRtl: boolean }) {
  const [filter, setFilter] = useState<"ALL" | "SENT" | "FAILED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["settings", "whatsapp", "messages", filter],
    queryFn: () => settingsApi.getWhatsappMessages(filter === "ALL" ? undefined : filter),
    refetchInterval: POLL_MS,
  });

  const ago = useRelativeTime(isRtl);

  // New message slide-in detection
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
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (m) =>
        m.to?.toLowerCase().includes(q) ||
        m.name?.toLowerCase().includes(q) ||
        m.message?.toLowerCase().includes(q) ||
        m.error?.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const tickerItems = items.slice(0, 15);
  const tickerRow = [...tickerItems].reverse();
  const duration = Math.max(30, tickerItems.length * 8);

  const stats = data?.stats ?? { sentToday: 0, failedToday: 0, total: 0 };
  const successRate = stats.total > 0 ? Math.round((stats.sentToday / Math.max(1, stats.sentToday + stats.failedToday)) * 100) : 100;

  function handleCopyPhone(phone: string | null) {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedId(phone);
    toast.success(isRtl ? "تم نسخ الرقم إلى الحافظة بنجاح" : "Phone number copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <Card id="whatsapp-live-stream-panel" className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl transition-all dark:border-white/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
      {/* 🌟 Ambient Royal Gradient Hairline */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 via-cyan-400 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10" />

      {/* 🔮 Ethereal Ambient Auras */}
      <div className="absolute top-0 end-0 h-80 w-80 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-0 start-0 h-80 w-80 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* 👑 Executive Header */}
      <CardHeader className="relative z-10 pb-5 border-b border-border/60 bg-muted/20 dark:bg-slate-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Title & Brand */}
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/15 shrink-0">
                <MessageSquare className="h-6 w-6 drop-shadow-sm" />
              </div>
              <span className="absolute -top-1 -end-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-black tracking-tight text-foreground">
                  {isRtl ? "مركز البث المباشر لإشعارات واتساب" : "WhatsApp Live Stream Broadcast Center"}
                </CardTitle>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isRtl ? "بث نشط" : "Active Feed"}
                </span>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {isRtl
                  ? "مراقبة لحظية ومباشرة لتدفق تنبيهات وإشعارات النظام الصادرة عبر WhatsApp Business API"
                  : "Live monitoring of all automated enterprise notifications dispatched via WhatsApp Business API"}
              </CardDescription>
            </div>
          </div>

          {/* 💎 4-Card Luxury KPI Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Sent Today */}
            <div className="group rounded-2xl p-2.5 border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent backdrop-blur-md shadow-xs transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                <span className="text-[11px] font-bold">{isRtl ? "المرسلة اليوم" : "Sent Today"}</span>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-black text-emerald-700 dark:text-emerald-300">
                  {stats.sentToday}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">{isRtl ? "رسالة" : "msgs"}</span>
              </div>
            </div>

            {/* Failed Today */}
            <div className="group rounded-2xl p-2.5 border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent backdrop-blur-md shadow-xs transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
                <span className="text-[11px] font-bold">{isRtl ? "المتعثرة اليوم" : "Failed Today"}</span>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-black text-rose-700 dark:text-rose-300">
                  {stats.failedToday}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">{isRtl ? "رسالة" : "msgs"}</span>
              </div>
            </div>

            {/* Total Logged */}
            <div className="group rounded-2xl p-2.5 border border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent backdrop-blur-md shadow-xs transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                <span className="text-[11px] font-bold">{isRtl ? "إجمالي السجلات" : "Total Logged"}</span>
                <Layers className="h-3.5 w-3.5 shrink-0" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-black text-blue-700 dark:text-blue-300">
                  {stats.total}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">{isRtl ? "إشعار" : "total"}</span>
              </div>
            </div>

            {/* Delivery Rate */}
            <div className="group rounded-2xl p-2.5 border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent backdrop-blur-md shadow-xs transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400 mb-1">
                <span className="text-[11px] font-bold">{isRtl ? "معدل الوصول" : "Delivery Rate"}</span>
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-black text-cyan-700 dark:text-cyan-300">
                  {successRate}%
                </span>
                <span className="text-[10px] text-emerald-500 font-bold">{isRtl ? "ناجح" : "good"}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* 🚀 High-Tech Financial Broadcast Ticker */}
      <div
        className="ticker relative flex items-stretch bg-slate-950 text-white border-b border-border/50 shadow-inner overflow-hidden select-none"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-black tracking-wide text-white shrink-0 shadow-md shadow-emerald-950 z-20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white shadow-[0_0_8px_white]" />
          </span>
          <span className="uppercase text-[11px]">{isRtl ? "شريط البث" : "LIVE TICKER"}</span>
        </div>

        <div className="relative flex-1 overflow-hidden" dir="ltr">
          {tickerItems.length === 0 ? (
            <div className="px-5 py-2.5 text-xs text-slate-400 font-medium" dir={isRtl ? "rtl" : "ltr"}>
              {isLoading
                ? isRtl
                  ? "جاري تهيئة البث المباشر..."
                  : "Initializing live stream..."
                : isRtl
                ? "في انتظار تدفق الإشعارات الجديدة عبر النظام..."
                : "Waiting for incoming notifications..."}
            </div>
          ) : (
            <div
              className="ticker-track py-2.5"
              style={{ ["--ticker-duration" as string]: `${duration}s` }}
            >
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
                  {tickerRow.map((m) => (
                    <span
                      key={m.id + copy}
                      className="inline-flex items-center gap-2.5 px-6 text-xs whitespace-nowrap border-s border-white/10 group cursor-default transition-colors hover:text-emerald-300"
                      dir={isRtl ? "rtl" : "ltr"}
                    >
                      {m.status === "SENT" ? (
                        <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/30">
                          <CheckCheck className="h-3 w-3" />
                        </span>
                      ) : (
                        <span className="h-5 w-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 ring-1 ring-rose-500/30">
                          <XCircle className="h-3 w-3" />
                        </span>
                      )}
                      <bdi className="font-mono font-bold text-slate-200 group-hover:text-white">
                        {formatPhoneNumber(m.to)}
                      </bdi>
                      <span className="text-slate-300 font-medium">{headline(m, isRtl)}</span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
                        {ago(m.at)}
                      </span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CardContent className="pt-5 space-y-4">
        {/* 🎛️ Toolbar: Filter Tabs + Search Box + Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
          {/* Segmented Filter Pills */}
          <div className="inline-flex rounded-2xl bg-muted/60 p-1 border border-border/50 text-xs font-bold shadow-2xs self-start" role="tablist">
            {(
              [
                ["ALL", isRtl ? "كافة الرسائل" : "All Messages", stats.total],
                ["SENT", isRtl ? "المسلّمة (ناجحة)" : "Delivered", stats.sentToday],
                ["FAILED", isRtl ? "المتعثرة (فشل)" : "Failed", stats.failedToday],
              ] as const
            ).map(([id, label, count]) => {
              const active = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 transition-all text-xs font-bold cursor-pointer",
                    active
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                  )}
                >
                  {id === "SENT" && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                  {id === "FAILED" && <span className="h-2 w-2 rounded-full bg-rose-500" />}
                  <span>{label}</span>
                  <span
                    className={cn(
                      "ms-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                      active ? "bg-primary/10 text-primary font-black" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input & Live Refresh Status */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? "بحث برقم الجوال أو المحتوى..." : "Search phone or text..."}
                className="h-8.5 rounded-xl ps-9 pe-3 text-xs bg-background/60 border-border/70 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500"
              />
            </div>

            {dataUpdatedAt ? (
              <span className="text-[11px] text-muted-foreground hidden md:inline-block font-mono">
                {isRtl ? "مزامنة: " : "Sync: "}
                {ago(new Date(dataUpdatedAt).toISOString())}
              </span>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              title={isRtl ? "تحديث البث فورياً" : "Refresh stream"}
              className="h-8.5 w-8.5 p-0 rounded-xl border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin text-emerald-500")} />
            </Button>
          </div>
        </div>

        {/* 💬 Messages Timeline Feed */}
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 py-12 px-4 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Radio className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">
              {searchQuery
                ? isRtl
                  ? "لا توجد رسائل مطابقة لبحثك"
                  : "No messages match your search criteria"
                : isRtl
                ? "سجل البث المباشر خالٍ حالياً"
                : "No messages in the live broadcast feed"}
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {searchQuery
                ? isRtl
                  ? "جرب البحث برقم جوال آخر أو مسح عبارة البحث"
                  : "Try searching with a different term or clear the filter"
                : isRtl
                ? "ستظهر الإشعارات هنا لحظياً وفورياً بمجرد إرسال النظام لأي تنبيه رسمي أو رسالة تجريبية."
                : "Notifications will appear here in real time as alerts are dispatched."}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Spine Line */}
            <div className="absolute top-4 bottom-4 start-4 sm:start-5 w-0.5 bg-gradient-to-b from-emerald-500/30 via-border/50 to-transparent pointer-events-none" />

            <ul className="max-h-[580px] overflow-y-auto space-y-4 pe-2 ps-1">
              {filteredItems.map((m) => {
                const isSent = m.status === "SENT";
                const isTest = m.kind === "TEST";
                const isFresh = fresh.has(m.id);
                const isCopied = copiedId === m.to;

                return (
                  <li
                    key={m.id}
                    className={cn(
                      "relative flex items-start gap-3 sm:gap-4 transition-all",
                      isFresh && "animate-in fade-in slide-in-from-top-4 duration-500"
                    )}
                  >
                    {/* Timeline Node Ring */}
                    <div
                      className={cn(
                        "relative z-10 mt-1 h-8 w-8 sm:h-9 sm:w-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 transition-transform hover:scale-105 shadow-sm",
                        isSent
                          ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-4 ring-emerald-500/15 shadow-emerald-500/20"
                          : "bg-gradient-to-br from-rose-600 to-red-700 text-white ring-4 ring-rose-500/15 shadow-rose-500/20"
                      )}
                    >
                      {isSent ? (
                        <CheckCheck className="h-4 w-4 drop-shadow-xs" />
                      ) : (
                        <XCircle className="h-4 w-4 drop-shadow-xs" />
                      )}
                    </div>

                    {/* Message Bubble Container */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Contact & Meta Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-foreground tracking-tight text-xs sm:text-sm">
                            {m.name || (isRtl ? "المستلم" : "Recipient")}
                          </span>

                          {m.to && (
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(m.to)}
                              title={isRtl ? "انقر لنسخ رقم الجوال" : "Click to copy phone number"}
                              className="group inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 px-2 py-0.5 text-[11px] font-mono text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                            >
                              <Phone className="h-2.5 w-2.5 opacity-70 group-hover:text-primary" />
                              <bdi dir="ltr">{formatPhoneNumber(m.to)}</bdi>
                              {isCopied ? (
                                <Check className="h-2.5 w-2.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100" />
                              )}
                            </button>
                          )}

                          {isTest ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
                              <FlaskConical className="h-3 w-3" />
                              {isRtl ? "رسالة تجريبية" : "Test Dispatch"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                              <ShieldCheck className="h-3 w-3" />
                              {isRtl ? "إشعار نظام رسمي" : "Official Alert"}
                            </span>
                          )}
                        </div>

                        {/* Relative Time Badge */}
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold ms-auto">
                          <Clock className="h-3 w-3 opacity-60" />
                          <span>{ago(m.at)}</span>
                        </div>
                      </div>

                      {/* 💬 Executive WhatsApp-Styled Chat Bubble */}
                      <div
                        className={cn(
                          "relative rounded-2xl rounded-ss-sm p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words max-w-2xl border transition-all shadow-md",
                          isSent
                            ? "bg-gradient-to-br from-emerald-50/90 via-background to-emerald-50/40 border-emerald-500/25 text-slate-800 dark:from-emerald-950/40 dark:via-slate-900/90 dark:to-emerald-950/20 dark:border-emerald-500/25 dark:text-slate-100 dark:shadow-[0_4px_20px_rgba(6,78,59,0.2)]"
                            : "bg-gradient-to-br from-rose-50/90 via-background to-rose-50/40 border-rose-500/25 text-slate-800 dark:from-rose-950/40 dark:via-slate-900/90 dark:to-rose-950/20 dark:border-rose-500/25 dark:text-slate-100 dark:shadow-[0_4px_20px_rgba(159,18,57,0.2)]"
                        )}
                        dir="rtl"
                      >
                        {/* Bubble Header Ribbon */}
                        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border/40 text-[11px]">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                isSent ? "bg-emerald-500" : "bg-rose-500"
                              )}
                            />
                            <span className={isSent ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
                              {isSent
                                ? isRtl
                                  ? "تم التسليم بنجاح عبر بوابة الأعمال"
                                  : "Successfully Dispatched via Gateway"
                                : isRtl
                                ? "تعذر تسليم الإشعار للمستلم"
                                : "Delivery Failed"}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                            WhatsApp Business API
                          </span>
                        </div>

                        {/* Bubble Content Body */}
                        <div className="text-foreground/90 font-medium">
                          {m.message ? (
                            <WhatsappText text={m.message} />
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground italic text-xs py-1">
                              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span>
                                {isRtl
                                  ? "سجل إشعار سابق — تم الإرسال بنجاح قبل تفعيل الأرشفة النصية المباشرة للمحتوى."
                                  : "Archived historical alert — successfully sent before direct payload logging."}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Diagnostic Error Box for Failed Messages */}
                        {!isSent && m.error && (
                          <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-700 dark:text-rose-300">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                              <div>
                                <p className="font-extrabold mb-1">
                                  {isRtl ? "تقرير سبب عدم الوصول:" : "Delivery Diagnostic Report:"}
                                </p>
                                <p className="text-[11px] leading-relaxed opacity-90 font-medium">
                                  {m.error.includes("مش مربوط") || m.error.includes("QR")
                                    ? isRtl
                                      ? "خدمة واتساب غير متصلة أو انتهت صلاحية الجلسة. يرجى التوجه لتبويب واتساب في الإعدادات ومسح رمز الاستجابة السريعة (QR Code) لإعادة التفعيل."
                                      : m.error
                                    : m.error}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Bubble Footer: Timestamp & Verified Checks */}
                        <div className="mt-2.5 pt-1.5 border-t border-border/20 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-mono text-[10px]">
                            ID: #{m.id.slice(-6)}
                          </span>

                          <div className="flex items-center gap-1.5 font-mono">
                            <span>
                              {new Date(m.at).toLocaleTimeString(isRtl ? "ar-SA" : "en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Riyadh",
                              })}
                            </span>

                            {isSent ? (
                              <CheckCheck className="h-4 w-4 text-sky-400 drop-shadow-[0_0_5px_rgba(56,189,248,0.6)]" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-rose-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
