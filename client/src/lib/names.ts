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
