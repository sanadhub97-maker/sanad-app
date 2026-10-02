import type { PrintTheme, ShellContext } from "@/services/printThemes";

/*
 * Five print designs in one family — modern Saudi: deep green, teal and lime,
 * bold geometric shapes (rotated rounded squares), Tajawal at heavy weights,
 * and the status tally as number cards. They share one base for the body
 * (tables, cards, status pills, signatures); each lays out the letterhead its
 * own way.
 *
 *   munassa  المنصة    a full-width green band with the shapes
 *   janib    الجانبي   a green column down the side of every page
 *   bitaqa   البطاقة   the letterhead as a rounded green card inside the page
 *   qutri    القطري    a letterhead cut on a diagonal, with a lime stripe
 *   fatih    الفاتح    the light one: a mint band, dark green type, less ink
 *
 * PDF rules (see printThemes.ts): no gradient with a transparent stop, no
 * repeating-linear-gradient; page-wide art is vertical, on the page background.
 */

type SignatureId = "munassa" | "janib" | "bitaqa" | "qutri" | "fatih";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cls = (ctx: ShellContext) => esc(ctx.classification.split("|")[0].trim());
const PAGE_NO = `صفحة <span class="pageNumber"></span> من <span class="totalPages"></span>`;

function logo(ctx: ShellContext, c: string) {
  if (ctx.logoDataUrl) return `<img class="${c}" src="${ctx.logoDataUrl}" alt="" />`;
  return `<span class="${c} mono-mark">${esc(ctx.companyNameAr.trim().charAt(0) || "س")}</span>`;
}

/** A Puppeteer header/footer box (they don't see the page CSS). */
function tpl(height: string, inner: string, paper = "transparent") {
  return `<style>#header, #footer { padding: 0 !important; margin: 0 !important; } html, body { margin: 0 !important; padding: 0 !important; background: transparent !important; }</style><div style="position:relative;width:100%;height:${height};margin:0;padding:0;background:${paper};font-family:'Tajawal','IBM Plex Sans Arabic','Segoe UI',Tahoma,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${inner}</div>`;
}

const DG = "#00594f"; // deep green
const TEAL = "#00a389";
const LIME = "#c4d600";
const INK = "#10302b";
const MUTE = "#5b736f";
const LINE = "#e3eeeb";
const MINT = "#e7f5f1";

const RED = ":is(.status-EXPIRED, .status-TERMINATED, .status-INACTIVE)";
const AMBER = ":is(.status-EXPIRING_SOON, .status-ON_LEAVE)";
const GREEN = ":is(.status-VALID, .status-ACTIVE)";

