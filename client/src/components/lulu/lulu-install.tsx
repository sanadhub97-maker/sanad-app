import { useEffect, useState, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Download,
  Share,
  SquarePlus,
  Zap,
  WifiOff,
  Maximize2,
  Bell,
  X,
  CheckCircle2,
  Laptop,
  Smartphone,
  Tablet,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* =========================================================================
   SanaD Apple Liquid Glass Install Prompt (PWA Experience)
   Supports: PC/Desktop (Chrome/Edge/Safari/Windows/Mac), iPhone, iPad, Android
   ========================================================================= */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type PlatformType =
  | "iphone"
  | "ipad"
  | "android-phone"
  | "android-tablet"
  | "desktop-chrome"
  | "desktop-safari"
  | "desktop-other";

const SNOOZE_KEY = "sanad.install.snoozedAt";
const NEVER_KEY = "sanad.install.never";
const SNOOZE_DURATION = 3 * 24 * 3600 * 1000; // 3 days snooze
const OPEN_EVENT = "sanad:install";

let deferredPrompt: InstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    window.dispatchEvent(new Event("sanad:install-ready"));
  });
}

/** Check if site is already running in standalone / installed PWA mode */
export const isStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.includes("android-app://")
  );
};

/** Accurate client platform detector */
export function detectPlatform(): PlatformType {
  if (typeof navigator === "undefined") return "desktop-chrome";
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPod/.test(ua);
  const isIpad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isMobile = /Mobile/.test(ua);

  if (isIos) return "iphone";
  if (isIpad) return "ipad";
  if (isAndroid && !isMobile) return "android-tablet";
  if (isAndroid) return "android-phone";

  const isMac = /Macintosh|Mac OS X/.test(ua);
  const isChrome = /Chrome|Chromium|Edg/.test(ua);
  const isSafari = isMac && /Safari/.test(ua) && !isChrome;

  if (isChrome) return "desktop-chrome";
  if (isSafari) return "desktop-safari";
  return "desktop-other";
}

/** Trigger the install dialog from anywhere */
export const openInstall = (overridePlatform?: PlatformType) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(OPEN_EVENT, { detail: { platform: overridePlatform } })
    );
  }
};

