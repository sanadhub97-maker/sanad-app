import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import * as service from "@/modules/employees/employees.service";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext } from "@/services/branding";
import { employeeProfilePdf } from "@/modules/pdf/templates";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.list(req.query as never));
});

export const getNextNumber = asyncHandler(async (_req: Request, res: Response) => {
  const nextNumber = await service.getNextEmployeeNumber();
  res.json({ data: { nextNumber } });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.getById(req.params.id) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const employee = await service.create(req.body);
  res.status(201).json({ data: employee, message: "Employee saved successfully." });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const employee = await service.update(req.params.id, req.body);
  res.json({ data: employee, message: "Employee updated successfully." });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.softDelete(req.params.id);
  res.json({ message: "Employee deleted successfully." });
});

export const exportPdf = asyncHandler(async (req: Request, res: Response) => {
  const employee = await service.getById(req.params.id);
  const branding = await getBrandingContext();
  const html = employeeProfilePdf(employee as never, branding);
  const pdf = await renderHtmlToPdf(html, { footerLabel: "Employee Profile" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="employee-${employee.employeeNumber}.pdf"`);
  res.send(pdf);
});
