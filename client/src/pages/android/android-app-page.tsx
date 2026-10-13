import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import qrcode from "qrcode-generator";
import { BellRing, CheckCircle2, Download, Laptop, Maximize2, MonitorDown, RefreshCw, Share, Smartphone, SquarePlus, Zap } from "lucide-react";
import { detectPlatform, isStandalone, openInstall } from "@/components/lulu/lulu-install";
import { cn } from "@/lib/utils";

/* /apps (and the older /android) — SanaD's apps, installed from the site itself:
   the desktop app (the site installed by the browser as its own window on
   Windows or Mac) and the Android app (android/, a Trusted Web Activity that
   opens this site full screen). Open without signing in, so the link can be
   sent to anyone on the team. */

interface ApkInfo {
  versionName: string;
  versionCode: number;
  size: number;
  minAndroid: string;
  builtAt: string;
}

const APK = "/download/SanaD.apk";
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} ميجا`;
/** Browsers inside other apps (WhatsApp, Instagram, Facebook…) can't install sites. */
const inAppBrowser = () => typeof navigator !== "undefined" && /FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|TikTok|; wv\)/i.test(navigator.userAgent);
const inAndroidApp = () => typeof document !== "undefined" && document.referrer.startsWith("android-app://com.sanad.hr");

function Qr({ text }: { text: string }) {
  const svg = useMemo(() => {
    const q = qrcode(0, "M");
    q.addData(text);
    q.make();
    return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  }, [text]);
  return <div className="h-36 w-36 overflow-hidden rounded-2xl bg-white p-1 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

const DESKTOP_STEPS = [
  { icon: MonitorDown, title: "اضغط «ثبّت على الكمبيوتر»", text: "من Chrome أو Edge على ويندوز أو ماك." },
  { icon: CheckCircle2, title: "وافق على التثبيت", text: "هيظهر سؤال «تثبيت SanaD؟»، اضغط «تثبيت»." },
  { icon: Laptop, title: "افتحه من سطح المكتب", text: "هيتحط له أيقونة على سطح المكتب وفي قائمة ابدأ، ويفتح في نافذة لوحده." },
];
const ANDROID_STEPS = [
  { icon: Smartphone, title: "افتح الصفحة دي من كروم", text: "على موبايلك الأندرويد، من متصفح Chrome أو Samsung Internet." },
  { icon: MonitorDown, title: "اضغط «ثبّت على الموبايل»", text: "وبعدين «تثبيت» في الرسالة اللي هتظهر." },
  { icon: CheckCircle2, title: "افتحه من الشاشة الرئيسية", text: "هتلاقي أيقونة سند، وسجّل دخولك مرة واحدة." },
];
const IOS_STEPS = [
  { icon: Smartphone, title: "افتح الصفحة دي من Safari", text: "على الآيفون أو الآيباد." },
  { icon: Share, title: "اضغط زرار المشاركة", text: "المربع اللي طالع منه سهم، تحت الشاشة أو فوقها." },
  { icon: SquarePlus, title: "اختار «إضافة إلى الشاشة الرئيسية»", text: "ثم «إضافة»، وافتح سند من الأيقونة. الإشعارات بتشتغل من التطبيق المثبّت بس." },
];
const PERKS = [
  { icon: Maximize2, title: "نافذة لوحده", text: "من غير شريط المتصفح، زي أي برنامج" },
  { icon: BellRing, title: "إشعارات باسم SanaD", text: "تنبيهات الوثائق والمهام حتى والبرنامج مقفول" },
  { icon: RefreshCw, title: "دايمًا آخر نسخة", text: "أي تحديث في النظام بيظهر فيه لوحده" },
  { icon: Zap, title: "خفيف وسريع", text: "مش بياخد مساحة، ويفتح في ثانية" },
];

function Steps({ steps }: { steps: { icon: typeof Download; title: string; text: string }[] }) {
  return (
    <ol className="grid gap-2.5">
      {steps.map(({ icon: Icon, title, text }, i) => (
        <li key={title} className="flex items-start gap-3 rounded-2xl border border-[rgba(214,182,120,.16)] bg-white/[0.02] p-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#f3dfae] shadow-[inset_0_0_0_1px_rgba(214,182,120,.4)]" style={{ background: "radial-gradient(circle at 50% 30%, #3a3020, #0f0e0b)" }}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <b className="block text-[15px] font-extrabold text-[#f3ebda]">
              <span className="me-1.5 font-mono text-[#c9a464]">{i + 1}.</span>
              {title}
            </b>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-[#9a907c]">{text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function AppsPage() {
  const [info, setInfo] = useState<ApkInfo | null>(null);
  const platform = detectPlatform();
  const onAndroid = platform === "android-phone" || platform === "android-tablet";
  const onIos = platform === "iphone" || platform === "ipad";
  const installed = isStandalone();
  const androidApp = inAndroidApp();

  useEffect(() => {
    document.title = "تطبيقات SanaD";
    fetch("/download/android.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setInfo)
      .catch(() => undefined);
  }, []);
  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/apps` : "/apps";

  const card = "relative overflow-hidden rounded-[28px] border border-[rgba(214,182,120,.26)] p-6 sm:p-8 shadow-[0_40px_80px_-40px_#000,inset_0_0_0_6px_#0d0d11,inset_0_0_0_7px_rgba(214,182,120,.12)]";
  const cardBg = { background: "radial-gradient(600px 320px at 100% 0%, rgba(243,223,174,.12), transparent 65%), linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,0)), #0d0d11" };
  const gold = "inline-flex h-14 items-center gap-3 rounded-2xl px-6 text-base font-black text-[#1b1407] shadow-[0_14px_30px_-12px_rgba(201,164,100,.9),inset_0_1px_0_rgba(255,255,255,.7)] transition hover:brightness-105 active:scale-[0.98]";
  const goldBg = { background: "linear-gradient(110deg, #8a6a35, #f3dfae 30%, #c9a464 50%, #fff3d6 64%, #a5803f 86%)" };

  return (
    <div dir="rtl" className="min-h-dvh text-[#f3ebda]" style={{ background: "radial-gradient(1100px 700px at 90% -10%, rgba(201,164,100,.16), transparent 60%), radial-gradient(800px 600px at 0% 110%, rgba(120,90,40,.12), transparent 60%), #07070a" }}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-[max(20px,env(safe-area-inset-top))] sm:px-6">
        <header className="flex items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-black">
            <img src="/pwa/icon-192.png" alt="" className="h-10 w-10 rounded-xl ring-1 ring-[rgba(243,223,174,.5)]" />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(110deg, #8a6a35, #f3dfae 40%, #c9a464)" }}>
              سند
            </span>
          </Link>
          <Link to="/" className="rounded-xl border border-[rgba(214,182,120,.26)] px-3.5 py-2 text-sm font-bold text-[#d8ceb9] hover:text-[#f3dfae]">
            افتح النظام من المتصفح
          </Link>
        </header>

        <section className="mt-6 text-center">
          <span className="text-sm font-extrabold tracking-[.26em] text-[#c9a464]">ثبّت سند على أجهزتك</span>
          <h1 className="mt-2 bg-clip-text pb-1 text-4xl font-black text-transparent sm:text-6xl" style={{ backgroundImage: "linear-gradient(110deg, #7d5d27, #f3dfae 24%, #c9a464 42%, #fff3d6 56%, #a5803f 74%, #e8cc8e)" }}>
            تطبيقات سند
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-[#9a907c]">
            نفس النظام بنفس حسابك، بس في برنامج لوحده على الكمبيوتر وتطبيق على الموبايل. بيتثبتوا من هنا مباشرة، وأي تحديث في الموقع بيوصلهم لوحده.
          </p>
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* the desktop app */}
          <section className={cn(card, !onAndroid && !onIos && "ring-1 ring-[rgba(243,223,174,.35)]")} style={cardBg} aria-labelledby="desk">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-[20px] text-[#f3dfae] shadow-[inset_0_0_0_1px_rgba(214,182,120,.45),0_0_30px_-10px_rgba(201,164,100,.6)]" style={{ background: "radial-gradient(circle at 50% 30%, #3a3020, #0f0e0b)" }}>
                <Laptop className="h-8 w-8" />
              </span>
              <div>
                <span className="text-xs font-extrabold tracking-[.2em] text-[#c9a464]">ويندوز · ماك</span>
                <h2 id="desk" className="text-2xl font-black sm:text-3xl">سند للكمبيوتر</h2>
              </div>
            </div>
            <p className="mt-4 text-[14.5px] leading-relaxed text-[#d8ceb9]">برنامج بيفتح في نافذة لوحده، بأيقونة على سطح المكتب وشريط المهام، وبيبعتلك إشعارات الجهاز.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {installed && !androidApp ? (
                <span className="inline-flex items-center gap-2 rounded-2xl bg-[rgba(127,211,164,.12)] px-4 py-3 text-sm font-bold text-[#7fd3a4] ring-1 ring-[rgba(127,211,164,.35)]">
                  <CheckCircle2 className="h-5 w-5" /> إنت فاتح برنامج سند دلوقتي.
                </span>
              ) : onAndroid || onIos ? (
                <span className="text-sm text-[#9a907c]">افتح الصفحة دي من الكمبيوتر عشان تثبّته.</span>
              ) : (
                <button type="button" className={gold} style={goldBg} onClick={() => openInstall(platform)}>
                  <MonitorDown className="h-5 w-5" /> ثبّت على الكمبيوتر
                </button>
              )}
            </div>
            <div className="mt-6">
              <Steps steps={DESKTOP_STEPS} />
            </div>
            {platform === "desktop-safari" && (
              <p className="mt-3 text-[13px] leading-relaxed text-[#e6b964]">على Safari في الماك: من قائمة «ملف» اختار «إضافة إلى Dock».</p>
            )}
          </section>

          {/* the phone app: the site installed on the phone, the APK kept as a fallback */}
          <section className={cn(card, (onAndroid || onIos) && "ring-1 ring-[rgba(243,223,174,.35)]")} style={cardBg} aria-labelledby="andr">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-[20px] text-[#f3dfae] shadow-[inset_0_0_0_1px_rgba(214,182,120,.45),0_0_30px_-10px_rgba(201,164,100,.6)]" style={{ background: "radial-gradient(circle at 50% 30%, #3a3020, #0f0e0b)" }}>
                <Smartphone className="h-8 w-8" />
              </span>
              <div>
                <span className="text-xs font-extrabold tracking-[.2em] text-[#c9a464]">أندرويد · آيفون</span>
                <h2 id="andr" className="text-2xl font-black sm:text-3xl">سند للموبايل</h2>
              </div>
            </div>
            <p className="mt-4 text-[14.5px] leading-relaxed text-[#d8ceb9]">بيتثبت من الموقع مباشرة من غير ما تحمّل ملفات: أيقونة على الشاشة، ويفتح ملء الشاشة، وبيبعتلك إشعارات.</p>
            <div className="mt-5 flex flex-wrap items-center gap-5">
              {installed || androidApp ? (
                <span className="inline-flex items-center gap-2 rounded-2xl bg-[rgba(127,211,164,.12)] px-4 py-3 text-sm font-bold text-[#7fd3a4] ring-1 ring-[rgba(127,211,164,.35)]">
                  <CheckCircle2 className="h-5 w-5" /> سند متثبّت على الجهاز ده.
                </span>
              ) : (onAndroid || onIos) && inAppBrowser() ? (
                <span className="rounded-2xl bg-[rgba(230,185,100,.1)] px-4 py-3 text-sm font-bold leading-relaxed text-[#e6b964] ring-1 ring-[rgba(230,185,100,.25)]">
                  الصفحة مفتوحة جوه تطبيق تاني. افتحها في {onIos ? "Safari" : "Chrome"} من القائمة (⋮ أو «فتح في المتصفح») عشان تقدر تثبّت سند.
                </span>
              ) : onAndroid || onIos ? (
                <button type="button" className={gold} style={goldBg} onClick={() => openInstall(platform)}>
                  <MonitorDown className="h-5 w-5" /> ثبّت على الموبايل
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <Qr text={pageUrl} />
                  <span className="max-w-[11rem] text-[13px] leading-relaxed text-[#9a907c]">امسح الكود بكاميرا موبايلك عشان تفتح الصفحة دي عليه وتثبّت سند.</span>
                </div>
              )}
            </div>
            {!(installed || androidApp) && (
              <div className="mt-6 grid gap-5">
                {!onIos && (
                  <div>
                    <b className="mb-2 block text-sm font-extrabold text-[#c9a464]">على الأندرويد</b>
                    <Steps steps={ANDROID_STEPS} />
                  </div>
                )}
                {!onAndroid && (
                  <div>
                    <b className="mb-2 block text-sm font-extrabold text-[#c9a464]">على الآيفون والآيباد</b>
                    <Steps steps={IOS_STEPS} />
                  </div>
                )}
              </div>
            )}
            {!onIos && !androidApp && (
              <p className="mt-5 border-t border-[rgba(214,182,120,.16)] pt-4 text-[12.5px] leading-relaxed text-[#6c6555]">
                متصفحك مش بيقبل التثبيت؟{" "}
                <a href={APK} download="SanaD.apk" className="font-bold text-[#c9a464] underline-offset-2 hover:underline">
                  حمّل ملف التطبيق للأندرويد{info ? ` (${info.versionName} · ${mb(info.size)})` : ""}
                </a>
                ، وممكن الموبايل يطلب منك تسمح بالتثبيت من مصادر غير معروفة.
              </p>
            )}
          </section>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl border border-[rgba(214,182,120,.18)] bg-white/[0.02] p-4">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#c9a464]" />
              <span>
                <b className="block text-sm font-extrabold">{title}</b>
                <span className="block text-xs text-[#9a907c]">{text}</span>
              </span>
            </div>
          ))}
        </section>

              </div>
    </div>
  );
}
