/** The issuing authority shown for a workforce document. Iqamas and passports
 * live on the employee record, which has no authority field for an iqama and
 * only an optional country for a passport, so fall back to a label in the
 * current language rather than a stored value. */
export function documentAuthority(
  doc: { type?: string | null; issuingAuthority?: string | null; passportCountry?: string | null },
  isAr: boolean
): string | null {
  const stored = doc.issuingAuthority || doc.passportCountry;
  if (stored) return stored;
  const type = doc.type?.toUpperCase();
  if (type === "IQAMA") return isAr ? "الجوازات السعودية" : "Saudi Jawazat";
  if (type === "PASSPORT") return isAr ? "إدارة الجوازات" : "Passport Office";
  return null;
}
