import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings";

/* Domestic professions (private driver, housemaid, nanny…): their medical
   insurance follows the iqama. Same matching as the server
   (server/src/services/domesticInsurance.ts). */

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

/** The professions list, and a check for a job title (Arabic or English). */
export function useDomesticProfessions(enabled = true) {
  const { data } = useQuery({ queryKey: ["settings", "domestic-professions"], queryFn: settingsApi.getDomesticProfessions, enabled, staleTime: 5 * 60_000 });
  const list = data?.professions ?? [];
  const set = new Set(list.map(normalizeProfession).filter(Boolean));
  const isDomestic = (jobTitle?: string | null, jobTitleEn?: string | null) => set.has(normalizeProfession(jobTitle)) || set.has(normalizeProfession(jobTitleEn));
  // Arabic suggestions for the job title field.
  const arabic = list.filter((p) => /[؀-ۿ]/.test(p));
  return { list, arabic, defaults: data?.defaults ?? [], isDomestic };
}
