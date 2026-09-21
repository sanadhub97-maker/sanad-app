import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import * as service from "@/modules/employeeDocuments/employeeDocuments.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.list(req.params.employeeId) });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.getById(req.params.employeeId, req.params.id) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const doc = await service.create(req.params.employeeId, req.body);
  res.status(201).json({ data: doc, message: "Document saved successfully." });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const doc = await service.update(req.params.employeeId, req.params.id, req.body);
  res.json({ data: doc, message: "Document updated successfully." });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(req.params.employeeId, req.params.id);
  res.json({ message: "Document deleted successfully." });
});
