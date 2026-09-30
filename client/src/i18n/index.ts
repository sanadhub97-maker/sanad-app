import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { z } from "zod";
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
    // The browser tab speaks the interface's language too.
    document.title = isRtl ? "SanaD | نظام SanaD لإدارة الوثائق والموظفين" : "SanaD | Documents & HR System";
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

// Form errors without a message of their own follow the interface language,
// worked out when the error shows (not when the schema was made).
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") return { message: tr("هذا الحقل مطلوب", "This field is required") };
      if (issue.expected === "number") return { message: tr("اكتب رقمًا صحيحًا", "Enter a valid number") };
      if (issue.expected === "date") return { message: tr("اختر تاريخًا صحيحًا", "Pick a valid date") };
      return { message: tr("قيمة غير صحيحة", "Invalid value") };
    case z.ZodIssueCode.too_small:
      if (issue.type === "string")
        return { message: Number(issue.minimum) <= 1 ? tr("هذا الحقل مطلوب", "This field is required") : tr(`اكتب ${issue.minimum} أحرف على الأقل`, `Enter at least ${issue.minimum} characters`) };
      if (issue.type === "number") return { message: tr(`القيمة يجب ألا تقل عن ${issue.minimum}`, `Must be at least ${issue.minimum}`) };
      if (issue.type === "array") return { message: tr("اختر عنصرًا واحدًا على الأقل", "Choose at least one") };
      break;
    case z.ZodIssueCode.too_big:
      if (issue.type === "string") return { message: tr(`الحد الأقصى ${issue.maximum} حرفًا`, `At most ${issue.maximum} characters`) };
      if (issue.type === "number") return { message: tr(`القيمة يجب ألا تزيد عن ${issue.maximum}`, `Must be at most ${issue.maximum}`) };
      break;
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "email") return { message: tr("صيغة البريد الإلكتروني غير صحيحة", "Invalid email address") };
      if (issue.validation === "url") return { message: tr("الرابط غير صحيح", "Invalid link") };
      return { message: tr("صيغة غير صحيحة", "Invalid format") };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: tr("اختر قيمة من القائمة", "Choose a value from the list") };
    case z.ZodIssueCode.invalid_date:
      return { message: tr("اختر تاريخًا صحيحًا", "Pick a valid date") };
    case z.ZodIssueCode.custom:
      return { message: ctx.defaultError === "Invalid input" ? tr("قيمة غير صحيحة", "Invalid value") : ctx.defaultError };
  }
  return { message: ctx.defaultError === "Invalid input" ? tr("قيمة غير صحيحة", "Invalid value") : ctx.defaultError };
});
applyDocumentDirection(initialLang);

/** Picks the Arabic or English text for the current language. For strings
 * built outside React (zod messages, toasts in plain modules) — call it at
 * the moment the text is shown, not at module load, or it freezes. */
export function tr(ar: string, en: string): string {
  return isRtlLanguage(i18n.language) ? ar : en;
}

export default i18n;
