import crypto from "crypto";

/** Random URL-safe opaque token for refresh/reset/verify flows. Only the
 * hash is ever persisted — the raw value is shown to the client once. */
export function generateOpaqueToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
