import { z, ZodTypeAny } from "zod";

/** Untouched optional text inputs on the frontend submit "" rather than
 * omitting the field, and the FileUpload component's remove button sets the
 * field to `null` rather than "". Without this, optional string columns end
 * up storing "" instead of null (breaking `value ?? "—"`-style placeholders),
 * or a `z.string().optional()` field rejects the `null` a file-remove sends
 * with a 422 (it only accepts string | undefined, not null). Wrap any
 * optional string schema with this to normalize "" / null -> undefined
 * before validation. */
export function emptyToUndefined<T extends ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v === null ? undefined : v), schema);
}
