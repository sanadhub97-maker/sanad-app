import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Radio,
  XCircle,
  Sparkles,
  MessageSquare,
  Clock,
  Search,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Phone,
  Layers,
  TrendingUp,
  Smartphone,
  Columns,
  List,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { settingsApi } from "@/api/settings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WhatsappPhoneMockup } from "./whatsapp-phone-mockup";
import { WhatsappText } from "./whatsapp-text";

const POLL_MS = 8000;

function useRelativeTime(isRtl: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const rtf = useMemo(
    () =>
      new Intl.RelativeTimeFormat(isRtl ? "ar-SA" : "en-GB", {
        numeric: "auto",
        style: "narrow",
      }),
    [isRtl]
  );

  return function formatAgo(iso: string) {
    const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const abs = Math.abs(diffSec);
    if (abs < 30) return isRtl ? "الآن" : "just now";
    if (abs < 90) return isRtl ? "قبل دقيقة" : "1 min ago";
    if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
    return rtf.format(Math.round(diffSec / 86400), "day");
  };
}

function formatPhoneDisplay(phone: string | null): string {
  if (!phone) return "";
  const clean = phone.replace(/[^\d+]/g, "");
  if (clean.startsWith("+966") && clean.length === 13) {
    return `+966 ${clean.slice(4, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`;
  }
  if (clean.startsWith("+20") && clean.length === 13) {
    return `+20 ${clean.slice(3, 5)} ${clean.slice(5, 9)} ${clean.slice(9)}`;
  }
  return clean;
}

/**
 * 👑 Ultra-Luxury Executive WhatsApp Live Feed & Dispatch Command Center
 * Features:
 * - Dual-pane Command Stream + Interactive iPhone 16 Pro Live Simulator
 * - Holographic KPI Jewel Strip & Bloomberg-style Telemetry News Ticker
 * - Deep Obsidian Glassmorphism with Dynamic Aurora Highlights
 */
