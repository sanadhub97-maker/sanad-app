import type { PrintTheme, ShellContext } from "@/services/printThemes";

/*
 * فاخر (Fakhir), the print side of the site's luxury edition: a white page,
 * a letterhead repeated at the top of every page (the company's mark in a
 * gold-edged tile, its name, the issue details) over a gold rule, four
 * figure tiles, a calm table with a light head and status pills, and a
 * footer rule. Navy ink and royal gold, as on the site.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const PAGE_NO = `صفحة <span class="pageNumber"></span> من <span class="totalPages"></span>`;
const NAVY = "#0f172a";
const GOLD = "#a8792f";
const GOLD_L = "#d8b46a";
const SOFT = "#f5f6fa";
const LINE = "#e2e8f0";
const MUTED = "#64748b";

function tpl(height: string, inner: string) {
  return `<style>#header, #footer { padding: 0 !important; margin: 0 !important; } html, body { margin: 0 !important; padding: 0 !important; background: transparent !important; }</style><div dir="rtl" style="position:relative;width:100%;height:${height};margin:0;padding:0;font-family:'Zain','Cairo',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${inner}</div>`;
}

function mark(ctx: ShellContext) {
  const inner = ctx.logoDataUrl
    ? `<img src="${ctx.logoDataUrl}" alt="" style="width:12mm;height:12mm;object-fit:contain;display:block;" />`
    : `<div style="font-size:15pt;font-weight:800;color:#fff;">${esc(ctx.companyNameAr.trim().charAt(0) || "س")}</div>`;
  const bg = ctx.logoDataUrl ? "#ffffff" : NAVY;
  return `<div style="width:15mm;height:15mm;border-radius:3.6mm;background:${bg};border:.5mm solid ${GOLD_L};display:flex;align-items:center;justify-content:center;flex:none;box-sizing:border-box;">${inner}</div>`;
}

const RED = ":is(.status-EXPIRED, .status-TERMINATED, .status-INACTIVE)";
const AMBER = ":is(.status-EXPIRING_SOON, .status-ON_LEAVE)";
const GREEN = ":is(.status-VALID, .status-ACTIVE)";

const fakhir: PrintTheme = {
  id: "fakhir" as PrintTheme["id"],
  margin: { top: "40mm", bottom: "16mm" },
  css: `
  html { background: #ffffff; }
  body.lux { background: transparent; color: ${NAVY}; padding-inline: 14mm; font-size: 9pt; line-height: 1.6; font-variant-numeric: tabular-nums; }
  .lux .ltr { direction: ltr; unicode-bidi: isolate; }
  .lux td[style*="monospace"], .lux tr[style*="monospace"], .lux tr[style*="monospace"] td { font-family: inherit !important; }

  .lux .section-card { border: none; border-radius: 0; background: transparent; overflow: visible; margin-bottom: 7mm; }
  .lux .section-body { padding: 0 !important; }
  .lux .section-header { background: none; border: none; padding: 0 0 2.5mm; display: flex; justify-content: space-between; align-items: baseline; color: ${NAVY}; font-size: 11.5pt; font-weight: 800; }
  .lux .section-header > span:first-child::after { content: ""; display: block; width: 12mm; height: .7mm; margin-top: 1.2mm; border-radius: 1mm; background: ${GOLD}; }

  .lux table { border-collapse: separate; border-spacing: 0 1.2mm; margin-bottom: 0; border: none !important; }
  .lux th, .lux td { border: none !important; padding: 2.4mm 2.8mm; }
  .lux thead th { background: ${NAVY}; color: #fff; font-weight: 700; font-size: 8pt; text-align: start; }
  .lux thead th:first-child { border-radius: 0 2.4mm 2.4mm 0; } .lux thead th:last-child { border-radius: 2.4mm 0 0 2.4mm; }
  .lux thead th .th-sub { color: #fff; opacity: .65; }
  .lux tbody td { background: ${SOFT}; font-size: 8.8pt; }
  .lux tbody tr:nth-child(even) td { background: ${SOFT}; }
  .lux tbody tr > :first-child { border-radius: 0 2.4mm 2.4mm 0; } .lux tbody tr > :last-child { border-radius: 2.4mm 0 0 2.4mm; }
  .lux .report-table tbody td:first-child { color: ${GOLD} !important; font-weight: 800; white-space: nowrap; }
  .lux tbody th { background: #eef1f6; color: ${NAVY}; font-weight: 700; font-size: 8pt; text-align: start; border-radius: 2.4mm; }

  .lux .badge-status { border: none !important; border-radius: 99px !important; padding: .5mm 3mm !important; font-weight: 700; font-size: 7.6pt; }
  .lux .badge-status${RED} { background: #fdeaea !important; color: #c62839 !important; }
  .lux .badge-status${AMBER} { background: #fdf3e2 !important; color: #b86a00 !important; }
  .lux .badge-status${GREEN} { background: #e7f6ee !important; color: #138a55 !important; }

  .lux .report-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3.5mm; margin-bottom: 7mm; }
  .lux .rs { border: .35mm solid ${LINE}; border-radius: 3.4mm; padding: 3mm 4mm; background: #fff; box-shadow: inset 0 -.8mm 0 var(--c); }
  .lux .rs b { display: block; font-size: 17pt; font-weight: 800; line-height: 1.15; color: var(--c); }
  .lux .rs span { font-size: 7.8pt; color: ${MUTED}; }
  .lux .rs-red { --c: #c62839; } .lux .rs-amber { --c: #b86a00; } .lux .rs-green { --c: #138a55; } .lux .rs-total { --c: ${GOLD}; }

  .lux .report-summary-bar { background: ${SOFT}; border: none; border-radius: 99px; color: ${MUTED}; padding: 2mm 5mm; }
  .lux .report-summary-bar .summary-kpi { color: ${NAVY}; }
  .lux .kpi-total-card { background: linear-gradient(120deg, ${NAVY}, #2a2414); color: #fff; border-radius: 5mm; padding: 6mm 8mm; margin-bottom: 7mm; text-align: center; flex-direction: column; justify-content: center; gap: 1mm; border-bottom: .9mm solid ${GOLD_L}; }
  .lux .amount-label { font-size: 10pt; font-weight: 700; opacity: .85; }
  .lux .amount-val { font-size: 28pt; font-weight: 800; color: #f3dca3; }
  .lux .amount-val span { font-family: inherit; }
  .lux .amount-sub { color: #fff; opacity: .7; }
  .lux .total-th { background: ${NAVY} !important; color: #fff !important; }
  .lux .total-cell { color: ${GOLD}; font-weight: 800; background: ${SOFT} !important; }
  .lux .desc-box { background: ${SOFT}; border: none; border-radius: 3mm; }
  .lux .ref-code { color: ${GOLD}; }
  .lux .empty-state-card { background: ${SOFT}; border: none; border-radius: 4mm; }

  .lux .sig-card { border: none; border-radius: 0; background: transparent; }
  .lux .sig-card-header { background: none; border: none; border-bottom: .4mm solid ${GOLD_L}; padding: 1.5mm 1mm; }
  .lux .sig-title-ar { color: ${NAVY}; font-size: 10pt; font-weight: 800; }
  .lux .sig-title-en { color: ${GOLD}; letter-spacing: .06em; }
  .lux .sig-card-body { padding: 3mm 1mm; }
  .lux .sig-dots, .lux .sig-name, .lux .sig-date { border-bottom-color: #94a3b8; }
  .lux .official-seal-circle { border: .5mm solid ${GOLD}; }
  .lux .seal-text-ar { color: ${NAVY}; } .lux .seal-stars, .lux .seal-text-en { color: ${GOLD}; }
`,
  letterhead: () => "",
  runningHeader: (ctx) => {
    const meta = [ctx.referenceNumber ? `المرجع <b dir="ltr">${esc(ctx.referenceNumber)}</b>` : "", `تاريخ الإصدار <b dir="ltr">${ctx.dateStr}</b>`, `الوقت <b dir="ltr">${ctx.timeStr}</b>`].filter(Boolean);
    return {
      height: "36mm",
      html: tpl(
        "36mm",
        `<div style="position:absolute;left:14mm;right:14mm;top:8mm;display:flex;align-items:center;gap:4mm;">
           ${mark(ctx)}
           <div style="flex:1;min-width:0;">
             <div style="font-size:14pt;font-weight:800;color:${NAVY};line-height:1.25;">${esc(ctx.companyNameAr)}</div>
             <div style="font-size:7.4pt;color:${MUTED};">${esc(ctx.companyNameEn)}</div>
           </div>
           <div style="text-align:left;font-size:7.4pt;color:${MUTED};line-height:1.7;">${meta.map((m) => `<div>${m}</div>`).join("")}</div>
         </div>
         <div style="position:absolute;left:14mm;right:14mm;top:26mm;display:flex;align-items:baseline;justify-content:space-between;">
           <div style="font-size:12.5pt;font-weight:800;color:${NAVY};">${esc(ctx.title)}</div>
           <div style="font-size:7.4pt;color:${GOLD};font-weight:700;">${esc(ctx.classification.split("|")[0].trim())}</div>
         </div>
         <div style="position:absolute;left:14mm;right:14mm;top:33.2mm;height:.8mm;border-radius:1mm;background:${GOLD};"></div>`
      ),
    };
  },
  decor: "",
  headerTemplate: "",
  footerTemplate: (label) =>
    tpl("16mm", `<div style="position:absolute;left:14mm;right:14mm;top:4mm;height:.3mm;background:${LINE};"></div><div style="position:absolute;left:14mm;right:14mm;top:6mm;display:flex;justify-content:space-between;font-size:7.4pt;color:${MUTED};"><span>${label}</span><span style="color:${GOLD};font-weight:700;letter-spacing:.15em;">SANAD</span><span>${PAGE_NO}</span></div>`),
};

export { fakhir };
