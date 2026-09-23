import puppeteer, { Browser } from "puppeteer";
import { logger } from "@/lib/logger";

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=medium"],
    });
  }
  return browserPromise;
}

export async function closePdfBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close().catch(() => undefined);
    browserPromise = null;
  }
}

export interface RenderPdfOptions {
  landscape?: boolean;
  footerLabel?: string;
}

/**
 * 👑 Executive Luxury PDF Renderer
 * Generates official corporate-grade A4 PDF documents with:
 * - Ultra-high precision typography (Cairo & Tajawal)
 * - Gold & Navy Royal dual-tone header
 * - Document security border & official reference stamp
 * - Official corporate signatures & circular stamp box
 * - Clean Puppeteer footer with Arabic page numbering
 */
export async function renderHtmlToPdf(html: string, options: RenderPdfOptions = {}): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      landscape: options.landscape ?? false,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `
        <div style="width:100%; font-size:8pt; color:#64748b; display:flex; justify-content:space-between; padding:0 14mm; font-family:'Cairo','Segoe UI',sans-serif; border-top:1px solid #e2e8f0; padding-top:4px;" dir="rtl">
          <span>${options.footerLabel ?? "🔒 وثيقة إدارية رسمية معتمدة — صالحة للأرشفة والتدقيق"}</span>
          <span>صفحة <span class="pageNumber"></span> من <span class="totalPages"></span></span>
        </div>`,
      margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });
    return Buffer.from(pdf);
  } catch (err) {
    logger.error({ err }, "PDF generation failed");
    throw err;
  } finally {
    await page.close();
  }
}

