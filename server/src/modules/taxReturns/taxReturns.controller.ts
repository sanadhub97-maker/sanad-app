import { Request, Response } from "express";
import * as service from "@/modules/taxReturns/taxReturns.service";
import { assertLinkedFileAccess } from "@/modules/files/files.access";

export async function list(req: Request, res: Response) {
  const result = await service.list(req.query as any);
  res.json(result);
}

export async function get(req: Request, res: Response) {
  const result = await service.getById(req.params.id as string);
  res.json(result);
}

export async function create(req: Request, res: Response) {
  await assertLinkedFileAccess(req.body.fileId, req.auth, ["tax-return", "payment"]);
  const result = await service.create(req.body, req.auth?.userId);
  res.status(201).json(result);
}

export async function update(req: Request, res: Response) {
  await assertLinkedFileAccess(req.body.fileId, req.auth, ["tax-return", "payment"]);
  const result = await service.update(req.params.id as string, req.body);
  res.json(result);
}

export async function remove(req: Request, res: Response) {
  const result = await service.remove(req.params.id as string);
  res.json(result);
}

export async function statsAndAlerts(req: Request, res: Response) {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const branchId = req.query.branchId as string | undefined;
  const result = await service.getStatsAndAlerts(year, branchId);
  res.json(result);
}
