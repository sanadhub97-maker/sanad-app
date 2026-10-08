import { escapeHtml } from "@/lib/security";
import { pdfDocumentShell } from "@/services/pdf";
import { DEFAULT_PRINT_SIGNATURES, type PrintSignatures, type SignatureDocument } from "@/services/settingsStore";
import { daysRemainingLabel } from "@/services/expiration";
import { paymentCategoryLabel, paymentMethodLabel } from "@/constants/paymentCategories";
import { DOCUMENT_KINDS } from "@/services/expiringItems";
import { L, isEn } from "@/services/lang";
import { getPrintTheme } from "@/services/printThemes";

/** A value with an optional English version, for the current language. */
const pick = (ar: string | null | undefined, en: string | null | undefined) => escapeHtml((isEn() ? en || ar : ar || en) || "—");

type Branding = {
  company: { nameAr?: string | null; nameEn?: string | null } | null;
  logoDataUrl: string | null;
  printTheme?: string | null;
  signatures?: PrintSignatures;
  stampDataUrl?: string | null;
  nameImages?: Record<string, string>;
  brandColor?: string | null;
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
  const box = (b: { ar: string; en: string; nameAr?: string; nameEn?: string; nameFileId?: string | null }) => {
    const nameImg = b.nameFileId ? branding.nameImages?.[b.nameFileId] : null;
    // One language: the box title in the document's language only.
    const heading = isEn() ? b.en || b.ar : b.ar || b.en;
    const arName = b.nameAr?.trim();
    const enName = b.nameEn?.trim();
    const name = isEn() ? enName || arName : arName || enName;
    return `
      <div class="sig-card">
        <div class="sig-card-header">
          <div class="sig-title-ar">${escHtml(heading)}</div>
        </div>
        <div class="sig-card-body">
          <div class="sig-row"><span class="sig-label">${L("الاسم:", "Name:")}</span>${name ? `<span class="sig-name">${escapeHtml(name)}</span>` : nameImg ? `<span class="sig-name"><img src="${nameImg}" alt="" /></span>` : `<span class="sig-dots"></span>`}</div>
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
    brandColor: branding.brandColor,
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
    brandColor: branding.brandColor,
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

  const rowHtml = rows.map(
    (row, idx) =>
      `<tr>
                    <td style="text-align:center; font-family:monospace; color:#64748b; font-size:8pt;">${idx + 1}</td>
                    ${columns.map((c) => `<td>${c.render(row)}</td>`).join("")}
                  </tr>`
  );

  // How many rows are expired, ending soon and valid. Hidden unless the design
  // shows it: as four number tiles, or (dashboard designs) a ring of the three
  // shares, a bar per status and the share still valid.
  const tally = { red: 0, amber: 0, green: 0 };
  for (const r of rowHtml) {
    if (/status-(EXPIRED|TERMINATED|INACTIVE)\b/.test(r)) tally.red++;
    else if (/status-(EXPIRING_SOON|ON_LEAVE)\b/.test(r)) tally.amber++;
    else if (/status-(VALID|ACTIVE)\b/.test(r)) tally.green++;
  }
  const known = tally.red + tally.amber + tally.green;
  const share = (n: number) => (known ? Math.round((n / known) * 100) : 0);
  // The ring: a circle of circumference 100, so each share is its own length.
  let offset = 25;
  const seg = (cls: string, n: number) => {
    const len = known ? (n / known) * 100 : 0;
    const out = len > 0 ? `<circle class="${cls}" cx="21" cy="21" r="15.9155" fill="none" stroke-width="5.2" stroke-dasharray="${len.toFixed(2)} ${(100 - len).toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"/>` : "";
    offset -= len;
    return out;
  };
  const ring = `<svg viewBox="0 0 42 42" aria-hidden="true"><circle class="rs-track" cx="21" cy="21" r="15.9155" fill="none" stroke-width="5.2"/>${seg("seg-red", tally.red)}${seg("seg-amber", tally.amber)}${seg("seg-green", tally.green)}</svg>`;
  const row = (cls: string, n: number, label: string) =>
    `<div class="rs ${cls}"><span class="rs-l">${label}</span><b>${n}</b><em>${share(n)}%</em><i><u style="width:${share(n)}%"></u></i></div>`;
  const tile = (cls: string, n: number, label: string) => `<div class="rs ${cls}" style="--n:${n}"><b>${n}</b><span>${label}</span></div>`;
  const statsHtml = !known
    ? ""
    : !getPrintTheme(branding.printTheme).dashboard
      ? `<div class="report-stats">
      ${tile("rs-red", tally.red, L("منتهية", "Expired"))}
      ${tile("rs-amber", tally.amber, L("قريبة من الانتهاء", "Ending soon"))}
      ${tile("rs-green", tally.green, L("سارية", "Valid"))}
      ${tile("rs-total", rows.length, L("إجمالي السجلات", "Total records"))}
    </div>`
      : `<div class="report-stats">
      <div class="rs-chart">${ring}<div class="rs-c"><b>${known}</b><span>${L("وثيقة", "documents")}</span></div></div>
      <div class="rs-list">
        ${row("rs-red", tally.red, L("منتهية", "Expired"))}
        ${row("rs-amber", tally.amber, L("قريبة من الانتهاء", "Ending soon"))}
        ${row("rs-green", tally.green, L("سارية", "Valid"))}
      </div>
      <div class="rs-score"><b>${share(tally.green)}%</b><span>${L("نسبة الوثائق السارية", "Share still valid")}</span></div>
    </div>`;

  const contentHtml = rows.length > 0
    ? `
    ${statsHtml}
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
            ${rowHtml.join("")}
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
    brandColor: branding.brandColor,
    highlight: { value: String(rows.length).padStart(2, "0"), label: L("سجل في التقرير", "records") },
    bodyHtml: body,
  });
}

