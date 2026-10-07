import { readSetting, writeSetting } from "@/services/settingsStore";

/*
 * Domestic workers (private driver, housemaid, nanny, home cook…): their medical
 * insurance goes with the iqama, so it is valid while the iqama is, ends when it
 * ends and renews with it. It isn't stored as its own document: wherever
 * insurance is listed, these employees show one dated by their iqama. An employee
 * can be marked insuranceSeparate for the exceptions, which keeps their own
 * insurance document instead.
 */

export const DOMESTIC_PROFESSIONS_KEY = "employees.domesticProfessions";

export const DEFAULT_DOMESTIC_PROFESSIONS = [
  "سائق خاص",
  "عامل منزلي",
  "عاملة منزلية",
  "مربية أطفال",
  "طباخ",
  "طباخة منزلية",
  "حارس منزلي",
  "مزارع منزلي",
  "ممرض منزلي",
  // The same professions as they are written in English.
  "Private driver",
  "Domestic worker",
  "Housemaid",
  "Nanny",
  "Cook",
  "Home cook",
  "Home guard",
  "Home farmer",
  "Home nurse",
];

/** One spelling for comparing professions: no diacritics or tatweel, one alif, ه for ة, ي for ى, no "ال", single spaces. */
export function normalizeProfession(text: string | null | undefined): string {
  return (text ?? "")
    .normalize("NFKC")
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[•·\-–—_.,،()]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.startsWith("ال") ? w.slice(2) : w))
    .join(" ");
}

let cache: { at: number; list: string[] } | null = null;

export async function getDomesticProfessions(): Promise<string[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.list;
  const stored = await readSetting<string[] | null>(DOMESTIC_PROFESSIONS_KEY, null);
  const list = Array.isArray(stored) && stored.every((s) => typeof s === "string") ? stored : DEFAULT_DOMESTIC_PROFESSIONS;
  cache = { at: Date.now(), list };
  return list;
}

export async function setDomesticProfessions(list: string[]): Promise<string[]> {
  const seen = new Set<string>();
  const clean = list.map((s) => s.trim()).filter((s) => s && !seen.has(normalizeProfession(s)) && seen.add(normalizeProfession(s)));
  await writeSetting(DOMESTIC_PROFESSIONS_KEY, clean);
  cache = { at: Date.now(), list: clean };
  return clean;
}

/** A matcher for the current list, for checking many employees at once. */
export async function domesticMatcher(): Promise<(jobTitle?: string | null, jobTitleEn?: string | null) => boolean> {
  const set = new Set((await getDomesticProfessions()).map(normalizeProfession).filter(Boolean));
  return (jobTitle, jobTitleEn) => set.has(normalizeProfession(jobTitle)) || set.has(normalizeProfession(jobTitleEn));
}

export interface InsuranceSubject {
  jobTitle?: string | null;
  jobTitleEn?: string | null;
  insuranceSeparate?: boolean | null;
}

/** Whether this employee's insurance follows the iqama. */
export function insuranceFollowsIqama(emp: InsuranceSubject, isDomestic: (a?: string | null, b?: string | null) => boolean) {
  return isDomestic(emp.jobTitle, emp.jobTitleEn) && !emp.insuranceSeparate;
}

/** The employees whose insurance follows the iqama, from a list (ids). */
export async function linkedInsuranceIds(employees: ({ id: string } & InsuranceSubject)[]): Promise<Set<string>> {
  const isDomestic = await domesticMatcher();
  return new Set(employees.filter((e) => insuranceFollowsIqama(e, isDomestic)).map((e) => e.id));
}
