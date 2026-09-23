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
  const branding = await getBrandingContext();

  if (format === "xlsx") {
    const companyTitle = branding.company?.nameAr
      ? `${branding.company.nameAr} ${branding.company.nameEn ? `— ${branding.company.nameEn}` : ""}`
      : undefined;

    const buffer = await buildWorkbook(title, columns, rows, {
      title,
      companyName: companyTitle,
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.xlsx"`);
    return res.send(buffer);
  }

  if (format === "csv") {
    const csv = buildCsv(columns, rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.csv"`);
    return res.send("\uFEFF" + csv); // Include BOM for proper Arabic display in Excel CSV
  }

  if (format === "pdf") {
    const pdfColumns = columns.map((c) => ({
      header: c.header,
      render: (row: Row) => {
        const raw = row[c.key];
        const value = c.format ? c.format(raw, row) : raw;
        if (c.key === "status" || c.key === "iqamaStatus" || c.key === "passportStatus" || c.key === "employmentStatus") {
          return statusBadge(value as string);
        }
        if (value instanceof Date) {
          const d = new Date(value);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
        return value === null || value === undefined ? "—" : String(value);
      },
    }));
    const html = tableReportPdf(title, pdfColumns, rows, branding);
    const pdf = await renderHtmlToPdf(html, { footerLabel: title, landscape: columns.length > 5 });
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
    title: "تقرير الموظفين الشامل | Employees Comprehensive Report",
    filenameBase: "employees-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      { header: "الرقم الوظيفي | Emp #", key: "employeeNumber" },
      { header: "اسم الموظف | Full Name", key: "fullName" },
      { header: "الجنسية | Nationality", key: "nationality" },
      { header: "المسمى الوظيفي | Job Title", key: "jobTitle" },
      { header: "القسم الإداري | Department", key: "department" },
      { header: "الفرع / المنشأة | Branch", key: "branch" },
      { header: "حالة العمل | Status", key: "employmentStatus" },
      { header: "انتهاء الإقامة | Iqama Expiry", key: "iqamaExpiryDate" },
      { header: "حالة الإقامة | Iqama Status", key: "iqamaStatus" },
      { header: "انتهاء الجواز | Passport Expiry", key: "passportExpiryDate" },
      { header: "حالة الجواز | Passport Status", key: "passportStatus" },
    ],
  });
});

export const documents = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.documentsReport(req.query as never);
  await respond(res, {
    title: "تقرير صلاحية ومتابعة الوثائق الرسمية | Documents Expiration Report",
    filenameBase: "documents-expiration-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      { header: "الوثيقة | Document", key: "label" },
      { header: "نوع المصدر | Source", key: "sourceType" },
      { header: "الموظف المرتبط | Employee", key: "employeeName" },
      { header: "تاريخ الانتهاء | Expiry Date", key: "expiryDate" },
      { header: "حالة الصلاحية | Status", key: "status" },
    ],
  });
});

export const payments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.paymentsReport(req.query as never);
  await respond(res, {
    title: "تقرير سندات الصرف والمصروفات التشغيلية | Payments & Expenses Report",
    filenameBase: "payments-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      { header: "رقم السند | Payment #", key: "paymentNumber" },
      { header: "تاريخ السند | Date", key: "paymentDate" },
      { header: "بند الصرف | Category", key: "category" },
      { header: "طريقة الدفع | Method", key: "method" },
      { header: "الفرع / المؤسسة | Branch", key: "branch" },
      { header: "الموظف / المستفيد | Beneficiary", key: "employee" },
      { header: "المبلغ الأساسي (ر.س) | Amount", key: "amount" },
      { header: "الضريبة (ر.س) | VAT", key: "vat" },
      { header: "الإجمالي (ر.س) | Total", key: "total" },
    ],
  });
});

export const activity = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.activityReport(req.query as never);
  await respond(res, {
    title: "سجل العمليات والتدقيق الإداري | Audit & Activity Log",
    filenameBase: "audit-activity-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      { header: "التاريخ والوقت | Timestamp", key: "date" },
      { header: "المستخدم | User", key: "user" },
      { header: "العملية | Action", key: "action" },
      { header: "الموديول | Module", key: "module" },
      { header: "المعرف | Record ID", key: "recordId" },
      { header: "تفاصيل العملية | Description", key: "description" },
    ],
  });
});
