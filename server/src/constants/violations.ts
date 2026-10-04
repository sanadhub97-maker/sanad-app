// The government authorities a violation can come from, and the staff
// penalties of the work regulations. Kept in sync with client/src/lib/violations.ts.

export const AUTHORITIES: Record<string, { ar: string; en: string }> = {
  labor: { ar: "مكتب العمل (الموارد البشرية)", en: "Labour office (HRSD)" },
  jawazat: { ar: "المديرية العامة للجوازات", en: "Jawazat (Passports)" },
  baladiya: { ar: "الأمانة / البلدية", en: "Municipality" },
  civil: { ar: "الدفاع المدني", en: "Civil Defence" },
  traffic: { ar: "الإدارة العامة للمرور", en: "Traffic department" },
  sfda: { ar: "هيئة الغذاء والدواء", en: "Food & Drug Authority" },
  zatca: { ar: "هيئة الزكاة والضريبة والجمارك", en: "Zakat, Tax & Customs" },
  gosi: { ar: "التأمينات الاجتماعية", en: "GOSI" },
  commerce: { ar: "وزارة التجارة", en: "Ministry of Commerce" },
  other: { ar: "جهة أخرى", en: "Other authority" },
};
export const AUTHORITY_KEYS = Object.keys(AUTHORITIES);

export const STAFF_PENALTIES = ["تنبيه شفهي", "إنذار كتابي", "إنذار نهائي", "خصم من الراتب", "إيقاف عن العمل", "حرمان من العلاوة", "فصل"];

/** The authority's name as the interface language shows it. */
export function authorityName(key: string | null | undefined, custom: string | null | undefined, en = false) {
  if (key === "other" || !key) return custom || (en ? AUTHORITIES.other.en : AUTHORITIES.other.ar);
  const a = AUTHORITIES[key];
  return a ? (en ? a.en : a.ar) : key;
}
