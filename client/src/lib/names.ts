import i18n, { isRtlLanguage } from "@/i18n";

/** The employee name in the current language (the other one only when it is
 * missing). The whole system speaks one language at a time, so the other
 * language's name is no longer shown as a second line: `secondary` is kept
 * for the callers and is always empty. */
export function namePair(ar: string | null | undefined, en: string | null | undefined, isAr: boolean) {
  const a = ar?.trim() || "";
  const e = en?.trim() || "";
  return { primary: isAr ? a || e : e || a, secondary: "" };
}

/** Up to two initials, e.g. "Mustafa Ragab" → "MR", "مصطفى رجب" → "مر". */
export function nameInitials(name: string, fallback = "?") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || fallback
  );
}

/** A free-text value with an optional English version: the English one in
 * English (falling back to Arabic when it was left empty), else the Arabic. */
export function pickLang(ar: string | null | undefined, en: string | null | undefined, isAr: boolean): string | null {
  return (isAr ? ar || en : en || ar) || null;
}

// Saudi cities, for a city typed in one language only.
const CITIES: [string, string][] = [
  ["الرياض", "Riyadh"], ["جدة", "Jeddah"], ["مكة المكرمة", "Makkah"], ["مكة", "Makkah"], ["المدينة المنورة", "Madinah"], ["المدينة", "Madinah"],
  ["الدمام", "Dammam"], ["الخبر", "Khobar"], ["الظهران", "Dhahran"], ["الأحساء", "Al Ahsa"], ["الهفوف", "Hofuf"], ["الجبيل", "Jubail"],
  ["القطيف", "Qatif"], ["الطائف", "Taif"], ["تبوك", "Tabuk"], ["بريدة", "Buraidah"], ["عنيزة", "Unaizah"], ["حائل", "Hail"],
  ["أبها", "Abha"], ["خميس مشيط", "Khamis Mushait"], ["بيشة", "Bisha"], ["نجران", "Najran"], ["جازان", "Jazan"], ["جيزان", "Jazan"],
  ["الباحة", "Al Baha"], ["سكاكا", "Sakaka"], ["عرعر", "Arar"], ["الخرج", "Al Kharj"], ["ينبع", "Yanbu"], ["حفر الباطن", "Hafar Al Batin"],
  ["القصيم", "Qassim"], ["المجمعة", "Al Majmaah"], ["الدوادمي", "Dawadmi"], ["رابغ", "Rabigh"], ["القريات", "Qurayyat"], ["محايل عسير", "Muhayil Asir"],
];
const norm = (s: string) => s.trim().toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة$/, "ه").replace(/^al[-\s]/, "al ");

/** A city in the current language: the stored translation, else a known Saudi city's name, else as typed. */
export function localizedCity(ar: string | null | undefined, en: string | null | undefined): string | null {
  const isAr = isRtlLanguage(i18n.language);
  const want = (isAr ? ar : en)?.trim() || "";
  const have = (isAr ? en : ar)?.trim() || "";
  // The wanted field already in the right script (a city is often typed in the other one).
  if (want && /[؀-ۿ]/.test(want) === isAr) return want;
  for (const v of [want, have]) {
    const hit = v && CITIES.find(([a, e]) => norm(a) === norm(v) || norm(e) === norm(v));
    if (hit) return isAr ? hit[0] : hit[1];
  }
  return want || have || null;
}

/** pickLang() for the current UI language. Components re-render on a
 * language switch (useTranslation), so reading it at render time is safe. */
export function localized(ar: string | null | undefined, en: string | null | undefined): string | null {
  return pickLang(ar, en, isRtlLanguage(i18n.language));
}

/** A file's type in words: "PDF", "صورة PNG" / "PNG image", "مستند Word" / "Word document". */
export function fileTypeLabel(mime: string | null | undefined): string {
  const m = (mime || "").toLowerCase();
  const isAr = isRtlLanguage(i18n.language);
  if (m === "application/pdf") return "PDF";
  if (m.startsWith("image/")) return isAr ? `صورة ${m.slice(6).toUpperCase()}` : `${m.slice(6).toUpperCase()} image`;
  if (/word|msword/.test(m)) return isAr ? "مستند Word" : "Word document";
  if (/sheet|excel|csv/.test(m)) return isAr ? "جدول Excel" : "Excel sheet";
  if (m.startsWith("text/")) return isAr ? "ملف نصي" : "Text file";
  return m ? (isAr ? "ملف" : "File") : "—";
}
