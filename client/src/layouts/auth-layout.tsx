import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Globe,
  Clock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";
import { AppleIcon } from "@/components/common/apple-icon";

export function AuthLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isAr = i18n.language === "ar";

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar");
  }

  return (
    <div className="relative min-h-screen bg-[#050814] text-white font-sans overflow-hidden flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      <RouteProgressBar />

      {/* 🌌 Deep Cosmos Ambient Glow Orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[650px] w-[650px] rounded-full bg-blue-600/20 blur-[140px] animate-ambient-pulse" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[650px] w-[650px] rounded-full bg-indigo-600/20 blur-[150px] animate-ambient-pulse-slow" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/15 blur-[120px] animate-ambient-pulse" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[110px]" />

      {/* 🕸️ Subtle Isometric Grid Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid-glow opacity-30" />

      {/* 🌟 Top Navigation Bar */}
      <header className="relative z-20 w-full px-6 py-5 sm:px-10 lg:px-14 flex items-center justify-between border-b border-white/[0.06] backdrop-blur-md bg-black/10">
        <BrandLogo />

        <div className="flex items-center gap-3">
          {/* Live system health beacon */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>{isAr ? "نظام SanaD متصل ومحدث" : "SanaD Enterprise Connected"}</span>
          </div>

          {/* Language Switcher Pill */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="h-9 gap-2 rounded-xl border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-white hover:text-white backdrop-blur-xl px-3.5 text-xs font-bold transition-all shadow-sm specular-border"
          >
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            <span>{isAr ? "English" : "العربية"}</span>
          </Button>
        </div>
      </header>

      {/* 🏛️ Main Content Cockpit */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* 🚀 Left Showcase Column (Brand Authority & Feature Showcase) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-8 pe-4">
            
            {/* Top Eyebrow Badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-cyan-400/30 bg-gradient-to-r from-blue-500/10 via-cyan-500/15 to-indigo-500/10 px-4 py-1.5 text-xs font-bold text-cyan-300 backdrop-blur-xl w-fit shadow-[0_0_20px_-3px_rgba(6,182,212,0.3)] specular-border">
              <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span>{isAr ? "المنظومة التنفيذية الموحدة لإدارة الموارد والامتثال" : "Next-Gen Enterprise Workforce & Compliance Suite"}</span>
            </div>

            {/* Grand Hero Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.15] text-white font-sans">
                {isAr ? (
                  <>
                    إدارة شاملة وذكية{" "}
                    <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                      للوثائق، التراخيص، والموظفين.
                    </span>
                  </>
                ) : (
                  <>
                    Intelligent Command Over{" "}
                    <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                      Workforce, Licenses & Compliance.
                    </span>
                  </>
                )}
              </h1>
              <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed font-normal">
                {isAr
                  ? "منصة رقمية موحدة تضمن الامتثال القانوني التام، تنبيهات استباقية لتواريخ الانتهاء، إدارة مدفوعات دقيقة، وتقارير احترافية بضغطة زر واحدة."
                  : "A unified platform ensuring total regulatory compliance, automated expiration tracking, expense auditing, and executive reporting in seconds."}
              </p>
            </div>

            {/* 💎 3 Executive Mini Feature Cards */}
            <div className="grid grid-cols-3 gap-3.5 pt-2">
              
              {/* Card 1: Expiration Radar */}
              <div className="group relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0A1224]/70 p-4 backdrop-blur-xl shadow-luxury transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 hover:bg-[#0E1A34]/80 specular-border">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                <AppleIcon icon={Clock} tone="amber" size="xs" className="mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-extrabold text-xs text-white tracking-tight">
                  {isAr ? "رادار الصلاحيات" : "Expiration Radar"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {isAr ? "تنبيهات استباقية مجدولة" : "Proactive auto-alerts"}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-amber-400 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>{isAr ? "0 مخالفات متأخرة" : "Zero Penalties"}</span>
                </div>
              </div>

              {/* Card 2: Certified Printing */}
              <div className="group relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0A1224]/70 p-4 backdrop-blur-xl shadow-luxury transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-[#0E1A34]/80 specular-border">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
                <AppleIcon icon={CheckCircle2} tone="emerald" size="xs" className="mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-extrabold text-xs text-white tracking-tight">
                  {isAr ? "جاهزية الامتثال" : "Regulatory Ready"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {isAr ? "قوالب معتمدة رسمياً" : "Official certified PDF"}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isAr ? "100% تطابق نظامي" : "100% Compliant"}</span>
                </div>
              </div>

              {/* Card 3: Security & Encryption */}
              <div className="group relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0A1224]/70 p-4 backdrop-blur-xl shadow-luxury transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:bg-[#0E1A34]/80 specular-border">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
                <AppleIcon icon={ShieldCheck} tone="cyan" size="xs" className="mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-extrabold text-xs text-white tracking-tight">
                  {isAr ? "حماية بنكية" : "Bank Security"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {isAr ? "تشفير 256-Bit TLS" : "256-bit TLS Vault"}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>{isAr ? "رقابة مستمرة" : "Zero-Trust Log"}</span>
                </div>
              </div>

            </div>

            {/* Verified Enterprise Government Platforms Trust Bar */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center gap-4 text-xs text-slate-400">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {isAr ? "متوافق مع المنصات الرسمية:" : "Integrated With:"}
              </span>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-300">
                <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08]">منصة قوى (Qiwa)</span>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08]">مقيم (Muqeem)</span>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08]">مدد (Mudad)</span>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08]">التأمينات (GOSI)</span>
              </div>
            </div>

          </div>

          {/* 🔐 Right Auth Form Column (Floating Obsidian Glass Capsule) */}
          <div className="lg:col-span-5 flex justify-center w-full">
            <div className="relative w-full max-w-md">
              
              {/* Decorative Subtle Glowing Rim Behind Card */}
              <div className="pointer-events-none absolute -inset-1 rounded-[32px] bg-gradient-to-b from-cyan-500/20 via-blue-600/10 to-indigo-600/20 blur-xl opacity-70" />

              {/* The Masterpiece Glass Container Card */}
              <div className="relative rounded-[28px] border border-white/[0.14] bg-[#090F1E]/85 p-7 sm:p-9 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] backdrop-blur-2xl specular-border overflow-hidden">
                
                {/* Top Specular Hairline Gradient */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

                {/* Mobile Brand Header */}
                <div className="lg:hidden mb-6 flex justify-center">
                  <BrandLogo />
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(3px)" }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Outlet />
                  </motion.div>
                </AnimatePresence>

              </div>
            </div>
          </div>

        </div>
      </main>

      {/* 🛡️ Footer Bar */}
      <footer className="relative z-20 w-full px-6 py-4 sm:px-10 lg:px-14 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 border-t border-white/[0.06] backdrop-blur-md bg-black/10">
        <p>© {new Date().getFullYear()} {t("app.name")}. All rights reserved.</p>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Lock className="h-3.5 w-3.5" />
            <span className="font-mono font-medium">{isAr ? "تشفير بيانات آمن 256-bit TLS" : "256-bit High Security TLS"}</span>
          </span>
          <span className="hidden sm:inline text-white/20">•</span>
          <span className="hidden sm:inline font-mono text-[11px] text-slate-400">v2.4 Enterprise Edition</span>
        </div>
      </footer>

    </div>
  );
}
