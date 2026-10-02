import { escapeHtml } from "@/lib/security";
import { pdfDocumentShell } from "@/services/pdf";
import { DEFAULT_PRINT_SIGNATURES, type PrintSignatures, type SignatureDocument } from "@/services/settingsStore";
import { daysRemainingLabel } from "@/services/expiration";
import { paymentCategoryLabel, paymentMethodLabel } from "@/constants/paymentCategories";
import { DOCUMENT_KINDS } from "@/services/expiringItems";
import { L, isEn } from "@/services/lang";

/** A value with an optional English version, for the current language. */
const pick = (ar: string | null | undefined, en: string | null | undefined) => escapeHtml((isEn() ? en || ar : ar || en) || "—");

type Branding = {
  company: { nameAr?: string | null; nameEn?: string | null } | null;
  logoDataUrl: string | null;
  printTheme?: string | null;
  signatures?: PrintSignatures;
  stampDataUrl?: string | null;
  nameImages?: Record<string, string>;
};

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Today's date in Riyadh, dd/mm/yyyy, for the date line of signature boxes. */
function printDate() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
}

/** Signature boxes and the seal closing a document, as configured in
 * Settings → Print. The seal sits before the last (approving) box and an
 * uploaded stamp image replaces the drawn seal. Each box shows its name
 * image (if uploaded), a blank line to sign by hand, and the print date. */
function signatureBlock(kind: SignatureDocument, branding: Branding) {
  const cfg = branding.signatures ?? DEFAULT_PRINT_SIGNATURES;
  const doc = cfg[kind] ?? DEFAULT_PRINT_SIGNATURES[kind];
  const boxes = cfg.showSignatures ? doc.boxes : [];
  if (!boxes.length && !cfg.showSeal) return "";

  const date = printDate();
  const box = (b: { ar: string; en: string; nameFileId?: string | null }) => {
    const nameImg = b.nameFileId ? branding.nameImages?.[b.nameFileId] : null;
    // One language: the box title in the document's language only.
    const heading = isEn() ? b.en || b.ar : b.ar || b.en;
    return `
      <div class="sig-card">
        <div class="sig-card-header">
          <div class="sig-title-ar">${escHtml(heading)}</div>
        </div>
        <div class="sig-card-body">
          <div class="sig-row"><span class="sig-label">${L("الاسم:", "Name:")}</span>${nameImg ? `<span class="sig-name"><img src="${nameImg}" alt="" /></span>` : `<span class="sig-dots"></span>`}</div>
          <div class="sig-row"><span class="sig-label">${L("التوقيع:", "Signature:")}</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span class="sig-label">${L("التاريخ:", "Date:")}</span><span class="sig-date">${date}</span></div>
        </div>
      </div>`;
  };
  const seal = !cfg.showSeal
    ? ""
    : branding.stampDataUrl
      ? `<div class="sig-seal-box"><img class="stamp-img" src="${branding.stampDataUrl}" alt="" /></div>`
      : `<div class="sig-seal-box">
        <div class="official-seal-circle">
          <div class="seal-stars">★★★★★</div>
          <div class="seal-text-ar">${escHtml(isEn() ? doc.sealEn || doc.sealAr : doc.sealAr).replace(/\n/g, "<br/>")}</div>
        </div>
      </div>`;

  const parts = boxes.map(box);
  // The seal goes before the approving (last) box, or alone when there are no boxes.
  if (seal) parts.splice(Math.max(parts.length - 1, 0), 0, seal);
  return `<div class="signature-matrix${boxes.length ? "" : " seal-only"}">${parts.join("")}</div>`;
}

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function statusBadge(status: string | null | undefined) {
  if (!status) return "—";
  // Short labels in the document's language.
  const labels: Record<string, [string, string]> = {
    VALID: ["سارية", "Valid"],
    ACTIVE: ["على رأس العمل", "Active"],
    EXPIRING_SOON: ["قاربت على الانتهاء", "Ending soon"],
    ON_LEAVE: ["في إجازة", "On leave"],
    EXPIRED: ["منتهية", "Expired"],
    TERMINATED: ["منتهي التعاقد", "Terminated"],
    INACTIVE: ["غير نشط", "Inactive"],
  };
  const label = labels[status] ? L(labels[status][0], labels[status][1]) : status;
  return `<span class="badge-status status-${status}">${label}</span>`;
}

/**
 * 👤 Official Employee Profile & HR Dossier PDF
 */
