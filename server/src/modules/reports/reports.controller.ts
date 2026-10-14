import * as taxService from "@/modules/taxReturns/taxReturns.service";
import * as violationService from "@/modules/violations/violations.service";
import { taxReportQuerySchema, violationReportQuerySchema } from "./reports.schemas";
import { escapeHtml } from "@/lib/security";
import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { buildWorkbook, buildCsv, ColumnDef } from "@/services/excel";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext, getSpreadsheetBranding, branchLogoDataUrls } from "@/services/branding";
import { paymentCategoryLabel, paymentMethodLabel } from "@/constants/paymentCategories";
import { actionLabel, moduleLabel } from "@/constants/auditLabels";
import { tableReportPdf, statusBadge, scopedDocumentsReportPdf, employeesDocumentsReportPdf, paymentsReportPdf, type PaymentReportRow, type PaymentStatementEstablishment, type ScopedEmployeeGroup, type ScopedEstablishment, type EmployeeDocsRow, type EstablishmentInfo } from "@/modules/pdf/templates";
import { hasPermission } from "@/lib/security";
import { prisma } from "@/lib/prisma";
import { daysUntil } from "@/services/expiration";
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
const STATUS_KEYS = new Set(["status", "iqamaStatus", "passportStatus", "employmentStatus", "healthCertStatus", "insuranceStatus", "visaStatus"]);
const VISA_KIND: Record<string, [string, string]> = { VISA: ["تأشيرة", "Visa"], EXIT_REENTRY_VISA: ["خروج وعودة", "Exit & re-entry"], FINAL_EXIT_VISA: ["خروج نهائي", "Final exit"] };

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
  // The health certificate, medical insurance and visa come with the employee documents permission.
  const withDocuments = hasPermission(req.auth, "employeeDocuments.view");
  const rows = await service.employeesReport(req.query as never, withDocuments);
  if (query.format === "pdf") {
    // The PDF: each employee's documents type by type, each named in its cell, by establishment.
    const branding = await getBrandingContext("report");
    const companyName = L(branding.company?.nameAr || branding.company?.nameEn || "الشركة", branding.company?.nameEn || branding.company?.nameAr || "Company");
    const r = rows as Array<Record<string, any>>;
    const docRows: EmployeeDocsRow[] = r.map((e) => ({
      name: L(e.fullName ?? "—", e.fullNameEn ?? e.fullName ?? "—"),
      employeeNumber: e.employeeNumber ?? null,
      // The profession on the iqama, as the report shows it (not the job title).
      profession: L(e.profession ?? "", e.professionEn ?? e.profession ?? "") || null,
      establishment: e.branch ? L(e.branch, e.branchEn ?? e.branch) : companyName,
      docs: {
        iqama: { number: e.iqamaNumber, expiry: e.iqamaExpiryDate, status: e.iqamaStatus },
        healthCert: { number: e.healthCertNumber, expiry: e.healthCertExpiryDate, status: e.healthCertStatus },
        passport: { number: e.passportNumber, expiry: e.passportExpiryDate, status: e.passportStatus },
        insurance: { number: e.insuranceNumber, expiry: e.insuranceExpiryDate, status: e.insuranceStatus, withIqama: e.insuranceWithIqama === true },
        visa: { number: e.visaNumber, expiry: e.visaExpiryDate, status: e.visaStatus, kind: e.visaType },
      },
    }));
    docRows.sort((a, b) => a.establishment.localeCompare(b.establishment, "ar") || (a.employeeNumber ?? "").localeCompare(b.employeeNumber ?? ""));
    // Each establishment's logo, owner and commercial register, for its plate.
    const [branches, registers] = await Promise.all([
      prisma.branch.findMany({ where: { deletedAt: null }, select: { id: true, name: true, nameEn: true, code: true, ownerName: true, logoFileId: true } }),
      prisma.companyDocument.findMany({ where: { deletedAt: null, category: "COMMERCIAL_REGISTRATION", branchId: { not: null } }, orderBy: { expiryDate: "desc" }, select: { branchId: true, documentNumber: true, licenseNumber: true } }),
    ]);
    const logos = await branchLogoDataUrls(branches);
    const establishments = new Map<string, EstablishmentInfo>();
    for (const b of branches) {
      const cr = registers.find((r) => r.branchId === b.id);
      establishments.set(L(b.name, b.nameEn ?? b.name), { logo: logos.get(b.id) ?? null, owner: b.ownerName, cr: cr?.documentNumber || cr?.licenseNumber || null, code: b.code });
    }
    const pdf = await renderHtmlToPdf(employeesDocumentsReportPdf(docRows, branding, establishments), { footerLabel: L("تقرير الموظفين ووثائقهم", "Employees and their documents") });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="employees-report.pdf"');
    return res.send(pdf);
  }
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
      col("المهنة حسب الإقامة", "Iqama Profession", "profession", "professionEn"),
      col("القسم الإداري", "Department", "department", "departmentEn"),
      col("الفرع / المنشأة", "Branch", "branch", "branchEn"),
      col("حالة العمل", "Status", "employmentStatus"),
      col("انتهاء الإقامة", "Iqama Expiry", "iqamaExpiryDate"),
      col("حالة الإقامة", "Iqama Status", "iqamaStatus"),
      col("انتهاء الجواز", "Passport Expiry", "passportExpiryDate"),
      col("حالة الجواز", "Passport Status", "passportStatus"),
      ...(withDocuments
        ? [
            col("انتهاء الشهادة الصحية", "Health Cert. Expiry", "healthCertExpiryDate"),
            col("حالة الشهادة الصحية", "Health Cert. Status", "healthCertStatus"),
            col("انتهاء التأمين الطبي", "Insurance Expiry", "insuranceExpiryDate"),
            col("حالة التأمين الطبي", "Insurance Status", "insuranceStatus"),
            col("نوع التأشيرة", "Visa Type", "visaType", undefined, (v) => (typeof v === "string" && VISA_KIND[v] ? L(VISA_KIND[v][0], VISA_KIND[v][1]) : "—")),
            col("انتهاء التأشيرة", "Visa Expiry", "visaExpiryDate"),
            col("حالة التأشيرة", "Visa Status", "visaStatus"),
          ]
        : []),
    ],
  });
});

