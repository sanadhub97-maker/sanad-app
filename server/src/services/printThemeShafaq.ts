import type { PrintTheme, ShellContext } from "@/services/printThemes";
import { brandPalette } from "@/services/printPalette";

/*
 * الشفق (Shafaq): a gradient from the logo's colours (see printPalette), a
 * curved, centred letterhead that repeats at the top of every page
 * (runningHeader, inline-styled), a gradient table head, and the report's
 * status dashboard (.report-stats, from templates.ts) in a gradient frame.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cls = (ctx: ShellContext) => esc(ctx.classification.split("|")[0].trim());
const PAGE_NO = `صفحة <span class="pageNumber"></span> من <span class="totalPages"></span>`;
const initial = (ctx: ShellContext) => esc(ctx.companyNameAr.trim().charAt(0) || "س");

function tpl(height: string, inner: string, paper = "transparent", font = "'IBM Plex Sans Arabic','Tajawal','Segoe UI',sans-serif") {
  return `<style>#header, #footer { padding: 0 !important; margin: 0 !important; } html, body { margin: 0 !important; padding: 0 !important; background: transparent !important; }</style><div dir="rtl" style="position:relative;width:100%;height:${height};margin:0;padding:0;background:${paper};font-family:${font};-webkit-print-color-adjust:exact;print-color-adjust:exact;">${inner}</div>`;
}
const head = (band: number, inner: string, paper?: string, font?: string) => ({ height: `${band + 6}mm`, html: tpl(`${band + 6}mm`, `<div style="position:relative;height:${band}mm;">${inner}</div>`, paper, font) });

function logoImg(ctx: ShellContext, h: number, style = "") {
  if (ctx.logoDataUrl) return `<img src="${ctx.logoDataUrl}" alt="" style="height:${h}mm;width:auto;max-width:${h * 2.4}mm;object-fit:contain;display:block;${style}" />`;
  return `<div style="width:${h}mm;height:${h}mm;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${h * 1.3}pt;${style}">${initial(ctx)}</div>`;
}
const metaBits = (ctx: ShellContext) => [cls(ctx), `تاريخ الإصدار ${ctx.dateStr}`, `الوقت ${ctx.timeStr}`, ctx.referenceNumber ? `المرجع ${esc(ctx.referenceNumber)}` : ""].filter(Boolean);

const DG = "var(--sg-deep)";
const MID = "var(--sg-mid)";
const ACC = "var(--sg-accent)";
const SOFT = "var(--sg-soft)";
const LINE = "var(--sg-line)";

const RED = ":is(.status-EXPIRED, .status-TERMINATED, .status-INACTIVE)";
const AMBER = ":is(.status-EXPIRING_SOON, .status-ON_LEAVE)";
const GREEN = ":is(.status-VALID, .status-ACTIVE)";

/** Undo the shared PDF styles these designs redraw. */
const RESET = `
  body.lux { background: transparent; font-variant-numeric: tabular-nums; }
  .lux .ltr { direction: ltr; unicode-bidi: isolate; }
  .lux td[style*="monospace"], .lux tr[style*="monospace"], .lux tr[style*="monospace"] td { font-family: inherit !important; }
  .lux table { margin-bottom: 0; border-radius: 0; }
  .lux th, .lux td { border-inline: none; }
  .lux tbody tr:nth-child(even) td { background: none; }
  .lux .section-card { border: none; border-radius: 0; background: transparent; overflow: visible; }
  .lux .section-body { padding: 0 !important; }
  .lux .section-header { background: none; border: none; }
  .lux .badge-status { border: none !important; background: none !important; border-radius: 0; padding: 0; }
  .lux .total-th { background: inherit !important; }
  .lux .amount-val span { font-family: inherit; }
  .lux .sig-card { border: none; border-radius: 0; background: transparent; }
  .lux .sig-card-header { background: none; border: none; }
  .lux .report-stats .rs i { display: block; }
`;

