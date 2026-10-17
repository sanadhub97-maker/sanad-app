import { useEffect, useState, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
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

/* Opened inside a frame (sanad-hr.sept.cloud shows the system in one), the
   browser installs the outer page, not this one. The outer page says when it
   can be installed, shows the prompt when asked, and says when it already
   runs as an installed app. */
const PARENTS = ["https://sanad-hr.sept.cloud", "https://sept.cloud"];
const framed = typeof window !== "undefined" && window.top !== window.self;
let parentOrigin: string | null = null;
let parentReady = false;
let parentStandalone = false;
let parentChoice: ((outcome: string) => void) | null = null;
if (framed) {
  window.addEventListener("message", (e) => {
    if (!PARENTS.includes(e.origin) || !e.data || typeof e.data.type !== "string") return;
    parentOrigin = e.origin;
    if (e.data.type === "sanad:install-ready") {
      parentReady = true;
      window.dispatchEvent(new Event("sanad:install-ready"));
    } else if (e.data.type === "sanad:installed") {
      parentReady = false;
      window.dispatchEvent(new Event("appinstalled"));
    } else if (e.data.type === "sanad:standalone") {
      parentStandalone = true;
      window.dispatchEvent(new Event("sanad:standalone"));
    } else if (e.data.type === "sanad:choice") {
      parentChoice?.(String(e.data.outcome));
      parentChoice = null;
    }
  });
  // A message to an origin the parent isn't on is simply not delivered.
  for (const origin of PARENTS) window.parent.postMessage({ type: "sanad:hello" }, origin);
}

/** Asks the outer page to show the browser's install prompt; resolves with the choice. */
function promptThroughParent(): Promise<string> {
  if (!parentOrigin) return Promise.resolve("unavailable");
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve("dismissed"), 120_000);
    parentChoice = (o) => {
      window.clearTimeout(timer);
      resolve(o);
    };
    window.parent.postMessage({ type: "sanad:prompt" }, parentOrigin!);
  });
}

/** Check if site is already running in standalone / installed PWA mode */
export const isStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    parentStandalone ||
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
    window.addEventListener("sanad:standalone", onInstalled);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("sanad:standalone", onInstalled);
    };
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
  const { pathname } = useLocation();
  // The apps page has its own install buttons: the card opens only from them, never by itself.
  return <AppleInstallPrompt auto={pathname !== "/android" && pathname !== "/apps"} />;
}