/** The family's body: tables, cards, status pills, number cards, signatures. */
const BASE = (pad: string) => `
  body.lux { background: transparent; font-family: 'Tajawal', 'IBM Plex Sans Arabic', sans-serif; color: ${INK}; padding-inline: ${pad}; font-size: 9.4pt; line-height: 1.5; font-variant-numeric: tabular-nums; font-weight: 500; }
  .lux .mono-mark { display: grid; place-items: center; font-weight: 900; }
  .lux .ltr { direction: ltr; unicode-bidi: isolate; }
  .lux table { border-radius: 0; margin-bottom: 0; }
  .lux th, .lux td { border-inline: none; padding: 2.2mm 2.4mm; }
  .lux .report-table.compact th, .lux .report-table.compact td { padding: 1.6mm 1.7mm; }
  .lux .report-table.dense th, .lux .report-table.dense td { padding: 1.1mm 1.2mm; }
  .lux td { border-bottom: .25mm solid ${LINE}; font-size: 9pt; }
  .lux tbody tr:nth-child(even) td { background: none; }
  .lux td[style*="monospace"], .lux tr[style*="monospace"], .lux tr[style*="monospace"] td { font-family: inherit !important; letter-spacing: .02em; }
  .lux thead th { background: none; color: ${DG}; font-weight: 900; font-size: 8.6pt; border: none; border-bottom: 1mm solid ${LIME}; text-align: start; }
  .lux th .th-sub { color: ${MUTE}; font-weight: 500; }
  .lux .report-table tbody td:first-child { color: #8aa39f !important; font-family: inherit !important; font-weight: 700; }
  .lux tbody th { background: ${MINT}; color: ${DG}; font-weight: 700; font-size: 8.6pt; text-align: start; border: none; border-bottom: .4mm solid #ffffff; }
  .lux .section-card { border: none; border-radius: 0; background: transparent; margin-bottom: 6mm; overflow: visible; }
  .lux .section-body { padding: 0 !important; }
  .lux .section-header { background: none; border: none; padding: 0 0 2.6mm; font-size: 12pt; font-weight: 900; color: ${DG}; }
  .lux .section-header > span:first-child::before { content: ""; display: inline-block; width: 2.6mm; height: 2.6mm; border-radius: .7mm; background: ${LIME}; transform: rotate(45deg); margin-inline-end: 2.8mm; vertical-align: .4mm; }
  .lux .section-header > span:not(:first-child) { color: ${MUTE} !important; font-weight: 500 !important; font-size: 8pt !important; font-family: inherit !important; }
  .lux .ref-code { font-family: inherit; color: ${TEAL}; font-weight: 700; font-size: 8.6pt; }
  .lux .badge-status { border: none !important; border-radius: 2mm; padding: .6mm 2.6mm; font-weight: 900; font-size: 8pt; }
  .lux .badge-status${RED} { background: #ffe5e2 !important; color: #c6281c !important; }
  .lux .badge-status${AMBER} { background: #f4f5c7 !important; color: #666800 !important; }
  .lux .badge-status${GREEN} { background: #d7f2ec !important; color: ${DG} !important; }

  .lux .report-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin: 0 0 7mm; }
  .lux .rs { background: #fff; border-radius: 4mm; padding: 3.2mm 4mm; box-shadow: 0 2.5mm 6mm -3mm rgba(0, 60, 50, .35), 0 0 0 .25mm ${LINE}; display: flex; flex-direction: column; gap: .6mm; }
  .lux .rs b { font-size: 21pt; font-weight: 900; line-height: 1; }
  .lux .rs span { font-size: 8.4pt; color: ${MUTE}; font-weight: 500; }
  .lux .rs-red b { color: #c6281c; } .lux .rs-amber b { color: #666800; } .lux .rs-green b { color: ${DG}; }
  .lux .rs-total { background: ${DG}; box-shadow: 0 2.5mm 6mm -3mm rgba(0, 60, 50, .5); } .lux .rs-total b { color: #fff; } .lux .rs-total span { color: ${LIME}; }

  .lux .kpi-total-card { position: relative; overflow: hidden; background: ${DG}; color: #fff; border-radius: 4mm; padding: 6mm 7mm 6mm 34mm; margin-bottom: 6mm; }
  .lux .kpi-total-card::before { content: ""; position: absolute; left: -12mm; top: -9mm; width: 30mm; height: 30mm; border-radius: 6mm; background: ${TEAL}; transform: rotate(45deg); }
  .lux .kpi-total-card::after { content: ""; position: absolute; left: 13mm; top: 11mm; width: 11mm; height: 11mm; border-radius: 2.5mm; background: ${LIME}; transform: rotate(45deg); }
  .lux .kpi-total-card > * { position: relative; z-index: 1; }
  .lux .amount-label { font-size: 11pt; font-weight: 700; }
  .lux .amount-val { font-size: 25pt; font-weight: 900; color: #fff; }
  .lux .amount-val span { font-family: inherit; color: ${LIME}; }
  .lux .total-th { background: none !important; color: ${DG} !important; }
  .lux .total-cell { color: ${DG}; font-weight: 900; background: ${MINT} !important; }
  .lux .desc-box { background: ${MINT}; border: none; border-radius: 3mm; font-size: 10pt; }
  .lux .report-summary-bar { background: ${MINT}; border: none; border-radius: 3mm; color: ${MUTE}; font-size: 8.4pt; }
  .lux .report-summary-bar .summary-kpi { color: ${DG}; font-weight: 900; }
  .lux .empty-state-card { background: ${MINT}; border: none; border-radius: 4mm; }
  .lux .signature-matrix { margin-top: 7mm; }
  .lux .sig-card { border: none; border-radius: 4mm; background: #fff; box-shadow: 0 0 0 .25mm ${LINE}; }
  .lux .sig-card-header { background: ${MINT}; border: none; border-radius: 4mm 4mm 0 0; padding: 2mm; }
  .lux .sig-title-ar { color: ${DG}; font-size: 10pt; font-weight: 900; }
  .lux .sig-card-body { padding: 3mm 4mm; }
  .lux .sig-dots, .lux .sig-name, .lux .sig-date { border-bottom-color: #c5d6d2; }
  .lux .sig-date { font-family: inherit; letter-spacing: .04em; color: ${INK}; font-weight: 700; }
  .lux .official-seal-circle { border: .5mm dashed ${TEAL}; }
  .lux .seal-text-ar { color: ${DG}; } .lux .seal-stars { color: ${TEAL}; }
`;

const footer = (label: string, left: string, right: string) =>
  tpl("15mm", `<div style="position:absolute;right:${right};top:3mm;width:9mm;height:1.4mm;border-radius:1mm;background:${LIME};"></div><div style="position:absolute;right:calc(${right} + 10.5mm);top:3mm;width:4mm;height:1.4mm;border-radius:1mm;background:${TEAL};"></div><div dir="rtl" style="position:absolute;left:${left};right:${right};top:6mm;display:flex;justify-content:space-between;font-size:7.5pt;color:${MUTE};"><span>${label}</span><span style="color:${DG};font-weight:700;">${PAGE_NO}</span></div>`);

