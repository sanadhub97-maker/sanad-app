import * as taxService from "@/modules/taxReturns/taxReturns.service";
import * as violationService from "@/modules/violations/violations.service";
import { taxReportQuerySchema, violationReportQuerySchema } from "./reports.schemas";
import { escapeHtml } from "@/lib/security";
import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { buildWorkbook, buildCsv, ColumnDef } from "@/services/excel";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext, getSpreadsheetBranding } from "@/services/branding";
import { paymentCategoryLabel, paymentMethodLabel } from "@/constants/paymentCategories";
import { actionLabel, moduleLabel } from "@/constants/auditLabels";
import { tableReportPdf, statusBadge } from "@/modules/pdf/templates";
import { L, isEn } from "@/services/lang";
import * as service from "@/modules/reports/reports.service";

type Row = Record<string, unknown>;
export const summary = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.reportSummary(req.auth!) });
});

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
  if (format === "json") return res.json({ data: rows });

  if (format === "xlsx") {
    const branding = await getSpreadsheetBranding();
    const name = isEn() ? branding.company?.nameEn || branding.company?.nameAr : branding.company?.nameAr || branding.company?.nameEn;
    const buffer = await buildWorkbook(title, columns, rows, {
      logo: branding.logo,
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
    const branding = await getBrandingContext("report");
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
        return value === null || value === undefined ? "—" : escapeHtml(value);
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
  const rows = await service.documentsReport(req.query as never, req.auth!);
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

export const taxDeclarations = asyncHandler(async (req: Request, res: Response) => {
  const query=taxReportQuerySchema.parse(req.query);
  const records=await taxService.reportRows({year:query.year,kind:query.kind});
  const rows=records.filter(r=>(!query.ownerName||r.ownerName===query.ownerName)&&(!query.quarter||r.kind==="ZAKAT"||r.quarter===query.quarter)).map(r=>({
    owner:r.ownerName||"—",establishments:r.selectedBranches.map(b=>b.nameSnapshot).join("، ")||r.branch?.name||L("عام للشركة","Company-wide"),
    type:r.kind==="VAT"?L("القيمة المضافة","VAT"):L("الزكاة","Zakat"),period:r.kind==="VAT"?`${r.year} / Q${r.quarter}`:`${r.year} / ${L("سنوي","Annual")}`,
    amount:r.amount,penalty:r.penalty,state:L(...({DRAFT:["مسودة","Draft"],FILED:["تم التقديم","Filed"],PAID:["تم السداد","Paid"]} as Record<string,[string,string]>)[r.status]),
  }));
  await respond(res,{title:`تقرير الإقرارات والزكاة · ${query.year} · ${query.ownerName||"جميع الملاك"}${query.quarter?` · الربع ${query.quarter}`:""}`,titleEn:`Tax and zakat declarations · ${query.year} · ${query.ownerName||"All owners"}${query.quarter?` · Q${query.quarter}`:""}`,filenameBase:"tax-declarations-report",format:query.format,rows,columns:[col("المالك","Owner","owner"),col("المنشآت","Establishments","establishments"),col("النوع","Type","type"),col("الفترة","Period","period"),col("المبلغ","Amount","amount"),col("الغرامة","Penalty","penalty"),col("الحالة","Status","state")]});
});
export const violationReport = asyncHandler(async (req: Request,res: Response)=>{
  const query=violationReportQuerySchema.parse(req.query);
  const records=await violationService.reportRows({state:query.state});
  const labels:Record<string,[string,string]>={NEW:["جديدة","New"],OBJECTION:["تم الاعتراض","Objected"],ACCEPTED:["تم قبول الاعتراض","Objection accepted"],REJECTED:["تم رفض الاعتراض","Objection rejected"],PAID:["تم السداد","Paid"],OPEN:["مفتوحة","Open"],APPLIED:["تم التنفيذ","Applied"],OVERDUE:["متأخرة","Overdue"]};
  const categories:Record<string,[string,string]>={all:["الكل","All"],overdue:["متأخرة","Overdue"],open:["مفتوحة","Open"],objection:["تم الاعتراض","Objected"],done:["منتهية","Completed"]};
  const rows=records.map(r=>({number:r.number||"—",authority:r.authorityLabel||r.authorityName||"—",entity:r.branch?.name||r.employee?.fullNameAr||"—",reason:r.reason,deadline:r.payDeadline||"—",amount:r.amount,state:labels[r.state]?L(...labels[r.state]):r.state}));
  await respond(res,{title:`تقرير المخالفات · ${categories[query.state][0]}`,titleEn:`Violations report · ${categories[query.state][1]}`,filenameBase:"violations-report",format:query.format,rows,columns:[col("رقم المخالفة","Number","number"),col("الجهة","Authority","authority"),col("المنشأة / الموظف","Establishment / employee","entity"),col("المخالفة","Reason","reason"),col("موعد السداد","Payment deadline","deadline"),col("القيمة","Amount","amount"),col("الحالة","Status","state")]});
});
