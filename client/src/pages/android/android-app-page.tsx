import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import qrcode from "qrcode-generator";
import { BellRing, CheckCircle2, Download, FolderDown, Maximize2, RefreshCw, ShieldCheck, Smartphone, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/* /android — the SanaD Android app: download it, and how to install it.
   Open without signing in, so the link can be sent to anyone on the team.
   The app (android/, a Trusted Web Activity) opens this site full screen. */

interface ApkInfo {
  versionName: string;
  versionCode: number;
  size: number;
  minAndroid: string;
  builtAt: string;
}

const APK = "/download/SanaD.apk";
const isAndroid = () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
const inApp = () => typeof document !== "undefined" && document.referrer.startsWith("android-app://com.sanad.hr");
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} ميجا`;

function Qr({ text }: { text: string }) {
  const svg = useMemo(() => {
    const q = qrcode(0, "M");
    q.addData(text);
    q.make();
    return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  }, [text]);
  return <div className="h-40 w-40 overflow-hidden rounded-2xl bg-white p-1 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

const STEPS = [
  { icon: Download, title: "حمّل التطبيق", text: "اضغط «حمّل التطبيق» واستنى الملف SanaD.apk يخلص تحميل." },
  { icon: FolderDown, title: "افتح الملف", text: "من إشعار التحميل أو من «التنزيلات»، اضغط على SanaD.apk." },
  { icon: ShieldCheck, title: "اسمح بالتثبيت مرة واحدة", text: "لو ظهر «تثبيت تطبيقات غير معروفة»، ادخل الإعدادات وفعّل «السماح من هذا المصدر» للمتصفح، وارجع." },
  { icon: CheckCircle2, title: "اضغط «تثبيت» ثم «فتح»", text: "وسجّل دخولك مرة واحدة. أيقونة SanaD هتفضل على الشاشة الرئيسية." },
];

const PERKS = [
  { icon: Maximize2, c: "#2f5fe0", title: "ملء الشاشة", text: "من غير شريط المتصفح، زي أي تطبيق" },
  { icon: BellRing, c: "#e5484d", title: "إشعارات باسم SanaD", text: "تنبيهات الوثائق والمهام حتى والتطبيق مقفول" },
  { icon: RefreshCw, c: "#10b981", title: "دايمًا آخر نسخة", text: "أي تحديث في النظام بيظهر فيه على طول" },
  { icon: Zap, c: "#f59e0b", title: "خفيف وسريع", text: "حجمه صغير، ويفتح في ثانية" },
];

export default function AndroidAppPage() {
  const [info, setInfo] = useState<ApkInfo | null>(null);
  const android = isAndroid();
  const opened = inApp();

  useEffect(() => {
    document.title = "SanaD لأندرويد";
    fetch("/download/android.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setInfo)
      .catch(() => undefined);
  }, []);

  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/android` : "/android";

  return (
    <div dir="rtl" className="min-h-dvh bg-[#f2f4f9] text-[#121a2e] dark:bg-[#0a0f1e] dark:text-slate-100">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-[max(20px,env(safe-area-inset-top))] sm:px-6">
        <header className="flex items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-2 font-head text-lg font-bold">
            <img src="/pwa/icon-192.png" alt="" className="h-9 w-9 rounded-xl" />
            SanaD
          </Link>
          <Link to="/" className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/10">
            افتح النظام من المتصفح
          </Link>
        </header>

        <section className="relative mt-4 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0b1b4d] via-[#14286b] to-[#1d3a96] p-6 text-white shadow-[0_30px_60px_-30px_rgba(15,35,110,0.7)] sm:p-10">
          <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[#d4a843]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center gap-4">
                <img src="/pwa/icon-512.png" alt="SanaD" className="h-20 w-20 rounded-[24px] shadow-[0_14px_30px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/20 sm:h-24 sm:w-24" />
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#f3d27a] ring-1 ring-white/15">
                    <Smartphone className="h-3.5 w-3.5" /> تطبيق أندرويد
                  </span>
                  <h1 className="mt-2 font-head text-3xl font-bold sm:text-4xl">SanaD على موبايلك</h1>
                </div>
              </div>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-200">
                موظفينك ووثائقك في جيبك: تنبيه قبل ما الإقامة أو الرخصة تنتهي، مهام اليوم، والمدفوعات — في تطبيق بيفتح ملء الشاشة وبيبعتلك إشعارات باسمه.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {info && <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">الإصدار {info.versionName}</span>}
                {info && <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">{mb(info.size)}</span>}
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">أندرويد {info?.minAndroid ?? "7.0"} أو أحدث</span>
              </div>

              {opened ? (
                <p className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-400/15 px-4 py-3 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-300/30">
                  <CheckCircle2 className="h-5 w-5" /> إنت فاتح تطبيق SanaD دلوقتي — مش محتاج تحمّله تاني.
                </p>
              ) : (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <a
                    href={APK}
                    download="SanaD.apk"
                    className="inline-flex h-14 items-center gap-3 rounded-2xl bg-gradient-to-b from-[#f3d27a] to-[#d4a843] px-6 font-head text-base font-bold text-[#1a1406] shadow-[0_12px_28px_-10px_rgba(212,168,67,0.8)] transition hover:brightness-105 active:scale-[0.98]"
                  >
                    <Download className="h-5 w-5" /> حمّل التطبيق
                  </a>
                  {!android && <span className="text-sm text-slate-300">أو امسح الكود بموبايلك الأندرويد ←</span>}
                </div>
              )}
            </div>

            {!android && !opened && (
              <div className="hidden flex-col items-center gap-2 rounded-3xl bg-white/10 p-4 ring-1 ring-white/15 md:flex">
                <Qr text={pageUrl} />
                <span className="text-xs text-slate-200">امسح بكاميرا الموبايل</span>
              </div>
            )}
          </div>
        </section>

        {!opened && (
          <section className="mt-8">
            <h2 className="font-head text-xl font-bold">التثبيت في 4 خطوات</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="relative rounded-3xl bg-white p-5 shadow-[0_1px_0_rgba(15,25,70,0.04),0_12px_30px_-20px_rgba(15,25,70,0.35)] ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
                  <span className="absolute left-4 top-4 font-head text-3xl font-bold text-black/[0.06] dark:text-white/10">{i + 1}</span>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#2f5fe0]/10 text-[#2f5fe0] dark:text-sky-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <b className="mt-3 block font-head text-[15px]">{title}</b>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{text}</p>
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200">
              التطبيق مش من متجر Google Play، فممكن «Play Protect» يسألك قبل التثبيت. اختار «تثبيت على أي حال» — التطبيق موقّع باسم SanaD وبيفتح نظامك بس.
            </p>
          </section>
        )}

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map(({ icon: Icon, c, title, text }) => (
            <div key={title} className="flex items-start gap-3 rounded-3xl bg-white p-4 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white" style={{ background: c }}>
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <b className="block text-sm">{title}</b>
                <span className={cn("block text-xs text-slate-500 dark:text-slate-400")}>{text}</span>
              </span>
            </div>
          ))}
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          على الآيفون والآيباد: افتح النظام من Safari واختار «إضافة إلى الشاشة الرئيسية».
        </p>
      </div>
    </div>
  );
}
