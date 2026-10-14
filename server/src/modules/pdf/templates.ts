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

/** The Saudi riyal sign (the official symbol, drawn as a shape so it prints without a font), set after an amount. */
const SAR = `<svg class="sar" viewBox="40 0 1150 1270" aria-label="SAR" style="display:inline-block;width:.8em;height:.88em;vertical-align:-.08em;margin:0 .22em 0 0;fill:currentColor"><path d="M750 1119C730 1163 716 1211 711 1262L1136 1172C1156 1127 1169 1079 1174 1028L750 1119ZM1136 901C1156 857 1169 809 1174 758L843 828V693L1136 631C1156 587 1169 538 1174 488L843 558V72C793 100 748 138 711 183V586L579 614V6C528 34 483 72 447 117V642L151 705C131 750 117 798 112 849L447 777V948L88 1024C68 1068 55 1117 50 1167L425 1088C456 1081 482 1063 499 1038L568 936C575 926 579 913 579 899V749L711 721V992L1136 901Z"/></svg>`;

/* ---------- Amounts in words (Arabic), for the voucher ---------- */

const ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

/** 0–999 in Arabic words. */
function under1000(n: number): string {
  const h = Math.floor(n / 100), r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(HUNDREDS[h]);
  if (r) parts.push(r < 20 ? ONES[r] : r % 10 ? `${ONES[r % 10]} و${TENS[Math.floor(r / 10)]}` : TENS[Math.floor(r / 10)]);
  return parts.join(" و");
}

