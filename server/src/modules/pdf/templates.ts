import { pdfDocumentShell } from "@/services/pdf";
import { daysRemainingLabel } from "@/services/expiration";

type Branding = { company: { nameAr?: string | null; nameEn?: string | null } | null; logoDataUrl: string | null };

function fmtDate(d: Date | null | undefined) {
  return d ? new Date(d).toLocaleDateString("en-GB") : "—";
}

function statusBadge(status: string | null | undefined) {
  if (!status) return "—";
  const label = status === "EXPIRING_SOON" ? "Expiring Soon" : status.charAt(0) + status.slice(1).toLowerCase();
  return `<span class="status-${status}">${label}</span>`;
}

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
    <h3 style="color:#0B1F3A;">Personal & Employment Information</h3>
    <table>
      <tr><th>Employee Number</th><td>${employee.employeeNumber}</td><th>Name</th><td>${employee.fullNameEn || employee.fullNameAr}</td></tr>
      <tr><th>Nationality</th><td>${employee.nationality ?? "—"}</td><th>Job Title</th><td>${employee.jobTitle ?? "—"}</td></tr>
      <tr><th>Department</th><td>${employee.department ?? "—"}</td><th>Branch</th><td>${employee.branch?.name ?? "—"}</td></tr>
      <tr><th>Mobile</th><td>${employee.mobile ?? "—"}</td><th>Email</th><td>${employee.email ?? "—"}</td></tr>
      <tr><th>Employment Status</th><td>${employee.employmentStatus}</td><th>Joining Date</th><td>${fmtDate(employee.joiningDate)}</td></tr>
    </table>

    <h3 style="color:#0B1F3A;">Iqama & Passport</h3>
    <table>
      <tr><th>Iqama Number</th><td>${employee.iqamaNumber ?? "—"}</td><th>Expiry</th><td>${fmtDate(employee.iqamaExpiryDate)} (${statusBadge(employee.iqamaStatus)})</td></tr>
      <tr><th>Passport Number</th><td>${employee.passportNumber ?? "—"}</td><th>Expiry</th><td>${fmtDate(employee.passportExpiryDate)} (${statusBadge(employee.passportStatus)})</td></tr>
    </table>

    <h3 style="color:#0B1F3A;">Documents</h3>
    <table>
      <thead><tr><th>Type</th><th>Name</th><th>Number</th><th>Expiry Date</th><th>Status</th></tr></thead>
      <tbody>
        ${
          employee.documents.length
            ? employee.documents
                .map(
                  (d) =>
                    `<tr><td>${d.type}</td><td>${d.name ?? "—"}</td><td>${d.documentNumber ?? "—"}</td><td>${fmtDate(d.expiryDate)}</td><td>${statusBadge(d.status)}</td></tr>`
                )
                .join("")
            : `<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No documents on file</td></tr>`
        }
      </tbody>
    </table>
  `;

  return pdfDocumentShell({
    title: "Employee Profile",
    dir: "ltr",
    companyNameAr: branding.company?.nameAr,
    companyNameEn: branding.company?.nameEn,
    logoDataUrl: branding.logoDataUrl,
    referenceNumber: employee.employeeNumber,
    bodyHtml: body,
  });
}

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
  const body = `
    <table>
      <tr><th>Payment Number</th><td>${payment.paymentNumber}</td><th>Date</th><td>${fmtDate(payment.paymentDate)}</td></tr>
      <tr><th>Category</th><td>${payment.category}</td><th>Method</th><td>${payment.method}</td></tr>
      <tr><th>Branch</th><td>${payment.branch?.name ?? "—"}</td><th>Paid By</th><td>${payment.paidBy ?? "—"}</td></tr>
      <tr><th>Employee</th><td>${payment.employee ? payment.employee.fullNameEn || payment.employee.fullNameAr : "—"}</td><th>Supplier</th><td>${payment.supplierName ?? "—"}</td></tr>
      <tr><th>Reference</th><td colspan="3">${payment.referenceNumber ?? "—"}</td></tr>
    </table>

    <h3 style="color:#0B1F3A;">Description</h3>
    <p>${payment.description ?? "—"}</p>

    <table>
      <thead><tr><th>Amount</th><th>VAT</th><th>Total</th></tr></thead>
      <tbody><tr><td>${Number(payment.amount).toFixed(2)}</td><td>${Number(payment.vat).toFixed(2)}</td><td><strong>${Number(payment.total).toFixed(2)}</strong></td></tr></tbody>
    </table>

    <div class="signature-area">
      <div class="signature-box">Received By</div>
      <div class="signature-box">Authorized Signature</div>
    </div>
  `;

  return pdfDocumentShell({
    title: "Payment Receipt",
    dir: "ltr",
    companyNameAr: branding.company?.nameAr,
    companyNameEn: branding.company?.nameEn,
    logoDataUrl: branding.logoDataUrl,
    referenceNumber: payment.paymentNumber,
    bodyHtml: body,
  });
}

export interface ReportColumn {
  header: string;
  render: (row: Record<string, unknown>) => string;
}

export function tableReportPdf(title: string, columns: ReportColumn[], rows: Record<string, unknown>[], branding: Branding) {
  const body = `
    <table>
      <thead><tr>${columns.map((c) => `<th>${c.header}</th>`).join("")}</tr></thead>
      <tbody>
        ${
          rows.length
            ? rows.map((row) => `<tr>${columns.map((c) => `<td>${c.render(row)}</td>`).join("")}</tr>`).join("")
            : `<tr><td colspan="${columns.length}" style="text-align:center;color:#94a3b8;">No records match the selected filters</td></tr>`
        }
      </tbody>
    </table>
  `;

  return pdfDocumentShell({
    title,
    dir: "ltr",
    companyNameAr: branding.company?.nameAr,
    companyNameEn: branding.company?.nameEn,
    logoDataUrl: branding.logoDataUrl,
    bodyHtml: body,
  });
}

export { statusBadge, daysRemainingLabel };