/** The expired / ending-soon report by establishment: each establishment with its
 * register details and documents, then the sponsored employees' documents. */
async function scopedDocumentsPdf(res: Response, rows: Awaited<ReturnType<typeof service.documentsReport>>, status?: string) {
  const [branches, registers, employees, branding] = await Promise.all([
    prisma.branch.findMany({ where: { deletedAt: null }, select: { id: true, name: true, nameEn: true, ownerName: true, vatRegistrationNumber: true } }),
    prisma.companyDocument.findMany({ where: { deletedAt: null, category: "COMMERCIAL_REGISTRATION", branchId: { not: null } }, orderBy: { expiryDate: "desc" }, select: { branchId: true, documentNumber: true, licenseNumber: true } }),
    prisma.employee.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.employeeId).filter(Boolean))] as string[] } }, select: { id: true, employeeNumber: true } }),
    getBrandingContext("report"),
  ]);
  const byName = new Map(branches.map((b) => [b.name, b]));
  const crOf = new Map<string, string>();
  for (const r of registers) if (r.branchId && !crOf.has(r.branchId)) crOf.set(r.branchId, r.documentNumber || r.licenseNumber || "");
  const numberOf = new Map(employees.map((e) => [e.id, e.employeeNumber]));
  const companyName = L(branding.company?.nameAr || branding.company?.nameEn || "الشركة", branding.company?.nameEn || branding.company?.nameAr || "Company");
  const estName = (ar?: string | null, en?: string | null) => (ar ? L(ar, en || ar) : companyName);
  const doc = (r: (typeof rows)[number]) => ({ kind: L(r.kindAr, r.kindEn), number: r.documentNumber, expiry: r.expiryDate, days: daysUntil(r.expiryDate), status: r.status as string });

  const ests = new Map<string, ScopedEstablishment>();
  const emps = new Map<string, ScopedEmployeeGroup>();
  for (const r of rows) {
    const name = estName(r.branch, r.branchEn);
    if (r.sourceType === "COMPANY_DOCUMENT" || r.sourceType === "VEHICLE") {
      const b = r.branch ? byName.get(r.branch) : undefined;
      if (!ests.has(name)) ests.set(name, { name, owner: b?.ownerName ?? null, cr: (b && crOf.get(b.id)) || null, vat: b?.vatRegistrationNumber ?? null, docs: [] });
      ests.get(name)!.docs.push(doc(r));
    } else {
      if (!emps.has(name)) emps.set(name, { establishment: name, rows: [] });
      emps.get(name)!.rows.push({ ...doc(r), employee: L(r.employeeName ?? r.owner ?? "—", r.employeeNameEn ?? r.ownerEn ?? "—"), employeeNumber: (r.employeeId && numberOf.get(r.employeeId)) || null });
    }
  }
  const [title, titleEn] = status === "EXPIRED" ? ["تقرير الوثائق المنتهية", "Expired documents"] : status === "EXPIRING_SOON" ? ["تقرير الوثائق القريبة من الانتهاء", "Documents ending soon"] : ["تقرير الوثائق", "Documents"];
  const html = scopedDocumentsReportPdf(title, titleEn, { establishments: [...ests.values()], employees: [...emps.values()] }, branding);
  const pdf = await renderHtmlToPdf(html, { footerLabel: L(title, titleEn) });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${status === "EXPIRED" ? "expired" : status === "EXPIRING_SOON" ? "ending-soon" : "documents"}-report.pdf"`);
  return res.send(pdf);
}

