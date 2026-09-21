import crypto from "crypto";
import { env } from "@/config/env";

// AES-256-GCM encryption for secrets-at-rest (SMTP password, WhatsApp API
// key) stored in the database. Never returned to the frontend in plaintext.
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = Buffer.from(env.SETTINGS_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    // Fall back to deriving a 32-byte key from an arbitrary-length secret so
    // local dev doesn't break if the key wasn't generated via the README's
    // one-liner.
    return crypto.createHash("sha256").update(env.SETTINGS_ENCRYPTION_KEY).digest();
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
