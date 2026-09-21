import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import * as service from "@/modules/roles/roles.service";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await service.list() });
});

export const permissionsCatalogue = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: service.listPermissionCatalogue() });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.getById(req.params.id) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const role = await service.create(req.body);
  res.status(201).json({ data: role, message: "Role created successfully." });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const role = await service.update(req.params.id, req.body);
  res.json({ data: role, message: "Role updated successfully." });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(req.params.id);
  res.json({ message: "Role deleted successfully." });
});
