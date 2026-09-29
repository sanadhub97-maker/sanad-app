import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, Maximize2, Share, SquarePlus, WifiOff, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/* Installing SanaD as an app. Chrome, Edge and Samsung Internet (computers,
   Android phones and tablets) install it with one button; Safari on iPhone
   and iPad has no install button, so the card shows the Share → Add to Home
   Screen steps instead. The card appears a few seconds after the site opens,
   and again at most once a week after "Later". */

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SNOOZE_KEY = "sanad.install.snoozedAt";
const WEEK = 7 * 24 * 3600 * 1000;
const OPEN_EVENT = "sanad:install";

let deferred: InstallEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    window.dispatchEvent(new Event("sanad:install-ready"));
  });
}

/** Opens the install card from anywhere (the account menu). */
export const openInstall = () => window.dispatchEvent(new Event(OPEN_EVENT));

export const isStandalone = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

function iosKind(): "iphone" | "ipad" | null {
  const ua = navigator.userAgent;
  if (/iPhone|iPod/.test(ua)) return "iphone";
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ipad";
  return null;
}

/** True when this browser can install the site (now or through the iOS steps). */
export function useCanInstall() {
  const [ready, setReady] = useState(() => Boolean(deferred));
  useEffect(() => {
    const on = () => setReady(true);
    const off = () => setReady(false);
    window.addEventListener("sanad:install-ready", on);
    window.addEventListener("appinstalled", off);
    return () => {
      window.removeEventListener("sanad:install-ready", on);
      window.removeEventListener("appinstalled", off);
    };
  }, []);
  return !isStandalone() && (ready || iosKind() !== null);
}

function snoozed() {
  try {
    const t = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Date.now() - t < WEEK;
  } catch {
    return false;
  }
}
function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch {
    /* private mode: it will ask again next visit */
  }
}

export function LuluInstall() {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(() => Boolean(deferred));
  const [busy, setBusy] = useState(false);
  const ios = typeof navigator !== "undefined" ? iosKind() : null;

  // Show on its own a few seconds after the site opens.
  useEffect(() => {
    if (isStandalone()) return;
    const onReady = () => setReady(true);
    const onInstalled = () => {
      setOpen(false);
      toast.success(isAr ? "تم تثبيت SanaD على جهازك 🎉" : "SanaD is installed 🎉");
    };
    const onAsk = () => setOpen(true);
    window.addEventListener("sanad:install-ready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(OPEN_EVENT, onAsk);
    const id = window.setTimeout(() => {
      if (!snoozed() && (deferred || ios)) setOpen(true);
    }, 3500);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("sanad:install-ready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(OPEN_EVENT, onAsk);
    };
  }, [ios, isAr]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && later();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  function later() {
    snooze();
    setOpen(false);
  }

  async function install() {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      setReady(false);
      if (outcome === "accepted") setOpen(false);
      else later();
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === "undefined" || isStandalone()) return null;
  const canPrompt = ready && !ios;

  const perks: [typeof Zap, string, string][] = [
    [Zap, "lt-amber", isAr ? "يفتح فورًا" : "Opens instantly"],
    [Maximize2, "lt-sky", isAr ? "ملء الشاشة" : "Full screen"],
    [WifiOff, "lt-teal", isAr ? "يعمل مع ضعف الاتصال" : "Works on weak signal"],
  ];

  return createPortal(
    <>
      <div className={cn("lu-inst-scrim", open && "open")} onClick={later} />
      <div className={cn("lu-inst", open && "open", ios && "ios")} role="dialog" aria-modal="false" aria-label={isAr ? "تثبيت SanaD" : "Install SanaD"} aria-hidden={!open}>
        <span className="grab" aria-hidden="true" />
        <button type="button" className="x" onClick={later} aria-label={isAr ? "إغلاق" : "Close"}>
          <X />
        </button>
        <div className="head">
          <span className="app">
            <img src="/pwa/icon-192.png" alt="" />
            <i className="ring" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <b>{isAr ? "ثبّت SanaD على جهازك" : "Install SanaD on this device"}</b>
            <small>{isAr ? "تطبيق على شاشتك الرئيسية — بدون متجر وبدون تحميل كبير" : "An app on your home screen — no store, no big download"}</small>
          </div>
        </div>

        {ios ? (
          <ol className="steps">
            <li style={{ ["--k" as string]: 0 }}>
              <span className="n">1</span>
              <span>
                {isAr ? "اضغط زر المشاركة" : "Tap the Share button"}{" "}
                <span className="key">
                  <Share />
                </span>{" "}
                {ios === "ipad" ? (isAr ? "أعلى الشاشة" : "at the top") : isAr ? "أسفل الشاشة" : "at the bottom"}
              </span>
            </li>
            <li style={{ ["--k" as string]: 1 }}>
              <span className="n">2</span>
              <span>
                {isAr ? "اختر" : "Choose"}{" "}
                <span className="key wide">
                  <SquarePlus /> {isAr ? "إضافة إلى الشاشة الرئيسية" : "Add to Home Screen"}
                </span>
              </span>
            </li>
            <li style={{ ["--k" as string]: 2 }}>
              <span className="n">3</span>
              <span>{isAr ? "اضغط «إضافة» — وستجد SanaD بين تطبيقاتك" : "Tap “Add” — SanaD joins your apps"}</span>
            </li>
          </ol>
        ) : (
          <div className="perks">
            {perks.map(([Icon, tone, label]) => (
              <span key={label} className={cn("perk", tone)}>
                <i>
                  <Icon />
                </i>
                {label}
              </span>
            ))}
          </div>
        )}

        <div className="acts">
          {canPrompt ? (
            <button type="button" className="lu-go go" onClick={install} disabled={busy}>
              <Download /> {isAr ? "تثبيت الآن" : "Install now"}
            </button>
          ) : ios ? (
            <button type="button" className="lu-go go" onClick={later}>
              {isAr ? "فهمت" : "Got it"}
            </button>
          ) : (
            <span className="note">{isAr ? "افتح الموقع من Chrome أو Edge لتثبيته" : "Open the site in Chrome or Edge to install it"}</span>
          )}
          <button type="button" className="later" onClick={later}>
            {isAr ? "لاحقًا" : "Later"}
          </button>
        </div>
        {ios === "iphone" && <span className="pointer" aria-hidden="true" />}
      </div>
    </>,
    document.body
  );
}
