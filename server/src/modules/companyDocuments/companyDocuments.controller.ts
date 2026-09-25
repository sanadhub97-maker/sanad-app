import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import * as service from "@/modules/companyDocuments/companyDocuments.service";

export function makeController() {
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      res.json(await service.list(req.query as never));
    }),

    categoryCounts: asyncHandler(async (_req: Request, res: Response) => {
      res.json({ data: await service.categoryCounts() });
    }),

    getById: asyncHandler(async (req: Request, res: Response) => {
      res.json({ data: await service.getById(String(req.params.id)) });
    }),

    create: asyncHandler(async (req: Request, res: Response) => {
      const doc = await service.create(req.body);
      res.status(201).json({ data: doc, message: "Document saved successfully." });
    }),

    update: asyncHandler(async (req: Request, res: Response) => {
      const doc = await service.update(String(req.params.id), req.body);
      res.json({ data: doc, message: "Document updated successfully." });
    }),

    remove: asyncHandler(async (req: Request, res: Response) => {
      await service.softDelete(String(req.params.id));
      res.json({ message: "Document deleted successfully." });
    }),
  };
}
