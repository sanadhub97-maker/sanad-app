import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Lock, Globe, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/layout/brand-logo";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";
import { cn } from "@/lib/utils";

/** Sign-in pages in the Oasis design: the calm sage ground, the product
 * story on one side and the form on a white rounded card. */
export function AuthLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isAr = (i18n.language || "ar").startsWith("ar");

  function toggleLanguage() {
    i18n.changeLanguage(isAr ? "en" : "ar");
  }

  const features = [
    {
      icon: Clock,
      tint: "text-warning bg-warning/10",
      title: isAr ? "رادار الصلاحيات" : "Expiration radar",
      text: isAr ? "تنبيهات استباقية مجدولة" : "Proactive auto-alerts",
    },
    {
      icon: CheckCircle2,
      tint: "text-success bg-success/10",
      title: isAr ? "جاهزية الامتثال" : "Regulatory ready",
      text: isAr ? "قوالب معتمدة رسمياً" : "Official certified PDF",
    },
    {
      icon: ShieldCheck,
      tint: "text-primary bg-accent",
      title: isAr ? "حماية بنكية" : "Bank-grade security",
      text: isAr ? "تشفير 256-Bit TLS" : "256-bit TLS",
    },
  ];

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-background font-sans text-foreground">
      <RouteProgressBar />

      <header className="flex w-full items-center justify-between px-5 py-5 sm:px-10 lg:px-14">
        <BrandLogo />
        <div className="flex items-center gap-2.5">
          <span className="hidden items-center gap-2 rounded-full bg-success/10 px-3.5 py-1.5 text-xs font-semibold text-success sm:flex">
            <span className="h-2 w-2 rounded-full bg-success" />
            {isAr ? "نظام SanaD متصل ومحدث" : "SanaD is online"}
          </span>
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex h-10 items-center gap-2 rounded-full bg-card px-4 text-[13px] font-semibold shadow-[var(--glass-shadow)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Globe className="h-4 w-4 text-primary" />
            {isAr ? "English" : "العربية"}
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="hidden flex-col justify-center gap-7 pe-4 lg:col-span-7 lg:flex">
            <img src="/brand/sanad-logo.png" alt="SanaD HR" className="h-36 w-auto self-start xl:h-44" />

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground">
              <Sparkles className="h-4 w-4" />
              {isAr ? "المنظومة التنفيذية الموحدة لإدارة الموارد والامتثال" : "Workforce & compliance, in one place"}
            </span>

            <div className="space-y-4">
              <h1 className="font-head text-4xl font-semibold leading-[1.25] sm:text-5xl">
                {isAr ? (
                  <>
                    إدارة شاملة وذكية <span className="text-primary">للوثائق، التراخيص، والموظفين.</span>
                  </>
                ) : (
                  <>
                    Calm control over <span className="text-primary">documents, licenses and people.</span>
                  </>
                )}
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {isAr
                  ? "منصة رقمية موحدة تضمن الامتثال القانوني التام، تنبيهات استباقية لتواريخ الانتهاء، إدارة مدفوعات دقيقة، وتقارير احترافية بضغطة زر واحدة."
                  : "One platform for regulatory compliance, expiry alerts, payments and professional reports in a click."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3.5">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-[var(--glass-shadow)]">
                    <span className={cn("grid h-11 w-11 place-items-center rounded-2xl", f.tint)}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <b className="block text-sm font-semibold">{f.title}</b>
                      <span className="text-xs text-muted-foreground">{f.text}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{isAr ? "متوافق مع المنصات الرسمية:" : "Works with:"}</span>
              <div className="flex flex-wrap gap-2">
                {(isAr ? ["منصة قوى", "مقيم", "مدد", "التأمينات"] : ["Qiwa", "Muqeem", "Mudad", "GOSI"]).map((p) => (
                  <span key={p} className="rounded-full bg-card px-3 py-1 font-medium text-foreground shadow-[var(--glass-shadow)]">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex w-full justify-center lg:col-span-5">
            <div className="w-full max-w-md rounded-[28px] bg-card p-7 shadow-[0_24px_60px_-28px_rgba(16,39,44,0.35)] sm:p-9">
              <div className="mb-6 flex justify-center lg:hidden">
                <img src="/brand/sanad-logo.png" alt="SanaD HR" className="h-28 w-auto" />
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      <footer className="flex w-full flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-muted-foreground sm:flex-row sm:px-10 lg:px-14">
        <p>
          © {new Date().getFullYear()} {t("app.name")}
        </p>
        <span className="flex items-center gap-1.5 text-success">
          <Lock className="h-3.5 w-3.5" />
          {isAr ? "تشفير بيانات آمن 256-bit TLS" : "256-bit TLS encryption"}
        </span>
      </footer>
    </div>
  );
}
