import { isEn } from "@/services/lang";
import puppeteer, { Browser, Page } from "puppeteer";
import { env } from "@/config/env";
import { escapeHtml } from "@/lib/security";
import { logger } from "@/lib/logger";
import { ApiError } from "@/utils/apiError";
import { getPrintTheme, themeDecor, PRINT_FONTS_HREF, type ShellContext } from "@/services/printThemes";

let browserPromise: Promise<Browser> | null = null;
let activeRenders = 0;
async function withRenderBudget<T>(html: string, render: () => Promise<T>): Promise<T> {
  if (Buffer.byteLength(html) > 8 * 1024 * 1024) throw ApiError.badRequest("Print document is too large.");
  if (activeRenders >= 2) throw ApiError.tooMany("Print service is busy. Retry shortly.");
  activeRenders++;
  try { return await render(); } finally { activeRenders--; }
}

export function allowedRenderUrl(raw: string): boolean {
  if (/^data:(image\/(png|jpeg|webp)|font\/)/i.test(raw)) return true;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
    if (url.hostname === "fonts.googleapis.com") return /^\/css2?$/.test(url.pathname);
    if (url.hostname === "fonts.gstatic.com") return url.pathname.startsWith("/s/");
    return url.origin === new URL(env.CLIENT_URL).origin && /^\/(pwa|brand)\/[a-zA-Z0-9._-]+\.(png|webp|jpg)$/.test(url.pathname) && !url.search;
  } catch { return false; }
}

export async function secureRenderPage(page: Page) {
  await page.setJavaScriptEnabled(false);
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const permitted = request.method() === "GET" && allowedRenderUrl(request.url());
    void (permitted ? request.continue() : request.abort("blockedbyclient")).catch(() => undefined);
  });
}

function launchBrowser(): Promise<Browser> {
  const promise = puppeteer.launch({
    headless: true,
    args: [...(env.PDF_DISABLE_SANDBOX ? ["--no-sandbox", "--disable-setuid-sandbox"] : []), "--font-render-hinting=medium"],
  });
  // A launch failure must not wedge every future PDF request behind the same
  // rejected promise forever — clear it so the next call retries a fresh launch.
  promise.catch(() => {
    if (browserPromise === promise) browserPromise = null;
  });
  return promise;
}

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const existing = await browserPromise.catch(() => null);
    if (existing?.connected) return existing;
    // The cached browser process died (crash/OOM) — relaunch instead of
    // staying stuck returning a dead browser to every request until restart.
    browserPromise = null;
  }
  browserPromise = launchBrowser();
  return browserPromise;
}

export async function closePdfBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close().catch(() => undefined);
    browserPromise = null;
  }
}

/** The designs' Arabic labels in English, for documents printed in English. */
const EN_LABELS: [RegExp, string][] = [
  [/تاريخ الإصدار/g, "Issue date"],
  [/وقت الطباعة/g, "Printed at"],
  [/الرقم المرجعي/g, "Reference no."],
  [/رقم المرجع/g, "Reference no."],
  [/رقم المستند/g, "Document no."],
  [/المرجع/g, "Ref."],
  [/التصنيف/g, "Classification"],
  [/التاريخ/g, "Date"],
  [/الوقت/g, "Time"],
  [/العدد/g, "No."],
  [/ · رسمي/g, ""],
  [/ · بريد جوي/g, ""],
  [/صفحة(\s*<span class="pageNumber"><\/span>\s*)من/g, "Page$1of"],
];
export function englishLabels(html: string) {
  return EN_LABELS.reduce((h, [re, en]) => h.replace(re, en), html);
}
/** "عربي | English" → the half for the current language. */
export function pickHalf(text: string) {
  if (!text.includes("|")) return text;
  const [ar, en] = text.split("|").map((x) => x.trim());
  return isEn() ? en || ar : ar || en;
}

// Every PDF is A4 portrait; wide report tables use a compact style instead.
export interface RenderPdfOptions {
  footerLabel?: string;
}

