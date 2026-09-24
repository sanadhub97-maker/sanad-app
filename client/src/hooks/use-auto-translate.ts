import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { translateText, type TranslateKind } from "@/api/translate";
import { getErrorMessage } from "@/lib/api";
import { tr } from "@/i18n";

export interface TranslatePair<T extends FieldValues> {
  ar: Path<T>;
  en: Path<T>;
  kind?: TranslateKind;
}

const DEBOUNCE_MS = 700;

/**
 * Fills each English field from its Arabic twin, like the employee name's
 * live transliteration, but with real translation (via the server):
 * - typing in the Arabic field translates it after a short pause, unless the
 *   user has typed their own English (or the record already had one);
 * - opening a record whose English is empty fills it from the Arabic;
 * - translateNow() (the "smart translate" button) always overwrites.
 */
export function useAutoTranslate<T extends FieldValues>(
  form: Pick<UseFormReturn<T>, "getValues" | "setValue">,
  pairs: TranslatePair<T>[],
  open: boolean
) {
  const { getValues, setValue } = form;
  const manual = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const pairsRef = useRef(pairs);
  pairsRef.current = pairs;

  const pairFor = (en: Path<T>) => pairsRef.current.find((p) => p.en === en)!;
  const setEn = useCallback(
    (en: Path<T>, value: string) =>
      setValue(en, value as PathValue<T, Path<T>>, { shouldDirty: true, shouldValidate: true }),
    [setValue]
  );

  const run = useCallback(
    async (pair: TranslatePair<T>, force: boolean) => {
      const ar = String(getValues(pair.ar) ?? "").trim();
      if (!ar) {
        if (force) toast.info(tr("اكتب النص بالعربي أولاً", "Enter the Arabic text first"));
        else if (!manual.current.has(pair.en)) setEn(pair.en, "");
        return;
      }
      setBusy((b) => ({ ...b, [pair.en]: true }));
      try {
        const en = await translateText(ar, pair.kind);
        // Stale: the Arabic changed while we waited, or the user typed English.
        if (String(getValues(pair.ar) ?? "").trim() !== ar) return;
        if (!force && manual.current.has(pair.en)) return;
        manual.current.delete(pair.en);
        setEn(pair.en, en);
      } catch (err) {
        if (force) toast.error(getErrorMessage(err));
      } finally {
        setBusy((b) => ({ ...b, [pair.en]: false }));
      }
    },
    [getValues, setEn]
  );

  // On open: keep English the record already has; fill the empty ones.
  useEffect(() => {
    if (!open) return;
    manual.current.clear();
    // After the dialog's reset() has populated the form.
    const id = setTimeout(() => {
      for (const p of pairsRef.current) {
        if (String(getValues(p.en) ?? "").trim()) manual.current.add(p.en);
        else if (String(getValues(p.ar) ?? "").trim()) void run(p, false);
      }
    }, 300);
    const pending = timers.current;
    return () => {
      clearTimeout(id);
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, [open, getValues, run]);

  return {
    busy,
    /** onChange for the Arabic input: translate after a pause. */
    arChange: (en: Path<T>) => () => {
      if (manual.current.has(en)) return;
      clearTimeout(timers.current.get(en));
      timers.current.set(en, setTimeout(() => void run(pairFor(en), false), DEBOUNCE_MS));
    },
    /** onChange for the English input: typed English stops auto-fill; clearing it resumes. */
    enChange: (en: Path<T>) => (e: { target: { value: string } }) => {
      if (e.target.value.trim()) manual.current.add(en);
      else manual.current.delete(en);
    },
    translateNow: (en: Path<T>) => void run(pairFor(en), true),
  };
}
