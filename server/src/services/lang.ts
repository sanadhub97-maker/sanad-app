import { AsyncLocalStorage } from "node:async_hooks";
import type { NextFunction, Request, Response } from "express";

/* The language of what the server prints for a request: PDFs, Excel and CSV
   exports follow the interface language the client sends (X-UI-Lang), so an
   English user gets English documents and an Arabic user Arabic ones. Code
   running outside a request (the daily alerts) uses Arabic unless it sets a
   language itself with withLang(). */

export type Lang = "ar" | "en";
const store = new AsyncLocalStorage<Lang>();

export function langMiddleware(req: Request, _res: Response, next: NextFunction) {
  const asked = String(req.headers["x-ui-lang"] ?? "").toLowerCase();
  store.run(asked.startsWith("en") ? "en" : "ar", next);
}

/** The current language (Arabic when none was set). */
export const currentLang = (): Lang => store.getStore() ?? "ar";
export const isEn = () => currentLang() === "en";

/** Arabic or English text for the current language. */
export const L = (ar: string, en: string) => (isEn() ? en : ar);

/** Runs fn with a fixed language, e.g. an alert in the language chosen in Settings. */
export function withLang<T>(lang: Lang, fn: () => T): T {
  return store.run(lang, fn);
}
