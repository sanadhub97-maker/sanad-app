import { prisma } from "@/lib/prisma";
import { randomBytes } from "node:crypto";
import { storage, validateStoredName } from "@/lib/storage";
import { ApiError } from "@/utils/apiError";
import { comparePassword } from "@/lib/password";
import { checksum, sealBackup, openBackup, backupModels, modelOrder, schemaFingerprint, encodeRows, decodeRows } from "./backup-format";
import { logger } from "@/lib/logger";
export let restoringSystem = false;
export type BackupManifest = { format: 1; schema: string; createdAt: string; tables: Record<string, any[]>; files: { id: string; storedName: string; checksum: string; originalChecksum: string; size: number }[] };
const MAX_MANIFEST = 64 * 1024 * 1024;
export async function confirmBackupPassword(userId: string, password: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null, isActive: true }, include: { userRoles: { include: { role: true } } } });
  if (!user || !user.userRoles.some(r => r.role.name === "Super Admin") || !await comparePassword(password, user.passwordHash)) throw ApiError.unauthorized("Current password is incorrect.");
  return user;
}
export async function acquireLease() {
  const token = randomBytes(24).toString("hex"), expiresAt = new Date(Date.now() + 2 * 60 * 60_000);
  try { await prisma.maintenanceLease.create({ data: { id: "backup", token, expiresAt } }); }
  catch (error) {
    if (!(error instanceof Object) || (error as any).code !== "P2002") throw error;
    const claimed = await prisma.maintenanceLease.updateMany({ where: { id: "backup", expiresAt: { lt: new Date() } }, data: { token, expiresAt } });
    if (!claimed.count) throw ApiError.tooMany("A backup or restore is already running.");
  }
  await prisma.backupSnapshot.updateMany({ where: { status: "RUNNING" }, data: { status: "FAILED", error: "انقطع تشغيل النسخة الاحتياطية. أعد إنشاء النسخة. / Backup execution interrupted; create a new backup.", completedAt: new Date() } });
  return async () => { await prisma.maintenanceLease.deleteMany({ where: { id: "backup", token } }); };
}
export function validateManifest(value: any): asserts value is BackupManifest {
  if (!value || value.format !== 1 || value.schema !== schemaFingerprint() || !value.tables || !Array.isArray(value.files)) throw ApiError.badRequest("Backup schema does not match this version of the system.");
  if (Object.keys(value.tables).length !== backupModels.length || backupModels.some(m => !Array.isArray(value.tables[m.name]))) throw ApiError.badRequest("Backup tables are incomplete.");
  if (value.files.length > 20000 || new Set(value.files.map((f: any) => f.id)).size !== value.files.length) throw ApiError.badRequest("Invalid backup attachments.");
  const files = value.tables.File;
  if (files.length !== value.files.length || value.files.some((f: any) => !files.some((row: any) => row.id === f.id && row.size === f.size) || !/^[a-f0-9]{64}$/.test(f.checksum) || !/^[a-f0-9]{64}$/.test(f.originalChecksum) || !Number.isInteger(f.size) || f.size < 0 || f.size > 25 * 1024 * 1024)) throw ApiError.badRequest("Backup attachments are incomplete.");
  for (const f of value.files) validateStoredName(f.storedName);
  for (const model of backupModels) { if (value.tables[model.name].length > 200000) throw ApiError.badRequest("Backup table exceeds the supported limit."); decodeRows(model.name, value.tables[model.name]); }
  // Keep a usable super administrator after replacement.
  const adminRoles = value.tables.Role.filter((r: any) => r.name === "Super Admin").map((r: any) => r.id);
  if (!value.tables.User.some((u: any) => u.isActive && !u.deletedAt && value.tables.UserRole.some((r: any) => r.userId === u.id && adminRoles.includes(r.roleId)))) throw ApiError.badRequest("Backup contains no active super administrator.");
}
export async function readManifest(id: string) {
  const snapshot = await prisma.backupSnapshot.findUnique({ where: { id } });
  if (!snapshot || snapshot.status !== "READY" || !snapshot.storedName) throw ApiError.notFound("Completed backup not found.");
  const bytes = await storage.read(snapshot.storedName);
  if (bytes.length > MAX_MANIFEST + 68 || checksum(bytes) !== snapshot.checksum) throw ApiError.badRequest("Backup integrity check failed.");
  const manifest = JSON.parse(openBackup(bytes).toString("utf8")); validateManifest(manifest);
  return { snapshot, bytes, manifest };
}
export async function createBackup(actorId?: string) {
  const release = await acquireLease(); const saved: string[] = [];
  let snapshotId: string | undefined;
  try {
    const snapshot = await prisma.backupSnapshot.create({ data: { status: "RUNNING" } }); snapshotId = snapshot.id;
    const tables = await prisma.$transaction(async tx => {
      const result: Record<string, any[]> = {}; let size = 0;
      for (const model of backupModels) {
        const delegate = model.name[0].toLowerCase() + model.name.slice(1);
        const rows = await (tx as any)[delegate].findMany({ take: 200001 });
        if (rows.length > 200000) throw ApiError.badRequest("Backup table exceeds the supported limit.");
        result[model.name] = encodeRows(model.name, rows); size += Buffer.byteLength(JSON.stringify(result[model.name]));
        if (size > MAX_MANIFEST) throw ApiError.badRequest("Backup database exceeds the supported limit.");
      }
      return result;
    }, { isolationLevel: "RepeatableRead", timeout: 120000, maxWait: 10000 });
    const manifest: BackupManifest = { format: 1, schema: schemaFingerprint(), createdAt: new Date().toISOString(), tables, files: [] };
    let totalBytes = 0;
    for (const file of tables.File) {
      if (file.size > 25 * 1024 * 1024) throw ApiError.badRequest("Backup attachment exceeds the supported limit.");
      let original: Buffer;
      try { original = await storage.read(file.storedName); }
      catch (err) {
        if (["ENOENT", "NoSuchKey", "NotFound"].includes((err as any)?.code || (err as any)?.name)) throw ApiError.badRequest(`مرفق مفقود: ${String(file.originalName).slice(0, 120)}. أعد رفع الملف الأصلي قبل إنشاء النسخة. / Missing attachment; upload its original before backing up.`);
        throw err;
      }
      if (original.length !== file.size) throw ApiError.badRequest("Attachment integrity check failed.");
      const encrypted = sealBackup(original), stored = await storage.save(encrypted, "attachment.sanad"); saved.push(stored.storedName); totalBytes += encrypted.length;
      manifest.files.push({ id: file.id, storedName: stored.storedName, checksum: checksum(encrypted), originalChecksum: checksum(original), size: original.length });
    }
    const json = Buffer.from(JSON.stringify(manifest)); if (json.length > MAX_MANIFEST) throw ApiError.badRequest("Backup manifest exceeds the supported limit.");
    const bytes = sealBackup(json), stored = await storage.save(bytes, "manifest.sanad"); saved.push(stored.storedName); totalBytes += bytes.length;
    await prisma.backupSnapshot.update({ where: { id: snapshot.id }, data: { status: "READY", storedName: stored.storedName, checksum: checksum(bytes), totalBytes: BigInt(totalBytes), fileCount: manifest.files.length, recordCount: Object.values(tables).reduce((n, rows) => n + rows.length, 0), completedAt: new Date() } });
    await prisma.auditLog.create({ data: { userId: actorId, action: "EXPORT", module: "backups", recordId: snapshot.id, description: "Created encrypted database and attachment backup" } });
    await pruneBackups(); return snapshot.id;
  } catch (error) {
    for (const name of saved) await storage.delete(name).catch(() => undefined);
    if (snapshotId) await prisma.backupSnapshot.update({ where: { id: snapshotId }, data: { status: "FAILED", error: error instanceof ApiError && error.statusCode === 400 ? error.message : "Backup failed. Check server logs and storage availability.", completedAt: new Date() } }).catch(() => undefined);
    logger.error({ err: error }, "Backup failed"); throw error;
  } finally { await release(); }
}
async function pruneBackups() {
  const old = await prisma.backupSnapshot.findMany({ where: { status: "READY" }, orderBy: { createdAt: "desc" }, skip: 7 });
  for (const row of old) {
    try { const { manifest } = await readManifest(row.id); for (const file of manifest.files) await storage.delete(file.storedName); await storage.delete(row.storedName!); await prisma.backupSnapshot.delete({ where: { id: row.id } }); }
    catch (err) { logger.warn({ err, backupId: row.id }, "Could not prune old backup"); }
  }
}
export async function restoreBackup(id: string, actorId: string, password: string) {
  const authorization = await confirmBackupPassword(actorId, password);
  const release = await acquireLease(); const saved: string[] = []; let committed = false;
  try {
    const { manifest } = await readManifest(id); const tables = manifest.tables;
    for (const file of manifest.files) {
      const bytes = await storage.read(file.storedName); if (checksum(bytes) !== file.checksum) throw ApiError.badRequest("Backup attachment integrity check failed.");
      const original = openBackup(bytes); if (original.length !== file.size || checksum(original) !== file.originalChecksum) throw ApiError.badRequest("Backup attachment integrity check failed.");
      const row = tables.File.find((r: any) => r.id === file.id)!;
      const stored = await storage.save(original, row.originalName); saved.push(stored.storedName); row.storedName = stored.storedName;
    }
    restoringSystem = true;
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId} FOR UPDATE`;
      const actor = await tx.user.findFirst({ where: { id: actorId, deletedAt: null, isActive: true }, include: { userRoles: { include: { role: true } } } });
      if (!actor || actor.passwordHash !== authorization.passwordHash || !actor.userRoles.some(r => r.role.name === "Super Admin")) throw ApiError.unauthorized("Restore authorization has changed. Sign in again.");
      await tx.session.deleteMany(); await tx.passkeyChallenge.deleteMany();
      const models = modelOrder();
      for (const model of [...models].reverse()) await (tx as any)[model.name[0].toLowerCase() + model.name.slice(1)].deleteMany();
      for (const model of models) {
        const rows = decodeRows(model.name, tables[model.name]);
        for (let i = 0; i < rows.length; i += 250) await (tx as any)[model.name[0].toLowerCase() + model.name.slice(1)].createMany({ data: rows.slice(i, i + 250) });
      }
      await tx.auditLog.create({ data: { action: "IMPORT", module: "backups", recordId: id, description: "Full snapshot restore; all sign-in sessions revoked" } });
    }, { timeout: 180000, maxWait: 10000, isolationLevel: "Serializable" });
    committed = true;
  } finally {
    restoringSystem = false;
    if (!committed) for (const name of saved) await storage.delete(name).catch(() => undefined);
    await release();
  }
}
export async function backupStatus() {
  const [rows, setting, lease] = await Promise.all([prisma.backupSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: 30 }), prisma.setting.findUnique({ where: { key: "automaticBackups" } }), prisma.maintenanceLease.findUnique({ where: { id: "backup" } })]);
  const running = Boolean(lease && lease.expiresAt > new Date());
  return { rows: rows.map(row => ({ ...row, ...(row.status === "RUNNING" && !running ? { status: "FAILED", error: "انقطع تشغيل النسخة الاحتياطية. أعد إنشاء النسخة. / Backup execution interrupted; create a new backup." } : {}), storedName: undefined, checksum: undefined, totalBytes: Number(row.totalBytes) })), enabled: (setting?.value as any)?.enabled ?? true, running, retention: 7, schedule: "03:00 Asia/Riyadh" };
}
export async function runScheduledBackup() {
  const enabled = await prisma.setting.findUnique({ where: { key: "automaticBackups" } }); if ((enabled?.value as any)?.enabled === false) return;
  const today = new Date(Date.now() + 3 * 60 * 60_000).toISOString().slice(0, 10);
  const due = new Date(`${today}T03:00:00+03:00`); if (new Date() < due) return;
  if (await prisma.backupSnapshot.findFirst({ where: { status: { in: ["READY", "FAILED", "RUNNING"] }, createdAt: { gte: due } } })) return;
  await createBackup();
}