export function employeeProfilePdf(
  employee: {
    employeeNumber: string;
    fullNameAr: string;
    fullNameEn: string | null;
    nationality: string | null;
    nationalityEn?: string | null;
    jobTitle: string | null;
    jobTitleEn?: string | null;
    department: string | null;
    branch: { name: string; nameEn?: string | null } | null;
    mobile: string | null;
    email: string | null;
    employmentStatus: string;
    joiningDate: Date | null;
    iqamaNumber: string | null;
    iqamaExpiryDate: Date | null;
    iqamaStatus: string | null;
    passportNumber: string | null;
    passportExpiryDate: Date | null;
    passportStatus: string | null;
    documents: { type: string; name: string | null; documentNumber: string | null; expiryDate: Date | null; status: string | null }[];
  },
  branding: Branding
) {
  const body = `
    <!-- 👤 Section 1: Personal & Employment Information -->
    <div class="section-card">
      <div class="section-header">
        <span>${L("البيانات الشخصية والوظيفية الأساسية", "Personal & Employment Information")}</span>
        <span class="ref-code">#${escapeHtml(employee.employeeNumber)}</span>
      </div>
      <div class="section-body">
        <table>
          <tr>
            <th style="width:20%;">${L("الاسم الكامل", "Full name")}</th>
            <td style="width:30%; font-weight:700;">${pick(employee.fullNameAr, employee.fullNameEn)}</td>
            <th style="width:20%;">${L("الرقم الوظيفي", "Employee no.")}</th>
            <td style="width:30%; font-family:monospace; font-weight:700;">${escapeHtml(employee.employeeNumber)}</td>
          </tr>
          <tr>
            <th>${L("الجنسية", "Nationality")}</th>
            <td>${pick(employee.nationality, employee.nationalityEn)}</td>
            <th>${L("المسمى الوظيفي", "Job title")}</th>
            <td>${pick(employee.jobTitle, employee.jobTitleEn)}</td>
          </tr>
          <tr>
            <th>${L("الفرع / المؤسسة", "Establishment")}</th>
            <td>${pick(employee.branch?.name, employee.branch?.nameEn)}</td>
            <th>${L("حالة الموظف", "Status")}</th>
            <td>${statusBadge(employee.employmentStatus)}</td>
          </tr>
          <tr>
            <th>${L("رقم الجوال", "Mobile")}</th>
            <td dir="ltr" style="text-align:${isEn() ? "left" : "right"};">${escapeHtml(employee.mobile ?? "—")}</td>
            <th>${L("البريد الإلكتروني", "Email")}</th>
            <td dir="ltr" style="text-align:${isEn() ? "left" : "right"};">${escapeHtml(employee.email ?? "—")}</td>
          </tr>
          <tr>
            <th>${L("تاريخ الالتحاق", "Joining date")}</th>
            <td colspan="3">${fmtDate(employee.joiningDate)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- 🪪 Section 2: Iqama & Passport Details -->
    <div class="section-card">
      <div class="section-header">
        <span>${L("وثائق الهوية والإقامة وجواز السفر", "Iqama & Passport")}</span>
      </div>
      <div class="section-body">
        <table>
          <thead>
            <tr>
              <th>${L("الوثيقة", "Document")}</th>
              <th>${L("الرقم الرسمي", "Number")}</th>
              <th>${L("تاريخ الانتهاء", "Expiry date")}</th>
              <th>${L("الحالة", "Status")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:700;">${L("الإقامة", "Iqama")}</td>
              <td style="font-family:monospace; font-weight:700;">${escapeHtml(employee.iqamaNumber ?? "—")}</td>
              <td>${fmtDate(employee.iqamaExpiryDate)}</td>
              <td>${statusBadge(employee.iqamaStatus)}</td>
            </tr>
            <tr>
              <td style="font-weight:700;">${L("جواز السفر", "Passport")}</td>
              <td style="font-family:monospace; font-weight:700;">${escapeHtml(employee.passportNumber ?? "—")}</td>
              <td>${fmtDate(employee.passportExpiryDate)}</td>
              <td>${statusBadge(employee.passportStatus)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 📁 Section 3: Official Workforce Documents Schedule -->
    <div class="section-card">
      <div class="section-header">
        <span>${L(`المستندات الملحقة (${employee.documents.length} وثائق)`, `Other documents (${employee.documents.length})`)}</span>
      </div>
      <div class="section-body">
        <table>
          <thead>
            <tr>
              <th>${L("نوع الوثيقة", "Document type")}</th>
              <th>${L("المسمى", "Name")}</th>
              <th>${L("رقم الوثيقة", "Number")}</th>
              <th>${L("تاريخ الانتهاء", "Expiry date")}</th>
              <th>${L("الحالة", "Status")}</th>
            </tr>
          </thead>
          <tbody>
            ${
              employee.documents.length
                ? employee.documents
                    .map(
                      (d) =>
                        `<tr>
                          <td style="font-weight:700;">${DOCUMENT_KINDS[d.type] ? L(DOCUMENT_KINDS[d.type][0], DOCUMENT_KINDS[d.type][1]) : d.type}</td>
                          <td>${escapeHtml(d.name ?? "—")}</td>
                          <td style="font-family:monospace;">${escapeHtml(d.documentNumber ?? "—")}</td>
                          <td>${fmtDate(d.expiryDate)}</td>
                          <td>${statusBadge(d.status)}</td>
                        </tr>`
                    )
                    .join("")
                : `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:18px;">${L("لا توجد وثائق إضافية مسجلة في ملف الموظف", "No other documents on this employee's file")}</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>

    ${signatureBlock("profile", branding)}
  `;

  return pdfDocumentShell({
    title: "الملف التعريفي والمهني للموظف",
    titleEn: "Employee Profile & Official HR Dossier",
    dir: "rtl",
    companyNameAr: branding.company?.nameAr,
    companyNameEn: branding.company?.nameEn,
    logoDataUrl: branding.logoDataUrl,
    referenceNumber: employee.employeeNumber,
    classification: "ملف موظف رسمي | Official HR Dossier",
    theme: branding.printTheme,
    bodyHtml: body,
  });
}

/**
 * 💰 Official Payment Voucher & Disbursement Order PDF
 */
export function paymentReceiptPdf(
  payment: {
    paymentNumber: string;
    paymentDate: Date;
    category: string;
    type?: string | null;
    description: string | null;
    amount: unknown;
    vat: unknown;
    total: unknown;
    method: string;
    paidBy: string | null;
    referenceNumber: string | null;
    branch: { name: string; nameEn?: string | null } | null;
    employee: { fullNameAr: string; fullNameEn: string | null } | null;
    supplierName: string | null;
  },
  branding: Branding
) {
  const amountNum = Number(payment.amount || 0).toFixed(2);
  const vatNum = Number(payment.vat || 0).toFixed(2);
  const totalNum = Number(payment.total || 0).toFixed(2);

  const body = `
    <!-- 💰 Total Amount Highlight Banner -->
    <div class="kpi-total-card">
      <div>
        <div class="amount-label">${L("المبلغ الإجمالي المصروف (شامل ضريبة القيمة المضافة)", "Total paid (VAT included)")}</div>
      </div>
      <div class="amount-val">
        ${totalNum} <span style="font-size:11pt; font-weight:700;">${L("ر.س", "SAR")}</span>
      </div>
    </div>

    <!-- 📋 Section 1: Voucher & Transaction Details -->
    <div class="section-card">
      <div class="section-header">
        <span>${L("بيانات قيد الصرف والمؤسسة", "Voucher & Establishment Details")}</span>
        <span class="ref-code">#${escapeHtml(payment.paymentNumber)}</span>
      </div>
      <div class="section-body">
        <table>
          <tr>
            <th style="width:20%;">${L("رقم سند الصرف", "Voucher no.")}</th>
            <td style="width:30%; font-family:monospace; font-weight:700;">${escapeHtml(payment.paymentNumber)}</td>
            <th style="width:20%;">${L("تاريخ السند", "Voucher date")}</th>
            <td style="width:30%; font-weight:700;">${fmtDate(payment.paymentDate)}</td>
          </tr>
          <tr>
            <th>${L("بند الصرف", "Category")}</th>
            <td style="font-weight:700;">${paymentCategoryLabel(payment.category, payment.type)}</td>
            <th>${L("طريقة الدفع", "Payment method")}</th>
            <td style="font-weight:700;">${paymentMethodLabel(payment.method)}</td>
          </tr>
          <tr>
            <th>${L("المؤسسة / الفرع", "Establishment")}</th>
            <td>${pick(payment.branch?.name, payment.branch?.nameEn)}</td>
            <th>${L("القائم بالصرف", "Paid by")}</th>
            <td>${escapeHtml(payment.paidBy ?? "—")}</td>
          </tr>
          <tr>
            <th>${L("الموظف المستفيد", "Employee")}</th>
            <td>${payment.employee ? pick(payment.employee.fullNameAr, payment.employee.fullNameEn) : "—"}</td>
            <th>${L("المورد / الجهة المستفيدة", "Supplier / payee")}</th>
            <td style="font-weight:700;">${escapeHtml(payment.supplierName ?? "—")}</td>
          </tr>
          <tr>
            <th>${L("رقم المرجع / الفاتورة", "Reference / invoice no.")}</th>
            <td colspan="3" style="font-family:monospace;">${escapeHtml(payment.referenceNumber ?? "—")}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- 📝 Section 2: Description & Breakdown -->
    <div class="section-card">
      <div class="section-header">
        <span>${L("البيان والتفاصيل المالية", "Description & Amounts")}</span>
      </div>
      <div class="section-body">
        <p class="desc-box">
          <strong>${L("البيان:", "Description:")} </strong>${escapeHtml(payment.description ?? L("لا يوجد بيان مسجل لهذا السند.", "No description on this voucher."))}
        </p>

        <table>
          <thead>
            <tr>
              <th style="text-align:center;">${L("المبلغ الأساسي (بدون ضريبة)", "Amount (before VAT)")}</th>
              <th style="text-align:center;">${L("ضريبة القيمة المضافة", "VAT")}</th>
              <th class="total-th" style="text-align:center;">${L("المبلغ الإجمالي", "Total")}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="text-align:center; font-family:'Cairo',monospace; font-size:11pt; font-weight:700;">
              <td style="text-align:center;">${amountNum} ${L("ر.س", "SAR")}</td>
              <td style="text-align:center;">${vatNum} ${L("ر.س", "SAR")}</td>
              <td class="total-cell" style="text-align:center;">${totalNum} ${L("ر.س", "SAR")}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    ${signatureBlock("voucher", branding)}
  `;

  return pdfDocumentShell({
    title: "سند صرف مالي رسمي معتمد",
    titleEn: "Official Payment Voucher & Disbursement Order",
    dir: "rtl",
    companyNameAr: branding.company?.nameAr,
    companyNameEn: branding.company?.nameEn,
    logoDataUrl: branding.logoDataUrl,
    referenceNumber: payment.paymentNumber,
    classification: "سند صرف معتمد | Payment Voucher",
    theme: branding.printTheme,
    highlight: { value: totalNum, label: L("ريال سعودي", "Saudi riyals") },
    bodyHtml: body,
  });
}

export interface ReportColumn {
  header: string;
  subHeader?: string;
  render: (row: Record<string, unknown>) => string;
}

export interface TableReportPdfOptions {
  titleEn?: string;
  classification?: string;
}

/**
 * 📊 Official Corporate Table Report PDF
 */
export function tableReportPdf(
  title: string,
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
  branding: Branding,
  opts?: TableReportPdfOptions
) {
  // Every report prints on A4 portrait; wide tables switch to a compact style
  // (smaller type, tighter cells) so all columns still fit the page width.
  const density = columns.length >= 9 ? "dense" : columns.length >= 6 ? "compact" : "";

  const contentHtml = rows.length > 0
    ? `
    <div class="section-card">
      <div class="section-header">
        <span>${L(`جدول البيانات والنتائج (${rows.length} سجل مطابق)`, `Results (${rows.length} records)`)}</span>
        <span style="font-size:8pt; color:#64748b; font-weight:600;">${L("تاريخ التصدير:", "Exported:")} ${fmtDate(new Date())}</span>
      </div>
      <div class="section-body" style="padding:0;">
        <table class="report-table ${density}" style="margin:0; border:none;">
          <thead>
            <tr>
              <th style="width:34px; text-align:center;">#</th>
              ${columns
                .map(
                  (c) =>
                    // One language: the English column name on English documents.
                    `<th><div>${escapeHtml(isEn() ? c.subHeader || c.header : c.header)}</div></th>`
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row, idx) =>
                  `<tr>
                    <td style="text-align:center; font-family:monospace; color:#64748b; font-size:8pt;">${idx + 1}</td>
                    ${columns.map((c) => `<td>${c.render(row)}</td>`).join("")}
                  </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    <!-- End of report summary -->
    <div class="report-summary-bar">
      <span>${L("✓ نهاية التقرير الرسمي — تم الاستخراج آلياً عبر منظومة سند لإدارة الموارد البشرية والامتثال", "✓ End of report — generated by SanaD HR & Compliance")}</span>
      <span class="summary-kpi">${L(`إجمالي السجلات: ${rows.length} سجل`, `Total records: ${rows.length}`)}</span>
    </div>
  `
    : `
    <div class="empty-state-card">
            <div class="empty-state-title">${L("لا توجد سجلات مطابقة لمعايير البحث الحالية", "No records match this report")}</div>
      <div class="empty-state-desc">${L("لم يتم العثور على أي نتائج في قاعدة البيانات بناءً على الفلاتر والخيارات المحددة في هذا التقرير.", "Nothing was found for the filters chosen for this report.")}</div>
    </div>
  `;

  const body = `
    ${contentHtml}

    ${signatureBlock("report", branding)}
  `;

  return pdfDocumentShell({
    title,
    titleEn: opts?.titleEn,
    dir: "rtl",
    companyNameAr: branding.company?.nameAr,
    companyNameEn: branding.company?.nameEn,
    logoDataUrl: branding.logoDataUrl,
    classification: opts?.classification || "تقرير تنفيذي رسمي معتمد | Official Executive Report",
    theme: branding.printTheme,
    highlight: { value: String(rows.length).padStart(2, "0"), label: L("سجل في التقرير", "records") },
    bodyHtml: body,
  });
}

export { statusBadge, daysRemainingLabel };
