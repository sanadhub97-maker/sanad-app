import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock,
  MessageSquareText,
  ImageIcon,
  Sparkles,
  Play,
  Loader2,
  CheckCircle2,
  CalendarClock,
  Layers,
  Info, Languages } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  settingsApi,
  type WhatsappDispatchMode,
  type WhatsappScheduleSettings,
} from "@/api/settings";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface WhatsappDispatchCardProps {
  canEdit: boolean;
  isRtl: boolean;
}

const PRESET_TIMES = [
  { label: "08:00 ص", value: "08:00", desc: "بداية الدوام" },
  { label: "09:00 ص", value: "09:00", desc: "موصى به", recommended: true },
  { label: "10:00 ص", value: "10:00", desc: "جولة الصباح" },
  { label: "01:00 م", value: "13:00", desc: "بعد الظهر" },
];

export function WhatsappDispatchCard({ canEdit, isRtl }: WhatsappDispatchCardProps) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["settings", "whatsapp", "schedule"],
    queryFn: settingsApi.getWhatsappSchedule,
  });

  const [mode, setMode] = useState<WhatsappDispatchMode>("both");
  const [time, setTime] = useState<string>("09:00");
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  useEffect(() => {
    if (data) {
      setMode(data.dispatchMode || "both");
      setTime(data.sendTime || "09:00");
      setLanguage(data.language === "en" ? "en" : "ar");
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (updated: Partial<WhatsappScheduleSettings>) =>
      settingsApi.updateWhatsappSchedule(updated),
    onSuccess: (res) => {
      queryClient.setQueryData(["settings", "whatsapp", "schedule"], res.data);
      // The design previews are drawn in the alert language.
      queryClient.invalidateQueries({ queryKey: ["settings", "whatsapp"], predicate: (q) => q.queryKey[2] !== "schedule" });
      toast.success(
        isRtl
          ? "تم حفظ طريقة إرسال التنبيهات وموعد الجدولة بنجاح"
          : "Alert delivery mode and schedule saved successfully"
      );
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const runScanMutation = useMutation({
    mutationFn: settingsApi.runExpirationScanNow,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["settings", "whatsapp", "messages"] });
      queryClient.invalidateQueries({ queryKey: ["settings", "whatsapp", "schedule"] });
      toast.success(
        isRtl
          ? `تم الفحص بنجاح: تم إرسال التنبيهات المستحقة (${res.data.dueCount} وثيقة)`
          : `Scan executed: ${res.data.dueCount} due documents processed`
      );
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const isDirty = data && (mode !== data.dispatchMode || time !== data.sendTime);

  const handleSave = () => {
    saveMutation.mutate({ dispatchMode: mode, sendTime: time, language });
  };

  const handleLanguage = (next: "ar" | "en") => {
    if (!canEdit || next === language) return;
    setLanguage(next);
    saveMutation.mutate({ dispatchMode: mode, sendTime: time, language: next });
  };

  const handleModeChange = (newMode: WhatsappDispatchMode) => {
    if (!canEdit) return;
    setMode(newMode);
    // Auto-save mode selection for a seamless experience
    saveMutation.mutate({ dispatchMode: newMode, sendTime: time, language });
  };

  const handleTimePreset = (newTime: string) => {
    if (!canEdit) return;
    setTime(newTime);
    saveMutation.mutate({ dispatchMode: mode, sendTime: newTime, language });
  };

  return (
    <Card className="overflow-hidden border-border/80 shadow-md">
      <CardHeader className="bg-gradient-to-r from-muted/50 via-background to-muted/30 pb-4 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-black tracking-tight flex items-center gap-2">
                <span>{isRtl ? "طريقة إرسال التنبيهات والجدولة اليومية" : "Alert Delivery Mode & Daily Schedule"}</span>
                <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  {isRtl ? "تلقائي يومياً" : "Daily Automated"}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {isRtl
                  ? "اختر ما إذا كان التنبيه يُرسل كنص فقط، أو كبطاقة فقط، أو كلاهما معاً، وحدد وقت الإرسال كل يوم."
                  : "Choose whether alerts send as text only, card only, or both together, and set the daily dispatch time."}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-9 gap-1.5 border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
              onClick={() => runScanMutation.mutate()}
              disabled={runScanMutation.isPending || !canEdit}
            >
              {runScanMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              <span>{isRtl ? "فحص وإرسال فوري الآن" : "Trigger Scan Now"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* The language of the WhatsApp and email alerts */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-black text-foreground flex items-center gap-1.5">
              <Languages className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isRtl ? "لغة التنبيهات (واتساب والبريد):" : "Alert language (WhatsApp & email):"}</span>
            </label>
            <span className="text-[11px] text-muted-foreground">
              {isRtl ? "الرسالة والبطاقة والبريد بلغة واحدة. تصميم «ثنائي اللغة» يبقى بالعربي والإنجليزي." : "The message, card and email in one language. The “Bilingual” design stays Arabic and English."}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md" role="radiogroup" aria-label={isRtl ? "لغة التنبيهات" : "Alert language"}>
            {(["ar", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={language === l}
                disabled={!canEdit}
                onClick={() => handleLanguage(l)}
                className={cn(
                  "h-11 rounded-2xl border text-sm font-bold transition-all",
                  language === l
                    ? "bg-emerald-500/10 border-emerald-500/80 text-emerald-700 ring-2 ring-emerald-500/30 dark:text-emerald-300"
                    : "bg-background/60 border-border/80 text-muted-foreground hover:bg-muted/30"
                )}
              >
                {l === "ar" ? "العربية" : "English"}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* Section 1: Dispatch Mode Selection (3 Cards)                   */}
        {/* ============================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isRtl ? "طريقة وشكل وصول التنبيه:" : "Alert Delivery Format:"}</span>
            </label>
            <span className="text-[11px] text-muted-foreground">
              {mode === "text_only" && (isRtl ? "رسالة تنبيه نصية فقط" : "Text Alert Only")}
              {mode === "card_only" && (isRtl ? "بطاقة تنبيه مصورة فقط" : "Card Image Only")}
              {mode === "both" && (isRtl ? "كلاهما معاً (نص تفصيلي + بطاقة مصممة)" : "Both Together (Text + Card)")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Option 1: Text Only */}
            <div
              onClick={() => handleModeChange("text_only")}
              className={cn(
                "group relative rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between select-none",
                mode === "text_only"
                  ? "bg-emerald-500/10 border-emerald-500/80 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                  : "bg-background/60 border-border/80 hover:border-border hover:bg-muted/30"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center transition-colors",
                    mode === "text_only"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "bg-muted text-muted-foreground group-hover:text-foreground"
                  )}>
                    <MessageSquareText className="h-4 w-4" />
                  </div>
                  <div className={cn(
                    "h-5 w-5 rounded-full border flex items-center justify-center transition-all",
                    mode === "text_only"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-muted-foreground/40 bg-transparent"
                  )}>
                    {mode === "text_only" && <CheckCircle2 className="h-4 w-4 fill-emerald-600 text-white" />}
                  </div>
                </div>

                <h4 className="text-xs font-black text-foreground">
                  {isRtl ? "رسالة تنبيه فقط" : "Alert Message Only"}
                </h4>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  {isRtl ? "نص تفصيلي منسق" : "Formatted Text Alert"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  {isRtl
                    ? "يتم إرسال إشعار نصي تفصيلي بالقالب المختار أدناه فقط، دون إرفاق أي صورة بطاقة."
                    : "Sends only the formatted text notification chosen below, without any card image attached."}
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                <span>⚡</span>
                <span>{isRtl ? "سريع وخفيف للبيانات" : "Fast & lightweight"}</span>
              </div>
            </div>

            {/* Option 2: Card Only */}
            <div
              onClick={() => handleModeChange("card_only")}
              className={cn(
                "group relative rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between select-none",
                mode === "card_only"
                  ? "bg-amber-500/10 border-amber-500/80 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/30"
                  : "bg-background/60 border-border/80 hover:border-border hover:bg-muted/30"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center transition-colors",
                    mode === "card_only"
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                      : "bg-muted text-muted-foreground group-hover:text-foreground"
                  )}>
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <div className={cn(
                    "h-5 w-5 rounded-full border flex items-center justify-center transition-all",
                    mode === "card_only"
                      ? "border-amber-600 bg-amber-600 text-white"
                      : "border-muted-foreground/40 bg-transparent"
                  )}>
                    {mode === "card_only" && <CheckCircle2 className="h-4 w-4 fill-amber-600 text-white" />}
                  </div>
                </div>

                <h4 className="text-xs font-black text-foreground">
                  {isRtl ? "رسالة تنبيه على شكل بطاقة فقط" : "Card Image Only"}
                </h4>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                  {isRtl ? "صورة رقمية فاخرة عالية الدقة" : "High-Res Executive Card"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  {isRtl
                    ? "يتم توليد بطاقة التنبيه المصممة وإرسالها كصورة عالية الدقة فقط (مع كابشن مختصر جداً دون نصوص طويلة)."
                    : "Generates the luxury card and sends it as a pure high-res picture with minimal caption."}
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                <span>🎨</span>
                <span>{isRtl ? "مظهر بصري متميز" : "Visual executive style"}</span>
              </div>
            </div>

            {/* Option 3: Both Together */}
            <div
              onClick={() => handleModeChange("both")}
              className={cn(
                "group relative rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between select-none",
                mode === "both"
                  ? "bg-gradient-to-b from-emerald-500/15 to-teal-500/10 border-emerald-500/80 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-500/30"
                  : "bg-background/60 border-border/80 hover:border-border hover:bg-muted/30"
              )}
            >
              <div className="absolute -top-2.5 end-4 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider shadow">
                {isRtl ? "الأشمل • موصى به" : "Complete"}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center transition-colors",
                    mode === "both"
                      ? "bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30"
                      : "bg-muted text-muted-foreground group-hover:text-foreground"
                  )}>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className={cn(
                    "h-5 w-5 rounded-full border flex items-center justify-center transition-all",
                    mode === "both"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-muted-foreground/40 bg-transparent"
                  )}>
                    {mode === "both" && <CheckCircle2 className="h-4 w-4 fill-emerald-600 text-white" />}
                  </div>
                </div>

                <h4 className="text-xs font-black text-foreground">
                  {isRtl ? "كلاهما معاً (رسالة + بطاقة)" : "Both Together"}
                </h4>
                <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-0.5">
                  {isRtl ? "رسالة تفصيلية + بطاقة توثيق" : "Full Text + Document Card"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  {isRtl
                    ? "يتم إرسال رسالة التنبيه النصية الكاملة متبوعة ببطاقة التنبيه المصممة الفاخرة لتوثيق فوري متكامل."
                    : "Sends the detailed text alert followed by the luxury card image for a complete executive alert."}
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                <span>💎</span>
                <span>{isRtl ? "التجربة المتكاملة الفاخرة" : "Ultimate corporate experience"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* Section 2: Daily Scheduled Send Time                           */}
        {/* ============================================================== */}
        <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <label className="text-xs font-black text-foreground block">
                  {isRtl ? "وقت إرسال التنبيهات اليومي:" : "Daily Automated Dispatch Time:"}
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {isRtl
                    ? "حدد الساعة والدقيقة التي يبدأ فيها النظام فحص الوثائق وإرسال التنبيهات يومياً."
                    : "Set the exact time when daily document checks and automated dispatches run."}
                </span>
              </div>
            </div>

            {/* Time input */}
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={!canEdit}
                className="h-10 px-3.5 py-1.5 rounded-xl border border-input bg-background text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              />
              {isDirty && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !canEdit}
                  className="h-10 text-xs font-bold gap-1"
                >
                  {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>{isRtl ? "حفظ الوقت" : "Save Time"}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
            <span className="text-[11px] text-muted-foreground font-medium me-1">
              {isRtl ? "أوقات شائعة سريعة:" : "Quick presets:"}
            </span>
            {PRESET_TIMES.map((preset) => {
              const active = time === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleTimePreset(preset.value)}
                  disabled={!canEdit}
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all border",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background/80 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  <span>{preset.label}</span>
                  {preset.recommended && (
                    <span className="ms-1.5 text-[9px] font-sans opacity-80">
                      ({isRtl ? "موصى به" : "rec"})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Schedule Telemetry & Last Run Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-primary" />
              <span>
                {isRtl
                  ? `الجدولة الحالية: يتم الإرسال يومياً في تمام الساعة ${time} بتوقيت مكة المكرمة (GMT+3).`
                  : `Active schedule: Runs every day at ${time} (Asia/Riyadh, GMT+3).`}
              </span>
            </div>
            {data?.lastRunAt && (
              <span className="font-mono text-[10px] text-muted-foreground/80">
                {isRtl ? "آخر فحص ناجح: " : "Last successful scan: "}
                {new Date(data.lastRunAt).toLocaleDateString(isRtl ? "ar-SA" : "en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
