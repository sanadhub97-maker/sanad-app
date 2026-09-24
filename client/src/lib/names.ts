import i18n, { isRtlLanguage } from "@/i18n";

/** The employee name to lead with in the current language, plus the other
 * language's name as a secondary line (empty when missing or identical). */
export function namePair(ar: string | null | undefined, en: string | null | undefined, isAr: boolean) {
  const a = ar?.trim() || "";
  const e = en?.trim() || "";
  const primary = isAr ? a || e : e || a;
  const other = isAr ? e : a;
  return { primary, secondary: other && other !== primary ? other : "" };
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

/** pickLang() for the current UI language. Components re-render on a
 * language switch (useTranslation), so reading it at render time is safe. */
export function localized(ar: string | null | undefined, en: string | null | undefined): string | null {
  return pickLang(ar, en, isRtlLanguage(i18n.language));
}