export { statusBadge, daysRemainingLabel };

/* ---------- Expired / ending-soon documents, by establishment ---------- */

export interface ScopedDocRow { kind: string; number: string | null; expiry: Date; days: number; status: string }
export interface ScopedEstablishment { name: string; owner: string | null; cr: string | null; vat: string | null; docs: ScopedDocRow[] }
export interface ScopedEmployeeGroup { establishment: string; rows: (ScopedDocRow & { employee: string; employeeNumber: string | null })[] }

const SCOPED_CSS = `<style>
  .sc-sum { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #e6dcc4; border-radius: 10px; overflow: hidden; margin: 0 0 14px; break-inside: avoid; }
  .sc-sum div { padding: 8px 12px; background: #fffaf0; }
  .sc-sum div + div { border-inline-start: 1px solid #efe5cd; }
  .sc-sum small { display: block; color: #5d6a80; font-size: 8pt; }
  .sc-sum b { font-size: 14pt; color: #0d1f3f; font-family: 'Zain', sans-serif !important; }
  .sc-sec { display: flex; align-items: center; gap: 8px; margin: 14px 0 8px; font-size: 11.5pt; font-weight: 700; color: #0d1f3f; break-after: avoid; }
  .sc-sec .dm { width: 8px; height: 8px; background: #b08a40; transform: rotate(45deg); flex: none; }
  .sc-sec .ln { flex: 1; height: 1px; background: #e6dcc4; }
  .sc-sec small { font-size: 8.5pt; font-weight: 600; color: #5d6a80; }
  .sc-est { border: 1px solid #e3e8f0; border-radius: 9px; overflow: hidden; margin: 0 0 10px; break-inside: avoid; }
  .sc-est-h { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f5f7fb; border-bottom: 1px solid #e3e8f0; }
  .sc-mk { width: 26px; height: 26px; border-radius: 50%; background: #0d1f3f; color: #ecd594; display: flex; align-items: center; justify-content: center; font-size: 8.5pt; font-weight: 700; flex: none; }
  .sc-est-h .nm { flex: 1; min-width: 0; }
  .sc-est-h .nm b { display: block; font-size: 10pt; color: #0f172a; }
  .sc-est-h .nm small { color: #5d6a80; font-size: 8pt; }
  .sc-facts { display: flex; gap: 12px; font-size: 8pt; color: #5d6a80; white-space: nowrap; }
  .sc-facts b { color: #0f172a; font-weight: 600; }
  .sc-tbl { width: 100%; border-collapse: collapse; }
  .sc-tbl th { text-align: start; font-size: 8pt; font-weight: 700; color: #5d6a80; padding: 5px 10px; border-bottom: 1px solid #e3e8f0; background: #fff; }
  .sc-tbl td { padding: 6px 10px; border-bottom: 1px solid #eef1f6; font-size: 9pt; }
  .sc-tbl tr:last-child td { border-bottom: 0; }
  .sc-tbl tr { break-inside: avoid; }
  .sc-days { font-weight: 700; white-space: nowrap; }
  .sc-days.exp { color: #c6283b; } .sc-days.soon { color: #c26a06; } .sc-days.ok { color: #15803d; }
  .sc-tag { display: inline-block; font-size: 7.5pt; font-weight: 700; color: #15803d; background: #e8f6ed; border-radius: 99px; padding: 0 6px; margin-inline-start: 5px; }
  .sc-none { padding: 12px; text-align: center; color: #8792a6; font-size: 9pt; }
  .sc-n { font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate; }
</style>`;

