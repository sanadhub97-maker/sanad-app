import { readFileSync } from "node:fs";
import path from "node:path";
import { isEn } from "@/services/lang";
import puppeteer, { Browser, Page } from "puppeteer";
import { env } from "@/config/env";
import { escapeHtml } from "@/lib/security";
import { logger } from "@/lib/logger";
import { ApiError } from "@/utils/apiError";
import { SITE_PRINT_TYPOGRAPHY } from "@/services/printTypography";
import { getPrintTheme, themeDecor, PRINT_FONTS_HREF, type ShellContext } from "@/services/printThemes";

const bundledFontDir = path.resolve(__dirname, "../../assets/print-fonts");
let bundledFontManifest: Record<string, string> = {};
let bundledFontCss: Buffer | null = null;
try {
  bundledFontManifest = JSON.parse(readFileSync(path.join(bundledFontDir, "manifest.json"), "utf8").replace(/^\uFEFF/, ""));
  bundledFontCss = readFileSync(path.join(bundledFontDir, "fonts.css"));
} catch { logger.warn("Bundled print fonts unavailable; using font provider fallback"); }
const bundledFontBuffers = new Map<string, Buffer>();
let marginTypography: string | undefined;
function printMarginTypography() {
  if (marginTypography !== undefined) return marginTypography;
  const blocks = bundledFontCss?.toString("utf8").match(/@font-face\s*\{[^}]+\}/g) ?? [];
  const css = blocks.filter(block => /font-family:\s*['"](?:IBM Plex Sans Arabic|Alexandria)['"]/.test(block)).map(block => block.replace(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g, (_match, url) => {
    const font = bundledRenderResource(url);
    return font ? `url(data:${font.contentType};base64,${font.body.toString("base64")})` : `url(${url})`;
  })).join("\n");
  marginTypography = `<style>${css}\n${SITE_PRINT_TYPOGRAPHY}</style>`;
  return marginTypography;
}
// The page header and footer are separate documents Chromium lays out for every
// page, so carrying the full fonts (1.5 MB) there cost about 60 MB per report on a
// 512 MB host. They get the same fonts cut down to the characters they contain.
const marginFontCache = new Map<string, string>();
export async function marginTypographyFor(templatesHtml: string): Promise<string> {
  const text = templatesHtml.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  // Plus digits (page numbers), all printable ASCII and the usual Arabic punctuation,
  // which designs also draw from CSS content the text above doesn't see.
  let ascii = "";
  for (let c = 0x20; c < 0x7f; c++) ascii += String.fromCharCode(c);
  // Chromium fills in the date and page numbers itself; its time format uses
  // narrow and thin spaces and direction marks, so those are kept too.
  const chars = [...new Set(`${text}${ascii}٠١٢٣٤٥٦٧٨٩٫٬،؛؟٪«»·•…–—‘’“”✓صم     ‎‏؜`)].sort().join("");
  const cached = marginFontCache.get(chars);
  if (cached !== undefined) return cached;
  try {
    const { default: subsetFont } = await import("subset-font");
    const blocks = (bundledFontCss?.toString("utf8").match(/@font-face\s*\{[^}]+\}/g) ?? []).filter((block) => /font-family:\s*['"](?:IBM Plex Sans Arabic|Alexandria)['"]/.test(block));
    const faces = await Promise.all(blocks.map(async (block) => {
      const url = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/.exec(block)?.[1];
      const font = url ? bundledRenderResource(url) : null;
      if (!url || !font) return "";
      const small = await subsetFont(font.body, chars, { targetFormat: "truetype" });
      return block.replace(url, `data:font/ttf;base64,${Buffer.from(small).toString("base64")}`).replace(/\s*unicode-range:[^;]+;/, "");
    }));
    const css = `<style>${faces.join("\n")}\n${SITE_PRINT_TYPOGRAPHY}</style>`;
    if (marginFontCache.size > 100) marginFontCache.clear();
    marginFontCache.set(chars, css);
    return css;
  } catch (err) {
    logger.warn({ err }, "Could not cut the print fonts down for the page header and footer");
    return printMarginTypography();
  }
}

/** The document with the site's fonts (IBM Plex Sans Arabic, Alexandria) embedded in its head.
 * `preload` is the header/footer's cut-down fonts: the page loads them first under another
 * name, so Chromium already has them when it draws the margins (it doesn't wait for them there). */
export function withSiteFonts(html: string, preload = "") {
  const fonts = printMarginTypography() + preload;
  if (!fonts) return html;
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${fonts}</head>`) : fonts + html;
}

/** The margin fonts again, renamed and used once in a hidden line, so the page loads the exact same files. */
function preloadMarginFonts(marginCss: string) {
  const faces = marginCss.match(/@font-face\s*\{[^}]+\}/g) ?? [];
  if (!faces.length) return "";
  const css = faces.map((face, i) => face.replace(/font-family:\s*(['"])[^'"]+\1/, `font-family: 'sanad-margin-${i}'`)).join("\n");
  const probes = faces.map((face, i) => `<span style="font-family:'sanad-margin-${i}' !important;font-weight:${/font-weight:\s*(\d+)/.exec(face)?.[1] ?? 400}">سند 0</span>`).join("");
  return `<style>${css}</style><div aria-hidden="true" style="position:absolute;left:-9999px;top:0;height:0;overflow:hidden">${probes}</div>`;
}

// Lay the page out (which requests exactly the font weights it uses), then wait
// for them. A slow host used to print after a fixed 5 s, before the fonts were
// in, and the documents came out in the system's fallback fonts.
async function waitForSiteFonts(page: Page) {
  const loaded = page.evaluate("void document.body.offsetHeight, document.fonts.ready.then(() => true)");
  await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, 30_000))]).catch(() => undefined);
}

export function bundledRenderResource(raw: string): { contentType: string; body: Buffer } | null {
  if (raw === PRINT_FONTS_HREF && bundledFontCss) return { contentType: "text/css; charset=utf-8", body: bundledFontCss };
  const filename = bundledFontManifest[raw];
  if (!filename || !/^font-[0-9]+\.bin$/.test(filename)) return null;
  let body = bundledFontBuffers.get(filename);
  if (!body) { body = readFileSync(path.join(bundledFontDir, filename)); bundledFontBuffers.set(filename, body); }
  const magic = body.subarray(0, 4).toString("ascii");
  return { contentType: magic === "wOF2" ? "font/woff2" : magic === "wOFF" ? "font/woff" : magic === "OTTO" ? "font/otf" : "font/ttf", body };
}

let browserPromise: Promise<Browser> | null = null;
// One document at a time: the host has 512 MB for Node and Chromium together, and
// two renders at once were enough to get the whole service killed. Others wait in line.
let activeRenders = 0;
const renderQueue: (() => void)[] = [];
const MAX_QUEUED_RENDERS = 6;
const QUEUE_WAIT_MS = 90_000;
async function withRenderBudget<T>(html: string, render: () => Promise<T>): Promise<T> {
  if (Buffer.byteLength(html) > 8 * 1024 * 1024) throw ApiError.badRequest("Print document is too large.");
  if (activeRenders >= 1) {
    if (renderQueue.length >= MAX_QUEUED_RENDERS) throw ApiError.tooMany("Print service is busy. Retry shortly.");
    await new Promise<void>((resolve, reject) => {
      const go = () => { clearTimeout(timer); resolve(); };
      const timer = setTimeout(() => {
        const i = renderQueue.indexOf(go);
        if (i >= 0) renderQueue.splice(i, 1);
        reject(ApiError.tooMany("Print service is busy. Retry shortly."));
      }, QUEUE_WAIT_MS);
      renderQueue.push(go);
    });
  }
  activeRenders++;
  cancelIdleClose();
  try { return await render(); } finally {
    activeRenders--;
    const next = renderQueue.shift();
    if (next) next();
    else scheduleIdleClose();
  }
}

// An idle Chromium holds well over 100 MB; close it a minute after the last document.
const IDLE_CLOSE_MS = 60_000;
let idleTimer: NodeJS.Timeout | null = null;
function cancelIdleClose() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
}
function scheduleIdleClose() {
  cancelIdleClose();
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (activeRenders === 0 && renderQueue.length === 0) void closePdfBrowser().catch(() => undefined);
  }, IDLE_CLOSE_MS);
  idleTimer.unref?.();
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
    if (!permitted) { void request.abort("blockedbyclient").catch(() => undefined); return; }
    try {
      const bundled = bundledRenderResource(request.url());
      void (bundled ? request.respond({ status: 200, contentType: bundled.contentType, body: bundled.body, headers: { "Cache-Control": "public, max-age=31536000" } }) : request.continue()).catch(() => undefined);
    } catch { void request.continue().catch(() => undefined); }
  });
}

function launchBrowser(): Promise<Browser> {
  const promise = puppeteer.launch({
    headless: true,
    args: [
      ...(env.PDF_DISABLE_SANDBOX ? ["--no-sandbox", "--disable-setuid-sandbox"] : []),
      "--font-render-hinting=medium",
      // Low-memory profile for a small container: no GPU, no /dev/shm (64 MB on
      // the host), no background services, one renderer process.
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-sync",
      "--mute-audio",
      "--no-first-run",
      "--renderer-process-limit=1",
      "--disable-features=Translate,BackForwardCache,MediaRouter,OptimizationHints,AcceptCHFrame,AutofillServerCommunication,CertificateTransparencyComponentUpdater,PaintHolding,DialMediaRouteProvider",
      "--js-flags=--max-old-space-size=96",
    ],
  });
  // A launch failure must not wedge every future PDF request behind the same
  // rejected promise forever — clear it so the next call retries a fresh launch.
  promise.catch(() => {
    if (browserPromise === promise) browserPromise = null;
  });
  return promise;
}

async function getBrowser(): Promise<Browser> {
  const cached = browserPromise;
  if (cached) {
    const existing = await cached.catch(() => null);
    if (existing?.connected) return existing;
    // The cached browser process died (crash/OOM) — relaunch instead of
    // staying stuck returning a dead browser to every request until restart.
    if (browserPromise === cached) browserPromise = null;
  }
  browserPromise ??= launchBrowser();
  return browserPromise;
}

export async function closePdfBrowser() {
  cancelIdleClose();
  const cached = browserPromise;
  if (cached) {
    browserPromise = null;
    const browser = await cached.catch(() => null);
    await browser?.close().catch(() => undefined);
  }
}

/** Start the shared renderer before the first export, without rendering data. */
export async function warmPdfBrowser() {
  await getBrowser();
  if (activeRenders === 0) scheduleIdleClose();
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
    // The letterhead some designs repeat on every page (see pdfDocumentShell).
    const rh = /<template id="sanad-running-header" data-height="([^"]+)">([\s\S]*?)<\/template>/.exec(html);
    const running = rh ? { height: rh[1], html: rh[2] } : null;
    // The design's colour variables, which the header and footer documents need too.
    const pv = /<template id="sanad-print-vars">([\s\S]*?)<\/template>/.exec(html);
    const vars = pv ? `<style>${pv[1]}</style>` : "";
    const footerLabel = options.footerLabel ?? (english ? "Official administrative document — valid for archiving and audit" : "وثيقة إدارية رسمية معتمدة — صالحة للأرشفة والتدقيق");
    // A4 at 96dpi: fixed-position page decoration is laid out against the
    // viewport, so it must match the paper or the first page comes out wrong.
    await page.setViewport({ width: 794, height: 1123 });
    await page.emulateMediaType("print");
    // The site's fonts travel inside the document, so nothing has to arrive over
    // the network before they can be used.
    const headerHtml = running ? running.html : english ? englishLabels(theme.headerTemplate) : theme.headerTemplate;
    const footerHtml = english ? englishLabels(theme.footerTemplate(footerLabel)) : theme.footerTemplate(footerLabel);
    const marginFonts = await marginTypographyFor(headerHtml + footerHtml);
    await page.setContent(withSiteFonts(html, preloadMarginFonts(marginFonts)), { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForSiteFonts(page);
    const settled = await Promise.race([
      page.waitForNetworkIdle({ idleTime: 250, timeout: 5000 }).then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
    ]).catch(() => false);
    // Stop anything still loading past the budget (a design's own extra font).
    if (!settled) await page.evaluate("window.stop()").catch(() => undefined);
    const pdf = await page.pdf({
      format: "A4",
      landscape: false,
      printBackground: true,
      // Font readiness already has a bounded wait above; Puppeteer's second
      // extra font wait otherwise turns a slow font provider into a failed PDF.
      waitForFonts: false,
      displayHeaderFooter: true,
      headerTemplate: marginFonts + vars + headerHtml,
      footerTemplate: marginFonts + vars + footerHtml,
      // No side margins: designs draw full-bleed side columns and the body's
      // own padding keeps the content in.
      margin: { top: running ? running.height : theme.margin.top, bottom: theme.margin.bottom, left: "0", right: "0" },
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
    // getBrowser relaunches a disconnected browser. A page-only failure can
    // retry on the healthy browser without abandoning a process or disturbing
    // the other in-flight render.
    logger.warn({ err }, "PDF generation failed, retrying once");
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
    logger.warn({ err }, "Image render failed, retrying once");
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
  /** The logo's colour, for designs that take their palette from it. */
  brandColor?: string | null;
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
  .report-stats { display: none; }
  .desc-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin: 0 0 14px; font-size: 10pt; }
${theme.palette ? theme.palette(opts.brandColor) : ""}
${theme.css}
${SITE_PRINT_TYPOGRAPHY}
</style>
</head>
<body class="${isClassic ? "" : "lux"}">
${(() => {
  const top = isClassic ? classicHeader() : themeDecor(theme, ctx) + theme.letterhead(ctx);
  // A design whose letterhead repeats on every page hands it to renderOnce here.
  const running = theme.runningHeader?.(ctx);
  const head =
    (running ? `<template id="sanad-running-header" data-height="${running.height}">${running.html}</template>` : "") +
    (theme.palette ? `<template id="sanad-print-vars">${theme.palette(opts.brandColor)}</template>` : "");
  return en ? englishLabels(top + head) : top + head;
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
