import puppeteer, { Browser } from "puppeteer";
import { logger } from "@/lib/logger";

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
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

/** Renders real HTML/CSS to a print-ready A4 PDF (§28/§54) — used for
 * employee profiles, payment receipts, and every tabular report. Real page
 * numbers come from Puppeteer's own footer template (pageNumber/totalPages
 * placeholders), not CSS — a fixed-position footer in the page HTML cannot
 * know the total page count. */
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
        <div style="width:100%; font-size:9px; color:#94a3b8; display:flex; justify-content:space-between; padding:0 12mm; font-family:'Segoe UI',sans-serif;">
          <span>${options.footerLabel ?? ""}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`,
      margin: { top: "15mm", bottom: "16mm", left: "12mm", right: "12mm" },
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
  dir: "rtl" | "ltr";
  companyNameAr?: string | null;
  companyNameEn?: string | null;
  logoDataUrl?: string | null;
  referenceNumber?: string;
  bodyHtml: string;
  generatedAt?: Date;
}): string {
  const companyName = opts.dir === "rtl" ? opts.companyNameAr || opts.companyNameEn : opts.companyNameEn || opts.companyNameAr;
  const generated = (opts.generatedAt ?? new Date()).toLocaleString(opts.dir === "rtl" ? "ar-SA" : "en-US");

  return `<!doctype html>
<html dir="${opts.dir}" lang="${opts.dir === "rtl" ? "ar" : "en"}">
<head>
<meta charset="utf-8" />
<title>${opts.title}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: ${opts.dir === "rtl" ? "'Cairo', 'Segoe UI', sans-serif" : "'Inter', 'Segoe UI', sans-serif"};
    color: #1e293b;
    margin: 0;
    padding: 0;
    font-size: 12px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid #0B1F3A;
    padding-bottom: 10px;
    margin-bottom: 20px;
  }
  .header img { height: 48px; }
  .header .company-name { font-size: 16px; font-weight: 700; color: #0B1F3A; }
  .header .doc-title { text-align: ${opts.dir === "rtl" ? "left" : "right"}; }
  .doc-title h1 { font-size: 18px; margin: 0; color: #0B1F3A; }
  .doc-title .ref { color: #64748b; font-size: 11px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 11.5px; text-align: ${opts.dir === "rtl" ? "right" : "left"}; }
  th { background: #f1f5f9; font-weight: 700; }
  .status-VALID { color: #16A34A; font-weight: 600; }
  .status-EXPIRING_SOON { color: #F59E0B; font-weight: 600; }
  .status-EXPIRED { color: #DC2626; font-weight: 600; }
  .signature-area { margin-top: 40px; display: flex; justify-content: space-between; }
  .signature-box { width: 45%; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px; color: #64748b; }
</style>
</head>
<body>
  <div class="header">
    <div style="display:flex; align-items:center; gap:10px;">
      ${opts.logoDataUrl ? `<img src="${opts.logoDataUrl}" />` : ""}
      <div class="company-name">${companyName ?? "SanaD Documents & Licenses"}</div>
    </div>
    <div class="doc-title">
      <h1>${opts.title}</h1>
      ${opts.referenceNumber ? `<div class="ref">Ref: ${opts.referenceNumber}</div>` : ""}
      <div class="ref">${generated}</div>
    </div>
  </div>
  ${opts.bodyHtml}
</body>
</html>`;
}
