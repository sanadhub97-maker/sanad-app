import { ZipArchive } from "archiver";
import yauzl from "yauzl";
import type { Response } from "express";
import { once } from "node:events";
import { storage } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { checksum, openBackup } from "./backup-format";
import { readManifest, validateManifest, acquireLease, type BackupManifest } from "./backups.service";
async function streamBackup(id: string, res: Response) {
  const { manifest, bytes } = await readManifest(id);
  const archive = new ZipArchive({ store: true });
  archive.on("error", error => res.destroy(error)); res.on("close", () => archive.abort());
  res.setHeader("Content-Type", "application/zip"); res.setHeader("Content-Disposition", `attachment; filename="sanad-backup-${id}.zip"`);
  archive.pipe(res);
  let done = once(archive, "entry"); archive.append(bytes, { name: "manifest.sanad" }); await done;
  for (let i = 0; i < manifest.files.length; i++) {
    const bytes = await storage.read(manifest.files[i].storedName);
    if (checksum(bytes) !== manifest.files[i].checksum) { archive.abort(); throw ApiError.badRequest("Backup attachment integrity check failed."); }
    done = once(archive, "entry"); archive.append(bytes, { name: `attachments/${i}.sanad` }); await done;
  }
  await archive.finalize();
}
async function readEntry(zip: yauzl.ZipFile, entry: yauzl.Entry, limit: number): Promise<Buffer> {
  if (entry.uncompressedSize > limit || entry.generalPurposeBitFlag & 1) throw ApiError.badRequest("Invalid backup archive entry.");
  const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => zip.openReadStream(entry, (err, stream) => err ? reject(err) : resolve(stream!)));
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of stream as any) { size += chunk.length; if (size > limit) { (stream as any).destroy(); throw ApiError.badRequest("Backup archive exceeds the supported limit."); } chunks.push(chunk); }
  return Buffer.concat(chunks);
}
async function importArchive(filename: string) {
  const zip = await new Promise<yauzl.ZipFile>((resolve, reject) => yauzl.open(filename, { lazyEntries: true, autoClose: false, validateEntrySizes: true }, (error, zip) => error ? reject(ApiError.badRequest("Invalid backup ZIP archive.")) : resolve(zip!)));
  const saved: string[] = []; let manifest: BackupManifest | undefined; let manifestBytes: Buffer | undefined; const attachments = new Map<number, { storedName: string; checksum: string; size: number }>(); let totalBytes = 0;
  try {
    await new Promise<void>((resolve, reject) => {
      const names = new Set<string>();
      zip.on("error", reject); zip.on("end", resolve);
      zip.on("entry", async (entry: yauzl.Entry) => {
        try {
          if (names.has(entry.fileName) || names.size >= 20001 || (!/^attachments\/(0|[1-9]\d*)\.sanad$/.test(entry.fileName) && entry.fileName !== "manifest.sanad")) throw ApiError.badRequest("Unexpected file in backup archive."); names.add(entry.fileName);
          const bytes = await readEntry(zip, entry, entry.fileName === "manifest.sanad" ? 64 * 1024 * 1024 + 68 : 25 * 1024 * 1024 + 68);
          totalBytes += bytes.length; if (totalBytes > 512 * 1024 * 1024) throw ApiError.badRequest("Backup import exceeds 512 MB.");
          if (entry.fileName === "manifest.sanad") { manifestBytes = bytes; manifest = JSON.parse(openBackup(bytes).toString("utf8")); validateManifest(manifest); }
          else { const stored = await storage.save(bytes, "attachment.sanad"); saved.push(stored.storedName); attachments.set(Number(entry.fileName.match(/\d+/)![0]), { storedName: stored.storedName, checksum: checksum(bytes), size: bytes.length }); }
          zip.readEntry();
        } catch (error) { reject(error); }
      }); zip.readEntry();
    });
    if (!manifest || !manifestBytes || manifest.files.length !== attachments.size) throw ApiError.badRequest("Backup attachments are incomplete.");
    for (let i = 0; i < manifest.files.length; i++) {
      const original = manifest.files[i], imported = attachments.get(i);
      if (!imported || imported.checksum !== original.checksum || imported.size !== original.size + 68) throw ApiError.badRequest("Backup attachment integrity check failed.");
      const data = openBackup(await storage.read(imported.storedName)); if (checksum(data) !== original.originalChecksum) throw ApiError.badRequest("Backup attachment integrity check failed.");
      original.storedName = imported.storedName;
    }
    // Update storage references inside a freshly authenticated manifest.
    const { sealBackup } = await import("./backup-format");
    const bytes = sealBackup(Buffer.from(JSON.stringify(manifest))), stored = await storage.save(bytes, "manifest.sanad"); saved.push(stored.storedName);
    const row = await prisma.backupSnapshot.create({ data: { status: "READY", storedName: stored.storedName, checksum: checksum(bytes), totalBytes: BigInt(totalBytes), recordCount: Object.values(manifest.tables).reduce((n, rows) => n + rows.length, 0), fileCount: manifest.files.length, completedAt: new Date() } });
    return row.id;
  } catch (error) { for (const name of saved) await storage.delete(name).catch(() => undefined); throw error; }
  finally { zip.close(); }
}

export async function downloadBackup(id: string, res: Response) { const release = await acquireLease(); try { await streamBackup(id, res); } finally { await release(); } }
export async function importBackupArchive(filename: string) { const release = await acquireLease(); try { return await importArchive(filename); } finally { await release(); } }
