import { pdfDocumentShell } from "@/services/pdf";
import { daysRemainingLabel } from "@/services/expiration";

type Branding = { company: { nameAr?: string | null; nameEn?: string | null } | null; logoDataUrl: string | null };

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
        <span>📋 البيانات الشخصية والوظيفية الأساسية (Personal & Employment Information)</span>
        <span style="font-family:monospace; font-size:9pt; color:#2563eb;">#${employee.employeeNumber}</span>
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
        <span>🪪 وثائق الهوية والإقامة وجواز السفر (Identity & Passports)</span>
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
        <span>📁 جدول المستندات والتراخيص الرسمية الملحقة (${employee.documents.length} وثائق)</span>
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

    <!-- ✍️ Signatures & Official Stamp Matrix -->
    <div class="signature-matrix">
      <div class="sig-card">
        <div class="sig-card-header">
          <div class="sig-title-ar">إعداد شؤون الموظفين</div>
          <div class="sig-title-en">HR Operations Specialist</div>
        </div>
        <div class="sig-card-body">
          <div class="sig-row"><span>الاسم:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>التوقيع:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>التاريخ:</span><span class="sig-dots"></span></div>
        </div>
      </div>
      <div class="sig-seal-box">
        <div class="official-seal-circle">
          <div class="seal-stars">★★★★★</div>
          <div class="seal-text-ar">شؤون الموظفين<br/>معتمد</div>
          <div class="seal-text-en">HR DEPARTMENT</div>
        </div>
      </div>
      <div class="sig-card">
        <div class="sig-card-header">
          <div class="sig-title-ar">اعتماد المدير العام</div>
          <div class="sig-title-en">General Manager Approval</div>
        </div>
        <div class="sig-card-body">
          <div class="sig-row"><span>الاسم:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>الاعتماد:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>التاريخ:</span><span class="sig-dots"></span></div>
        </div>
      </div>
    </div>
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
        <div style="font-size:9pt; color:#cbd5e1; margin-top:2px;">Total Payable & Disbursed (VAT Included)</div>
      </div>
      <div class="amount-val">
        ${totalNum} <span style="font-size:11pt; font-weight:700;">ر.س SAR</span>
      </div>
    </div>

    <!-- 📋 Section 1: Voucher & Transaction Details -->
    <div class="section-card">
      <div class="section-header">
        <span>بيانات قيد الصرف والمؤسسة (Voucher & Establishment Details)</span>
        <span style="font-family:monospace; font-size:9pt; color:#0284c7;">#${payment.paymentNumber}</span>
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
            <td style="font-weight:700;">${payment.category}</td>
            <th>طريقة الدفع</th>
            <td style="font-weight:700;">${payment.method}</td>
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
        <p style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; margin-bottom:14px; font-size:10pt;">
          <strong>البيان: </strong>${payment.description ?? "لا يوجد بيان مسجل لهذا السند."}
        </p>

        <table>
          <thead>
            <tr>
              <th style="text-align:center;">المبلغ الأساسي (خالي الضريبة)</th>
              <th style="text-align:center;">ضريبة القيمة المضافة (VAT)</th>
              <th style="text-align:center; background:#1e3a8a;">المبلغ الإجمالي المعتمد</th>
            </tr>
          </thead>
          <tbody>
            <tr style="text-align:center; font-family:'Cairo',monospace; font-size:11pt; font-weight:700;">
              <td style="text-align:center;">${amountNum} ر.س</td>
              <td style="text-align:center;">${vatNum} ر.س</td>
              <td style="text-align:center; font-weight:900; color:#1e3a8a; background:#f0fdf4;">${totalNum} ر.س</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ✍️ Financial Approvals & Stamp Matrix -->
    <div class="signature-matrix">
      <div class="sig-card">
        <div class="sig-card-header">
          <div class="sig-title-ar">المستلم / المفوض بالصرف</div>
          <div class="sig-title-en">Recipient / Authorized Receiver</div>
        </div>
        <div class="sig-card-body">
          <div class="sig-row"><span>الاسم:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>التوقيع:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>التاريخ:</span><span class="sig-dots"></span></div>
        </div>
      </div>
      <div class="sig-card">
        <div class="sig-card-header">
          <div class="sig-title-ar">المحاسب المالي</div>
          <div class="sig-title-en">Financial Accountant</div>
        </div>
        <div class="sig-card-body">
          <div class="sig-row"><span>الاسم:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>التدقيق:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>التاريخ:</span><span class="sig-dots"></span></div>
        </div>
      </div>
      <div class="sig-seal-box">
        <div class="official-seal-circle">
          <div class="seal-stars">★★★★★</div>
          <div class="seal-text-ar">الإدارة المالية<br/>معتمد للصرف</div>
          <div class="seal-text-en">FINANCIAL SEAL</div>
        </div>
      </div>
      <div class="sig-card">
        <div class="sig-card-header">
          <div class="sig-title-ar">الاعتماد المالي العام</div>
          <div class="sig-title-en">Financial Authorization</div>
        </div>
        <div class="sig-card-body">
          <div class="sig-row"><span>الاسم:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>الاعتماد:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>التاريخ:</span><span class="sig-dots"></span></div>
        </div>
      </div>
    </div>
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
      <div style="font-size:24pt; margin-bottom:6px;">📋</div>
      <div class="empty-state-title">لا توجد سجلات مطابقة لمعايير البحث الحالية</div>
      <div class="empty-state-desc">لم يتم العثور على أي نتائج في قاعدة البيانات بناءً على الفلاتر والخيارات المحددة في هذا التقرير.</div>
    </div>
  `;

  const body = `
    ${contentHtml}

    <div class="signature-matrix">
      <div class="sig-card">
        <div class="sig-card-header">
          <div class="sig-title-ar">إعداد التقرير وتدقيقه</div>
          <div class="sig-title-en">Prepared & Audited By</div>
        </div>
        <div class="sig-card-body">
          <div class="sig-row"><span>الاسم:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>التوقيع:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>التاريخ:</span><span class="sig-dots"></span></div>
        </div>
      </div>

      <div class="sig-seal-box">
        <div class="official-seal-circle">
          <div class="seal-stars">★★★★★</div>
          <div class="seal-text-ar">ختم الرقابة<br/>والاعتماد</div>
          <div class="seal-text-en">OFFICIAL SEAL</div>
        </div>
      </div>

      <div class="sig-card">
        <div class="sig-card-header">
          <div class="sig-title-ar">اعتماد الإدارة العامة</div>
          <div class="sig-title-en">Executive Management Approval</div>
        </div>
        <div class="sig-card-body">
          <div class="sig-row"><span>الاسم:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>الاعتماد:</span><span class="sig-dots"></span></div>
          <div class="sig-row"><span>التاريخ:</span><span class="sig-dots"></span></div>
        </div>
      </div>
    </div>
  `;

  return pdfDocumentShell({
    title,
    titleEn: opts?.titleEn,
    dir: "rtl",
    companyNameAr: branding.company?.nameAr,
    companyNameEn: branding.company?.nameEn,
    logoDataUrl: branding.logoDataUrl,
    classification: opts?.classification || "تقرير تنفيذي رسمي معتمد | Official Executive Report",
    bodyHtml: body,
  });
}

export { statusBadge, daysRemainingLabel };