export function WhatsappLiveFeed({ isRtl }: { isRtl: boolean }) {
  const [filter, setFilter] = useState<"ALL" | "SENT" | "FAILED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"dual" | "stream" | "phone">("dual");

  const { data, isFetching, refetch, dataUpdatedAt } = useQuery({
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
  const attemptedToday = stats.sentToday + stats.failedToday;
  // Share of today's sends that went through; null on a day with no sends.
  const successRate = attemptedToday > 0 ? Math.round((stats.sentToday / attemptedToday) * 100) : null;

  async function handleCopyPhone(phone: string | null) {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
    } catch {
      toast.error(isRtl ? "تعذر النسخ — انسخ الرقم يدوياً" : "Couldn't copy — copy the number manually");
      return;
    }
    setCopiedId(phone);
    toast.success(isRtl ? "تم نسخ الرقم إلى الحافظة بنجاح" : "Phone number copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <Card id="whatsapp-live-stream-panel" className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl transition-all dark:border-white/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
      {/* 🌟 Ambient Royal Gradient Hairline */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 via-cyan-400 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10" />

      {/* 🔮 Ethereal Ambient Auras */}
      <div className="absolute top-0 end-0 h-96 w-96 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-0 start-0 h-96 w-96 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

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
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-black tracking-tight text-foreground">
                  {isRtl ? "مركز البث المباشر لإشعارات واتساب" : "WhatsApp Live Stream Broadcast Center"}
                </CardTitle>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                  {isRtl ? "بث نشط" : "Active Feed"}
                </span>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {isRtl
                  ? "مراقبة لحظية لتنبيهات النظام المرسلة عبر واتساب، مع معاينة على شكل هاتف"
                  : "Live monitoring and real-time device simulation of all automated enterprise notifications"}
              </CardDescription>
            </div>
          </div>

          {/* 💎 4-Card Luxury KPI Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Sent Today */}
            <div className="group rounded-2xl p-2.5 border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent backdrop-blur-md shadow-sm transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                <span>{isRtl ? "المرسلة اليوم" : "Sent Today"}</span>
                <Check className="h-3.5 w-3.5 opacity-80" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black tracking-tight text-foreground font-mono">
                  {stats.sentToday}
                </span>
                <span className="text-[10px] text-muted-foreground">{isRtl ? "رسالة" : "msgs"}</span>
              </div>
            </div>

            {/* Failed Today */}
            <div className="group rounded-2xl p-2.5 border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent backdrop-blur-md shadow-sm transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1">
                <span>{isRtl ? "المتعثرة اليوم" : "Failed Today"}</span>
                <AlertTriangle className="h-3.5 w-3.5 opacity-80" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black tracking-tight text-foreground font-mono">
                  {stats.failedToday}
                </span>
                <span className="text-[10px] text-muted-foreground">{isRtl ? "رسالة" : "msgs"}</span>
              </div>
            </div>

            {/* Total Logged */}
            <div className="group rounded-2xl p-2.5 border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent backdrop-blur-md shadow-sm transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                <span>{isRtl ? "إجمالي السجلات" : "Total Logs"}</span>
                <Layers className="h-3.5 w-3.5 opacity-80" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black tracking-tight text-foreground font-mono">
                  {stats.total}
                </span>
                <span className="text-[10px] text-muted-foreground">{isRtl ? "إشعار" : "total"}</span>
              </div>
            </div>

            {/* Delivery Rate */}
            <div className="group rounded-2xl p-2.5 border border-teal-500/25 bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent backdrop-blur-md shadow-sm transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between text-[11px] font-bold text-teal-600 dark:text-teal-400 mb-1">
                <span>{isRtl ? "نجاح الإرسال اليوم" : "Sent OK Today"}</span>
                <TrendingUp className="h-3.5 w-3.5 opacity-80" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black tracking-tight text-foreground font-mono">
                  {successRate === null ? "—" : `${successRate}%`}
                </span>
                {successRate !== null && (
                  <span className="text-[10px] text-emerald-500 font-bold">{isRtl ? "ناجح" : "pass"}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* 📡 High-Tech Bloomberg Broadcast Ticker */}
      <div className="relative border-b border-border/40 bg-slate-950 text-slate-100 overflow-hidden select-none py-1.5 flex items-center">
        <div className="z-10 bg-emerald-600 px-3 py-1 flex items-center gap-1.5 font-black text-xs text-white uppercase tracking-wider shrink-0 shadow-md">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse motion-reduce:animate-none" />
          <span>{isRtl ? "شريط البث" : "Live Ticker"}</span>
        </div>

        {/* The track slides left-to-right in both languages; each item keeps its own direction. */}
        <div className="ticker flex-1 overflow-hidden relative" dir="ltr">
          {tickerItems.length === 0 ? (
            <div className="px-4 text-xs text-slate-400 italic" dir={isRtl ? "rtl" : "ltr"}>
              {!data
                ? isRtl ? "جاري تهيئة البث المباشر..." : "Initializing live stream feed..."
                : isRtl ? "لا توجد رسائل بعد" : "No messages yet"}
            </div>
          ) : (
            <div
              className="ticker-track"
              style={{ ["--ticker-duration" as any]: `${duration}s` }}
            >
              {[0, 1].map((copyIndex) => (
                <div key={copyIndex} className="inline-flex items-center gap-3 pe-6" aria-hidden={copyIndex === 1}>
                  {tickerRow.map((m) => {
                    const isSent = m.status === "SENT";
                    return (
                      <button
                        type="button"
                        key={`${copyIndex}-${m.id}`}
                        dir={isRtl ? "rtl" : "ltr"}
                        tabIndex={copyIndex === 1 ? -1 : undefined}
                        onClick={() => setSelectedMessageId(m.id)}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900/90 border border-slate-800 px-2.5 py-1 text-xs hover:border-emerald-500/50 hover:bg-slate-800 transition-all cursor-pointer"
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            isSent ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                          )}
                        />
                        <span dir="ltr" className="font-mono font-bold text-slate-200">
                          {formatPhoneDisplay(m.to) || (isRtl ? "رقم غير محدد" : "Unknown")}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {m.kind === "TEST"
                            ? isRtl
                              ? "اختبار تجريبي"
                              : "Test"
                            : isRtl
                            ? "إشعار تنبيه تلقائي"
                            : "Auto Alert"}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {ago(m.at)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CardContent className="pt-5 space-y-5">
        {/* 🎛️ Command Toolbar: Filters, Search, Layout Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/40 border border-border/60">
            {(
              [
                ["ALL", isRtl ? "كافة الرسائل" : "All Messages", stats.total],
                ["SENT", isRtl ? "المرسلة (ناجحة)" : "Sent", null],
                ["FAILED", isRtl ? "المتعثرة (فشل)" : "Failed", null],
              ] as const
            ).map(([val, label, count]) => {
              const active = filter === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFilter(val)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                    active
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      val === "SENT" ? "bg-emerald-500" : val === "FAILED" ? "bg-rose-500" : "bg-sky-500"
                    )}
                  />
                  <span>{label}</span>
                  {count !== null && (
                    <span
                      className={cn(
                        "ms-1 rounded-full px-1.5 py-px text-[10px] font-mono",
                        active ? "bg-primary/10 text-primary font-black" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search, Sync status, and View Layout Modes */}
          <div className="flex items-center gap-2">
            {/* View Mode Selector (Dual vs Stream vs Phone) */}
            <div className="hidden lg:flex items-center gap-1 p-0.5 rounded-xl bg-muted/40 border border-border/60">
              <button
                type="button"
                onClick={() => setViewMode("dual")}
                title={isRtl ? "عرض مزدوج: السجل + الهاتف" : "Dual View"}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  viewMode === "dual"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Columns className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("stream")}
                title={isRtl ? "سجل البث فقط" : "Stream Feed Only"}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  viewMode === "stream"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("phone")}
                title={isRtl ? "محاكي الهاتف فقط" : "Phone Simulator Only"}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  viewMode === "phone"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[190px] flex-1 sm:flex-initial">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? "بحث برقم الجوال أو المحتوى..." : "Search phone or text..."}
                className="h-9 rounded-xl ps-9 pe-3 text-xs bg-background/60 border-border/70 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500"
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
              className="h-9 w-9 p-0 rounded-xl border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin text-emerald-500")} />
            </Button>
          </div>
        </div>

        {/* 📱 Master Layout: Split View / Stream / Phone */}
        <div
          className={cn(
            "grid gap-6 items-start transition-all",
            viewMode === "dual"
              ? "grid-cols-1 xl:grid-cols-12"
              : viewMode === "phone"
              ? "grid-cols-1 max-w-lg mx-auto"
              : "grid-cols-1"
          )}
        >
          {/* Main Feed Column */}
          {viewMode !== "phone" && (
            <div
              className={cn(
                "min-w-0 space-y-4",
                viewMode === "dual" ? "xl:col-span-7 2xl:col-span-8" : "w-full"
              )}
            >
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

                  <ul className="max-h-[640px] overflow-y-auto space-y-4 pe-2 ps-1">
                    {filteredItems.map((m) => {
                      const isSent = m.status === "SENT";
                      const isTest = m.kind === "TEST";
                      const isFresh = fresh.has(m.id);
                      const isCopied = copiedId === m.to;
                      const isSelected = selectedMessageId === m.id;

                      return (
                        <li
                          key={m.id}
                          className={cn(
                            "relative flex items-start gap-3 sm:gap-4 transition-all group",
                            isFresh && "animate-in fade-in slide-in-from-top-4 duration-500"
                          )}
                        >
                          {/* Timeline Node Ring */}
                          <div
                            className={cn(
                              "relative z-10 mt-1 h-8 w-8 sm:h-9 sm:w-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 transition-transform group-hover:scale-110 shadow-sm",
                              isSent
                                ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-4 ring-emerald-500/15 shadow-emerald-500/20"
                                : "bg-gradient-to-br from-rose-600 to-red-700 text-white ring-4 ring-rose-500/15 shadow-rose-500/20"
                            )}
                          >
                            {isSent ? (
                              <Check className="h-4 w-4 drop-shadow-sm" />
                            ) : (
                              <XCircle className="h-4 w-4 drop-shadow-sm" />
                            )}
                          </div>

                          {/* Message Bubble Container */}
                          <div
                            onClick={() => setSelectedMessageId(m.id)}
                            className={cn(
                              "min-w-0 flex-1 space-y-1.5 cursor-pointer rounded-2xl p-1 transition-all",
                              isSelected && "ring-2 ring-emerald-500/50 shadow-md shadow-emerald-500/10"
                            )}
                          >
                            {/* Contact & Meta Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-foreground tracking-tight">
                                  {m.name || (isRtl ? "المستلم" : "Recipient")}
                                </span>
                                {m.to && (
                                  <div className="inline-flex items-center gap-1 rounded-md bg-muted/60 border border-border/40 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
                                    <Phone className="h-2.5 w-2.5 opacity-70" />
                                    <span dir="ltr">{formatPhoneDisplay(m.to)}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyPhone(m.to);
                                      }}
                                      title={isRtl ? "نسخ الرقم" : "Copy number"}
                                      className="ms-1 hover:text-emerald-500 transition-colors"
                                    >
                                      {isCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm",
                                    isTest
                                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  )}
                                >
                                  {isTest ? <Sparkles className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                                  <span>{isTest ? (isRtl ? "رسالة تجريبية" : "Test Alert") : isRtl ? "تنبيه تلقائي" : "Auto Alert"}</span>
                                </span>

                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3 opacity-60" />
                                  <span>{ago(m.at)}</span>
                                </span>
                              </div>
                            </div>

                            {/* Executive Obsidian Bubble Card */}
                            <div
                              className={cn(
                                "relative rounded-2xl p-4 transition-all border shadow-sm",
                                isSent
                                  ? "bg-gradient-to-br from-emerald-500/[0.04] via-emerald-500/[0.02] to-transparent border-emerald-500/25 dark:bg-slate-900/60"
                                  : "bg-gradient-to-br from-rose-500/[0.05] via-rose-500/[0.02] to-transparent border-rose-500/30 dark:bg-slate-900/60"
                              )}
                            >
                              {/* Official Ribbon Header */}
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40 text-xs">
                                <div className="flex items-center gap-2 font-bold">
                                  <span
                                    className={cn(
                                      "h-2 w-2 rounded-full",
                                      isSent ? "bg-emerald-500" : "bg-rose-500"
                                    )}
                                  />
                                  <span className={isSent ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
                                    {isSent
                                      ? isRtl
                                        ? "تم الإرسال بنجاح"
                                        : "Sent successfully"
                                      : isRtl
                                      ? "تعذر تسليم الإشعار للمستلم"
                                      : "Delivery Failed"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="hidden sm:inline-block text-[10px] text-emerald-600 dark:text-emerald-400/80 font-semibold">
                                    {isRtl ? "عرض في الهاتف ←" : "View in phone →"}
                                  </span>
                                  
                                </div>
                              </div>

                              {/* Bubble Content Body */}
                              <div className="text-foreground/90 font-medium text-xs sm:text-sm whitespace-pre-wrap break-words">
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
                                    <Check className="h-4 w-4 text-muted-foreground" />
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
            </div>
          )}

          {/* 📱 Interactive iPhone 16 Pro Simulator Column */}
          {viewMode !== "stream" && (
            <div
              className={cn(
                "sticky top-6 flex justify-center py-2",
                viewMode === "dual" ? "xl:col-span-5 2xl:col-span-4" : "w-full"
              )}
            >
              <WhatsappPhoneMockup
                messages={filteredItems}
                selectedId={selectedMessageId}
                onSelectMessage={(id) => setSelectedMessageId(id)}
                isRtl={isRtl}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