// ===========================================================================
// الشفق — a gradient from the logo's colours, curved and centred.
// ===========================================================================
const GRAD = `linear-gradient(120deg, ${DG} 0%, ${MID} 55%, ${ACC} 100%)`;
const shafaq: PrintTheme = {
  id: "shafaq" as PrintTheme["id"],
  margin: { top: "54mm", bottom: "15mm" },
  css: `${RESET}
  html { background: #ffffff; }
  body.lux { font-family: 'Cairo', sans-serif; color: #172033; padding-inline: 14mm; font-size: 8.8pt; line-height: 1.55; }
  .lux .section-card { margin-bottom: 7mm; }
  .lux .section-header { justify-content: center; text-align: center; padding: 0 0 3mm; font-size: 12pt; font-weight: 800; }
  .lux .section-header > span:first-child { background: ${GRAD}; -webkit-background-clip: text; background-clip: text; color: transparent; }
  .lux .section-header > span:not(:first-child) { display: none; }
  .lux table { border-collapse: separate; border-spacing: 0; }
  .lux th, .lux td { border: none !important; padding: 2.2mm 2.4mm; }
  .lux thead th { background: ${GRAD}; background-attachment: fixed; color: #fff; font-weight: 700; font-size: 7.8pt; text-align: start; }
  .lux thead th:first-child { border-radius: 0 3mm 3mm 0; } .lux thead th:last-child { border-radius: 3mm 0 0 3mm; }
  .lux th .th-sub { color: #fff; opacity: .7; }
  .lux tbody tr:nth-child(even) td { background: ${SOFT}; }
  .lux tbody tr > :first-child { border-radius: 0 2mm 2mm 0; } .lux tbody tr > :last-child { border-radius: 2mm 0 0 2mm; }
  .lux td { font-size: 8.8pt; }
  .lux .report-table tbody td:first-child { color: ${MID} !important; font-weight: 800; }
  .lux tbody th { background: ${SOFT}; color: ${DG}; font-weight: 700; font-size: 8pt; text-align: start; }
  .lux .badge-status { border-radius: 99px !important; padding: .4mm 2.8mm !important; font-weight: 700; font-size: 7.6pt; }
  .lux .badge-status${RED} { background: #ffe4e4 !important; color: #c8282f !important; } .lux .badge-status${AMBER} { background: #fff0cf !important; color: #8f5c00 !important; } .lux .badge-status${GREEN} { background: #d9f5ea !important; color: #0f7a55 !important; }

  .lux .report-stats { display: grid; grid-template-columns: 32mm minmax(0, 1fr) 38mm; gap: 6mm; align-items: center; border: .7mm solid transparent; border-radius: 6mm; background: linear-gradient(#ffffff, #ffffff) padding-box, ${GRAD} border-box; padding: 4.5mm 5.5mm; margin-bottom: 8mm; }
  .lux .rs-chart { position: relative; width: 30mm; height: 30mm; }
  .lux .rs-chart svg { width: 100%; height: 100%; }
  .lux .rs-track { stroke: ${SOFT}; }
  .lux .seg-red { stroke: #e5484d; } .lux .seg-amber { stroke: #f0a420; } .lux .seg-green { stroke: #16a37b; }
  .lux .rs-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .lux .rs-c b { font-size: 17pt; font-weight: 900; color: ${DG}; line-height: 1; } .lux .rs-c span { font-size: 7pt; color: #66708a; }
  .lux .rs-list { display: grid; gap: 2.4mm; }
  .lux .rs { display: grid; grid-template-columns: minmax(0, 1fr) auto 10mm; grid-template-areas: "l n p" "bar bar bar"; align-items: baseline; column-gap: 2mm; row-gap: 1mm; }
  .lux .rs-l { grid-area: l; font-size: 8.2pt; font-weight: 700; }
  .lux .rs b { grid-area: n; font-size: 11pt; font-weight: 900; }
  .lux .rs em { grid-area: p; font-style: normal; font-size: 7.6pt; color: #66708a; text-align: left; }
  .lux .rs i { grid-area: bar; height: 2mm; border-radius: 99px; background: ${SOFT}; overflow: hidden; }
  .lux .rs i u { display: block; height: 100%; border-radius: 99px; background: ${GRAD}; }
  .lux .rs-red b { color: #c8282f; } .lux .rs-amber b { color: #8f5c00; } .lux .rs-green b { color: #0f7a55; }
  .lux .rs-score { align-self: stretch; border-radius: 4.5mm; background: ${GRAD}; color: #fff; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
  .lux .rs-score b { font-size: 24pt; font-weight: 900; line-height: 1; } .lux .rs-score span { font-size: 7.6pt; margin-top: 1mm; }

  .lux .kpi-total-card { background: ${GRAD}; color: #fff; border-radius: 6mm; padding: 6mm 8mm; margin-bottom: 7mm; text-align: center; flex-direction: column; justify-content: center; gap: 1mm; }
  .lux .amount-label { font-size: 10pt; font-weight: 700; opacity: .9; }
  .lux .amount-val { font-size: 28pt; font-weight: 900; color: #fff; }
  .lux .total-th { background: ${GRAD} !important; background-attachment: fixed !important; color: #fff !important; }
  .lux .total-cell { color: ${DG}; font-weight: 900; background: ${SOFT} !important; }
  .lux .desc-box { background: ${SOFT}; border: none; border-radius: 4mm; text-align: center; }
  .lux .report-summary-bar { background: ${SOFT}; border: none; border-radius: 99px; color: #66708a; padding: 2mm 5mm; }
  .lux .report-summary-bar .summary-kpi { color: ${DG}; }
  .lux .sig-card { background: #fff; border-radius: 5mm; border: .5mm solid transparent; background: linear-gradient(#ffffff, #ffffff) padding-box, ${GRAD} border-box; }
  .lux .sig-card-header { padding: 2.6mm 2mm 0; }
  .lux .sig-title-ar { color: ${DG}; font-size: 10pt; font-weight: 800; }
  .lux .sig-card-body { padding: 2.5mm 4mm 3.5mm; }
  .lux .official-seal-circle { border: .5mm solid ${MID}; }
  .lux .seal-text-ar { color: ${DG}; } .lux .seal-stars { color: ${ACC}; }
`,
  letterhead: () => "",
  runningHeader: (ctx) =>
    head(
      48,
      `<div style="position:absolute;inset:0;background:${GRAD};border-radius:0 0 50% 50% / 0 0 16mm 16mm;overflow:hidden;text-align:center;color:#fff;">
         <div style="position:absolute;left:-20mm;top:-30mm;width:70mm;height:70mm;border-radius:50%;border:.4mm solid rgba(255,255,255,.25);"></div>
         <div style="position:absolute;right:-14mm;top:8mm;width:46mm;height:46mm;border-radius:50%;border:.4mm solid rgba(255,255,255,.2);"></div>
         <div style="display:flex;justify-content:center;margin-top:6mm;">${logoImg(ctx, 10, "background:#fff;border-radius:50%;padding:1.4mm;box-sizing:content-box;color:" + DG + ";")}</div>
         <div style="font-size:8.4pt;opacity:.9;margin-top:1.6mm;">${esc(ctx.companyNameAr)}</div>
         <div style="font-size:17pt;font-weight:800;line-height:1.2;margin-top:.6mm;">${esc(ctx.title)}</div>
         <div style="font-size:7.4pt;opacity:.92;margin-top:2mm;">${metaBits(ctx).join(" &nbsp;•&nbsp; ")}</div>
       </div>`,
      undefined,
      "'Cairo','IBM Plex Sans Arabic',sans-serif"
    ),
  palette: brandPalette,
  dashboard: true,
  decor: "",
  headerTemplate: "",
  footerTemplate: (label) =>
    tpl("15mm", `<div style="position:absolute;left:14mm;right:14mm;top:3mm;height:1mm;border-radius:1mm;background:${GRAD};"></div><div style="position:absolute;left:14mm;right:14mm;top:6mm;display:flex;justify-content:space-between;font-size:7.4pt;color:#66708a;"><span>${label}</span><span>${PAGE_NO}</span></div>`, "transparent", "'Cairo',sans-serif"),
};

export { shafaq };
