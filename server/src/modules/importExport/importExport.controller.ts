import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/apiError";
import { buildEmployeesImportTemplate } from "@/modules/importExport/employeesTemplate";
import { importEmployees } from "@/modules/importExport/employeesImport";
import { buildWorkbook } from "@/services/excel";
import * as service from "@/modules/importExport/importExport.service";

export const employeesTemplate = asyncHandler(async (_req: Request, res: Response) => {
  const buffer = await buildEmployeesImportTemplate();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="employees-import-template.xlsx"');
  res.send(buffer);
});

export const importEmployeesFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("Please upload an Excel (.xlsx) file.");
  if (!req.auth) throw ApiError.unauthorized();

  const dryRun = req.query.dryRun === "true";
  const summary = await importEmployees(req.file.buffer, req.file.originalname, req.auth.userId, dryRun);

  res.json({
    data: summary,
    message: dryRun
      ? `Preview: ${summary.importedCount} to import, ${summary.updatedCount} to update, ${summary.skippedCount} to skip.`
      : `${summary.importedCount} imported, ${summary.updatedCount} updated, ${summary.skippedCount} skipped.`,
  });
});

export const listJobs = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listJobs(req.query as never));
});

export const getJob = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.getJob(String(req.params.id)) });
});

export const downloadJobErrors = asyncHandler(async (req: Request, res: Response) => {
  const job = await service.getJob(String(req.params.id));
  const buffer = await buildWorkbook(
    "Import Errors",
    [
      { header: "Row", key: "rowNumber" },
      { header: "Field", key: "field" },
      { header: "Message", key: "message" },
    ],
    job.errors as never
  );
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="import-errors-${job.id}.xlsx"`);
  res.send(buffer);
});
