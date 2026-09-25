import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/apiError";
import * as service from "@/modules/notifications/notifications.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  res.json(await service.list(req.auth.userId, req.query as never));
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  res.json({ data: await service.markRead(req.auth.userId, String(req.params.id)) });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  await service.markAllRead(req.auth.userId);
  res.json({ message: "All notifications marked as read." });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  await service.remove(req.auth.userId, String(req.params.id));
  res.json({ message: "Notification deleted." });
});