/** Hook to check if app can be installed or guided */
export function useCanInstall() {
  const [can, setCan] = useState(() => !isStandalone());
  useEffect(() => {
    const onInstalled = () => setCan(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);
  return can;
}

function isSnoozed(): boolean {
  try {
    const t = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Date.now() - t < SNOOZE_DURATION;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch {}
}

function setNever() {
  try {
    localStorage.setItem(NEVER_KEY, "true");
  } catch {}
}

function isNever(): boolean {
  try {
    return localStorage.getItem(NEVER_KEY) === "true";
  } catch {
    return false;
  }
}

export function LuluInstall() {
  return <AppleInstallPrompt />;
}

export function AppleInstallPrompt() {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");

  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<PlatformType>(() => detectPlatform());
  const [hasPrompt, setHasPrompt] = useState(() => Boolean(deferredPrompt));
  const [busy, setBusy] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // Shows by itself a moment after the site opens
  useEffect(() => {
    if (isStandalone()) return;

    const onReady = () => setHasPrompt(true);
    const onInstalled = () => {
      setOpen(false);
      toast.success(
        isAr ? "تم تثبيت SanaD بنجاح على جهازك 🎉" : "SanaD was installed successfully 🎉"
      );
    };

    const onManualOpen = (e: Event) => {
      const custom = e as CustomEvent<{ platform?: PlatformType }>;
      if (custom.detail?.platform) {
        setPlatform(custom.detail.platform);
      } else {
        setPlatform(detectPlatform());
      }
      setShowSteps(false);
      setOpen(true);
    };

    window.addEventListener("sanad:install-ready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(OPEN_EVENT, onManualOpen);

    const autoTimer = window.setTimeout(() => {
      if (!isSnoozed() && !isNever()) {
        setPlatform(detectPlatform());
        setOpen(true);
      }
    }, 2200);

    return () => {
      window.clearTimeout(autoTimer);
      window.removeEventListener("sanad:install-ready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(OPEN_EVENT, onManualOpen);
    };
  }, [isAr]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleLater();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const handleLater = useCallback(() => {
    snooze();
    setOpen(false);
  }, []);

  const handleNever = useCallback(() => {
    setNever();
    setOpen(false);
    toast.info(
      isAr
        ? "تم حفظ تفضيلك. يمكنك تثبيت التطبيق مستقبلاً من القائمة الشخصية."
        : "Preference saved. You can always install later from your account menu."
    );
  }, [isAr]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setBusy(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        setHasPrompt(false);
        if (outcome === "accepted") {
          setOpen(false);
          toast.success(
            isAr ? "جاري تثبيت نظام SanaD على جهازك..." : "Installing SanaD on your device..."
          );
        } else {
          handleLater();
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      } finally {
        setBusy(false);
      }
      return;
    }

    // If no direct prompt is supported (e.g. iOS Safari, iPadOS, or Chrome address-bar manual)
    setShowSteps((prev) => !prev);
  };

  if (typeof document === "undefined" || isStandalone()) return null;

  const isIos = platform === "iphone";
  const isIpad = platform === "ipad";
  const isDesktop = platform.startsWith("desktop");
  const isAndroid = platform.startsWith("android");

  // What the app gives, as small chips
  const perks = [
    { icon: Zap, tone: "text-amber-300 bg-amber-400/10 border-amber-400/25", title: isAr ? "يفتح فوراً" : "Instant" },
    { icon: WifiOff, tone: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25", title: isAr ? "بدون إنترنت" : "Offline" },
    { icon: Maximize2, tone: "text-sky-300 bg-sky-400/10 border-sky-400/25", title: isAr ? "شاشة كاملة" : "Full screen" },
    { icon: Bell, tone: "text-indigo-300 bg-indigo-400/10 border-indigo-400/25", title: isAr ? "تنبيهات" : "Alerts" },
  ];

  let deviceTitle = isAr ? "ثبّت SanaD كتطبيق" : "Install SanaD as an app";
  let deviceSub = isAr ? "أسرع وأخف، ويفتح في نافذة خاصة به" : "Faster and lighter, in its own window";
  let DeviceIcon = Laptop;
  if (isIos) {
    deviceTitle = isAr ? "ثبّت SanaD على الآيفون" : "Install SanaD on iPhone";
    deviceSub = isAr ? "أيقونة على الشاشة الرئيسية بدون App Store" : "An icon on your home screen, no App Store";
    DeviceIcon = Smartphone;
  } else if (isIpad) {
    deviceTitle = isAr ? "ثبّت SanaD على الآيباد" : "Install SanaD on iPad";
    deviceSub = isAr ? "ملء الشاشة واستجابة فورية للمس" : "Full screen with instant touch response";
    DeviceIcon = Tablet;
  } else if (isAndroid) {
    deviceTitle = isAr ? "ثبّت SanaD على الأندرويد" : "Install SanaD on Android";
    deviceSub = isAr ? "تطبيق خفيف على هاتفك مع التنبيهات" : "A light app on your phone, with alerts";
    DeviceIcon = Smartphone;
  } else if (isDesktop) {
    deviceTitle = isAr ? "ثبّت SanaD على الكمبيوتر" : "Install SanaD on your computer";
    deviceSub = isAr ? "يعمل كبرنامج مستقل بنافذة خاصة" : "Runs as its own program, in its own window";
  }

  const badge = (content: ReactNode) => (
    <span className="mx-1 inline-flex items-center gap-1 rounded-md bg-sky-400/15 px-1.5 py-0.5 font-semibold text-sky-300">{content}</span>
  );
  const steps =
    isIos || isIpad
      ? [
          <>
            {isAr ? "اضغط زر المشاركة" : "Tap Share"} {badge(<Share className="h-3 w-3" />)}
            {isIos ? (isAr ? "أسفل المتصفح" : "at the bottom") : isAr ? "أعلى الشاشة" : "at the top"}
          </>,
          <>
            {isAr ? "اختر" : "Choose"} {badge(<><SquarePlus className="h-3 w-3" />{isAr ? "إضافة إلى الشاشة الرئيسية" : "Add to Home Screen"}</>)}
          </>,
          <>{isAr ? "اضغط «إضافة»، وهيفتح معاك كتطبيق" : "Tap “Add” and it opens like an app"}</>,
        ]
      : [
          <>
            {isAr ? "اضغط أيقونة التثبيت" : "Click the install icon"} {badge("⊕")} {isAr ? "في شريط العنوان" : "in the address bar"}
          </>,
          <>{isAr ? "أو من قائمة المتصفح (⋮) ← تثبيت SanaD" : "Or from the browser menu (⋮) → Install SanaD"}</>,
        ];

  /* A small card in the corner (at the top on phones and tablets, where the
     sign-in form sits low), with no dim backdrop:
     the page under it stays usable, so it never swallows a click. */
  return createPortal(
    <div
      dir={isAr ? "rtl" : "ltr"}
      role="dialog"
      aria-modal="false"
      aria-label={deviceTitle}
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "fixed z-[9990] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "inset-x-3 top-[max(12px,env(safe-area-inset-top))] sm:inset-x-auto sm:start-5 sm:w-[372px] lg:top-auto lg:bottom-5",
        open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0 lg:translate-y-4"
      )}
    >
      <div
        className="relative overflow-hidden rounded-[22px] border border-white/15 bg-[#0e1628]/[0.97] p-4 text-white shadow-[0_18px_44px_-14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.18)]"
        style={{ backgroundImage: "radial-gradient(220px 140px at 0% 0%, rgba(59,130,246,0.22), transparent 70%), radial-gradient(200px 120px at 100% 100%, rgba(99,102,241,0.16), transparent 70%)" }}
      >
        <button
          type="button"
          onClick={handleLater}
          aria-label={isAr ? "إغلاق" : "Close"}
          className="absolute end-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-3 pe-8">
          <div className="relative shrink-0">
            <img src="/pwa/icon-192.png" alt="" className="h-12 w-12 rounded-[14px] shadow-[0_6px_18px_-6px_rgba(37,99,235,0.6)]" />
            <span className="absolute -bottom-1 -end-1 grid h-5 w-5 place-items-center rounded-full border border-white/25 bg-[#0a1020] text-sky-300">
              <DeviceIcon className="h-3 w-3" />
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-head text-[15px] font-bold leading-snug">{deviceTitle}</h3>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-300">{deviceSub}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {perks.map(({ icon: Icon, tone, title }) => (
            <span key={title} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", tone)}>
              <Icon className="h-3 w-3" />
              {title}
            </span>
          ))}
        </div>

        {(isIos || isIpad || showSteps) && (
          <ol className="mt-3 space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-[11.5px] text-slate-200">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-sky-400/20 text-[10px] font-bold text-sky-300">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={isIos || isIpad ? handleLater : handleInstallClick}
            disabled={busy}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-gradient-to-r from-blue-600 to-indigo-600 px-3 font-head text-[13px] font-bold shadow-[0_4px_16px_rgba(37,99,235,0.4)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {hasPrompt ? (
              <>
                <Download className="h-4 w-4" />
                {isAr ? "تثبيت الآن" : "Install now"}
              </>
            ) : isIos || isIpad ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {isAr ? "تمام، فهمت" : "Got it"}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {isAr ? "طريقة التثبيت" : "How to install"}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showSteps && "rotate-180")} />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleLater}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 text-[12.5px] font-medium text-slate-200 transition-colors hover:bg-white/15 hover:text-white"
          >
            {isAr ? "لاحقاً" : "Later"}
          </button>
        </div>

        <button type="button" onClick={handleNever} className="mt-2 block w-full text-center text-[11px] text-slate-400 transition-colors hover:text-slate-200">
          {isAr ? "عدم الإظهار مجدداً — التثبيت متاح دائماً من قائمة الحساب" : "Don't show again — install anytime from your account menu"}
        </button>
      </div>
    </div>,
    document.body
  );
}
