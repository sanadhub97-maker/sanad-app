import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { env } from "@/config/env";
import { ApiError } from "@/utils/apiError";
import fs from "node:fs";
import path from "node:path";
const MAGIC = Buffer.from("SNDBAK01");
function key(salt: Buffer) { return Buffer.from(hkdfSync("sha256", env.SETTINGS_ENCRYPTION_KEY, salt, "sanad-encrypted-backup-v1", 32)); }
export const checksum = (data: Buffer) => createHash("sha256").update(data).digest("hex");
export function sealBackup(data: Buffer) {
  const salt = randomBytes(32), iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(salt), iv);
  cipher.setAAD(MAGIC);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), encrypted]);
}
export function openBackup(data: Buffer) {
  if (data.length < 68 || !data.subarray(0, 8).equals(MAGIC)) throw ApiError.badRequest("Invalid encrypted backup.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(data.subarray(8, 40)), data.subarray(40, 52));
    decipher.setAAD(MAGIC); decipher.setAuthTag(data.subarray(52, 68));
    return Buffer.concat([decipher.update(data.subarray(68)), decipher.final()]);
  } catch { throw ApiError.badRequest("Backup is corrupted or belongs to another encryption key."); }
}
const excluded = new Set(["Session", "PasskeyChallenge", "BackupSnapshot", "MaintenanceLease"]);
// Prisma 7's runtime DMMF omits arity and relation fields. Read those from the
// deployed migration schema instead of guessing null handling or FK order.
const schemaSource = fs.readFileSync(path.join(__dirname, "../../../prisma/schema.prisma"), "utf8");
export const backupModels = Prisma.dmmf.datamodel.models.filter(model => !excluded.has(model.name)).map(model => {
  const block = schemaSource.match(new RegExp(`model ${model.name} \\{([\\s\\S]*?)\\n\\}`))?.[1];
  if (!block) throw new Error(`Missing backup schema model: ${model.name}`);
  return { ...model, fields: model.fields.map(field => {
    const definition = block.match(new RegExp(`^\\s*${field.name}\\s+${field.type}(\\[\\]|\\?)?([^\\n]*)`, "m"));
    if (!definition) throw new Error(`Missing backup field: ${model.name}.${field.name}`);
    const relation = definition[2].match(/fields:\s*\[([^\]]*)\]/)?.[1];
    return { ...field, isRequired: definition[1] !== "?", isList: definition[1] === "[]", relationFromFields: relation ? relation.split(",").map(value => value.trim()) : [] };
  }) };
});
export function modelOrder() {
  const remaining = [...backupModels], result: typeof backupModels = [];
  while (remaining.length) {
    const index = remaining.findIndex(model => model.fields.filter(f => f.kind === "object" && f.relationFromFields?.length && f.type !== model.name).every(f => excluded.has(f.type) || result.some(m => m.name === f.type)));
    if (index < 0) throw ApiError.internal("Backup schema contains unsupported dependency cycles.");
    result.push(remaining.splice(index, 1)[0]);
  }
  return result;
}
export const schemaFingerprintFor = (names: Set<string>) => checksum(Buffer.from(JSON.stringify(backupModels.filter(m => names.has(m.name)).map(m => [m.name, m.fields.filter(f => f.kind !== "object").map(f => [f.name, f.type, f.isList, f.isRequired])]))));
export const schemaFingerprint = () => schemaFingerprintFor(new Set(backupModels.map(m => m.name)));
export function encodeRows(name: string, rows: any[]) {
  const fields = backupModels.find(m => m.name === name)!.fields.filter(f => f.kind !== "object");
  return rows.map(row => Object.fromEntries(fields.map(f => { const v = row[f.name]; return [f.name, v == null ? null : f.type === "Bytes" ? Buffer.from(v).toString("base64") : ["BigInt", "Decimal"].includes(f.type) ? String(v) : f.type === "DateTime" ? v.toISOString() : v]; })));
}
export function decodeRows(name: string, rows: any[]) {
  const model = backupModels.find(m => m.name === name); if (!model) throw ApiError.badRequest("Unknown backup table.");
  const fields = model.fields.filter(f => f.kind !== "object");
  return rows.map(row => {
    if (!row || typeof row !== "object" || Array.isArray(row) || Object.keys(row).some(k => !fields.some(f => f.name === k))) throw ApiError.badRequest("Invalid backup record.");
    return Object.fromEntries(fields.map(f => { const v = row[f.name]; if (v == null) { if (f.type === "Json" && v === null) return [f.name, f.isRequired ? Prisma.JsonNull : Prisma.DbNull]; if (f.isRequired) throw ApiError.badRequest("Backup record is missing a required value."); return [f.name, v]; }
      if (f.type === "DateTime") { const date = new Date(v); if (!Number.isFinite(date.getTime())) throw ApiError.badRequest("Invalid backup date."); return [f.name, date]; }
      return [f.name, f.type === "Bytes" ? Buffer.from(v, "base64") : f.type === "BigInt" ? BigInt(v) : v];
    }));
  });
}