export function scopedDocumentsReportPdf(title: string, titleEn: string, data: { establishments: ScopedEstablishment[]; employees: ScopedEmployeeGroup[] }, branding: Branding) {
  const esc = (v: unknown) => escapeHtml(v ?? "—");
  const day = (d: Date) => fmtDate(d);
  const tone = (days: number) => (days <= 0 ? "exp" : days <= 30 ? "soon" : "ok");
  const left = (days: number) => (days < 0 ? L(`من ${-days} يوم`, `${-days} days ago`) : days === 0 ? L("النهارده", "Today") : L(`باقي ${days} يوم`, `${days} days left`));
  const mark = (name: string) => escapeHtml(name.replace(/^(مؤسسة|شركة|مطعم|مقهى|محل)\s+/, "").split(/\s+/).slice(0, 2).map((w) => w.replace(/^ال(?=..)/, "").charAt(0)).join(""));
  const nEst = data.establishments.reduce((a, e) => a + e.docs.length, 0);
  const nEmp = data.employees.reduce((a, g) => a + g.rows.length, 0);
  const th = (labels: string[]) => `<thead><tr>${labels.map((l) => `<th>${l}</th>`).join("")}</tr></thead>`;
  const ests = data.establishments.length
    ? data.establishments.map((e) => `<div class="sc-est"><div class="sc-est-h"><span class="sc-mk">${mark(e.name)}</span><div class="nm"><b>${esc(e.name)}</b>${e.owner ? `<small>${L("المالك", "Owner")}: ${esc(e.owner)}</small>` : ""}</div>
        <div class="sc-facts">${e.cr ? `<span>${L("س.ت", "CR")} <b class="sc-n">${esc(e.cr)}</b></span>` : ""}${e.vat ? `<span>${L("الرقم الضريبي", "VAT")} <b class="sc-n">${esc(e.vat)}</b></span>` : ""}</div></div>
        <table class="sc-tbl">${th([L("الوثيقة", "Document"), L("رقمها", "Number"), L("تاريخ الانتهاء", "Expiry"), L("المدة", "Time"), L("الحالة", "Status")])}<tbody>
        ${e.docs.map((d) => `<tr><td><b>${esc(d.kind)}</b></td><td class="sc-n">${esc(d.number)}</td><td class="sc-n">${day(d.expiry)}</td><td class="sc-days ${tone(d.days)}">${left(d.days)}</td><td>${statusBadge(d.status)}</td></tr>`).join("")}</tbody></table></div>`).join("")
    : `<div class="sc-est"><div class="sc-none">${L("مفيش وثائق للمؤسسات في التقرير ده.", "No establishment documents in this report.")}</div></div>`;
  const emps = data.employees.length
    ? data.employees.map((g) => `<div class="sc-est"><div class="sc-est-h"><span class="sc-mk">${mark(g.establishment)}</span><div class="nm"><b>${esc(g.establishment)}</b><small>${L(`${new Set(g.rows.map((r) => r.employee)).size} موظف على الكفالة`, `${new Set(g.rows.map((r) => r.employee)).size} sponsored employees`)}</small></div></div>
        <table class="sc-tbl">${th([L("الموظف", "Employee"), L("الرقم الوظيفي", "Emp. no."), L("الوثيقة", "Document"), L("رقمها", "Number"), L("تاريخ الانتهاء", "Expiry"), L("المدة", "Time")])}<tbody>
        ${g.rows.map((r) => `<tr><td><b>${esc(r.employee)}</b><span class="sc-tag">${L("على الكفالة", "Sponsored")}</span></td><td class="sc-n">${esc(r.employeeNumber)}</td><td>${esc(r.kind)}</td><td class="sc-n">${esc(r.number)}</td><td class="sc-n">${day(r.expiry)}</td><td class="sc-days ${tone(r.days)}">${left(r.days)}</td></tr>`).join("")}</tbody></table></div>`).join("")
    : `<div class="sc-est"><div class="sc-none">${L("مفيش وثائق لموظفين على الكفالة في التقرير ده.", "No sponsored employees' documents in this report.")}</div></div>`;
  const body = `${SCOPED_CSS}
    <div class="sc-sum"><div><small>${L("إجمالي الوثائق", "All documents")}</small><b class="sc-n">${nEst + nEmp}</b></div><div><small>${L("وثائق المؤسسات", "Establishments")}</small><b class="sc-n">${nEst}</b></div><div><small>${L("وثائق موظفين الكفالة", "Sponsored employees")}</small><b class="sc-n">${nEmp}</b></div><div><small>${L("عدد المؤسسات", "Establishments")}</small><b class="sc-n">${data.establishments.length}</b></div></div>
    <div class="sc-sec"><span class="dm"></span>${L("المؤسسات والشركات", "Establishments")}<span class="ln"></span><small>${L(`${nEst} وثيقة`, `${nEst} documents`)}</small></div>
    ${ests}
    <div class="sc-sec"><span class="dm"></span>${L("الموظفون على الكفالة", "Employees on the company's sponsorship")}<span class="ln"></span><small>${L(`${nEmp} وثيقة`, `${nEmp} documents`)}</small></div>
    ${emps}
    ${signatureBlock("report", branding)}`;
  return pdfDocumentShell({
    title,
    titleEn,
    dir: "rtl",
    companyNameAr: branding.company?.nameAr,
    companyNameEn: branding.company?.nameEn,
    logoDataUrl: branding.logoDataUrl,
    classification: "تقرير تنفيذي رسمي معتمد | Official Executive Report",
    theme: branding.printTheme,
    brandColor: branding.brandColor,
    highlight: { value: String(nEst + nEmp).padStart(2, "0"), label: L("وثيقة في التقرير", "documents") },
    bodyHtml: body,
  });
}