/** A scale word for a count: ألف / ألفان / آلاف / ألفًا, and the same for مليون. */
function scaled(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${under1000(n)} ${few}`;
  return `${under1000(n)} ${n % 100 >= 3 && n % 100 <= 10 ? few : many}`;
}

/** A whole number in Arabic words (up to 999,999,999). */
export function arabicWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "صفر";
  const m = Math.floor(n / 1_000_000), t = Math.floor((n % 1_000_000) / 1000), r = n % 1000;
  const parts: string[] = [];
  if (m) parts.push(scaled(m, "مليون", "مليونان", "ملايين", "مليونًا"));
  if (t) parts.push(scaled(t, "ألف", "ألفان", "آلاف", "ألفًا"));
  if (r) parts.push(under1000(r));
  return parts.join(" و");
}

/** "ألف وأربعمائة وتسعون ريالًا سعوديًا وخمسون هللة فقط لا غير". */
export function riyalsInWords(amount: number): string {
  const riyals = Math.floor(amount + 1e-9);
  const halalas = Math.round((amount - riyals) * 100);
  // After a round hundred, thousand or million the riyal is singular (مائة ريال، ألف ريال).
  const unit = (n: number) => (n === 1 ? "ريال سعودي" : n === 2 ? "ريالان سعوديان" : n % 100 === 0 ? "ريال سعودي" : n % 100 >= 3 && n % 100 <= 10 ? "ريالات سعودية" : "ريالًا سعوديًا");
  const r = riyals === 1 ? "ريال سعودي واحد" : riyals === 2 ? "ريالان سعوديان" : `${arabicWords(riyals)} ${unit(riyals)}`;
  const h = halalas ? ` و${halalas === 1 ? "هللة واحدة" : halalas === 2 ? "هللتان" : `${arabicWords(halalas)} ${halalas >= 3 && halalas <= 10 ? "هللات" : "هللة"}`}` : "";
  return `${r}${h} فقط لا غير`;
}

const VOUCHER_CSS = `<style>
  table.vc-list { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 4.5mm; }
  .vc-list th { background: #fbf6ea !important; color: #6b4e1d !important; font-size: 7.9pt !important; font-weight: 900; padding: 1.8mm 2mm !important; text-align: start; border: 0 !important; border-top: .5mm solid #b8904a !important; border-bottom: .3mm solid #b8904a !important; box-shadow: none !important; }
  .vc-list th:first-child { width: 7mm; text-align: center; }
  .vc-list th.m, .vc-list td.m { text-align: left; }
  .vc-list td { padding: 1.3mm 2mm !important; font-size: 8.8pt !important; font-weight: 700; border: 0 !important; border-bottom: .2mm solid #efe7d4 !important; background: transparent !important; color: #1a1610; }
  .vc-list td.c { text-align: center; color: #9a7433; font-weight: 900; }
  .vc-list td.n, .vc-list td.m { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .vc-list td.m { font-weight: 900; color: #5e4418; }
  .vc-list td.n { text-align: right; }
  .vc-list tr { break-inside: avoid; }
  .vc-top { display: grid; grid-template-columns: 1.2fr 1fr; gap: 4mm; margin: 0 0 4mm; break-inside: avoid; }
  .vc-amt { position: relative; display: flex; flex-direction: column; justify-content: center; padding: 5.4mm 7mm 4.6mm; background: #15120c; color: #f3e3bd; border-radius: 1.4mm; box-shadow: inset 0 0 0 1.2mm #15120c, inset 0 0 0 1.45mm #b8904a, inset 0 0 0 2.2mm #15120c, inset 0 0 0 2.35mm #5e4a26; text-align: center; }
  .vc-amt::before, .vc-amt::after { content: ""; position: absolute; width: 5mm; height: 5mm; border: 0 solid #d9b877; }
  .vc-amt::before { top: 3.4mm; right: 3.4mm; border-top-width: .45mm; border-right-width: .45mm; }
  .vc-amt::after { bottom: 3.4mm; left: 3.4mm; border-bottom-width: .45mm; border-left-width: .45mm; }
  .vc-amt small { display: block; font-size: 8.4pt; letter-spacing: .05em; color: #c9a464; font-weight: 700; }
  .vc-amt b { display: block; font-size: 31pt; font-weight: 900; line-height: 1.2; color: #f3dfae; font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate; margin: 1.2mm 0 1mm; }
  .vc-amt b span { font-size: 18pt; color: #d8c49a; }
  .vc-amt em { display: block; font-style: normal; font-size: 10pt; font-weight: 700; color: #eadcb8; border-top: .25mm solid #6b5530; padding-top: 2.2mm; margin: 1.2mm 6mm 0; line-height: 1.6; }
  .vc-meta { display: grid; grid-template-columns: 1fr 1fr; border: .3mm solid #d4c194; background: #fff; box-shadow: inset 0 0 0 1mm #fff, inset 0 0 0 1.25mm #ece1c4; }
  .vc-meta > div { padding: 2.7mm 3.6mm; border-bottom: .25mm solid #ece3cd; }
  .vc-meta > div:nth-child(odd) { border-inline-end: .25mm solid #ece3cd; }
  .vc-meta > div:nth-last-child(-n+2) { border-bottom: 0; }
  .vc-meta small { display: block; font-size: 7.8pt; color: #8a7c62; font-weight: 700; }
  .vc-meta b { display: block; font-size: 10.4pt; font-weight: 800; color: #1a1610; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vc-meta b.num { direction: ltr; unicode-bidi: isolate; text-align: start; font-variant-numeric: tabular-nums; }
  .vc-meta .chip { display: inline-block; font-size: 8.6pt; font-weight: 800; color: #6b4e1d; border: .25mm solid #c9a464; border-radius: 99px; padding: 0 2.6mm; background: #fbf6ea; }

  /* the statement: a framed certificate with its title on the top rule */
  .vc-deed { position: relative; margin: 4mm 0 5mm; padding: 7mm 7mm 5mm; background: #fffdf8; border: .35mm solid #b8904a; box-shadow: inset 0 0 0 1.1mm #fffdf8, inset 0 0 0 1.3mm #d9c69a; break-inside: avoid; }
  .vc-deed::before, .vc-deed::after { content: ""; position: absolute; width: 5mm; height: 5mm; border: 0 solid #9a7433; }
  .vc-deed::before { top: 2.4mm; right: 2.4mm; border-top-width: .45mm; border-right-width: .45mm; }
  .vc-deed::after { bottom: 2.4mm; left: 2.4mm; border-bottom-width: .45mm; border-left-width: .45mm; }
  .vc-deed-t { position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%); background: #15120c; color: #f3dfae; font-size: 10pt; font-weight: 900; padding: 1.2mm 7mm; border-radius: 99px; box-shadow: 0 0 0 .8mm #fffdf8, 0 0 0 1.05mm #b8904a; white-space: nowrap; }
  .vc-line { display: grid; grid-template-columns: 34mm 1fr; align-items: baseline; gap: 3mm; margin: 0 0 3.2mm; font-size: 10.6pt; }
  .vc-line:last-child { margin-bottom: 0; }
  .vc-line > span { color: #5e4418; font-weight: 800; white-space: nowrap; }
  .vc-line > span::before { content: ""; display: inline-block; width: 1.5mm; height: 1.5mm; background: #b8904a; transform: rotate(45deg); margin-inline-end: 2.2mm; vertical-align: .2em; }
  .vc-line > b { min-width: 0; font-weight: 800; color: #1a1610; border-bottom: .3mm dotted #b9a67a; padding: 0 1.6mm .7mm; line-height: 1.6; }
  .vc-line > b .n { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; font-weight: 900; color: #6b4e1d; }

  /* information bands: label over value, cells divided by hairlines */
  .vc-band { display: grid; grid-auto-columns: 1fr; grid-auto-flow: column; border: .3mm solid #d4c194; background: #fff; box-shadow: inset 0 0 0 1mm #fff, inset 0 0 0 1.25mm #ece1c4; margin: 0 0 4.5mm; break-inside: avoid; }
  .vc-band > div { padding: 2.6mm 3.4mm; text-align: center; }
  .vc-band > div + div { border-inline-start: .25mm solid #ece3cd; }
  .vc-band small { display: block; font-size: 7.8pt; color: #8a7c62; font-weight: 700; margin-bottom: .6mm; }
  .vc-band b { display: block; font-size: 10.4pt; font-weight: 800; color: #1a1610; }
  .vc-band b.num { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }
  .vc-band > div.tot { background: #15120c; box-shadow: inset 0 0 0 .8mm #15120c, inset 0 0 0 1mm #8a6a35; }
  .vc-band > div.tot small { color: #c9a464; }
  .vc-band > div.tot b { color: #f3dfae; font-size: 12pt; font-weight: 900; }
</style>`;

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
    referenceNumber: string | null;
    branch?: { name: string; nameEn?: string | null } | null;
    employee: {
      employeeNumber?: string | null;
      fullNameAr: string;
      fullNameEn: string | null;
      profession?: string | null;
      professionEn?: string | null;
      iqamaNumber?: string | null;
      sponsorName?: string | null;
    } | null;
    /** A payment shared by several establishments / employees: all of them. */
    branches?: { name: string; nameEn?: string | null; code?: string | null }[];
    employees?: { employeeNumber?: string | null; fullNameAr: string; fullNameEn: string | null; iqamaNumber?: string | null; profession?: string | null; professionEn?: string | null }[];
  },
  branding: Branding,
  // A domestic worker's payments are made by the sponsor, whose name the voucher carries.
  opts: { domestic?: boolean } = {}
) {
  const money = (v: unknown) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const total = Number(payment.total || 0);
  const cur = SAR;
  const emp = payment.employee;
  const domestic = !!(emp && opts.domestic);
  let hijri = "";
  try {
    hijri = new Date(payment.paymentDate).toLocaleDateString(isEn() ? "en-u-ca-islamic-umalqura" : "ar-SA-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Riyadh" });
  } catch {
    /* no Hijri calendar here */
  }
  const words = isEn() ? `${money(total)} Saudi riyals only` : riyalsInWords(total);
  const purpose = payment.description || paymentCategoryLabel(payment.category, payment.type);
  const est = payment.branch ? pick(payment.branch.name, payment.branch.nameEn) : "";
  const cell = (label: string, value: string, num = false) => `<div><small>${label}</small><b${num ? ' class="num"' : ""}>${value}</b></div>`;

  const manyBranches = (payment.branches?.length ?? 0) > 1 ? payment.branches! : null;
  const manyEmployees = (payment.employees?.length ?? 0) > 1 ? payment.employees! : null;
  const share = (n: number) => `${cur}${money(total / n)}`;
  // Several parties: a ruled list, each with its equal share of the amount.
  const partyList = manyEmployees
    ? `<div class="section-header"><span>${L(`الموظفون (${manyEmployees.length})`, `Employees (${manyEmployees.length})`)}</span><span>${L("المبلغ مقسم بالتساوي", "Shared equally")}</span></div>
    <table class="vc-list"><colgroup><col style="width:6%"><col style="width:35%"><col style="width:15%"><col style="width:17%"><col style="width:14%"><col style="width:13%"></colgroup><thead><tr><th>#</th><th>${L("الموظف", "Employee")}</th><th>${L("الرقم الوظيفي", "Employee no.")}</th><th>${L("رقم الإقامة", "Iqama no.")}</th><th>${L("المهنة", "Profession")}</th><th class="m">${L("الحصة", "Share")}</th></tr></thead>
    <tbody>${manyEmployees.map((e, i) => `<tr><td class="c">${i + 1}</td><td>${pick(e.fullNameAr, e.fullNameEn)}</td><td class="n">${escapeHtml(e.employeeNumber || "—")}</td><td class="n">${escapeHtml(e.iqamaNumber || "—")}</td><td>${e.profession || e.professionEn ? pick(e.profession, e.professionEn) : "—"}</td><td class="m">${share(manyEmployees.length)}</td></tr>`).join("")}</tbody></table>`
    : manyBranches
      ? `<div class="section-header"><span>${L(`المنشآت (${manyBranches.length})`, `Establishments (${manyBranches.length})`)}</span><span>${L("المبلغ مقسم بالتساوي", "Shared equally")}</span></div>
    <table class="vc-list"><colgroup><col style="width:6%"><col style="width:58%"><col style="width:18%"><col style="width:18%"></colgroup><thead><tr><th>#</th><th>${L("المنشأة", "Establishment")}</th><th>${L("الرمز", "Code")}</th><th class="m">${L("الحصة", "Share")}</th></tr></thead>
    <tbody>${manyBranches.map((b, i) => `<tr><td class="c">${i + 1}</td><td>${pick(b.name, b.nameEn)}</td><td class="n">${escapeHtml(b.code || "—")}</td><td class="m">${share(manyBranches.length)}</td></tr>`).join("")}</tbody></table>`
      : "";

  const person = manyEmployees || manyBranches
    ? partyList
    : emp
    ? `<div class="section-header"><span>${domestic ? L("بيانات العامل", "Worker") : L("بيانات الموظف", "Employee")}</span></div>
    <div class="vc-band">
      ${cell(domestic ? L("العامل", "Worker") : L("الموظف", "Employee"), pick(emp.fullNameAr, emp.fullNameEn))}
      ${domestic ? cell(L("رقم الإقامة", "Iqama no."), escapeHtml(emp.iqamaNumber || "—"), true) : cell(L("الرقم الوظيفي", "Employee no."), escapeHtml(emp.employeeNumber || "—"), true)}
      ${cell(L("المهنة", "Profession"), emp.profession || emp.professionEn ? pick(emp.profession, emp.professionEn) : "—")}
      ${!domestic && est ? cell(L("المنشأة", "Establishment"), est) : ""}
    </div>`
    : "";

  const body = `${VOUCHER_CSS}
    <div class="vc-top">
      <div class="vc-amt">
        <small>${L("المبلغ المدفوع · شامل ضريبة القيمة المضافة", "Amount paid · VAT included")}</small>
        <b><span>${cur}</span>${money(total)}</b>
        <em>${escapeHtml(words)}</em>
      </div>
      <div class="vc-meta">
        ${cell(L("رقم السند", "Voucher no."), escapeHtml(payment.paymentNumber), true)}
        ${cell(L("تاريخ السند", "Date"), fmtDate(payment.paymentDate), true)}
        ${cell(L("الموافق", "Hijri"), escapeHtml(hijri || "—"))}
        ${cell(L("طريقة الدفع", "Method"), `<span class="chip">${paymentMethodLabel(payment.method)}</span>`)}
        ${cell(L("بند الصرف", "Category"), paymentCategoryLabel(payment.category, payment.type))}
        ${cell(L("رقم المرجع / الفاتورة", "Reference"), escapeHtml(payment.referenceNumber || "—"), true)}
      </div>
    </div>

    <div class="vc-deed">
      <div class="vc-deed-t">${L("بيان الدفع", "Payment statement")}</div>
      ${domestic && emp?.sponsorName ? `<div class="vc-line"><span>${L("الكفيل", "Sponsor")}</span><b>${escapeHtml(emp.sponsorName)}</b></div>` : ""}
      <div class="vc-line"><span>${L("تم دفع مبلغ وقدره", "The sum of")}</span><b><span class="n">${cur}${money(total)}</span> — ${escapeHtml(words)}</b></div>
      <div class="vc-line"><span>${L("وذلك عن", "For")}</span><b>${escapeHtml(purpose)}</b></div>
      ${!emp && est && !manyBranches ? `<div class="vc-line"><span>${L("المنشأة", "Establishment")}</span><b>${est}</b></div>` : ""}
    </div>

    ${person}

    <div class="section-header"><span>${L("تفاصيل المبلغ", "Amount")}</span><span>${L("بالريال السعودي", "In Saudi riyals")}</span></div>
    <div class="vc-band">
      ${cell(L("المبلغ قبل الضريبة", "Before VAT"), `${cur}${money(payment.amount)}`, true)}
      ${cell(L("ضريبة القيمة المضافة", "VAT"), `${cur}${money(payment.vat)}`, true)}
      <div class="tot"><small>${L("الإجمالي المدفوع", "Total paid")}</small><b class="num">${cur}${money(total)}</b></div>
    </div>

    ${signatureBlock("voucher", branding)}
  `;

  return pdfDocumentShell({
    title: "سند صرف",
    titleEn: "Payment Voucher",
    dir: "rtl",
    companyNameAr: branding.company?.nameAr,
    companyNameEn: branding.company?.nameEn,
    logoDataUrl: branding.logoDataUrl,
    referenceNumber: payment.paymentNumber,
    classification: "سند صرف معتمد | Payment Voucher",
    theme: branding.printTheme,
    brandColor: branding.brandColor,
    highlight: { value: money(total), label: L("ريال سعودي", "Saudi riyals") },
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

  // A code, a number or a date stays on one line: a wide table otherwise splits them at a hyphen or a slash.
  const cell = (html: string) => {
    const text = html.replace(/<[^>]+>/g, "").trim();
    return `<td${/^[\w./:+#-]{1,24}$/.test(text) ? ' class="nowrap"' : ""}>${html}</td>`;
  };
  const rowHtml = rows.map(
    (row, idx) =>
      `<tr>
                    <td style="text-align:center; font-family:monospace; color:#64748b; font-size:8pt;">${idx + 1}</td>
                    ${columns.map((c) => cell(c.render(row))).join("")}
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

/* ---------- The employees report: each employee's documents, type by type ---------- */

/** `withIqama`: a domestic worker's insurance, which runs with the iqama. */
export interface EmployeeDocCell { number?: string | null; expiry?: Date | null; status?: string | null; kind?: string | null; withIqama?: boolean }
export interface EmployeeDocsRow {
  name: string;
  employeeNumber: string | null;
  /** The profession on the iqama. */
  profession: string | null;
  establishment: string;
  docs: Record<"iqama" | "healthCert" | "passport" | "insurance" | "visa", EmployeeDocCell>;
}
/** What the report shows of an establishment beside its name. */
export interface EstablishmentInfo { logo?: string | null; owner?: string | null; cr?: string | null; code?: string | null }

/** The five document types, in the order printed, with their names. */
export const EMPLOYEE_DOC_TYPES: { key: keyof EmployeeDocsRow["docs"]; ar: string; en: string }[] = [
  { key: "iqama", ar: "الإقامة", en: "Iqama" },
  { key: "healthCert", ar: "الشهادة الصحية", en: "Health certificate" },
  { key: "passport", ar: "جواز السفر", en: "Passport" },
  { key: "insurance", ar: "التأمين الطبي", en: "Medical insurance" },
  { key: "visa", ar: "التأشيرة", en: "Visa" },
];
const VISA_KINDS: Record<string, [string, string]> = { VISA: ["تأشيرة", "Visa"], EXIT_REENTRY_VISA: ["خروج وعودة", "Exit & re-entry"], FINAL_EXIT_VISA: ["خروج نهائي", "Final exit"] };
const DOC_STATE: Record<string, [string, string]> = { VALID: ["سارية", "Valid"], EXPIRING_SOON: ["قاربت", "Ending soon"], EXPIRED: ["منتهية", "Expired"] };
const recorded = (c: EmployeeDocCell) => Boolean(c.expiry || c.number || c.withIqama);
const initialsOf = (s: string) => s.replace(/^(مؤسسة|شركة|مطعم|مقهى|محل|أسواق)\s+/, "").trim().split(/\s+/).slice(0, 2).map((w) => w.replace(/^ال(?=..)/, "").charAt(0)).join("");

/* A report in chapters. The summary is one framed band of four figures and a
   table of each document type. Each establishment then opens with its own
   plate — its logo in a gold-framed tile (its monogram when it has none), its
   name, owner and register, and three figures — over an aligned ledger: the
   employee with the profession on the iqama, then the same five columns, each
   the end date and its state. Quiet lines, generous rows, nothing repeated. */
const EMP_DOCS_CSS = `<style>
  .ch-kpis { display: grid; grid-template-columns: repeat(4, 1fr); margin: 0 0 6mm; border: .3mm solid #d4c194; background: #fff; box-shadow: inset 0 0 0 1.1mm #fff, inset 0 0 0 1.35mm #ece1c4; break-inside: avoid; }
  .ch-kpis > div { text-align: center; padding: 4.2mm 2mm 3.6mm; }
  .ch-kpis > div + div { border-inline-start: .25mm solid #e6dabd; }
  .ch-kpis b { display: block; font-size: 22pt; font-weight: 900; line-height: 1.05; color: var(--c); font-variant-numeric: tabular-nums; }
  .ch-kpis span { display: block; margin-top: 1.2mm; font-size: 8.6pt; letter-spacing: .02em; color: #5e5240; font-weight: 700; }

  table.ch-mx { width: 100%; border-collapse: collapse; margin: 0 0 8mm; break-inside: avoid; }
  table.ch-mx thead th { padding: 2.1mm 2.4mm !important; font-size: 8.4pt !important; text-align: center !important; white-space: nowrap; }
  table.ch-mx thead th:first-child { text-align: start !important; }
  .ch-mx td { padding: 2.2mm 2.4mm !important; font-size: 9.4pt !important; text-align: center; border-bottom: .2mm solid #ece3cd !important; font-variant-numeric: tabular-nums; }
  .ch-mx td:first-child { text-align: start; font-weight: 800; color: #1a1610; }
  .ch-mx .r { color: #a8281b; font-weight: 800; } .ch-mx .a { color: #9a5b00; font-weight: 800; } .ch-mx .g { color: #1d6b40; font-weight: 800; } .ch-mx .n { color: #a89a80; }
  .ch-mx .pc { font-weight: 900; color: #1a1610; direction: ltr; unicode-bidi: isolate; }
  .ch-bar { display: flex; height: 2mm; border-radius: 2mm; overflow: hidden; background: #efe8d8; }
  .ch-bar i { display: block; height: 100%; } .ch-bar .bg { background: #2f8a57; } .ch-bar .ba { background: #c48a1a; } .ch-bar .br { background: #b8402f; }

  .ch-plate { display: flex; align-items: center; gap: 4mm; margin: 8mm 0 0; padding: 3.4mm 4mm; background: #fff; border: .3mm solid #d4c194; border-bottom: 0; border-top: 1mm solid #9a7433; break-after: avoid; box-shadow: inset 0 0 0 1mm #fff, inset 0 0 0 1.25mm #ece1c4; }
  .ch-logo { width: 16mm; height: 16mm; flex: none; display: flex; align-items: center; justify-content: center; background: #fff; border: .35mm solid #c9a464; box-shadow: 0 0 0 .8mm #fff, 0 0 0 1.05mm #e2d3ad; border-radius: 1.4mm; overflow: hidden; }
  .ch-logo img { width: 100%; height: 100%; object-fit: contain; padding: 1.2mm; }
  .ch-logo.mono { background: #1a1610; color: #f3dfae; font-size: 12pt; font-weight: 900; }
  .ch-id { flex: 1; min-width: 0; }
  .ch-id > b { display: block; font-size: 13pt; font-weight: 800 !important; color: #1a1610 !important; line-height: 1.3; font-family: inherit; }
  .ch-id small { display: block; font-size: 8pt; color: #7a6c55; margin-top: .6mm; }
  .ch-id small em { font-style: normal; color: #5e4418; font-weight: 700; direction: ltr; unicode-bidi: isolate; }
  .ch-fig { display: flex; flex: none; }
  .ch-fig > span { min-width: 18mm; padding: 0 3mm; text-align: center; }
  .ch-fig > span + span { border-inline-start: .25mm solid #e6dabd; }
  .ch-fig b { display: block; font-size: 13pt; font-weight: 900; line-height: 1.15; color: var(--c, #1a1610); font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate; }
  .ch-fig small { display: block; font-size: 7.4pt; color: #7a6c55; font-weight: 700; white-space: nowrap; }

  table.ch-g { width: 100%; border-collapse: collapse; table-layout: fixed; border: .3mm solid #d4c194; }
  .ch-g thead { display: table-header-group; }
  .ch-g tr { break-inside: avoid; page-break-inside: avoid; }
  table.ch-g thead th { padding: 1.9mm 1mm !important; font-size: 7.9pt !important; text-align: center !important; white-space: nowrap; }
  table.ch-g thead th.who { text-align: start !important; width: 34%; padding-inline-start: 4mm !important; }
  .ch-g td { padding: 2.4mm 1.2mm !important; vertical-align: middle; border-bottom: .2mm solid #eee5cf !important; background: transparent !important; }
  .ch-g tbody tr:nth-child(even) td { background: rgba(248, 243, 232, .7) !important; }
  .ch-g tbody tr:last-child td { border-bottom: 0 !important; }
  .ch-g td.who { padding-inline-start: 4mm !important; }
  .ch-who { display: flex; align-items: baseline; gap: 2.4mm; min-width: 0; }
  .ch-who .n { flex: none; width: 5mm; font-size: 8pt; font-weight: 800; color: #b39a68; text-align: center; font-variant-numeric: tabular-nums; }
  .ch-who > span:last-child { min-width: 0; }
  .ch-who b { display: block; font-size: 9.6pt; font-weight: 800; line-height: 1.32; color: #1a1610; }
  .ch-who i { display: block; font-style: normal; font-size: 8pt; line-height: 1.4; color: #8a7c62; }
  .ch-who i em { font-style: normal; color: #8a6420; font-weight: 800; }
  .ch-c { text-align: center; line-height: 1.35; }
  .ch-c .d { display: block; font-size: 9.4pt; font-weight: 800; color: #1a1610; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .ch-c .s { display: inline-flex; align-items: center; gap: 1mm; font-size: 7.6pt; font-weight: 800; color: var(--c); white-space: nowrap; }
  .ch-c .s::before { content: ""; width: 1.7mm; height: 1.7mm; border-radius: 50%; background: var(--c); }
  .ch-c .k { display: block; font-size: 6.9pt; color: #9a8d72; }
  .ch-c.EXPIRED { --c: #a8281b; } .ch-c.EXPIRING_SOON { --c: #a76400; } .ch-c.VALID { --c: #1d6b40; }
  .ch-c.none .d { color: #d3c8b0; font-weight: 600; }
  .ch-legend { display: flex; flex-wrap: wrap; gap: 6mm; justify-content: center; margin: 6mm 0 0; font-size: 8pt; color: #5e5240; }
  .ch-legend span { display: inline-flex; align-items: center; gap: 1.4mm; }
  .ch-legend i { width: 2.2mm; height: 2.2mm; border-radius: 50%; }
</style>`;

function docCell(t: (typeof EMPLOYEE_DOC_TYPES)[number], c: EmployeeDocCell) {
  if (!recorded(c)) return `<div class="ch-c none"><span class="d">—</span></div>`;
  const st = c.status && DOC_STATE[c.status] ? c.status : "";
  const note = c.withIqama ? L("مع الإقامة", "With the iqama") : t.key === "visa" && c.kind && VISA_KINDS[c.kind] ? L(VISA_KINDS[c.kind][0], VISA_KINDS[c.kind][1]) : "";
  return `<div class="ch-c ${st}"><span class="d">${fmtDate(c.expiry)}</span>${st ? `<span class="s">${L(DOC_STATE[st][0], DOC_STATE[st][1])}</span>` : ""}${note ? `<span class="k">${note}</span>` : ""}</div>`;
}

export function employeesDocumentsReportPdf(rows: EmployeeDocsRow[], branding: Branding, establishments: Map<string, EstablishmentInfo> = new Map()) {
  const esc = (v: unknown) => escapeHtml(v ?? "—");
  const count = { recorded: 0, EXPIRED: 0, EXPIRING_SOON: 0 };
  const perType = EMPLOYEE_DOC_TYPES.map((t) => {
    const n = { EXPIRED: 0, EXPIRING_SOON: 0, VALID: 0, none: 0 };
    for (const r of rows) {
      const c = r.docs[t.key];
      if (!recorded(c)) n.none++;
      else if (c.status === "EXPIRED") n.EXPIRED++;
      else if (c.status === "EXPIRING_SOON") n.EXPIRING_SOON++;
      else n.VALID++;
    }
    count.recorded += rows.length - n.none;
    count.EXPIRED += n.EXPIRED;
    count.EXPIRING_SOON += n.EXPIRING_SOON;
    return { t, n };
  });
  const k = (c: string, v: number, ar: string, en: string) => `<div style="--c:${c}"><b>${v}</b><span>${L(ar, en)}</span></div>`;
  const kpis = `<div class="ch-kpis">${k("#9a7433", rows.length, "موظف", "Employees")}${k("#1a1610", count.recorded, "وثيقة مسجلة", "Recorded documents")}${k("#a8281b", count.EXPIRED, "وثيقة منتهية", "Expired")}${k("#a76400", count.EXPIRING_SOON, "قاربت على الانتهاء", "Ending soon")}</div>`;
  const pc = (v: number, of: number) => (of ? (v / of) * 100 : 0);
  const matrix = `<div class="section-header"><span>${L("ملخص الوثائق", "Documents at a glance")}</span><span>${L("حسب نوع الوثيقة", "By document type")}</span></div>
    <table class="ch-mx"><thead><tr><th>${L("الوثيقة", "Document")}</th><th>${L("منتهية", "Expired")}</th><th>${L("قاربت", "Ending soon")}</th><th>${L("سارية", "Valid")}</th><th>${L("غير مسجلة", "Not recorded")}</th><th>${L("نسبة السارية", "Valid share")}</th><th style="width:24%">${L("التوزيع", "Split")}</th></tr></thead><tbody>
    ${perType
      .map(({ t, n }) => {
        const rec = n.EXPIRED + n.EXPIRING_SOON + n.VALID;
        return `<tr><td>${L(t.ar, t.en)}</td><td class="r">${n.EXPIRED}</td><td class="a">${n.EXPIRING_SOON}</td><td class="g">${n.VALID}</td><td class="n">${n.none}</td><td class="pc">${rec ? Math.round(pc(n.VALID, rec)) + "%" : "—"}</td><td><div class="ch-bar">${rec ? `<i class="bg" style="width:${pc(n.VALID, rec)}%"></i><i class="ba" style="width:${pc(n.EXPIRING_SOON, rec)}%"></i><i class="br" style="width:${pc(n.EXPIRED, rec)}%"></i>` : ""}</div></td></tr>`;
      })
      .join("")}</tbody></table>`;
  const groups = new Map<string, EmployeeDocsRow[]>();
  for (const r of rows) groups.set(r.establishment, [...(groups.get(r.establishment) ?? []), r]);
  const head = `<thead><tr><th class="who">${L("الموظف · المهنة", "Employee · profession")}</th>${EMPLOYEE_DOC_TYPES.map((t) => `<th>${L(t.ar, t.en)}</th>`).join("")}</tr></thead>`;
  let i = 0;
  const sections = [...groups.entries()]
    .map(([est, list]) => {
      let rec = 0, ok = 0, bad = 0;
      for (const r of list) for (const t of EMPLOYEE_DOC_TYPES) { const c = r.docs[t.key]; if (recorded(c)) { rec++; if (c.status === "VALID") ok++; if (c.status === "EXPIRED") bad++; } }
      const info = establishments.get(est) ?? {};
      const logo = info.logo ? `<span class="ch-logo"><img src="${info.logo}" alt="" /></span>` : `<span class="ch-logo mono">${esc(initialsOf(est))}</span>`;
      const meta = [info.owner ? `${L("المالك", "Owner")}: <em>${esc(info.owner)}</em>` : "", info.cr ? `${L("السجل التجاري", "CR")}: <em>${esc(info.cr)}</em>` : "", info.code ? `<em>${esc(info.code)}</em>` : ""].filter(Boolean).join(" · ");
      const body = list
        .map((r) => {
          const sub = [r.profession ? `<em>${esc(r.profession)}</em>` : "", r.employeeNumber ? esc(r.employeeNumber) : ""].filter(Boolean).join(" · ");
          return `<tr><td class="who"><div class="ch-who"><span class="n">${++i}</span><span><b>${esc(r.name)}</b>${sub ? `<i>${sub}</i>` : ""}</span></div></td>${EMPLOYEE_DOC_TYPES.map((t) => `<td>${docCell(t, r.docs[t.key])}</td>`).join("")}</tr>`;
        })
        .join("");
      return `<div class="ch-plate">${logo}<div class="ch-id"><b>${esc(est)}</b>${meta ? `<small>${meta}</small>` : ""}</div><div class="ch-fig"><span><b>${list.length}</b><small>${L("موظف", "staff")}</small></span><span style="--c:#1d6b40"><b>${rec ? Math.round((ok / rec) * 100) : 0}%</b><small>${L("وثائق سارية", "valid")}</small></span><span style="--c:${bad ? "#a8281b" : "#1d6b40"}"><b>${bad}</b><small>${L("منتهية", "expired")}</small></span></div></div><table class="ch-g">${head}<tbody>${body}</tbody></table>`;
    })
    .join("");
  const legend = `<div class="ch-legend"><span><i style="background:#2f8a57"></i>${L("سارية", "Valid")}</span><span><i style="background:#c48a1a"></i>${L("قاربت على الانتهاء (خلال ٣٠ يوم)", "Ending within 30 days")}</span><span><i style="background:#b8402f"></i>${L("منتهية", "Expired")}</span><span>— ${L("غير مسجلة", "Not recorded")}</span></div>`;
  const content = rows.length
    ? `${EMP_DOCS_CSS}${kpis}${matrix}${sections}${legend}
    <div class="report-summary-bar"><span>${L("✓ نهاية التقرير", "✓ End of report")}</span><span class="summary-kpi">${L(`إجمالي الموظفين: ${rows.length}`, `Employees: ${rows.length}`)}</span></div>
    ${signatureBlock("report", branding)}`
    : `<div class="empty-state-card"><div class="empty-state-title">${L("لا يوجد موظفون مطابقون لهذا التقرير", "No employees match this report")}</div></div>`;
  return pdfDocumentShell({
    title: "تقرير الموظفين ووثائقهم",
    titleEn: "Employees and their documents",
    dir: "rtl",
    companyNameAr: branding.company?.nameAr,
    companyNameEn: branding.company?.nameEn,
    logoDataUrl: branding.logoDataUrl,
    classification: "تقرير تنفيذي رسمي معتمد | Official Executive Report",
    theme: branding.printTheme,
    brandColor: branding.brandColor,
    highlight: { value: String(rows.length).padStart(2, "0"), label: L("موظف في التقرير", "employees") },
    bodyHtml: content,
  });
}

/* ---------- Payment vouchers report: totals, a split by category and method, the ledger ---------- */

export interface PaymentReportRow {
  paymentNumber: string;
  paymentDate: Date;
  category: string;
  type?: string | null;
  method: string;
  description?: string | null;
  branch: string | null;
  branchEn: string | null;
  employee: string | null;
  employeeEn: string | null;
  amount: number;
  vat: number;
  total: number;
}

/** A ring of small gold petals and beads around the crest's medallion (solid fills: PDF-safe). */
const PR_CREST_RING = (() => {
  const c = 50, parts: string[] = [];
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2, r1 = 41, r2 = 47.5, w = 0.055;
    const p = (r: number, t: number) => `${(c + r * Math.cos(t)).toFixed(2)},${(c + r * Math.sin(t)).toFixed(2)}`;
    if (k % 2 === 0) parts.push(`<polygon points="${p(r1, a)} ${p((r1 + r2) / 2, a - w)} ${p(r2, a)} ${p((r1 + r2) / 2, a + w)}" fill="#b8904a"/>`);
    else parts.push(`<circle cx="${(c + 44.2 * Math.cos(a)).toFixed(2)}" cy="${(c + 44.2 * Math.sin(a)).toFixed(2)}" r=".9" fill="#c9a464"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49.3" fill="none" stroke="#b8904a" stroke-width=".5"/><circle cx="50" cy="50" r="39.6" fill="none" stroke="#b8904a" stroke-width=".5"/>${parts.join("")}</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();

/** The first letters of a name's first two words, for an establishment with no logo. */
function monogram(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w.replace(/^ال/, "").charAt(0)).join(" ");
}

const PAY_REP_CSS = `<style>
  /* the watermark: the establishment's logo, faint, in the middle of every page */
  .pr-wm { position: fixed; left: 50%; top: 53%; width: 118mm; height: 118mm; transform: translate(-50%, -50%); z-index: -1; pointer-events: none; display: grid; place-items: center; }
  .pr-wm img { max-width: 100%; max-height: 100%; object-fit: contain; opacity: .065; filter: grayscale(1) sepia(.7); }

  /* a centred ornament: gold rules ending in diamonds, a title between them */
  .pr-orn { display: flex; align-items: center; gap: 3mm; margin: 0 0 3mm; break-after: avoid; }
  .pr-orn::before, .pr-orn::after { content: ""; flex: 1; height: .3mm; background: #c9a464; }
  .pr-orn > i { flex: none; width: 1.8mm; height: 1.8mm; background: #b8904a; transform: rotate(45deg); }
  .pr-orn > b { flex: none; font-size: 10.6pt; font-weight: 900; color: #5e4418; letter-spacing: .02em; padding: 0 1mm; }
  .pr-orn > b span { font-size: 7.6pt; font-weight: 700; color: #9a7433; padding-inline-start: 2mm; }

  /* the establishment's registrations, centred between gold rules */
  .pr-idf { display: flex; justify-content: center; align-items: center; flex-wrap: nowrap; gap: 0; padding: 2.4mm 0; margin: 0 0 5mm; border-top: .3mm solid #d9c69a; border-bottom: .3mm solid #d9c69a; font-size: 8.4pt; break-inside: avoid; }
  .pr-idf > div { white-space: nowrap; padding: 0 2.8mm; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .pr-idf > i { flex: none; width: 1.5mm; height: 1.5mm; background: #b8904a; transform: rotate(45deg); }
  .pr-idf span { color: #8a7c62; font-weight: 700; padding-inline-end: 1.6mm; }
  .pr-idf b { color: #1a1610; font-weight: 800; }
  .pr-idf b.n { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }
  /* the crest: the establishment's medallion, its name and its registrations, centred */
  .pr-crest { display: flex; justify-content: center; align-items: center; gap: 6mm; margin: 0 0 3mm; break-inside: avoid; }
  .pr-crest > div:last-child { text-align: start; }
  .pr-medal { flex: none; position: relative; width: 28mm; height: 28mm; margin: 0; display: grid; place-items: center; background: ${PR_CREST_RING} center / 100% 100% no-repeat; }
  .pr-medal > div { width: 21mm; height: 21mm; border-radius: 50%; display: grid; place-items: center; overflow: hidden; background: #fff; box-shadow: 0 0 0 .5mm #fff, 0 0 0 .85mm #b8904a; }
  .pr-medal img { width: 78%; height: 78%; object-fit: contain; }
  .pr-medal span { width: 100%; height: 100%; display: grid; place-items: center; background: #fbf6ea; color: #6b4e1d; font-size: 17pt; font-weight: 900; }
  .pr-crest small { display: block; font-size: 8pt; font-weight: 800; color: #9a7433; letter-spacing: .12em; }
  .pr-crest h2 { margin: .6mm 0 1.8mm; font-size: 17pt; font-weight: 900; color: #1a1610; line-height: 1.3; }
  .pr-facts { display: flex; flex-wrap: wrap; justify-content: flex-start; align-items: center; gap: 1mm 0; font-size: 8.6pt; }
  .pr-facts > div { white-space: nowrap; padding: 0 3.4mm; }
  .pr-facts > div:first-child { padding-inline-start: 0; }
  .pr-facts > div + div { border-inline-start: .3mm solid #d4c194; }
  .pr-facts span { color: #8a7c62; font-weight: 700; padding-inline-end: 1.4mm; }
  .pr-facts b { color: #1a1610; font-weight: 800; }
  .pr-facts b.n { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }
  .pr-by { margin-top: 1.4mm; font-size: 7.8pt; color: #8a7c62; font-weight: 700; }
  .pr-by b { color: #5e4418; font-weight: 800; padding-inline-start: 1mm; }

  /* the total, in a framed cartouche with its ribbon on the top rule */
  .pr-cart { position: relative; display: grid; grid-template-columns: 1fr 1.5fr 1fr; align-items: center; margin: 5mm 0 2mm; padding: 6mm 4mm 3.6mm; background: #fffdf8; border: .4mm solid #b8904a; box-shadow: inset 0 0 0 1.2mm #fffdf8, inset 0 0 0 1.45mm #d9c69a, inset 0 0 0 2.4mm #fffdf8, inset 0 0 0 2.55mm #ece1c4; break-inside: avoid; }
  .pr-cart > i { position: absolute; width: 4.6mm; height: 4.6mm; background: #fffdf8; border: .4mm solid #b8904a; transform: rotate(45deg); }
  .pr-cart > i.a { top: -2.3mm; right: -2.3mm; } .pr-cart > i.b { top: -2.3mm; left: -2.3mm; } .pr-cart > i.c { bottom: -2.3mm; right: -2.3mm; } .pr-cart > i.d { bottom: -2.3mm; left: -2.3mm; }
  .pr-cart > i::after { content: ""; position: absolute; inset: .9mm; background: #b8904a; }
  .pr-rib { position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%); white-space: nowrap; background: #fffdf8; padding: 0 4mm; font-size: 8.6pt; font-weight: 900; color: #9a7433; letter-spacing: .06em; }
  .pr-cart .side { text-align: center; }
  .pr-cart .side small { display: block; font-size: 7.8pt; color: #8a7c62; font-weight: 700; }
  .pr-cart .side b { display: block; font-size: 12pt; font-weight: 900; color: #5e4418; direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; margin-top: .6mm; }
  .pr-cart .side b span { font-size: 10pt; color: #a8925f; }
  .pr-cart .mid { text-align: center; padding: 0 4mm; border-inline: .3mm solid #e6dcc4; }
  .pr-cart .mid b { display: block; font-size: 26pt; font-weight: 900; color: #5e4418; line-height: 1.1; direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }
  .pr-cart .mid b span { font-size: 17pt; color: #9a7433; }
  .pr-cart .mid b.txt span { font-size: 10pt; font-weight: 700; padding-inline-start: 1.6mm; }
  .pr-cart .side b.txt span { font-size: 7.4pt; padding-inline-start: 1mm; }
  .pr-cart .mid em { display: block; font-style: normal; font-size: 8.6pt; font-weight: 700; color: #6b5a3e; margin-top: 1.2mm; line-height: 1.5; }
  .pr-strip { display: flex; justify-content: center; align-items: center; gap: 0; margin: 0 0 5mm; font-size: 8.4pt; font-weight: 700; color: #8a7c62; }
  .pr-strip > div { padding: 0 4mm; white-space: nowrap; display: inline-flex; gap: 1.8mm; align-items: baseline; }
  .pr-strip > div + div { border-inline-start: .3mm solid #d4c194; }
  .pr-strip b { color: #1a1610; font-weight: 900; }
  .pr-strip b.n { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }

  /* where the money went: one ruled summary table by category, the methods on a line under it */
  table.pr-sumt thead, table.pr-sumt thead tr, table.pr-led thead, table.pr-led thead tr { border: 0 !important; box-shadow: none !important; background: none !important; }
  table.pr-sumt th, table.pr-led thead th { box-shadow: none !important; }
  table.pr-sumt { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 2.4mm; }
  .pr-sumt th { background: transparent !important; color: #8a7c62 !important; font-size: 7.6pt !important; font-weight: 800; padding: 0 2mm 1.6mm !important; text-align: start; border: 0 !important; border-bottom: .35mm solid #b8904a !important; white-space: nowrap; }
  .pr-sumt th.c, .pr-sumt td.c { text-align: center; }
  .pr-sumt th.m, .pr-sumt td.m { text-align: end; }
  .pr-sumt td { padding: 1.7mm 2mm !important; font-size: 9pt !important; border: 0 !important; border-bottom: .2mm solid #efe7d4 !important; vertical-align: middle; background: transparent !important; color: #1a1610; }
  .pr-sumt td.k i { display: inline-grid; place-items: center; width: 5.6mm; height: 5.6mm; border-radius: 50%; font-style: normal; font-size: 7.4pt; font-weight: 900; color: #6b4e1d; background: #fbf6ea; box-shadow: 0 0 0 .3mm #b8904a, 0 0 0 .6mm #fff, 0 0 0 .8mm #d9c69a; }
  .pr-sumt td.l { font-weight: 800; }
  .pr-sumt td.c { font-weight: 800; color: #5e4418; }
  .pr-sumt td.bar { padding-inline-end: 4mm !important; }
  .pr-sumt td.bar > div { display: flex; align-items: center; gap: 2mm; }
  .pr-sumt td.bar u { flex: 1; display: block; height: 1.3mm; background: #f1e9d6; text-decoration: none; border-radius: 1mm; overflow: hidden; }
  .pr-sumt td.bar u s { display: block; height: 100%; background: #b8904a; text-decoration: none; }
  .pr-sumt td.bar b { flex: none; width: 9mm; text-align: end; font-size: 8pt; font-weight: 900; color: #9a7433; direction: ltr; unicode-bidi: isolate; }
  .pr-sumt td.m { font-weight: 900; color: #5e4418; direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .pr-meth { display: flex; flex-wrap: wrap; align-items: center; gap: 1.6mm 0; margin: 0 0 6mm; font-size: 8.6pt; break-inside: avoid; }
  .pr-meth > b { font-weight: 900; color: #5e4418; padding-inline-end: 3mm; }
  .pr-meth > span { padding: 0 3mm; font-weight: 800; color: #1a1610; white-space: nowrap; }
  .pr-meth > span + span { border-inline-start: .3mm solid #d4c194; }
  .pr-meth em { font-style: normal; color: #8a7c62; font-weight: 700; padding-inline-start: 1.4mm; }

  /* the ledger: gold-ruled, months as small ribbons, the total between double rules */
  table.pr-led { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .pr-led thead th { background: #fbf6ea !important; color: #6b4e1d !important; font-size: 7.9pt !important; font-weight: 900; padding: 2.2mm 2mm !important; text-align: start; border: 0 !important; border-top: 1mm double #b8904a !important; border-bottom: .3mm solid #b8904a !important; white-space: nowrap; }
  .pr-led thead th.m { text-align: left; }
  .pr-led td { padding: 1.6mm 2mm !important; font-size: 8.8pt !important; border: 0 !important; border-bottom: .2mm solid #efe7d4 !important; vertical-align: middle; color: #1a1610; background: transparent !important; }
  .pr-led tbody tr:nth-child(odd):not(.mo) td { background: #fffdf8 !important; }
  .pr-led tr { break-inside: avoid; }
  .pr-led tr.mo td { padding: 2.4mm 2mm 1.2mm !important; border-bottom: .3mm solid #d9c69a !important; font-size: 8.8pt !important; font-weight: 900; color: #9a7433; background: transparent !important; }
  .pr-led tr.mo td small { display: inline; font-size: 7.4pt; color: #a8925f; font-weight: 700; padding-inline-start: 2mm; margin: 0; }
  .pr-led tr.mo td .dm { display: inline-block; width: 1.5mm; height: 1.5mm; background: #b8904a; transform: rotate(45deg); margin-inline-end: 2mm; vertical-align: .2em; }
  .pr-led tr.mo td.m { color: #a8925f; font-weight: 800; font-size: 8pt !important; }
  .pr-led td.i { text-align: center; color: #b8904a; font-weight: 900; font-size: 8pt !important; }
  .pr-led td b { display: block; font-weight: 800; overflow: hidden; text-overflow: ellipsis; }
  .pr-led td small { display: block; font-size: 7.4pt; color: #8a7c62; font-weight: 600; margin-top: .4mm; line-height: 1.45; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .pr-led td small.one { display: block; white-space: nowrap; -webkit-line-clamp: unset; }
  .pr-led td b { line-height: 1.4; }
  .pr-led tr.mo td.sub { text-align: end; color: #a8925f; font-weight: 700; font-size: 7.6pt !important; }
  .pr-led .no { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .pr-led td.m { text-align: left; direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 700; }
  .pr-led td.t { font-weight: 900; color: #5e4418; }
  .pr-led td.m, .pr-led tfoot td { line-height: 1.4; vertical-align: middle; }
  .pr-led td.z { color: #c2b69c; }
  .pr-led td .self { color: #8a7c62; font-weight: 700; }
  .pr-led tfoot { display: table-row-group; }
  .pr-led tfoot td { padding: 2.6mm 2mm !important; font-size: 9.8pt !important; font-weight: 900; color: #5e4418; background: #fbf6ea !important; border: 0 !important; border-top: .4mm solid #b8904a !important; border-bottom: 1.2mm double #b8904a !important; }
  .pr-led tfoot td.t { font-size: 9.8pt !important; }
  .pr-led tr.mo td .mo-in { display: flex; justify-content: space-between; align-items: baseline; }
  .pr-led tr.mo td .mo-in > span:last-child { white-space: nowrap; color: #8a7c62; font-size: 7.8pt; font-weight: 700; }
  .pr-led tr.mo td .mo-in > span:last-child b { display: inline !important; color: #5e4418; font-size: 8.8pt; font-weight: 900; direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; margin-right: 2mm; }
  table.pr-led ~ .signature-matrix { margin-top: 3.5mm !important; }
  table.pr-led ~ .signature-matrix .sig-card-header { padding: 1.4mm 1mm !important; }
  table.pr-led ~ .signature-matrix .sig-card-body { padding: 2.2mm 3mm !important; }
  table.pr-led ~ .signature-matrix .sig-row { height: 8.6mm !important; margin-bottom: .8mm !important; }
  table.pr-led ~ .signature-matrix .stamp-img { width: 26mm; height: 26mm; }
</style>`;

/** The establishment a statement is for: its name, logo and registrations head the pages, its logo is the watermark. */
export interface PaymentStatementEstablishment { name: string; nameEn?: string | null; logo?: string | null; owner?: string | null; cr?: string | null; vat?: string | null; code?: string | null }

export function paymentsReportPdf(rows: PaymentReportRow[], branding: Branding, est?: PaymentStatementEstablishment) {
  const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cur = SAR;
  const withCur = (v: string, wrap = true) => `${wrap ? `<span>${cur}</span>` : cur}${v}`;
  const sum = (list: PaymentReportRow[], k: "amount" | "vat" | "total") => list.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const amount = sum(rows, "amount"), vat = sum(rows, "vat"), total = sum(rows, "total");
  const name = (ar: string | null, en: string | null) => escapeHtml((isEn() ? en || ar : ar || en) || "");
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);

  // The period the vouchers cover, oldest to newest.
  const times = rows.map((r) => new Date(r.paymentDate).getTime()).filter((t) => !Number.isNaN(t));
  const period = times.length ? `${fmtDate(new Date(Math.min(...times)))} — ${fmtDate(new Date(Math.max(...times)))}` : "—";

  // Totals per key, largest first; past `keep` the rest fold into "other".
  const group = (key: (r: PaymentReportRow) => string, label: (k: string) => string, keep: number) => {
    const m = new Map<string, { n: number; v: number }>();
    for (const r of rows) {
      const e = m.get(key(r)) ?? { n: 0, v: 0 };
      e.n++;
      e.v += Number(r.total) || 0;
      m.set(key(r), e);
    }
    let list = [...m.entries()].map(([k, e]) => ({ label: label(k), ...e })).sort((a, b) => b.v - a.v);
    if (list.length > keep) {
      const rest = list.slice(keep - 1);
      list = [...list.slice(0, keep - 1), { label: L("بنود أخرى", "Other"), n: rest.reduce((s, e) => s + e.n, 0), v: rest.reduce((s, e) => s + e.v, 0) }];
    }
    return list;
  };
  // The amounts are summed once, by category; the methods line only counts the vouchers.
  const catRows = (list: ReturnType<typeof group>) =>
    list
      .map((e, i) => `<tr><td class="k c"><i>${i + 1}</i></td><td class="l">${e.label}</td><td class="c">${e.n}</td><td class="bar"><div><u><s style="width:${Math.max(3, pct(e.v))}%;${isEn() ? "" : "margin-left:auto"}"></s></u><b>${pct(e.v)}%</b></div></td><td class="m">${money(e.v)}</td></tr>`)
      .join("");
  const methodLine = (list: ReturnType<typeof group>) =>
    [...list].sort((x, y) => y.n - x.n).map((e) => `<span>${e.label}<em><bdi>${L(`${e.n} سند`, `${e.n} vouchers`)}</bdi> · <bdi dir="ltr">${rows.length ? Math.round((e.n / rows.length) * 100) : 0}%</bdi></em></span>`).join("");
  const cats = group((r) => `${r.category}|${r.type ?? ""}`, (k) => { const [c, t] = k.split("|"); return paymentCategoryLabel(c, t || null); }, 6);
  const methods = group((r) => r.method, (k) => paymentMethodLabel(k), 4);
  const estCount = new Set(rows.map((r) => r.branch ?? "")).size;
  const orn = (title: string, note = "") => `<div class="pr-orn"><i></i><b>${title}${note ? `<span>${note}</span>` : ""}</b><i></i></div>`;

  // The crest: the establishment (or, for the whole report, the company).
  const fact = (label: string, value?: string | null, num = false) => (value ? `<div><span>${label}</span><b${num ? ' class="n"' : ""}>${escapeHtml(value)}</b></div>` : "");
  // The establishment's registrations, on one ruled line under the title (its name and logo are in the page header).
  const crest = est
    ? `<div class="pr-idf">
        ${[fact(L("السجل التجاري", "CR no."), est.cr, true), fact(L("الرقم الضريبي", "VAT no."), est.vat, true), fact(L("المالك", "Owner"), est.owner), fact(L("الرمز", "Code"), est.code, true)].filter(Boolean).join("<i></i>")}
      </div>`
    : "";

  // The ledger, a chapter per month (newest first) with its subtotal; a short month stays on one page.
  const monthKey = (d: Date) => `${new Date(d).getFullYear()}-${String(new Date(d).getMonth() + 1).padStart(2, "0")}`;
  const monthName = (d: Date) => new Date(d).toLocaleDateString(isEn() ? "en-GB" : "ar-EG-u-nu-latn", { month: "long", year: "numeric", timeZone: "Asia/Riyadh" });
  const months: { label: string; rows: PaymentReportRow[] }[] = [];
  for (const r of rows) {
    const last = months[months.length - 1];
    if (last && monthKey(last.rows[0].paymentDate) === monthKey(r.paymentDate)) last.rows.push(r);
    else months.push({ label: monthName(r.paymentDate), rows: [r] });
  }
  let n = 0;
  const ledger = months
    .map((m) => {
      const head = `<tr class="mo"><td colspan="7"><div class="mo-in"><span><span class="dm"></span><bdi>${escapeHtml(m.label)}</bdi><small><bdi>${L(`${m.rows.length} سند`, `${m.rows.length} vouchers`)}</bdi></small></span><span>${L("مجموع الشهر", "Month total")}<b>${money(sum(m.rows, "total"))}</b></span></div></td></tr>`;
      const body = m.rows
        .map((r) => {
          const place = name(r.branch, r.branchEn);
          const person = name(r.employee, r.employeeEn);
          const payee = est ? person || `<span class="self">${L("المنشأة نفسها", "The establishment")}</span>` : place || person || "—";
          const z = (v: number) => (Number(v) ? "" : " z");
          return `<tr>
        <td class="i">${++n}</td>
        <td><b class="no">${escapeHtml(r.paymentNumber)}</b><small class="one"><span class="no">${fmtDate(r.paymentDate)}</span></small><small class="one">${paymentMethodLabel(r.method)}</small></td>
        <td><b>${paymentCategoryLabel(r.category, r.type ?? null)}</b>${r.description ? `<small>${escapeHtml(r.description)}</small>` : ""}</td>
        <td><b>${payee}</b>${!est && place && person ? `<small class="one">${person}</small>` : ""}</td>
        <td class="m${z(r.amount)}">${money(Number(r.amount))}</td>
        <td class="m${z(r.vat)}">${money(Number(r.vat))}</td>
        <td class="m t">${money(Number(r.total))}</td>
      </tr>`;
        })
        .join("");
      return `<tbody${m.rows.length <= 8 ? ' style="break-inside:avoid"' : ""}>${head}${body}</tbody>`;
    })
    .join("");

  // The watermark: the establishment's logo on its statement, the company's (from the settings) on the whole report.
  const wmLogo = est ? est.logo : branding.logoDataUrl;
  const watermark = wmLogo ? `<style>.pr-wm { position: fixed; left: 50%; top: 53%; width: 118mm; height: 118mm; transform: translate(-50%, -50%); z-index: -1; pointer-events: none; display: grid; place-items: center; } .pr-wm img { max-width: 100%; max-height: 100%; object-fit: contain; opacity: .065; filter: grayscale(1) sepia(.7); }</style><div class="pr-wm" aria-hidden="true"><img src="${wmLogo}" alt="" /></div><style>.mk-wm { display: none !important; }</style>` : "";
  const words = isEn() ? "" : escapeHtml(riyalsInWords(total));

  const body = `${PAY_REP_CSS}${watermark}
    ${crest}
    ${rows.length
      ? `<div class="pr-cart">
      <i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i>
      <div class="pr-rib">${L("إجمالي المدفوعات · شامل الضريبة", "TOTAL PAID · VAT INCLUDED")}</div>
      <div class="side"><small>${L("المبالغ قبل الضريبة", "Before VAT")}</small><b>${withCur(money(amount))}</b></div>
      <div class="mid"><b>${withCur(money(total))}</b>${words ? `<em>${words}</em>` : ""}</div>
      <div class="side"><small>${L("ضريبة القيمة المضافة", "VAT")}</small><b>${withCur(money(vat))}</b></div>
    </div>
    <div class="pr-strip">
${est ? "" : `<div>${L("عدد المنشآت", "Establishments")}<b class="n">${estCount}</b></div>`}
      <div>${L("عدد السندات", "Vouchers")}<b class="n">${rows.length}</b></div>
      <div>${L("متوسط السند", "Average")}<b class="n">${withCur(money(total / rows.length), false)}</b></div>
      <div>${L("الفترة", "Period")}<b class="n">${period}</b></div>
    </div>

    ${orn(L("ملخص بنود الصرف", "By category"))}
    <table class="pr-sumt">
      <colgroup><col style="width:7%"><col style="width:37%"><col style="width:13%"><col style="width:27%"><col style="width:16%"></colgroup>
      <thead><tr><th class="c">#</th><th>${L("بند الصرف", "Category")}</th><th class="c">${L("عدد السندات", "Vouchers")}</th><th>${L("النسبة من الإجمالي", "Share")}</th><th class="m">${L("المبلغ", "Amount")}</th></tr></thead>
      <tbody>${catRows(cats)}</tbody>
    </table>
    <div class="pr-meth"><b>${L("طرق الدفع:", "Methods:")}</b>${methodLine(methods)}</div>

    ${orn(L("سجل السندات", "The vouchers"), L(`${rows.length} سند · بالريال السعودي`, `${rows.length} vouchers · SAR`))}
    <table class="pr-led">
      <colgroup><col style="width:4.5%"><col style="width:15%"><col style="width:27%"><col style="width:22.5%"><col style="width:11.5%"><col style="width:8%"><col style="width:11.5%"></colgroup>
      <thead><tr>
        <th style="text-align:center">#</th>
        <th>${L("السند", "Voucher")}</th>
        <th>${L("البيان", "Details")}</th>
        <th>${est ? L("المستفيد", "Payee") : L("المنشأة / المستفيد", "Establishment · payee")}</th>
        <th class="m">${L("قبل الضريبة", "Before VAT")}</th>
        <th class="m">${L("الضريبة", "VAT")}</th>
        <th class="m">${L("الإجمالي", "Total")}</th>
      </tr></thead>
      ${ledger}
      <tfoot><tr>
        <td colspan="4">${L(`الإجمالي العام — ${rows.length} سند`, `Grand total — ${rows.length} vouchers`)}</td>
        <td class="m">${money(amount)}</td>
        <td class="m">${money(vat)}</td>
        <td class="m t">${money(total)}</td>
      </tr></tfoot>
    </table>

    ${signatureBlock("report", est ? { ...branding, signatures: { ...(branding.signatures ?? DEFAULT_PRINT_SIGNATURES), showSeal: false } } : branding)}`
      : `<div class="empty-state-card">
      <div class="empty-state-title">${L("لا توجد سندات مطابقة لمعايير البحث الحالية", "No vouchers match this report")}</div>
      <div class="empty-state-desc">${L("لم يتم العثور على أي سندات صرف بناءً على الفلاتر المحددة في هذا التقرير.", "No payment vouchers were found for the filters chosen.")}</div>
    </div>`}`;

  return pdfDocumentShell({
    title: est ? "كشف مدفوعات منشأة" : "تقرير سندات الصرف",
    titleEn: est ? "Establishment Payments Statement" : "Payment Vouchers Report",
    dir: "rtl",
    companyNameAr: est ? est.name : branding.company?.nameAr,
    companyNameEn: est ? est.nameEn || est.name : branding.company?.nameEn,
    logoDataUrl: est ? est.logo ?? undefined : branding.logoDataUrl,
    classification: est ? "كشف مدفوعات معتمد | Payments Statement" : "تقرير مالي معتمد | Financial Report",
    theme: branding.printTheme,
    brandColor: branding.brandColor,
    highlight: { value: money(total), label: L("ريال سعودي", "Saudi riyals") },
    bodyHtml: body,
  });
}
