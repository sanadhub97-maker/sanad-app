import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "@/i18n/locales/en.json";
import ar from "@/i18n/locales/ar.json";

export const RTL_LANGUAGES = new Set(["ar", "fa", "ur", "he"]);

export function isRtlLanguage(lang: string | undefined | null): boolean {
  if (!lang) return true;
  const clean = lang.toLowerCase().trim();
  return clean.startsWith("ar") || clean.startsWith("fa") || clean.startsWith("ur") || clean.startsWith("he") || RTL_LANGUAGES.has(clean);
}

export function applyDocumentDirection(lang: string) {
  const isRtl = isRtlLanguage(lang);
  const dir = isRtl ? "rtl" : "ltr";
  const normLang = isRtl ? "ar" : "en";
  
  if (typeof document !== "undefined") {
    document.documentElement.dir = dir;
    document.documentElement.lang = normLang;
    if (document.body) {
      document.body.dir = dir;
    }
  }
}

const savedLang = typeof window !== "undefined" ? localStorage.getItem("i18nextLng") : null;
const initialLang = savedLang === "en" ? "en" : "ar";

if (typeof window !== "undefined" && (!savedLang || (savedLang !== "ar" && savedLang !== "en"))) {
  localStorage.setItem("i18nextLng", "ar");
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    lng: initialLang,
    fallbackLng: "ar",
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage"], caches: ["localStorage"], lookupLocalStorage: "i18nextLng" },
  });

i18n.on("languageChanged", applyDocumentDirection);
applyDocumentDirection(initialLang);

/** Picks the Arabic or English text for the current language. For strings
 * built outside React (zod messages, toasts in plain modules) — call it at
 * the moment the text is shown, not at module load, or it freezes. */
export function tr(ar: string, en: string): string {
  return isRtlLanguage(i18n.language) ? ar : en;
}

export default i18n;
