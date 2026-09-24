import { pdfDocumentShell } from "@/services/pdf";
import { DEFAULT_PRINT_SIGNATURES, type PrintSignatures, type SignatureDocument } from "@/services/settingsStore";
import { daysRemainingLabel } from "@/services/expiration";
import { paymentCategoryLabel, paymentMethodLabel } from "@/constants/paymentCategories";

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
    return `
      <div class="sig-card">
        <div class="sig-card-header">
          <div class="sig-title-ar">${escHtml(b.ar)}</div>
          ${b.en ? `<div class="sig-title-en">${escHtml(b.en)}</div>` : ""}
        </div>
        <div class="sig-card-body">
          <div class="sig-row sig-name-row"><span class="sig-label">الاسم:</span>${nameImg ? `<span class="sig-name"><img src="${nameImg}" alt="" /></span>` : `<span class="sig-dots"></span>`}</div>
          <div class="sig-row sig-sign-row"><span class="sig-label">التوقيع:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span class="sig-label">التاريخ:</span><span class="sig-date">${date}</span></div>
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
          <div class="seal-text-ar">${escHtml(doc.sealAr).replace(/\n/g, "<br/>")}</div>
          ${doc.sealEn ? `<div class="seal-text-en">${escHtml(doc.sealEn)}</div>` : ""}
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
  // Short Arabic labels: on A4 portrait a bilingual badge ate most of a
  // table's width; the column headers already carry the English names.
  const labels: Record<string, string> = {
    VALID: "سارية",
    ACTIVE: "على رأس العمل",
    EXPIRING_SOON: "قاربت على الانتهاء",
    ON_LEAVE: "في إجازة",
    EXPIRED: "منتهية",
    TERMINATED: "منتهي التعاقد",
    INACTIVE: "غير نشط",
  };
  const label = labels[status] ?? status;
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
    jobTitle: string | null;
    department: string | null;
    branch: { name: string } | null;
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
        <span>البيانات الشخصية والوظيفية الأساسية (Personal & Employment Information)</span>
        <span class="ref-code">#${employee.employeeNumber}</span>
      </div>
      <div class="section-body">
        <table>
          <tr>
            <th style="width:20%;">الاسم الكامل (عربي)</th>
            <td style="width:30%; font-weight:700;">${employee.fullNameAr}</td>
            <th style="width:20%;">Full Name (English)</th>
            <td style="width:30%; font-weight:700;">${employee.fullNameEn || "—"}</td>
          </tr>
          <tr>
            <th>الرقم الوظيفي</th>
            <td style="font-family:monospace; font-weight:700;">${employee.employeeNumber}</td>
            <th>الجنسية (Nationality)</th>
            <td>${employee.nationality ?? "—"}</td>
          </tr>
          <tr>
            <th>المسمى الوظيفي</th>
            <td>${employee.jobTitle ?? "—"}</td>
            <th>الفرع / المؤسسة</th>
            <td>${employee.branch?.name ?? "—"}</td>
          </tr>
          <tr>
            <th>رقم الجوال</th>
            <td dir="ltr" style="text-align:right;">${employee.mobile ?? "—"}</td>
            <th>البريد الإلكتروني</th>
            <td dir="ltr" style="text-align:right;">${employee.email ?? "—"}</td>
          </tr>
          <tr>
            <th>تاريخ الالتحاق</th>
            <td>${fmtDate(employee.joiningDate)}</td>
            <th>حالة الموظف</th>
            <td>${statusBadge(employee.employmentStatus)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- 🪪 Section 2: Iqama & Passport Details -->
    <div class="section-card">
      <div class="section-header">
        <span>وثائق الهوية والإقامة وجواز السفر (Identity & Passports)</span>
      </div>
      <div class="section-body">
        <table>
          <thead>
            <tr>
              <th>الوثيقة</th>
              <th>الرقم الرسمي</th>
              <th>تاريخ الانتهاء</th>
              <th>حالة الامتثال</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:700;">هوية مقيم / الإقامة (Iqama)</td>
              <td style="font-family:monospace; font-weight:700;">${employee.iqamaNumber ?? "—"}</td>
              <td>${fmtDate(employee.iqamaExpiryDate)}</td>
              <td>${statusBadge(employee.iqamaStatus)}</td>
            </tr>
            <tr>
              <td style="font-weight:700;">جواز السفر (Passport)</td>
              <td style="font-family:monospace; font-weight:700;">${employee.passportNumber ?? "—"}</td>
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
        <span>جدول المستندات والتراخيص الرسمية الملحقة (${employee.documents.length} وثائق)</span>
      </div>
      <div class="section-body">
        <table>
          <thead>
            <tr>
              <th>نوع الوثيقة</th>
              <th>المسمى الإضافي</th>
              <th>رقم الوثيقة</th>
              <th>تاريخ الانتهاء</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${
              employee.documents.length
                ? employee.documents
                    .map(
                      (d) =>
                        `<tr>
                          <td style="font-weight:700;">${d.type}</td>
                          <td>${d.name ?? "—"}</td>
                          <td style="font-family:monospace;">${d.documentNumber ?? "—"}</td>
                          <td>${fmtDate(d.expiryDate)}</td>
                          <td>${statusBadge(d.status)}</td>
                        </tr>`
                    )
                    .join("")
                : `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:18px;">لا توجد وثائق إضافية مسجلة في ملف الموظف</td></tr>`
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
    branch: { name: string } | null;
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
        <div class="amount-label">المبلغ الإجمالي المستحق والمصروف (شامل ضريبة القيمة المضافة)</div>
        <div class="amount-sub">Total Payable & Disbursed (VAT Included)</div>
      </div>
      <div class="amount-val">
        ${totalNum} <span style="font-size:11pt; font-weight:700;">ر.س SAR</span>
      </div>
    </div>

    <!-- 📋 Section 1: Voucher & Transaction Details -->
    <div class="section-card">
      <div class="section-header">
        <span>بيانات قيد الصرف والمؤسسة (Voucher & Establishment Details)</span>
        <span class="ref-code">#${payment.paymentNumber}</span>
      </div>
      <div class="section-body">
        <table>
          <tr>
            <th style="width:20%;">رقم سند الصرف</th>
            <td style="width:30%; font-family:monospace; font-weight:700;">${payment.paymentNumber}</td>
            <th style="width:20%;">تاريخ السند</th>
            <td style="width:30%; font-weight:700;">${fmtDate(payment.paymentDate)}</td>
          </tr>
          <tr>
            <th>بند / تصنيف الصرف</th>
            <td style="font-weight:700;">${paymentCategoryLabel(payment.category, payment.type)}</td>
            <th>طريقة الدفع</th>
            <td style="font-weight:700;">${paymentMethodLabel(payment.method)}</td>
          </tr>
          <tr>
            <th>المؤسسة / الفرع</th>
            <td>${payment.branch?.name ?? "—"}</td>
            <th>القائم بالصرف</th>
            <td>${payment.paidBy ?? "—"}</td>
          </tr>
          <tr>
            <th>الموظف المستفيد</th>
            <td>${payment.employee ? payment.employee.fullNameAr : "—"}</td>
            <th>المورد / الجهة المستفيدة</th>
            <td style="font-weight:700;">${payment.supplierName ?? "—"}</td>
          </tr>
          <tr>
            <th>رقم المرجع / الفاتورة</th>
            <td colspan="3" style="font-family:monospace;">${payment.referenceNumber ?? "—"}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- 📝 Section 2: Description & Breakdown -->
    <div class="section-card">
      <div class="section-header">
        <span>البيان والتفاصيل المالية (Description & Financial Breakdown)</span>
      </div>
      <div class="section-body">
        <p class="desc-box">
          <strong>البيان: </strong>${payment.description ?? "لا يوجد بيان مسجل لهذا السند."}
        </p>

        <table>
          <thead>
            <tr>
              <th style="text-align:center;">المبلغ الأساسي (خالي الضريبة)</th>
              <th style="text-align:center;">ضريبة القيمة المضافة (VAT)</th>
              <th class="total-th" style="text-align:center;">المبلغ الإجمالي المعتمد</th>
            </tr>
          </thead>
          <tbody>
            <tr style="text-align:center; font-family:'Cairo',monospace; font-size:11pt; font-weight:700;">
              <td style="text-align:center;">${amountNum} ر.س</td>
              <td style="text-align:center;">${vatNum} ر.س</td>
              <td class="total-cell" style="text-align:center;">${totalNum} ر.س</td>
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
    highlight: { value: totalNum, label: "ريال سعودي" },
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
        <span>جدول البيانات والنتائج (${rows.length} سجل مطابق)</span>
        <span style="font-size:8pt; color:#64748b; font-weight:600;">تاريخ التصدير: ${fmtDate(new Date())}</span>
      </div>
      <div class="section-body" style="padding:0;">
        <table class="report-table ${density}" style="margin:0; border:none;">
          <thead>
            <tr>
              <th style="width:34px; text-align:center;">#</th>
              ${columns
                .map(
                  (c) =>
                    `<th><div>${c.header}</div>${c.subHeader ? `<div class="th-sub">${c.subHeader}</div>` : ""}</th>`
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
      <span>✓ نهاية التقرير الرسمي — تم الاستخراج آلياً عبر منظومة سند لإدارة الموارد البشرية والامتثال</span>
      <span class="summary-kpi">إجمالي السجلات: ${rows.length} سجل</span>
    </div>
  `
    : `
    <div class="empty-state-card">
            <div class="empty-state-title">لا توجد سجلات مطابقة لمعايير البحث الحالية</div>
      <div class="empty-state-desc">لم يتم العثور على أي نتائج في قاعدة البيانات بناءً على الفلاتر والخيارات المحددة في هذا التقرير.</div>
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
    highlight: { value: String(rows.length).padStart(2, "0"), label: "سجل في التقرير" },
    bodyHtml: body,
  });
}

export { statusBadge, daysRemainingLabel };
