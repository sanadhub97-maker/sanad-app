import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { buildWorkbook, buildCsv, ColumnDef } from "@/services/excel";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext } from "@/services/branding";
import { tableReportPdf, statusBadge } from "@/modules/pdf/templates";
import * as service from "@/modules/reports/reports.service";

type Row = Record<string, unknown>;

async function respond(res: Response, opts: { title: string; filenameBase: string; format: string; columns: ColumnDef<Row>[]; rows: Row[] }) {
  const { title, filenameBase, format, columns, rows } = opts;

  if (format === "xlsx") {
    const buffer = await buildWorkbook(title, columns, rows);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.xlsx"`);
    return res.send(buffer);
  }

  if (format === "csv") {
    const csv = buildCsv(columns, rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.csv"`);
    return res.send(csv);
  }

  if (format === "pdf") {
    const branding = await getBrandingContext();
    const pdfColumns = columns.map((c) => ({
      header: c.header,
      render: (row: Row) => {
        const raw = row[c.key];
        const value = c.format ? c.format(raw, row) : raw;
        if (c.key === "status" || c.key === "iqamaStatus" || c.key === "passportStatus") return statusBadge(value as string);
        if (value instanceof Date) return value.toLocaleDateString("en-GB");
        return value === null || value === undefined ? "—" : String(value);
      },
    }));
    const html = tableReportPdf(title, pdfColumns, rows, branding);
    const pdf = await renderHtmlToPdf(html, { footerLabel: title, landscape: columns.length > 6 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filenameBase}.pdf"`);
    return res.send(pdf);
  }

  return res.json({ data: rows });
}

export const employees = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.employeesReport(req.query as never);
  await respond(res, {
    title: "Employee Report",
    filenameBase: "employee-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      { header: "Employee Number", key: "employeeNumber" },
      { header: "Full Name", key: "fullName" },
      { header: "Nationality", key: "nationality" },
      { header: "Job Title", key: "jobTitle" },
      { header: "Department", key: "department" },
      { header: "Branch", key: "branch" },
      { header: "Status", key: "employmentStatus" },
      { header: "Iqama Expiry", key: "iqamaExpiryDate" },
      { header: "Iqama Status", key: "iqamaStatus" },
      { header: "Passport Expiry", key: "passportExpiryDate" },
      { header: "Passport Status", key: "passportStatus" },
    ],
  });
});

export const documents = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.documentsReport(req.query as never);
  await respond(res, {
    title: "Documents Expiration Report",
    filenameBase: "documents-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      { header: "Document", key: "label" },
      { header: "Source", key: "sourceType" },
      { header: "Related Employee", key: "employeeName" },
      { header: "Expiry Date", key: "expiryDate" },
      { header: "Status", key: "status" },
    ],
  });
});

export const payments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.paymentsReport(req.query as never);
  await respond(res, {
    title: "Payments Report",
    filenameBase: "payments-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      { header: "Payment Number", key: "paymentNumber" },
      { header: "Date", key: "paymentDate" },
      { header: "Category", key: "category" },
      { header: "Method", key: "method" },
      { header: "Branch", key: "branch" },
      { header: "Employee", key: "employee" },
      { header: "Amount", key: "amount" },
      { header: "VAT", key: "vat" },
      { header: "Total", key: "total" },
    ],
  });
});

export const activity = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.activityReport(req.query as never);
  await respond(res, {
    title: "Activity Report",
    filenameBase: "activity-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      { header: "Date", key: "date" },
      { header: "User", key: "user" },
      { header: "Action", key: "action" },
      { header: "Module", key: "module" },
      { header: "Record", key: "recordId" },
      { header: "Description", key: "description" },
    ],
  });
});
