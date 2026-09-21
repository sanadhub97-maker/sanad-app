import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Zap, FileSpreadsheet, Lock, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";

export function AuthLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isAr = i18n.language === "ar";

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-12 bg-background font-sans overflow-hidden">
      {/* 🌟 Left Showcase Column (Luxury Dark Enterprise Panel) */}
      <div className="relative hidden lg:flex lg:col-span-7 flex-col justify-between bg-[#070C18] p-12 text-white overflow-hidden border-e border-white/[0.08]">
        {/* Subtle Ambient Radial Glows */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />

        {/* Brand Header */}
        <div className="relative z-10">
          <BrandLogo />
        </div>

        {/* Hero Narrative & Features */}
        <div className="relative z-10 space-y-8 max-w-xl my-auto py-12">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-300 backdrop-blur-md">
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              {isAr ? "الجيل الجديد لإدارة الموارد والامتثال" : "Next-Gen Workforce & Compliance Engine"}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white font-sans">
              {isAr
                ? "إدارة شاملة وفاخرة للوثائق، التراخيص، والموظفين."
                : "Complete enterprise control for documents, licenses & workforce."}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              {isAr
                ? "منظومة متكاملة تضمن الامتثال القانوني التام، متابعة استباقية لتواريخ الانتهاء، إدارة مدفوعات دقيقة، وتقارير احترافية بضغطة زر واحدة."
                : "A unified platform ensuring total regulatory compliance, automated expiration tracking, expense auditing, and executive reporting in seconds."}
            </p>
          </div>

          {/* Floating Luxury Feature Badges */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md transition-transform hover:scale-[1.02]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-cyan-300 mb-2.5">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="font-bold text-xs text-white">
                {isAr ? "متابعة تلقائية للصلاحيات" : "Proactive Expiration Radar"}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {isAr ? "تنبيهات مجدولة قبل الانتهاء" : "Multi-channel automated alerts"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md transition-transform hover:scale-[1.02]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 mb-2.5">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <p className="font-bold text-xs text-white">
                {isAr ? "تصدير وطباعة رسمية" : "Excel & PDF/A4 Reports"}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {isAr ? "قوالب متوافقة مع الأنظمة" : "Certified enterprise prints"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/[0.08] pt-6">
          <p>© {new Date().getFullYear()} {t("app.name")}. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>{isAr ? "حماية وتشفير عالي 256-bit" : "256-bit Secure TLS"}</span>
          </div>
        </div>
      </div>

      {/* 🔐 Right Auth Form Column */}
      <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Top bar with language switcher */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="h-9 gap-1.5 rounded-xl border-border/80 bg-background px-3 text-xs font-semibold"
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span>{isAr ? "English" : "العربية"}</span>
          </Button>
        </div>

        {/* Centered Form */}
        <div className="mx-auto w-full max-w-sm my-auto py-8">
          <RouteProgressBar />
          <div className="lg:hidden mb-6 flex justify-center">
            <BrandLogo />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(3px)" }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom copyright for mobile */}
        <div className="text-center text-xs text-muted-foreground lg:hidden">
          © {new Date().getFullYear()} {t("app.name")}
        </div>
      </div>
    </div>
  );
}

