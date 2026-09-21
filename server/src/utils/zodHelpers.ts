import { z, ZodTypeAny } from "zod";

/** Untouched optional text inputs on the frontend submit "" rather than
 * omitting the field. Without this, optional string columns end up storing
 * "" instead of null, which then fails `value ?? "—"`-style placeholders in
 * the UI. Wrap any optional string schema with this to normalize "" -> undefined
 * before validation. */
export function emptyToUndefined<T extends ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" ? undefined : v), schema);
}
