import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/apiError";
import * as service from "@/modules/files/files.service";
import { assertFileAccess, isPublicBrandAsset, FILE_MODULE_PERMISSIONS } from "./files.access";
import { hasPermission } from "@/lib/security";
import { paginationSchema } from "@/utils/pagination";
import { z } from "zod";

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("No file was uploaded.");
  if (!req.auth) throw ApiError.unauthorized();
  const module = z.enum(["employee", "employee-document", "employee-documents", "company-document", "payment", "company-logo", "company-favicon", "company-stamp", "company-signature"]).parse(req.body.module);
  const relatedId = z.string().min(1).max(100).optional().parse(req.body.relatedId);
  const permission = FILE_MODULE_PERMISSIONS[module];
  if (!hasPermission(req.auth, permission)) throw ApiError.forbidden("You cannot upload to this module.");
  if (module.startsWith("company-") && module !== "company-document" && !hasPermission(req.auth, "settings.edit")) throw ApiError.forbidden("Settings edit permission is required.");

  const file = await service.saveFile({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    uploadedById: req.auth.userId,
    module,
    relatedId,
  });

  res.status(201).json({ data: file, message: "File uploaded successfully." });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = paginationSchema.extend({ module: z.string().max(80).optional() }).parse(req.query);
  res.json(
    await service.list({
      page: query.page,
      pageSize: query.pageSize,
      q: query.q,
      module: query.module,
    }, req.auth)
  );
});

export const getMetadata = asyncHandler(async (req: Request, res: Response) => {
  const file = await service.getMetadata(String(req.params.id));
  assertFileAccess(file, req.auth);
  res.json({ data: file });
});

export const download = asyncHandler(async (req: Request, res: Response) => {
  const file = await service.getMetadata(String(req.params.id));
  assertFileAccess(file, req.auth, "download");
  const { buffer } = await service.getContent(file.id);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'; frame-ancestors 'self'");
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.originalName)}"`);
  res.send(buffer);
});

export const downloadPublic = asyncHandler(async (req: Request, res: Response) => {
  const file = await service.getMetadata(String(req.params.id));
  if (!(await isPublicBrandAsset(file))) {
    throw ApiError.forbidden("This file is not publicly accessible.");
  }
  const { buffer } = await service.getContent(file.id);
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.originalName)}"`);
  res.send(buffer);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  assertFileAccess(await service.getMetadata(String(req.params.id)), req.auth, "delete");
  await service.remove(String(req.params.id));
  res.json({ message: "File deleted successfully." });
});
