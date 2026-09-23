import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { buildWorkbook, buildCsv, ColumnDef } from "@/services/excel";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext, getPrintLogoPng } from "@/services/branding";
import { paymentCategoryLabel, paymentMethodLabel } from "@/constants/paymentCategories";
import { tableReportPdf, statusBadge } from "@/modules/pdf/templates";
import * as service from "@/modules/reports/reports.service";

type Row = Record<string, unknown>;

async function respond(
  res: Response,
  opts: {
    title: string;
    titleEn?: string;
    filenameBase: string;
    format: string;
    columns: ColumnDef<Row>[];
    rows: Row[];
  }
) {
  const { title, titleEn, filenameBase, format, columns, rows } = opts;
  const branding = await getBrandingContext();

  if (format === "xlsx") {
    const companyTitle = branding.company?.nameAr
      ? `${branding.company.nameAr} ${branding.company.nameEn ? `— ${branding.company.nameEn}` : ""}`
      : undefined;

    const buffer = await buildWorkbook(title, columns, rows, {
      logo: await getPrintLogoPng(),
      title: titleEn ? `${title} (${titleEn})` : title,
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
      subHeader: c.subHeader,
      render: (row: Row) => {
        const raw = row[c.key];
        const value = c.format ? c.format(raw, row) : raw;
        if (c.key === "status" || c.key === "iqamaStatus" || c.key === "passportStatus" || c.key === "employmentStatus") {
          return statusBadge(value as string);
        }
        if (value instanceof Date) {
          const d = new Date(value);
          return `<span class="nowrap">${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}</span>`;
        }
        return value === null || value === undefined ? "—" : String(value);
      },
    }));
    const html = tableReportPdf(title, pdfColumns, rows, branding, { titleEn });
    const pdf = await renderHtmlToPdf(html, {
      footerLabel: titleEn ? `${title} — ${titleEn}` : title,
    });
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
    title: "تقرير الموظفين الشامل",
    titleEn: "Comprehensive Employees & Workforce Report",
    filenameBase: "employees-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      { header: "الرقم الوظيفي", subHeader: "Emp ID", key: "employeeNumber" },
      { header: "اسم الموظف", subHeader: "Full Name", key: "fullName" },
      { header: "الجنسية", subHeader: "Nationality", key: "nationality" },
      { header: "المسمى الوظيفي", subHeader: "Job Title", key: "jobTitle" },
      { header: "القسم الإداري", subHeader: "Department", key: "department" },
      { header: "الفرع / المنشأة", subHeader: "Branch", key: "branch" },
      { header: "حالة العمل", subHeader: "Status", key: "employmentStatus" },
      { header: "انتهاء الإقامة", subHeader: "Iqama Expiry", key: "iqamaExpiryDate" },
      { header: "حالة الإقامة", subHeader: "Iqama Status", key: "iqamaStatus" },
      { header: "انتهاء الجواز", subHeader: "Passport Expiry", key: "passportExpiryDate" },
      { header: "حالة الجواز", subHeader: "Passport Status", key: "passportStatus" },
    ],
  });
});

export const documents = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.documentsReport(req.query as never);
  await respond(res, {
    title: "تقرير متابعة الوثائق الرسمية والامتثال",
    titleEn: "Official Documents & Compliance Expiration Report",
    filenameBase: "documents-expiration-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      { header: "الوثيقة الرسمية", subHeader: "Document", key: "label" },
      { header: "نوع المصدر", subHeader: "Source", key: "sourceType" },
      { header: "الموظف المرتبط", subHeader: "Employee", key: "employeeName" },
      { header: "تاريخ الانتهاء", subHeader: "Expiry Date", key: "expiryDate" },
      { header: "حالة الصلاحية", subHeader: "Status", key: "status" },
    ],
  });
});

export const payments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.paymentsReport(req.query as never);
  await respond(res, {
    title: "تقرير سندات الصرف والمصروفات التشغيلية",
    titleEn: "Payment Vouchers & Operational Expenses Report",
    filenameBase: "payments-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      { header: "رقم السند", subHeader: "Voucher #", key: "paymentNumber" },
      { header: "تاريخ السند", subHeader: "Date", key: "paymentDate" },
      { header: "بند الصرف", subHeader: "Category", key: "category", format: (v) => paymentCategoryLabel(v as string) },
      { header: "طريقة الدفع", subHeader: "Method", key: "method", format: (v) => paymentMethodLabel(v as string) },
      { header: "الفرع / المنشأة", subHeader: "Branch", key: "branch" },
      { header: "الموظف / المستفيد", subHeader: "Beneficiary", key: "employee" },
      { header: "المبلغ الأساسي", subHeader: "Amount (SAR)", key: "amount" },
      { header: "الضريبة", subHeader: "VAT (SAR)", key: "vat" },
      { header: "المبلغ الإجمالي", subHeader: "Total (SAR)", key: "total" },
    ],
  });
});

export const activity = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.activityReport(req.query as never);
  await respond(res, {
    title: "سجل العمليات والتدقيق الإداري",
    titleEn: "System Audit & Administrative Activity Log",
    filenameBase: "audit-activity-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      { header: "التاريخ والوقت", subHeader: "Timestamp", key: "date" },
      { header: "المستخدم", subHeader: "User", key: "user" },
      { header: "العملية", subHeader: "Action", key: "action" },
      { header: "الموديول", subHeader: "Module", key: "module" },
      { header: "المعرف", subHeader: "Record ID", key: "recordId" },
      { header: "تفاصيل العملية", subHeader: "Description", key: "description" },
    ],
  });
});
