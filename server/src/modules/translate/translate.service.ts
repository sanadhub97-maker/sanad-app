import { ApiError } from "@/utils/apiError";
import { logger } from "@/lib/logger";

// Arabic → English for the optional English fields (establishment name, job
// title, department, city, nationality). Uses Google's free web-translate
// endpoint (no key); it is unofficial, so a failure is reported to the user
// rather than silently filling the field with something wrong.

export type TranslateKind = "text" | "nationality";

// The web endpoint turns a nationality adjective into the country
// ("مصري" → "Egypt"); these are the demonyms people actually enter.
const NATIONALITIES: Record<string, string> = {
  سعودي: "Saudi", مصري: "Egyptian", أردني: "Jordanian", سوري: "Syrian", لبناني: "Lebanese",
  فلسطيني: "Palestinian", يمني: "Yemeni", سوداني: "Sudanese", عراقي: "Iraqi", كويتي: "Kuwaiti",
  إماراتي: "Emirati", قطري: "Qatari", بحريني: "Bahraini", عماني: "Omani", مغربي: "Moroccan",
  جزائري: "Algerian", تونسي: "Tunisian", ليبي: "Libyan", موريتاني: "Mauritanian", صومالي: "Somali",
  إريتري: "Eritrean", إثيوبي: "Ethiopian", كيني: "Kenyan", أوغندي: "Ugandan", نيجيري: "Nigerian",
  هندي: "Indian", باكستاني: "Pakistani", بنغلاديشي: "Bangladeshi", نيبالي: "Nepali", سريلانكي: "Sri Lankan",
  فلبيني: "Filipino", إندونيسي: "Indonesian", أفغاني: "Afghan", تركي: "Turkish", إيراني: "Iranian",
  صيني: "Chinese", بريطاني: "British", أمريكي: "American", فرنسي: "French", ألماني: "German",
};

/** Normalizes the spelling variants people type: ى/ي at the end, أ/إ/آ/ا,
 * a trailing ة/ه, and a feminine ending (مصرية → مصري). */
function normalizeNationality(s: string) {
  return s
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى$/, "ي")
    .replace(/(ية|يه)$/, "ي");
}
const NATIONALITY_BY_NORMAL = new Map(Object.entries(NATIONALITIES).map(([ar, en]) => [normalizeNationality(ar), en]));

const SMALL_WORDS = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);

/** "Life break café serving drinks" → "Life Break Café Serving Drinks". */
function titleCase(s: string) {
  return s
    .split(/\s+/)
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      // Leave acronyms and mixed-case words (e.g. "LLC", "McDonald") as given.
      if (w !== lower && w !== w[0].toUpperCase() + w.slice(1).toLowerCase()) return w;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

const cache = new Map<string, string>();
const CACHE_MAX = 2000;

async function googleTranslate(text: string): Promise<string> {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=" + encodeURIComponent(text);
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
  const body = (await res.json()) as [Array<[string]>] | unknown;
  const parts = Array.isArray(body) && Array.isArray(body[0]) ? (body[0] as Array<[string]>) : null;
  const out = parts?.map((p) => p[0]).join("").trim();
  if (!out) throw new Error("translate: empty response");
  return out;
}

export async function translateToEnglish(text: string, kind: TranslateKind = "text"): Promise<string> {
  const source = text.trim();
  if (!source) return "";
  // Nothing to translate when there is no Arabic in it.
  if (!/[؀-ۿ]/.test(source)) return source;

  if (kind === "nationality") {
    const known = NATIONALITY_BY_NORMAL.get(normalizeNationality(source));
    if (known) return known;
  }

  const key = `${kind}:${source}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let translated: string;
  try {
    translated = titleCase(await googleTranslate(source));
  } catch (err) {
    logger.warn({ err }, "Auto-translate failed");
    throw new ApiError(502, "TRANSLATE_FAILED", "Automatic translation is unavailable right now. Please type the English text.");
  }
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, translated);
  return translated;
}
