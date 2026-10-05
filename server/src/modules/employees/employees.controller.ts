import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import * as service from "@/modules/employees/employees.service";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext } from "@/services/branding";
import { employeeProfilePdf } from "@/modules/pdf/templates";
import { L } from "@/services/lang";
import { pdfContentDisposition } from "@/utils/pdfHeaders";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.list(req.query as never));
});

export const getNextNumber = asyncHandler(async (_req: Request, res: Response) => {
  const nextNumber = await service.getNextEmployeeNumber();
  res.json({ data: { nextNumber } });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.getById(String(req.params.id), req.auth) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const employee = await service.create(req.body);
  res.status(201).json({ data: employee, message: "Employee saved successfully." });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const employee = await service.update(String(req.params.id), req.body, req.auth);
  res.json({ data: employee, message: "Employee updated successfully." });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.softDelete(String(req.params.id));
  res.json({ message: "Employee deleted successfully." });
});

export const exportPdf = asyncHandler(async (req: Request, res: Response) => {
  const employee = await service.getById(String(req.params.id), req.auth);
  const branding = await getBrandingContext("profile");
  const html = employeeProfilePdf(employee as never, branding);
  const pdf = await renderHtmlToPdf(html, { footerLabel: L("ملف الموظف", "Employee Profile") });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", pdfContentDisposition(`employee-${employee.employeeNumber}.pdf`));
  res.send(pdf);
});
