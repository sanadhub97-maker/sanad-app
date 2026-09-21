import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { ApiError } from "@/utils/apiError";
import { paginationMeta, skipTake } from "@/utils/pagination";

export interface SaveFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  uploadedById: string;
  module?: string;
  relatedId?: string;
}

export async function saveFile(input: SaveFileInput) {
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
export async function list(query: ListFilesQuery) {
  const { page, pageSize, q, module } = query;
  const where: Prisma.FileWhereInput = {
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

export async function getContent(id: string) {
  const file = await getMetadata(id);
  const buffer = await storage.read(file.storedName);
  return { file, buffer };
}

export async function remove(id: string) {
  const file = await getMetadata(id);
  await storage.delete(file.storedName);
  await prisma.file.delete({ where: { id } });
}