/**
 * 👑 Executive Corporate PDF Renderer
 * Produces pixel-perfect official reports with:
 * - Proper print margins preventing content cutoff
 * - Cairo & Tajawal typography
 * - Clean bilingual headers without bidirectional text reversal
 * - Official corporate signatures and circular compliance seal
 */
async function renderOnce(browser: Browser, html: string, options: RenderPdfOptions): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    await secureRenderPage(page);
    // The shell stamps its design into the page; margins and the per-page
    // header/footer come from that design.
    const theme = getPrintTheme(html.match(/<meta name="print-theme" content="(\w+)"/)?.[1]);
    const english = /<html[^>]*\blang="en"/.test(html);
    const footerLabel = options.footerLabel ?? (english ? "Official administrative document — valid for archiving and audit" : "وثيقة إدارية رسمية معتمدة — صالحة للأرشفة والتدقيق");
    // A4 at 96dpi: fixed-position page decoration is laid out against the
    // viewport, so it must match the paper or the first page comes out wrong.
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 20000 });
    await Promise.race([
      page.evaluateHandle("document.fonts.ready"),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]).catch(() => undefined);
    const pdf = await page.pdf({
      format: "A4",
      landscape: false,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: english ? englishLabels(theme.headerTemplate) : theme.headerTemplate,
      footerTemplate: english ? englishLabels(theme.footerTemplate(footerLabel)) : theme.footerTemplate(footerLabel),
      // No side margins: designs draw full-bleed side columns and the body's
      // own padding keeps the content in.
      margin: { top: theme.margin.top, bottom: theme.margin.bottom, left: "0", right: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function renderPdfWithRetry(html: string, options: RenderPdfOptions = {}): Promise<Buffer> {
  try {
    return await renderOnce(await getBrowser(), html, options);
  } catch (err) {
    // The cached browser may have died between the health check in getBrowser()
    // and this request (e.g. crashed mid-render under load) — force a fresh
    // launch and retry once before giving up, instead of failing every request
    // until someone manually restarts the server.
    logger.warn({ err }, "PDF generation failed, relaunching browser and retrying once");
    browserPromise = null;
    try {
      return await renderOnce(await getBrowser(), html, options);
    } catch (retryErr) {
      logger.error({ err: retryErr }, "PDF generation failed after retry");
      throw retryErr;
    }
  }
}

async function screenshotOnce(browser: Browser, html: string, width: number, height: number): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    await secureRenderPage(page);
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => undefined);
    // Web fonts decide the Arabic shaping; don't shoot before they're in (5s cap).
    await Promise.race([page.evaluate("document.fonts.ready.then(() => true)"), new Promise((r) => setTimeout(r, 5000))]);
    return Buffer.from(await page.screenshot({ type: "png", clip: { x: 0, y: 0, width, height } }));
  } finally {
    await page.close().catch(() => undefined);
  }
}

/** An HTML page as a PNG — the WhatsApp alert cards. Shares the PDF browser. */
async function renderPngWithRetry(html: string, width: number, height: number): Promise<Buffer> {
  try {
    return await screenshotOnce(await getBrowser(), html, width, height);
  } catch (err) {
    logger.warn({ err }, "Image render failed, relaunching browser and retrying once");
    browserPromise = null;
    return screenshotOnce(await getBrowser(), html, width, height);
  }
}

export function renderHtmlToPdf(html: string, options: RenderPdfOptions = {}): Promise<Buffer> {
  return withRenderBudget(html, () => renderPdfWithRetry(html, options));
}
export function renderHtmlToPng(html: string, width: number, height: number): Promise<Buffer> {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 4_000_000) throw ApiError.badRequest("Invalid print image dimensions.");
  return withRenderBudget(html, () => renderPngWithRetry(html, width, height));
}