export function pdfDocumentShell(opts: {
  title: string;
  dir?: "rtl" | "ltr";
  companyNameAr?: string | null;
  companyNameEn?: string | null;
  logoDataUrl?: string | null;
  referenceNumber?: string;
  bodyHtml: string;
  generatedAt?: Date;
  classification?: string;
}): string {
  const dir = opts.dir ?? "rtl";
  const companyNameAr = opts.companyNameAr || "منظومة سند لإدارة الموارد البشرية والامتثال";
  const companyNameEn = opts.companyNameEn || "SanaD Enterprise HR & Compliance Suite";
  const classification = opts.classification || "وثيقة رسمية معتمدة | Official Document";

  const now = opts.generatedAt ?? new Date();
  const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return `<!doctype html>
<html dir="${dir}" lang="${dir === "rtl" ? "ar" : "en"}">
<head>
<meta charset="utf-8" />
<title>${opts.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: ${dir === "rtl" ? "'Cairo', 'Tajawal', 'Segoe UI', Tahoma, sans-serif" : "'Inter', 'Cairo', 'Segoe UI', sans-serif"};
    color: #0f172a;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 11pt;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* 🌟 Royal Header Accent Line */
  .royal-accent-bar {
    height: 4px;
    background: linear-gradient(90deg, #0B1B3D 0%, #C59A45 50%, #0B1B3D 100%);
    width: 100%;
    margin-bottom: 14px;
    border-radius: 2px;
  }

  /* 🏛️ Official Document Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1.5px solid #cbd5e1;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }
  .header-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .header-logo {
    height: 52px;
    width: auto;
    object-fit: contain;
  }
  .header-title-box h2 {
    font-size: 13pt;
    font-weight: 800;
    color: #0B1B3D;
    margin: 0;
    letter-spacing: -0.3px;
  }
  .header-title-box p {
    font-size: 8pt;
    font-weight: 600;
    color: #64748b;
    margin: 2px 0 0 0;
  }

  .header-meta-box {
    text-align: ${dir === "rtl" ? "left" : "right"};
  }
  .header-meta-box .doc-title-main {
    font-size: 14pt;
    font-weight: 900;
    color: #0B1B3D;
    margin: 0;
  }
  .header-meta-box .badge-classification {
    display: inline-block;
    padding: 2px 8px;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 8pt;
    font-weight: 700;
    color: #475569;
    margin-top: 4px;
  }
  .header-meta-box .doc-ref {
    font-family: monospace;
    font-size: 8.5pt;
    font-weight: 700;
    color: #0284c7;
    margin-top: 3px;
  }
  .header-meta-box .doc-date {
    font-size: 8pt;
    color: #64748b;
    margin-top: 2px;
  }

  /* 📦 Executive Section Card */
  .section-card {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #ffffff;
    margin-bottom: 16px;
    overflow: hidden;
  }
  .section-header {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 8px 14px;
    font-size: 10.5pt;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .section-body {
    padding: 12px 14px;
  }

  /* 📊 Executive Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }
  th, td {
    padding: 7px 10px;
    font-size: 9.5pt;
    text-align: ${dir === "rtl" ? "right" : "left"};
    border-bottom: 1px solid #e2e8f0;
  }
  th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    font-size: 9pt;
    letter-spacing: 0.3px;
  }
  tbody tr:nth-child(even) {
    background: #f8fafc;
  }

  /* 🏷️ Status Badges */
  .badge-status {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 8pt;
    font-weight: 700;
  }
  .status-VALID, .status-ACTIVE {
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #86efac;
  }
  .status-EXPIRING_SOON, .status-ON_LEAVE {
    background: #fef3c7;
    color: #b45309;
    border: 1px solid #fde68a;
  }
  .status-EXPIRED, .status-TERMINATED, .status-INACTIVE {
    background: #ffe4e6;
    color: #be123c;
    border: 1px solid #fecdd3;
  }

  /* 💰 Financial KPI Box */
  .kpi-total-card {
    background: linear-gradient(135deg, #0B1B3D 0%, #1E3A8A 100%);
    border-radius: 12px;
    color: #ffffff;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 16px 0;
  }
  .kpi-total-card .amount-label {
    font-size: 10pt;
    color: #93c5fd;
    font-weight: 600;
  }
  .kpi-total-card .amount-val {
    font-size: 18pt;
    font-weight: 900;
    color: #ffffff;
    font-family: 'Cairo', monospace;
  }

  /* ✍️ Signature & Approval Matrix */
  .signature-matrix {
    margin-top: 32px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .signature-box {
    flex: 1;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px;
    background: #ffffff;
    min-height: 90px;
    position: relative;
  }
  .signature-box .box-title {
    font-size: 9pt;
    font-weight: 800;
    color: #0B1B3D;
    border-bottom: 1px dashed #cbd5e1;
    padding-bottom: 4px;
    margin-bottom: 30px;
  }
  .signature-box .box-line {
    border-top: 1px solid #94a3b8;
    margin-top: 20px;
    font-size: 8pt;
    color: #64748b;
    text-align: center;
    padding-top: 2px;
  }

  /* ⭕ Official Circular Stamp */
  .stamp-box {
    width: 95px;
    height: 95px;
    border: 2px dashed #94a3b8;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 8pt;
    font-weight: 700;
    color: #94a3b8;
    margin: 0 auto;
  }
</style>
</head>
<body>
  <div class="royal-accent-bar"></div>
  <div class="header">
    <div class="header-brand">
      ${opts.logoDataUrl ? `<img src="${opts.logoDataUrl}" class="header-logo" alt="Logo" />` : ""}
      <div class="header-title-box">
        <h2>${companyNameAr}</h2>
        <p>${companyNameEn}</p>
      </div>
    </div>
    <div class="header-meta-box">
      <h1 class="doc-title-main">${opts.title}</h1>
      <div><span class="badge-classification">${classification}</span></div>
      ${opts.referenceNumber ? `<div class="doc-ref">REF: ${opts.referenceNumber}</div>` : ""}
      <div class="doc-date">${dateFormatted}</div>
    </div>
  </div>

  ${opts.bodyHtml}
</body>
</html>`;
}
