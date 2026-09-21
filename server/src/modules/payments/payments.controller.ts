import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/apiError";
import * as service from "@/modules/payments/payments.service";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext } from "@/services/branding";
import { paymentReceiptPdf } from "@/modules/pdf/templates";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.list(req.query as never));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.getById(req.params.id) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const payment = await service.create(req.body, req.auth.userId);
  res.status(201).json({ data: payment, message: "Payment saved successfully." });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const payment = await service.update(req.params.id, req.body);
  res.json({ data: payment, message: "Payment updated successfully." });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.softDelete(req.params.id);
  res.json({ message: "Payment deleted successfully." });
});

export const receiptPdf = asyncHandler(async (req: Request, res: Response) => {
  const payment = await service.getById(req.params.id);
  const branding = await getBrandingContext();
  const html = paymentReceiptPdf(payment as never, branding);
  const pdf = await renderHtmlToPdf(html, { footerLabel: "Payment Receipt" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="receipt-${payment.paymentNumber}.pdf"`);
  res.send(pdf);
});