export function pdfDocumentShell(opts: {
  title: string;
  titleEn?: string;
  dir?: "rtl" | "ltr";
  companyNameAr?: string | null;
  companyNameEn?: string | null;
  logoDataUrl?: string | null;
  referenceNumber?: string;
  bodyHtml: string;
  generatedAt?: Date;
  classification?: string;
  /** Print design id from Settings → Print (see services/printThemes). */
  theme?: string | null;
  highlight?: ShellContext["highlight"];
}): string {
  // The document is in the interface language only: the title and company name
  // in that language (English reads left to right), without the other one under it.
  const en = isEn();
  const dir = en ? "ltr" : "rtl";
  const nameAr = opts.companyNameAr || "منظومة سند لإدارة الموارد البشرية والامتثال";
  const nameEn = opts.companyNameEn || "SanaD Enterprise HR & Compliance Suite";
  const companyNameAr = en ? nameEn : nameAr;
  const companyNameEn = "";
  const classification = pickHalf(opts.classification || "وثيقة إدارية رسمية معتمدة | Official Document");
  const docTitle = en ? opts.titleEn || opts.title : opts.title;
  const docTitleEn: string | undefined = undefined;

  // Riyadh time: the server clock (Render) is UTC.
  const now = opts.generatedAt ?? new Date();
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", ...o }).format(now);
  const dateStr = part({ day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = part({ hour: "2-digit", minute: "2-digit", hour12: false });

  const theme = getPrintTheme(opts.theme);
  const ctx: ShellContext = {
    title: docTitle,
    titleEn: docTitleEn,
    companyNameAr,
    companyNameEn,
    logoDataUrl: opts.logoDataUrl,
    referenceNumber: opts.referenceNumber,
    classification,
    dateStr,
    timeStr,
    highlight: opts.highlight,
  };
  const isClassic = theme.id === "classic";

  return `<!doctype html>
<html dir="${dir}" lang="${dir === "rtl" ? "ar" : "en"}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(docTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<meta name="print-theme" content="${theme.id}">
<link href="${PRINT_FONTS_HREF}" rel="stylesheet">
<style>
  @page { size: A4 portrait; }
  * { box-sizing: border-box; }
  body {
    font-family: ${dir === "rtl" ? "'Cairo', 'Tajawal', 'Segoe UI', Tahoma, sans-serif" : "'Inter', 'Cairo', 'Segoe UI', sans-serif"};
    color: #1e293b;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 9pt;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* 🌟 Royal Accent Bar */
  .royal-top-stripe {
    height: 3px;
    background: linear-gradient(90deg, #1e3a8a 0%, #c59a45 50%, #1e3a8a 100%);
    width: 100%;
    margin-bottom: 12px;
    border-radius: 2px;
  }

  /* 🏛️ Header Top: Company Branding (Right) vs Document Meta (Left) */
  .doc-header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 10px;
    margin-bottom: 14px;
  }
  .company-brand-box {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .company-logo-img {
    height: 48px;
    width: auto;
    object-fit: contain;
  }
  .company-names h2 {
    font-size: 13pt;
    font-weight: 800;
    color: #0b1b3d;
    margin: 0;
    line-height: 1.3;
  }
  .company-names p {
    font-size: 7.5pt;
    font-weight: 600;
    color: #64748b;
    margin: 2px 0 0 0;
  }

  .doc-meta-card {
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 8px;
    padding: 6px 12px;
    text-align: ${dir === "rtl" ? "left" : "right"};
    font-size: 8pt;
    color: #475569;
    line-height: 1.5;
  }
  .doc-meta-card .meta-item strong {
    color: #0f172a;
    font-family: 'Cairo', sans-serif;
  }
  .doc-meta-card .meta-code {
    font-family: monospace;
    font-weight: 700;
    color: #0284c7;
  }

  /* 🏷️ Dedicated Document Title Banner */
  .doc-title-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 14px;
    margin-bottom: 14px;
  }
  .title-content h1 {
    font-size: 13.5pt;
    font-weight: 900;
    color: #0b1b3d;
    margin: 0;
    line-height: 1.25;
  }
  .title-content .title-subtitle-en {
    font-size: 8pt;
    font-weight: 600;
    color: #64748b;
    margin-top: 1px;
  }
  .title-badge {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 3px 9px;
    font-size: 7.5pt;
    font-weight: 700;
    color: #334155;
    white-space: nowrap;
  }

  /* 📦 Section Styling */
  .section-card {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    margin-bottom: 12px;
    overflow: hidden;
  }
  .section-header {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 6px 12px;
    font-size: 9pt;
    font-weight: 800;
    color: #0b1b3d;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* 📊 Executive Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }
  th, td {
    padding: 5px 8px;
    font-size: 8.5pt;
    text-align: ${dir === "rtl" ? "right" : "left"};
    border-bottom: 1px solid #e2e8f0;
    border-inline: 1px solid #f1f5f9;
  }
  th {
    background: #1e293b;
    color: #ffffff;
    font-weight: 700;
    font-size: 8pt;
    text-align: center;
    border-color: #334155;
    vertical-align: middle;
  }
  th .th-sub {
    font-size: 6.5pt;
    font-weight: 500;
    color: #94a3b8;
    margin-top: 1px;
    letter-spacing: 0.2px;
  }
  tbody tr:nth-child(even) td {
    background: #f8fafc;
  }

  /* Report tables on A4 portrait: keep rows intact across pages, repeat the
     header on every page, and tighten wide tables so every column fits. */
  .report-table thead { display: table-header-group; }
  .report-table tr { page-break-inside: avoid; break-inside: avoid; }
  .report-table td { overflow-wrap: anywhere; vertical-align: middle; }
  .report-table .nowrap { white-space: nowrap; }
  .report-table.compact th, .report-table.compact td { padding: 4px 5px; font-size: 7.5pt; }
  .report-table.compact th .th-sub { font-size: 6pt; }
  .report-table.dense th, .report-table.dense td { padding: 3px 3px; font-size: 6.6pt; line-height: 1.3; }
  .report-table.dense th .th-sub { font-size: 5.3pt; }
  .report-table.dense .badge-status, .report-table.compact .badge-status { padding: 1px 4px; font-size: 6.2pt; }

  /* 🏷️ Status Badges */
  .badge-status {
    display: inline-block;
    padding: 1.5px 7px;
    border-radius: 9999px;
    font-size: 7.5pt;
    font-weight: 700;
    text-align: center;
    white-space: nowrap;
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

  /* 🔍 Empty State */
  .empty-state-card {
    padding: 24px;
    text-align: center;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    margin: 8px 0;
  }
  .empty-state-title {
    font-size: 10pt;
    font-weight: 800;
    color: #334155;
    margin-bottom: 3px;
  }
  .empty-state-desc {
    font-size: 8pt;
    color: #64748b;
  }

  /* 🏁 Summary & Totals Bar */
  .report-summary-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 12px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 8pt;
    color: #475569;
    margin-top: 8px;
  }
  .report-summary-bar .summary-kpi {
    font-weight: 800;
    color: #0b1b3d;
    font-size: 8.5pt;
  }

  /* ✍️ Official Signatures & Seal Section */
  .signature-matrix {
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    gap: 14px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .sig-card {
    flex: 1;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    overflow: hidden;
  }
  .sig-card-header {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 5px 10px;
    text-align: center;
  }
  .sig-card-header .sig-title-ar {
    font-size: 8.5pt;
    font-weight: 800;
    color: #0b1b3d;
  }
  .sig-card-header .sig-title-en {
    font-size: 6.5pt;
    font-weight: 600;
    color: #64748b;
  }
  .sig-card-body {
    padding: 10px 12px;
    font-size: 7.5pt;
    color: #475569;
  }
  .sig-row {
    margin-bottom: 6px;
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .sig-dots {
    border-bottom: 1px dotted #94a3b8;
    flex: 1;
    height: 10px;
  }

  /* ⭕ Official Circular Seal */
  .sig-seal-box {
    width: 130px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .official-seal-circle {
    width: 82px;
    height: 82px;
    border: 2px dashed #94a3b8;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 4px;
  }
  .seal-stars {
    font-size: 6.5pt;
    color: #c59a45;
    letter-spacing: 2px;
  }
  .seal-text-ar {
    font-size: 7pt;
    font-weight: 800;
    color: #0b1b3d;
    line-height: 1.1;
    margin: 2px 0;
  }
  .seal-text-en {
    font-size: 5.5pt;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.5px;
  }
  /* Shared pieces the templates use */
  .kpi-total-card { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #0b1b3d; color: #fff; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
  .amount-label { font-size: 10pt; font-weight: 800; }
  .amount-sub { font-size: 8pt; color: #cbd5e1; margin-top: 2px; }
  .amount-val { font-size: 20pt; font-weight: 900; white-space: nowrap; }
  .ref-code { font-family: monospace; font-size: 9pt; color: #2563eb; }
  .total-th { background: #1e3a8a !important; }
  .total-cell { font-weight: 900; color: #1e3a8a; background: #f0fdf4; }
  /* Signature box rows: one grid for name, signature and date — the same
     height, a fixed label column, and the value centred on its line. */
  .sig-card-body .sig-row { display: grid; grid-template-columns: 13mm 1fr; align-items: stretch; column-gap: 2mm; height: 11mm; margin: 0 0 1.5mm; }
  .sig-card-body .sig-row:last-child { margin-bottom: 0; }
  .sig-label { white-space: nowrap; align-self: center; }
  .sig-card-body .sig-dots,
  .sig-name,
  .sig-date { height: auto; display: flex; align-items: center; justify-content: center; border-bottom: 1px dotted #94a3b8; }
  .sig-name img { max-height: 9.5mm; max-width: 100%; object-fit: contain; }
  .sig-date { font-family: 'IBM Plex Mono', monospace; font-size: 9pt; font-weight: 700; letter-spacing: .06em; }
  .stamp-img { width: 30mm; height: 30mm; object-fit: contain; }
  .signature-matrix.seal-only { justify-content: center; }
  .desc-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin: 0 0 14px; font-size: 10pt; }
${theme.css}
</style>
</head>
<body class="${isClassic ? "" : "lux"}">
${(() => {
  const top = isClassic ? classicHeader() : themeDecor(theme, ctx) + theme.letterhead(ctx);
  return en ? englishLabels(top) : top;
})()}

  ${opts.bodyHtml}
</body>
</html>`;

  function classicHeader() {
    return `
  <div class="royal-top-stripe"></div>

  <!-- 🏛️ Header Top: Company (Right) vs Meta (Left) -->
  <div class="doc-header-top">
    <div class="company-brand-box">
      ${opts.logoDataUrl ? `<img src="${opts.logoDataUrl}" class="company-logo-img" alt="Logo" />` : ""}
      <div class="company-names">
        <h2>${escapeHtml(companyNameAr)}</h2>
        ${companyNameEn ? `<p>${companyNameEn}</p>` : ""}
      </div>
    </div>
    <div class="doc-meta-card">
      <div class="meta-item"><span>تاريخ الإصدار: </span><strong>${dateStr}</strong></div>
      <div class="meta-item"><span>وقت الطباعة: </span><strong dir="ltr">${timeStr}</strong></div>
      ${opts.referenceNumber ? `<div class="meta-item"><span>الرقم المرجعي: </span><span class="meta-code">${escapeHtml(opts.referenceNumber)}</span></div>` : ""}
    </div>
  </div>

  <!-- 🏷️ Document Title Banner -->
  <div class="doc-title-banner">
    <div class="title-content">
      <h1>${escapeHtml(docTitle)}</h1>
      ${docTitleEn ? `<div class="title-subtitle-en">${docTitleEn}</div>` : ""}
    </div>
    <span class="title-badge">${escapeHtml(classification)}</span>
  </div>`;
  }
}
