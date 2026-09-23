import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import * as service from "@/modules/branches/branches.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.list(req.query as never);
  res.json(result);
});

export const listActive = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await service.listAllActive() });
});

export const getNextCode = asyncHandler(async (_req: Request, res: Response) => {
  const nextCode = await service.getNextCode();
  res.json({ data: { nextCode } });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.getById(req.params.id) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const branch = await service.create(req.body);
  res.status(201).json({ data: branch });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const branch = await service.update(req.params.id, req.body);
  res.json({ data: branch });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.softDelete(req.params.id);
  res.json({});
});
