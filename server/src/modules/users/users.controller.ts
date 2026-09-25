import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/apiError";
import * as service from "@/modules/users/users.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.list(req.query as never));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.getById(String(req.params.id)) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.create(req.body);
  res.status(201).json({ data: user, message: "User created successfully." });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.update(String(req.params.id), req.body);
  res.json({ data: user, message: "User updated successfully." });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  await service.softDelete(String(req.params.id), req.auth.userId);
  res.json({ message: "User deleted successfully." });
});
