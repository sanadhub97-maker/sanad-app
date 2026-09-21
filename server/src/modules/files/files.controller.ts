import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/apiError";
import * as service from "@/modules/files/files.service";

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("No file was uploaded.");
  if (!req.auth) throw ApiError.unauthorized();

  const file = await service.saveFile({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    uploadedById: req.auth.userId,
    module: req.body.module,
    relatedId: req.body.relatedId,
  });

  res.status(201).json({ data: file, message: "File uploaded successfully." });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as { page?: string; pageSize?: string; q?: string; module?: string };
  res.json(
    await service.list({
      page: Number(query.page ?? 1),
      pageSize: Number(query.pageSize ?? 20),
      q: query.q,
      module: query.module,
    })
  );
});

export const getMetadata = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.getMetadata(req.params.id) });
});

export const download = asyncHandler(async (req: Request, res: Response) => {
  const { file, buffer } = await service.getContent(req.params.id);
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.originalName)}"`);
  res.send(buffer);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(req.params.id);
  res.json({ message: "File deleted successfully." });
});
