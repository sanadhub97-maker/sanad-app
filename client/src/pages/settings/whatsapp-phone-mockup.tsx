import {
  ShieldCheck,
  Wifi,
  Battery,
  Phone,
  Video,
  MoreVertical,
  Check,
  Paperclip,
  Smile,
  Mic,
  ArrowRight,
  Sparkles,
  Smartphone,
  Lock,
} from "lucide-react";
import type { WhatsappMessageItem } from "@/api/settings";
import { cn } from "@/lib/utils";
import { WhatsappText } from "./whatsapp-text";

interface WhatsappPhoneMockupProps {
  messages: WhatsappMessageItem[];
  selectedId: string | null;
  onSelectMessage: (id: string) => void;
  isRtl: boolean;
}

export function WhatsappPhoneMockup({
  messages,
  selectedId,
  onSelectMessage,
  isRtl,
}: WhatsappPhoneMockupProps) {
  // Find selected message or fallback to the latest message
  const activeMessage =
    messages.find((m) => m.id === selectedId) ?? messages[0] ?? null;

  return (
    <div className="relative mx-auto flex flex-col items-center select-none">
      {/* 👑 Luxury Header Badge */}
      <div className="mb-3 flex items-center justify-between w-full max-w-[340px] px-1">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
          <Smartphone className="h-3.5 w-3.5" />
          <span>{isRtl ? "محاكي الهاتف التنفيذي الحي" : "Executive Live Device Simulation"}</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">iPhone 16 Pro</span>
      </div>

      {/* 📱 The Titanium Chassis Container */}
      <div className="relative w-[340px] h-[660px] rounded-[50px] p-[10px] bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 shadow-[0_25px_70px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.15)] ring-1 ring-black/40">
        {/* Specular Edge Highlights */}
        <div className="absolute inset-x-12 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full" />
        <div className="absolute inset-y-16 -start-[3px] w-[3px] h-12 bg-slate-700 rounded-s-md" /> {/* Volume up */}
        <div className="absolute inset-y-32 -start-[3px] w-[3px] h-12 bg-slate-700 rounded-s-md" /> {/* Volume down */}
        <div className="absolute inset-y-24 -end-[3px] w-[3px] h-16 bg-slate-700 rounded-e-md" /> {/* Power */}

        {/* 📺 OLED Screen Glass */}
        <div className="relative w-full h-full rounded-[40px] overflow-hidden flex flex-col bg-[#0b141a] text-slate-100 shadow-inner">
          {/* ⚡ Dynamic Island & Status Bar */}
          <div className="relative z-30 pt-2 px-6 pb-1 bg-[#1f2c34] flex items-center justify-between text-[11px] font-semibold text-slate-200">
            {/* Clock */}
            <span className="font-mono tracking-tight text-xs font-bold">09:41</span>

            {/* Dynamic Island Pill */}
            <div className="absolute left-1/2 -translate-x-1/2 top-2 h-5 w-24 bg-black rounded-full flex items-center justify-between px-2.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500/80 animate-pulse motion-reduce:animate-none" />
              <div className="h-2.5 w-2.5 rounded-full bg-slate-900 border border-slate-700" />
            </div>

            {/* Telemetry Icons */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <Wifi className="h-3 w-3" />
              <span className="text-[10px] font-mono">5G</span>
              <Battery className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* 🟢 WhatsApp Executive App Header */}
          <div className="relative z-20 px-3 py-2.5 bg-[#1f2c34] border-b border-white/5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <ArrowRight className={cn("h-4 w-4 text-emerald-400", !isRtl && "rotate-180")} />
              
              {/* SanaD Avatar */}
              <div className="relative h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center text-white font-black text-sm shadow-md ring-2 ring-emerald-500/30">
                <span>S</span>
                <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#1f2c34] flex items-center justify-center text-[8px] text-white">
                  ✓
                </span>
              </div>

              {/* Title & Status */}
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black truncate max-w-[120px] text-white">
                    SanaD Alerts
                  </span>
                  <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />
                </div>
                <div className="text-[9px] text-emerald-400/90 font-medium truncate flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
                  <span>{isRtl ? "رسائل النظام التلقائية" : "Automated system messages"}</span>
                </div>
              </div>
            </div>

            {/* Call / Action Icons */}
            <div className="flex items-center gap-3 text-emerald-400">
              <Video className="h-4 w-4 opacity-80" />
              <Phone className="h-4 w-4 opacity-80" />
              <MoreVertical className="h-4 w-4 opacity-80" />
            </div>
          </div>

          {/* 💬 WhatsApp Chat Area with Pattern */}
          <div className="relative flex-1 overflow-y-auto p-3 space-y-3 wa-chat-pattern">
            {/* E2EE Security Card */}
            <div className="mx-auto max-w-[260px] rounded-lg bg-[#182229]/90 border border-amber-500/20 p-2 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-400/90 mb-0.5">
                <Lock className="h-2.5 w-2.5" />
                <span>{isRtl ? "تشفير تام بين الطرفين" : "End-to-End Encrypted"}</span>
              </div>
              <p className="text-[8.5px] leading-relaxed text-slate-400">
                {isRtl
                  ? "الرسائل والمكالمات في هذه المحادثة مشفرة بأحدث بروتوكولات الأمان المؤسسي."
                  : "Messages and notifications in this chat are securely end-to-end encrypted."}
              </p>
            </div>

            {/* Date Pill */}
            <div className="flex justify-center">
              <span className="rounded-md bg-[#182229] px-2.5 py-0.5 text-[9px] font-semibold text-slate-400 shadow-sm">
                {isRtl ? "اليوم" : "Today"}
              </span>
            </div>

            {/* Active Message Bubble */}
            {activeMessage ? (
              <div className="flex flex-col items-start space-y-1 animate-in fade-in duration-300">
                {/* Official Message Bubble */}
                <div
                  className={cn(
                    "relative max-w-[88%] rounded-2xl p-3 shadow-md text-xs leading-relaxed",
                    activeMessage.status === "SENT"
                      ? "bg-[#005c4b] text-slate-100 rounded-tr-none"
                      : "bg-[#451e24] text-rose-100 border border-rose-500/30 rounded-tr-none"
                  )}
                >
                  {/* Subtle Bubble Tail pointer */}
                  <div
                    className={cn(
                      "absolute top-0 -end-2 w-0 h-0 border-t-[8px] border-e-[8px] border-e-transparent",
                      activeMessage.status === "SENT" ? "border-t-[#005c4b]" : "border-t-[#451e24]"
                    )}
                  />

                  {/* Header Tag */}
                  <div className="flex items-center justify-between gap-2 pb-1 mb-1.5 border-b border-white/10 text-[9px] font-mono text-emerald-200">
                    <span className="font-bold flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                      {activeMessage.kind === "TEST"
                        ? isRtl
                          ? "رسالة اختبارية"
                          : "Test Dispatch"
                        : isRtl
                        ? "إشعار نظام تلقائي"
                        : "Automated System Alert"}
                    </span>
                    <span className="opacity-80">#{activeMessage.id.slice(-6)}</span>
                  </div>

                  {/* Message Body */}
                  <div className="text-[11px] whitespace-pre-wrap leading-relaxed font-sans">
                    {activeMessage.message ? <WhatsappText text={activeMessage.message} /> : (
                      <span className="italic opacity-80 text-[10px]">
                        {isRtl
                          ? "سجل إشعار رسمي سابق تم تسليمه بنجاح للمستلم."
                          : "Historical official notification successfully dispatched."}
                      </span>
                    )}
                  </div>

                  {/* Diagnostic notice if failed */}
                  {activeMessage.status === "FAILED" && (
                    <div className="mt-2 rounded bg-black/30 p-1.5 text-[9px] text-rose-200 border border-rose-400/20">
                      <div className="font-bold mb-0.5 text-rose-300">
                        {isRtl ? "تنبيه النظام:" : "System Notice:"}
                      </div>
                      <div className="opacity-90 leading-tight">
                        {activeMessage.error || (isRtl ? "تعذر الإرسال" : "Dispatch failed")}
                      </div>
                    </div>
                  )}

                  {/* Bubble Metadata Footer */}
                  <div className="mt-2 flex items-center justify-end gap-1 text-[9px] text-slate-300/80 font-mono">
                    <span>
                      {new Date(activeMessage.at).toLocaleTimeString(isRtl ? "ar-SA" : "en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Riyadh",
                      })}
                    </span>
                    {activeMessage.status === "SENT" ? (
                      <Check className="h-3.5 w-3.5 text-slate-300/80" />
                    ) : (
                      <span className="text-rose-400 font-bold">!</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 p-4">
                <Smartphone className="h-8 w-8 mb-2 opacity-40 text-emerald-400" />
                <p className="text-xs font-bold text-slate-300">
                  {isRtl ? "في انتظار بث التنبيهات" : "Awaiting Broadcast Alerts"}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isRtl
                    ? "ستظهر الرسائل داخل هذا الهاتف التفاعلي فور إرسالها."
                    : "Live alerts will animate on this phone screen in real time."}
                </p>
              </div>
            )}
          </div>

          {/* ⌨️ WhatsApp Input Bar */}
          <div className="relative z-20 px-2 py-2 bg-[#1f2c34] border-t border-white/5 flex items-center gap-1.5 shadow-md">
            <div className="flex items-center gap-1 text-slate-400">
              <Smile className="h-4 w-4" />
              <Paperclip className="h-4 w-4" />
            </div>

            <div className="flex-1 rounded-full bg-[#2a3942] px-3 py-1.5 text-[11px] text-slate-400 flex items-center">
              <span>{isRtl ? "رسالة رسمية مشفرة..." : "Encrypted alert..."}</span>
            </div>

            <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Mic className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Home Indicator Bar */}
          <div className="h-4 bg-[#1f2c34] flex items-center justify-center">
            <div className="h-1 w-28 bg-slate-600 rounded-full" />
          </div>
        </div>
      </div>

      {/* 🧭 Recent Quick Selector Pills under phone */}
      {messages.length > 1 && (
        <div className="mt-3 flex items-center gap-1.5 max-w-[340px] overflow-x-auto py-1 px-1">
          <span className="text-[10px] font-bold text-muted-foreground shrink-0">
            {isRtl ? "اختر رسالة:" : "Select:"}
          </span>
          {messages.slice(0, 4).map((m, idx) => (
            <button
              key={m.id}
              onClick={() => onSelectMessage(m.id)}
              className={cn(
                "rounded-lg px-2 py-0.5 text-[10px] font-mono transition-all shrink-0 border",
                (selectedId === m.id || (!selectedId && idx === 0))
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold shadow-sm"
                  : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted/70"
              )}
            >
              #{m.id.slice(-4)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
