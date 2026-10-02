import { fileTypeFromBuffer } from "file-type";
import { ApiError } from "@/utils/apiError";
import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import path from "node:path";

export async function validateFileContent(buffer: Buffer, mimeType: string, originalName: string) {
  if (!buffer.length || originalName.length > 200) throw ApiError.badRequest("Invalid file.");
  const detected = await fileTypeFromBuffer(buffer).catch(() => undefined);
  const ext = path.extname(originalName).toLowerCase();
  const extensions: Record<string, string[]> = {
    "application/pdf": [".pdf"], "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"],
    "application/msword": [".doc"], "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  };
  const ole = detected?.mime === "application/x-cfb" && ["application/msword", "application/vnd.ms-excel"].includes(mimeType);
  if (!extensions[mimeType]?.includes(ext) || (!ole && detected?.mime !== mimeType)) throw ApiError.badRequest("File content does not match its declared type.");
}

export const validateUploadedFile = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  if (req.file) await validateFileContent(req.file.buffer, req.file.mimetype, req.file.originalname);
  next();
});