/*
 * The letterhead repeats at the top of every page: it is the Puppeteer page
 * header (runningHeader), so everything in it is inline-styled. Web fonts
 * the document loaded (Tajawal) are available to it.
 */

/** Rotated rounded squares; light = for the mint band. */
const shapes = (light: boolean, k = 1) => {
  const sq = (left: number, top: number, size: number, r: number, bg: string, op = 1) =>
    `<div style="position:absolute;left:${left * k}mm;top:${top * k}mm;width:${size * k}mm;height:${size * k}mm;border-radius:${r * k}mm;background:${bg};opacity:${op};transform:rotate(45deg);"></div>`;
  return sq(-16, -24, 70, 10, light ? "#bfe7dd" : TEAL) + sq(30, 12, 36, 6, LIME) + sq(10, 20, 15, 3, light ? DG : "#ffffff", 0.92);
};

function logoTag(ctx: ShellContext, bg: string, mono: string) {
  if (ctx.logoDataUrl)
    return `<img src="${ctx.logoDataUrl}" alt="" style="height:10mm;width:auto;max-width:24mm;object-fit:contain;background:${bg};border-radius:2.5mm;padding:1mm;box-sizing:border-box;display:block;" />`;
  return `<div style="width:10mm;height:10mm;border-radius:2.5mm;background:${bg};color:${mono};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13pt;">${esc(ctx.companyNameAr.trim().charAt(0) || "س")}</div>`;
}

const metaLine = (ctx: ShellContext) =>
  [cls(ctx), `تاريخ الإصدار ${ctx.dateStr}`, `الوقت ${ctx.timeStr}`, ctx.referenceNumber ? `المرجع ${esc(ctx.referenceNumber)}` : ""].filter(Boolean).join(" · ");

/** Company, title and the meta line, for a letterhead's text side. */
function textBlock(ctx: ShellContext, o: { ink: string; sub: string; logoBg: string; mono: string; size?: string }) {
  return `<div style="display:flex;align-items:center;gap:2.5mm;font-size:9pt;font-weight:700;color:${o.ink};">${logoTag(ctx, o.logoBg, o.mono)}<span>${esc(ctx.companyNameAr)}</span></div>
    <div style="margin-top:3mm;font-size:${o.size ?? "17pt"};font-weight:900;line-height:1.2;color:${o.ink};">${esc(ctx.title)}</div>
    <div style="margin-top:2mm;font-size:7.8pt;font-weight:500;color:${o.sub};">${metaLine(ctx)}</div>`;
}

/** A letterhead drawn `band` high, with 6mm of white under it before each page's content. */
const head = (band: number, inner: string) => ({ height: `${band + 6}mm`, html: tpl(`${band + 6}mm`, `<div style="position:relative;height:${band}mm;">${inner}</div>`) });

// ===========================================================================
// 1. المنصة — a full-width green band with the shapes.
// ===========================================================================
const munassa: PrintTheme = {
  id: "munassa" as PrintTheme["id"],
  margin: { top: "52mm", bottom: "15mm" },
  css: `${BASE("15mm")}
  html { background: #ffffff; }
`,
  letterhead: () => "",
  runningHeader: (ctx) =>
    head(
      46,
      `<div dir="rtl" style="position:absolute;inset:0;background:${DG};overflow:hidden;">${shapes(false)}
        <div style="position:absolute;right:15mm;top:7mm;width:62%;">${textBlock(ctx, { ink: "#ffffff", sub: "#cfe9e3", logoBg: "#ffffff", mono: DG })}</div>
      </div>`
    ),
  decor: "",
  headerTemplate: "",
  footerTemplate: (label) => footer(label, "15mm", "15mm"),
};

// ===========================================================================
// 2. الجانبي — a green column down the side of every page.
// ===========================================================================
const COL = "22mm";
const janib: PrintTheme = {
  id: "janib" as PrintTheme["id"],
  margin: { top: "46mm", bottom: "15mm" },
  css: `${BASE("14mm")}
  html { background: linear-gradient(270deg, ${DG} 0, ${DG} ${COL}, #ffffff ${COL}, #ffffff 100%) !important; }
  body.lux { padding-right: calc(${COL} + 10mm); }
`,
  letterhead: () => "",
  runningHeader: (ctx) =>
    head(
      40,
      `<div style="position:absolute;right:0;top:0;bottom:0;width:${COL};background:${DG};overflow:hidden;">
         <div style="position:absolute;right:-12mm;top:4mm;width:30mm;height:30mm;border-radius:6mm;background:${TEAL};transform:rotate(45deg);"></div>
         <div style="position:absolute;right:4mm;top:27mm;width:12mm;height:12mm;border-radius:2.5mm;background:${LIME};transform:rotate(45deg);"></div>
       </div>
       <div dir="rtl" style="position:absolute;right:calc(${COL} + 10mm);left:14mm;top:7mm;bottom:3mm;border-bottom:1mm solid ${LIME};">
         <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6mm;">
           <div style="min-width:0;">${textBlock(ctx, { ink: DG, sub: MUTE, logoBg: "#ffffff", mono: DG })}</div>
         </div>
       </div>`
    ),
  decor: "",
  headerTemplate: "",
  footerTemplate: (label) =>
    tpl("15mm", `<div style="position:absolute;right:0;top:0;bottom:0;width:${COL};background:${DG};"></div><div dir="rtl" style="position:absolute;left:14mm;right:calc(${COL} + 10mm);top:5mm;display:flex;justify-content:space-between;font-size:7.5pt;color:${MUTE};"><span>${label}</span><span style="color:${DG};font-weight:700;">${PAGE_NO}</span></div>`),
};

