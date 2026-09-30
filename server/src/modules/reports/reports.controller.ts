import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { buildWorkbook, buildCsv, ColumnDef } from "@/services/excel";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext, getPrintLogoPng } from "@/services/branding";
import { paymentCategoryLabel, paymentMethodLabel } from "@/constants/paymentCategories";
import { actionLabel, moduleLabel } from "@/constants/auditLabels";
import { tableReportPdf, statusBadge } from "@/modules/pdf/templates";
import { L, isEn } from "@/services/lang";
import * as service from "@/modules/reports/reports.service";

type Row = Record<string, unknown>;

/* Every report prints in the interface language (services/lang): Arabic
   headers and values for Arabic, English ones for English. */

const STATUS: Record<string, [string, string]> = {
  VALID: ["سارية", "Valid"],
  EXPIRING_SOON: ["قاربت على الانتهاء", "Ending soon"],
  EXPIRED: ["منتهية", "Expired"],
  ACTIVE: ["على رأس العمل", "Active"],
  ON_LEAVE: ["في إجازة", "On leave"],
  TERMINATED: ["منتهي التعاقد", "Terminated"],
  INACTIVE: ["غير نشط", "Inactive"],
};
const statusLabel = (v: unknown) => (typeof v === "string" && STATUS[v] ? L(STATUS[v][0], STATUS[v][1]) : ((v as string) ?? "—"));
const STATUS_KEYS = new Set(["status", "iqamaStatus", "passportStatus", "employmentStatus"]);

/** A column with Arabic and English titles, reading the English field on English reports. */
function col(ar: string, en: string, key: string, keyEn?: string, format?: ColumnDef<Row>["format"]): ColumnDef<Row> {
  const k = isEn() && keyEn ? keyEn : key;
  return { header: ar, subHeader: en, key: k, format: format ?? (STATUS_KEYS.has(key) ? (v) => statusLabel(v) : undefined) };
}

async function respond(
  res: Response,
  opts: {
    title: string;
    titleEn: string;
    filenameBase: string;
    format: string;
    columns: ColumnDef<Row>[];
    rows: Row[];
  }
) {
  const { filenameBase, format, columns, rows } = opts;
  const title = L(opts.title, opts.titleEn);
  const branding = await getBrandingContext();

  if (format === "xlsx") {
    const name = isEn() ? branding.company?.nameEn || branding.company?.nameAr : branding.company?.nameAr || branding.company?.nameEn;
    const buffer = await buildWorkbook(title, columns, rows, {
      logo: await getPrintLogoPng(),
      title,
      companyName: name || undefined,
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.xlsx"`);
    return res.send(buffer);
  }

  if (format === "csv") {
    const csv = buildCsv(columns, rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.csv"`);
    return res.send("﻿" + csv); // Include BOM for proper Arabic display in Excel CSV
  }

  if (format === "pdf") {
    const pdfColumns = columns.map((c) => ({
      header: c.header,
      subHeader: c.subHeader,
      render: (row: Row) => {
        const raw = row[c.key];
        // Statuses are coloured badges, made from the status code itself.
        if (STATUS_KEYS.has(c.key)) return statusBadge(raw as string);
        const value = c.format ? c.format(raw, row) : raw;
        if (c.key === "kindAr" || c.key === "kindEn") return `<b>${String(value ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</b>`;
        if (value instanceof Date) {
          const d = new Date(value);
          return `<span class="nowrap">${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}</span>`;
        }
        return value === null || value === undefined ? "—" : String(value);
      },
    }));
    const html = tableReportPdf(opts.title, pdfColumns, rows, branding, { titleEn: opts.titleEn });
    const pdf = await renderHtmlToPdf(html, { footerLabel: title });
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
    titleEn: "Employees Report",
    filenameBase: "employees-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      col("الرقم الوظيفي", "Emp ID", "employeeNumber"),
      col("اسم الموظف", "Full Name", "fullName", "fullNameEn"),
      col("الجنسية", "Nationality", "nationality", "nationalityEn"),
      col("المسمى الوظيفي", "Job Title", "jobTitle", "jobTitleEn"),
      col("القسم الإداري", "Department", "department", "departmentEn"),
      col("الفرع / المنشأة", "Branch", "branch", "branchEn"),
      col("حالة العمل", "Status", "employmentStatus"),
      col("انتهاء الإقامة", "Iqama Expiry", "iqamaExpiryDate"),
      col("حالة الإقامة", "Iqama Status", "iqamaStatus"),
      col("انتهاء الجواز", "Passport Expiry", "passportExpiryDate"),
      col("حالة الجواز", "Passport Status", "passportStatus"),
    ],
  });
});

export const documents = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.documentsReport(req.query as never);
  await respond(res, {
    title: "تقرير متابعة الوثائق الرسمية والامتثال",
    titleEn: "Documents & Expiry Report",
    filenameBase: "documents-expiration-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      col("نوع الوثيقة", "Document type", "kindAr", "kindEn"),
      col("صاحب الوثيقة", "Belongs to", "owner", "ownerEn"),
      col("التبعية", "Employee / Establishment", "ownerType", "ownerTypeEn"),
      col("رقم الوثيقة", "Number", "documentNumber"),
      col("الفرع", "Branch", "branch", "branchEn"),
      col("تاريخ الانتهاء", "Expiry Date", "expiryDate"),
      col("حالة الصلاحية", "Status", "status"),
    ],
  });
});

export const payments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.paymentsReport(req.query as never);
  await respond(res, {
    title: "تقرير سندات الصرف والمصروفات التشغيلية",
    titleEn: "Payment Vouchers Report",
    filenameBase: "payments-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      col("رقم السند", "Voucher #", "paymentNumber"),
      col("تاريخ السند", "Date", "paymentDate"),
      col("بند الصرف", "Category", "category", undefined, (v, row) => paymentCategoryLabel(v as string, row.type as string | null)),
      col("طريقة الدفع", "Method", "method", undefined, (v) => paymentMethodLabel(v as string)),
      col("الفرع / المنشأة", "Branch", "branch", "branchEn"),
      col("الموظف / المستفيد", "Beneficiary", "employee", "employeeEn"),
      col("المبلغ الأساسي", "Amount (SAR)", "amount"),
      col("الضريبة", "VAT (SAR)", "vat"),
      col("المبلغ الإجمالي", "Total (SAR)", "total"),
    ],
  });
});

export const activity = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.activityReport(req.query as never);
  await respond(res, {
    title: "سجل العمليات والتدقيق الإداري",
    titleEn: "Activity Log",
    filenameBase: "audit-activity-report",
    format: query.format,
    rows: rows as Row[],
    columns: [
      col("التاريخ والوقت", "Timestamp", "date"),
      col("المستخدم", "User", "user", undefined, (v) => (v === "System" ? L("النظام", "System") : ((v as string) ?? "—"))),
      col("العملية", "Action", "action", undefined, (v) => actionLabel(v as string)),
      col("القسم", "Section", "module", undefined, (v) => moduleLabel(v as string)),
      col("المعرف", "Record ID", "recordId"),
      col("تفاصيل العملية", "Description", "description"),
    ],
  });
});