export const documents = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string; scope?: string; status?: string };
  const rows = await service.documentsReport(req.query as never, req.auth!);
  if (query.scope === "sponsored" && query.format === "pdf") return scopedDocumentsPdf(res, rows, query.status);
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

/** An establishment's name, logo and registrations, for its payments statement. */
async function paymentStatementEstablishment(branchId: string): Promise<PaymentStatementEstablishment | undefined> {
  const b = await prisma.branch.findFirst({ where: { id: branchId, deletedAt: null }, select: { id: true, name: true, nameEn: true, code: true, ownerName: true, vatRegistrationNumber: true, logoFileId: true } });
  if (!b) return undefined;
  const [cr, logos] = await Promise.all([
    prisma.companyDocument.findFirst({ where: { deletedAt: null, category: "COMMERCIAL_REGISTRATION", branchId: b.id }, orderBy: { expiryDate: "desc" }, select: { documentNumber: true, licenseNumber: true } }),
    branchLogoDataUrls([b]),
  ]);
  return { name: b.name, nameEn: b.nameEn, logo: logos.get(b.id) ?? null, owner: b.ownerName, cr: cr?.documentNumber || cr?.licenseNumber || null, vat: b.vatRegistrationNumber, code: b.code };
}

export const payments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as never as { format: string };
  const rows = await service.paymentsReport(req.query as never);
  if (query.format === "pdf") {
    // One establishment chosen: its own statement, under its name and logo.
    const branchId = (req.query as { branchId?: string }).branchId;
    const est = branchId ? await paymentStatementEstablishment(branchId) : undefined;
    const html = paymentsReportPdf(rows as PaymentReportRow[], await getBrandingContext("report"), est);
    const pdf = await renderHtmlToPdf(html, { footerLabel: est ? L("كشف مدفوعات منشأة", "Payments Statement") : L("تقرير سندات الصرف", "Payment Vouchers Report") });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="payments-report.pdf"`);
    return res.send(pdf);
  }
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
      col("التاريخ والوقت", "Timestamp", "date", undefined, (v) => (v ? new Date(v as Date).toLocaleString("en-GB", { timeZone: "Asia/Riyadh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).replace(",", "") : "—")),
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
