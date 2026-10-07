import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { renderHtmlToPdf } from "@/services/pdf";
import { assertLinkedFileAccess } from "@/modules/files/files.access";
import * as service from "./custody.service";
import { clearanceHtml, handoverHtml } from "./custody.print";

const id = (req: Request) => String(req.params.id);

export const stats = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await service.stats() });
});

export const listHandovers = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listHandovers(req.query as never));
});
export const getHandover = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.getHandover(id(req)) });
});
export const createHandover = asyncHandler(async (req: Request, res: Response) => {
  await assertLinkedFileAccess(req.body.signedFileId, req.auth, ["custody"]);
  res.status(201).json({ data: await service.createHandover(req.body, req.auth?.userId) });
});
export const updateHandover = asyncHandler(async (req: Request, res: Response) => {
  await assertLinkedFileAccess(req.body.signedFileId, req.auth, ["custody"]);
  res.json({ data: await service.updateHandover(id(req), req.body) });
});
export const returnItems = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.returnItems(id(req), req.body) });
});
export const removeHandover = asyncHandler(async (req: Request, res: Response) => {
  await service.removeHandover(id(req));
  res.json({ message: "Custody handover deleted." });
});
export const employeeItems = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.employeeItems(String(req.params.employeeId)) });
});

export const listClearances = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listClearances(req.query as never));
});
export const getClearance = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.getClearance(id(req)) });
});
export const createClearance = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ data: await service.createClearance(req.body, req.auth?.userId) });
});
export const updateClearance = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.updateClearance(id(req), req.body) });
});
export const issueClearance = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.issueClearance(id(req)) });
});
export const removeClearance = asyncHandler(async (req: Request, res: Response) => {
  await service.removeClearance(id(req));
  res.json({ message: "Clearance deleted." });
});

function sendPdf(res: Response, name: string, pdf: Buffer) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${name}.pdf"`);
  res.send(pdf);
}

export const handoverPdf = asyncHandler(async (req: Request, res: Response) => {
  const h = await service.getHandover(id(req));
  const { est, emp } = await service.printParty(h.employee);
  const html = await handoverHtml({ est, emp, number: h.number, date: h.date, deliveredBy: h.deliveredBy, notes: h.notes, items: h.items });
  sendPdf(res, h.number, await renderHtmlToPdf(html, { bare: true, fitSelector: ".ry .body" }));
});

export const clearancePdf = asyncHandler(async (req: Request, res: Response) => {
  const c = await service.getClearance(id(req));
  const { est, emp } = await service.printParty(c.employee);
  const html = await clearanceHtml({
    est, emp, number: c.number, lastWorkingDay: c.lastWorkingDay, reason: c.reason, dues: c.dues, notes: c.notes,
    issued: c.status === "ISSUED", departments: c.departments, items: c.items,
  });
  sendPdf(res, c.number, await renderHtmlToPdf(html, { bare: true, fitSelector: ".ry .body" }));
});
