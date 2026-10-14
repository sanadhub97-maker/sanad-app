import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { ApiError } from "@/utils/apiError";
import { paginationMeta, skipTake } from "@/utils/pagination";
import { FILE_MODULE_PERMISSIONS } from "./files.access";
import { hasPermission } from "@/lib/security";
import type { AuthContext } from "@/types/express";
import { validateFileContent } from "./files.validation";
import sharp from "sharp";

export interface SaveFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  uploadedById: string;
  module?: string;
  relatedId?: string;
}

export async function saveFile(input: SaveFileInput) {
  await validateFileContent(input.buffer, input.mimeType, input.originalName);
  // Decode/re-encode raster uploads to reject malformed files and remove metadata.
  if (input.mimeType === "image/png" || input.mimeType === "image/jpeg") {
    const image = sharp(input.buffer, { limitInputPixels: 25_000_000 }).rotate();
    input.buffer = await (input.mimeType === "image/png" ? image.png() : image.jpeg()).toBuffer().catch(() => { throw ApiError.badRequest("Invalid image."); });
  }
  const { storedName, size } = await storage.save(input.buffer, input.originalName);
  return prisma.file.create({
    data: {
      originalName: input.originalName,
      storedName,
      mimeType: input.mimeType,
      size,
      module: input.module,
      relatedId: input.relatedId,
      uploadedById: input.uploadedById,
    },
  });
}

export interface ListFilesQuery {
  page: number;
  pageSize: number;
  q?: string;
  module?: string;
}

// Powers the File Manager screen (§36) — every uploaded file across every
// module, browsable independent of the record it's attached to.
export async function list(query: ListFilesQuery, auth: AuthContext | undefined) {
  if (!auth) throw ApiError.unauthorized();
  const { page, pageSize, q, module } = query;
  const where: Prisma.FileWhereInput = {
    ...(!auth.isSuperAdmin ? { OR: [{ module: { in: Object.keys(FILE_MODULE_PERMISSIONS).filter((key) => hasPermission(auth, FILE_MODULE_PERMISSIONS[key])) } }, { module: "user-avatar", relatedId: auth.userId }] } : {}),
    ...(module ? { module } : {}),
    ...(q ? { originalName: { contains: q, mode: "insensitive" } } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.file.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...skipTake(page, pageSize),
      include: { uploadedBy: { select: { id: true, fullName: true } } },
    }),
    prisma.file.count({ where }),
  ]);

  return { data, meta: paginationMeta(page, pageSize, total) };
}

export async function getMetadata(id: string) {
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw ApiError.notFound("File not found");
  return file;
}

/* The stored files live in another region; a warm server keeps the small ones it has
   served (logos, photos) in memory. A stored name never changes its content, so no
   invalidation is needed beyond dropping a deleted file. */
const CACHE_LIMIT = 24 * 1024 * 1024;
const CACHE_ITEM = 1024 * 1024;
const contentCache = new Map<string, Buffer>();
let cacheBytes = 0;
function remember(name: string, buffer: Buffer) {
  if (buffer.length > CACHE_ITEM) return;
  contentCache.delete(name);
  contentCache.set(name, buffer);
  cacheBytes += buffer.length;
  for (const [k, v] of contentCache) {
    if (cacheBytes <= CACHE_LIMIT) break;
    contentCache.delete(k);
    cacheBytes -= v.length;
  }
}

export async function getContent(id: string) {
  const file = await getMetadata(id);
  const cached = contentCache.get(file.storedName);
  if (cached) return { file, buffer: cached };
  const buffer = await storage.read(file.storedName);
  remember(file.storedName, buffer);
  return { file, buffer };
}

export async function remove(id: string) {
  const file = await getMetadata(id);
  const history = await prisma.documentRevision.findFirst({ where: { OR: ["before", "after"].flatMap(version => ["fileId", "iqamaFileId", "passportFileId"].map(field => ({ [version]: { path: [field], equals: id } }))) }, select: { id: true } });
  if (history) throw ApiError.badRequest("This attachment is retained in document history and cannot be deleted.");
  const gone = contentCache.get(file.storedName);
  if (gone) { contentCache.delete(file.storedName); cacheBytes -= gone.length; }
  await storage.delete(file.storedName);
  await prisma.file.delete({ where: { id } });
}