// ===========================================================================
// 3. البطاقة — the letterhead as a rounded green card.
// ===========================================================================
const bitaqa: PrintTheme = {
  id: "bitaqa" as PrintTheme["id"],
  margin: { top: "54mm", bottom: "15mm" },
  css: `${BASE("14mm")}
  html { background: #ffffff; }
`,
  letterhead: () => "",
  runningHeader: (ctx) =>
    head(
      48,
      `<div dir="rtl" style="position:absolute;left:14mm;right:14mm;top:7mm;bottom:2mm;border-radius:6mm;background:${DG};overflow:hidden;">${shapes(false, 0.85)}
        <div style="position:absolute;right:7mm;top:6mm;width:64%;">${textBlock(ctx, { ink: "#ffffff", sub: "#cfe9e3", logoBg: "#ffffff", mono: DG, size: "16pt" })}</div>
      </div>`
    ),
  decor: "",
  headerTemplate: "",
  footerTemplate: (label) => footer(label, "14mm", "14mm"),
};

// ===========================================================================
// 4. القطري — a letterhead cut on a diagonal, with a lime stripe.
// ===========================================================================
const qutri: PrintTheme = {
  id: "qutri" as PrintTheme["id"],
  margin: { top: "56mm", bottom: "15mm" },
  css: `${BASE("15mm")}
  html { background: #ffffff; }
`,
  letterhead: () => "",
  runningHeader: (ctx) =>
    head(
      50,
      `<div style="position:absolute;inset:0;background:${LIME};clip-path:polygon(0 0,100% 0,100% 80%,0 100%);"></div>
       <div dir="rtl" style="position:absolute;inset:0;background:${DG};clip-path:polygon(0 0,100% 0,100% 72%,0 91%);overflow:hidden;">${shapes(false)}
         <div style="position:absolute;right:15mm;top:6mm;width:60%;">${textBlock(ctx, { ink: "#ffffff", sub: "#cfe9e3", logoBg: "#ffffff", mono: DG })}</div>
       </div>`
    ),
  decor: "",
  headerTemplate: "",
  footerTemplate: (label) => footer(label, "15mm", "15mm"),
};

// ===========================================================================
// 5. الفاتح — the light one: a mint band, dark green type.
// ===========================================================================
const fatih: PrintTheme = {
  id: "fatih" as PrintTheme["id"],
  margin: { top: "52mm", bottom: "15mm" },
  css: `${BASE("15mm")}
  html { background: #ffffff; }
  .lux .kpi-total-card { background: ${MINT}; color: ${DG}; }
  .lux .kpi-total-card::before { background: #bfe7dd; }
  .lux .amount-val { color: ${DG}; }
  .lux .amount-val span { color: ${TEAL}; }
  .lux .rs-total { background: ${MINT}; box-shadow: 0 0 0 .25mm ${LINE}; } .lux .rs-total b { color: ${DG}; } .lux .rs-total span { color: ${MUTE}; }
`,
  letterhead: () => "",
  runningHeader: (ctx) =>
    head(
      46,
      `<div dir="rtl" style="position:absolute;left:0;right:0;top:0;bottom:1mm;background:${MINT};overflow:hidden;">${shapes(true)}
        <div style="position:absolute;right:15mm;top:7mm;width:62%;">${textBlock(ctx, { ink: DG, sub: MUTE, logoBg: "#ffffff", mono: DG })}</div>
      </div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:1mm;background:${LIME};"></div>`
    ),
  decor: "",
  headerTemplate: "",
  footerTemplate: (label) => footer(label, "15mm", "15mm"),
};

export const SIGNATURE_THEMES: Record<SignatureId, PrintTheme> = { munassa, janib, bitaqa, qutri, fatih };
export const SIGNATURE_THEME_IDS = Object.keys(SIGNATURE_THEMES) as SignatureId[];