export function AppleInstallPrompt({ auto = true }: { auto?: boolean }) {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");

  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<PlatformType>(() => detectPlatform());
  const [hasPrompt, setHasPrompt] = useState(() => Boolean(deferredPrompt) || parentReady);
  const [, setStandalone] = useState(false);
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

    // Already the installed app (the outer page says so): never show the card.
    const onStandalone = () => {
      setOpen(false);
      setStandalone(true);
    };

    window.addEventListener("sanad:install-ready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("sanad:standalone", onStandalone);
    window.addEventListener(OPEN_EVENT, onManualOpen);

    const autoTimer = window.setTimeout(() => {
      if (auto && !isStandalone() && !isSnoozed() && !isNever()) {
        setPlatform(detectPlatform());
        setOpen(true);
      }
    }, 2200);

    return () => {
      window.clearTimeout(autoTimer);
      window.removeEventListener("sanad:install-ready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("sanad:standalone", onStandalone);
      window.removeEventListener(OPEN_EVENT, onManualOpen);
    };
  }, [isAr, auto]);

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
    if (!deferredPrompt && parentReady) {
      setBusy(true);
      const outcome = await promptThroughParent();
      setBusy(false);
      if (outcome === "accepted") {
        parentReady = false;
        setHasPrompt(false);
        setOpen(false);
        toast.success(isAr ? "جاري تثبيت نظام SanaD على جهازك..." : "Installing SanaD on your device...");
      } else if (outcome === "unavailable") {
        parentReady = false;
        setHasPrompt(false);
        setShowSteps(true);
      } else {
        handleLater();
      }
      return;
    }
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

  // What the app gives, as small royal chips
  const perks = [
    { icon: Zap, tone: "border-[#c9a464]/40 bg-[#c9a464]/12 text-[#f3dfae]", title: isAr ? "يفتح فوراً" : "Instant" },
    { icon: WifiOff, tone: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300", title: isAr ? "بدون إنترنت" : "Offline" },
    { icon: Maximize2, tone: "border-[#c9a464]/30 bg-white/[0.03] text-[#e9d3a1]", title: isAr ? "شاشة كاملة" : "Full screen" },
    { icon: Bell, tone: "border-[#c9a464]/30 bg-white/[0.03] text-[#e9d3a1]", title: isAr ? "تنبيهات" : "Alerts" },
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
    <span className="mx-1 inline-flex items-center gap-1 rounded-md border border-[#c9a464]/35 bg-[#c9a464]/15 px-1.5 py-0.5 font-semibold text-[#f3dfae]">{content}</span>
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
        "inset-x-3 top-[max(12px,env(safe-area-inset-top))] sm:inset-x-auto sm:start-5 sm:w-[382px] lg:top-auto lg:bottom-5",
        open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0 lg:translate-y-4"
      )}
    >
      <div
        className="relative overflow-hidden rounded-[20px] border border-[#d6b678]/40 bg-[#110f0d]/[0.98] p-4 text-[#f7f2e7] shadow-[0_28px_60px_-18px_rgba(0,0,0,0.88),inset_0_0_0_3px_#0c0b09,inset_0_0_0_4px_rgba(214,182,120,0.16)]"
        style={{
          backgroundImage:
            "radial-gradient(280px 150px at 85% 0%, rgba(243,223,174,0.13), transparent 70%), radial-gradient(220px 140px at 0% 100%, rgba(201,164,100,0.09), transparent 70%), linear-gradient(160deg, #151310, #0b0a08)",
        }}
      >
        {/* Top subtle gold ornament rule */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-[1.5px]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(243,223,174,0.75), transparent)" }}
        />

        <button
          type="button"
          onClick={handleLater}
          aria-label={isAr ? "إغلاق" : "Close"}
          className="absolute end-3.5 top-3.5 grid h-7 w-7 place-items-center rounded-full border border-[#c9a464]/30 bg-[#c9a464]/10 text-[#e9d3a1]/80 transition-colors hover:border-[#c9a464]/60 hover:bg-[#c9a464]/20 hover:text-[#fff3d6]"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-3.5 pe-8">
          <div className="relative shrink-0">
            <img
              src="/pwa/icon-192.png"
              alt=""
              className="h-12 w-12 rounded-[14px] border border-[#c9a464]/50 shadow-[0_8px_22px_-6px_rgba(201,164,100,0.55)]"
            />
            <span className="absolute -bottom-1 -end-1 grid h-5 w-5 place-items-center rounded-full border border-[#c9a464]/55 bg-[#12100d] text-[#f3dfae] shadow-[0_0_10px_rgba(201,164,100,0.4)]">
              <DeviceIcon className="h-3 w-3" />
            </span>
          </div>
          <div className="min-w-0">
            <h3
              className="font-head text-[15.5px] font-extrabold leading-snug text-[#f3dfae]"
              style={{
                background: "linear-gradient(118deg, #e8cf8b 0%, #fff3d6 45%, #c9a464 90%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {deviceTitle}
            </h3>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#b9ae99]">{deviceSub}</p>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {perks.map(({ icon: Icon, tone, title }) => (
            <span key={title} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold", tone)}>
              <Icon className="h-3 w-3" />
              {title}
            </span>
          ))}
        </div>

        {(isIos || isIpad || showSteps) && (
          <ol className="mt-3 space-y-1.5 rounded-xl border border-[#c9a464]/25 bg-black/35 p-3 text-[11.5px] text-[#e9d3a1]">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-[#c9a464]/45 bg-[#c9a464]/20 text-[10px] font-bold text-[#fff3d6]">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={isIos || isIpad ? handleLater : handleInstallClick}
            disabled={busy}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#f3dfae]/40 px-3 font-head text-[13.5px] font-extrabold text-[#191206] shadow-[0_10px_24px_-8px_rgba(201,164,100,0.75)] transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
            style={{
              backgroundImage: "var(--rx-foil, linear-gradient(118deg, #8b6524 0%, #d4af68 24%, #fff3d6 50%, #c9a464 76%, #7a581e 100%))",
              backgroundSize: "200% 100%",
            }}
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
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#c9a464]/30 bg-[#c9a464]/10 px-3.5 text-[12.5px] font-bold text-[#e9d3a1] transition-colors hover:border-[#c9a464]/55 hover:bg-[#c9a464]/18 hover:text-[#fff3d6]"
          >
            {isAr ? "لاحقاً" : "Later"}
          </button>
        </div>

        {isAndroid && (
          <a
            href="/android"
            className="mt-2 flex h-10 items-center justify-center gap-2 rounded-xl border border-[#c9a464]/40 bg-[#c9a464]/15 text-[12.5px] font-bold text-[#f3dfae] transition hover:bg-[#c9a464]/25"
          >
            <Smartphone className="h-4 w-4" />
            {isAr ? "أو حمّل تطبيق SanaD لأندرويد" : "Or get the SanaD Android app"}
          </a>
        )}

        <button
          type="button"
          onClick={handleNever}
          className="mt-2.5 block w-full text-center text-[11px] font-medium text-[#9e927d] transition-colors hover:text-[#f3dfae]"
        >
          {isAr ? "عدم الإظهار مجدداً — التثبيت متاح دائماً من قائمة الحساب" : "Don't show again — install anytime from your account menu"}
        </button>
      </div>
    </div>,
    document.body
  );
}
