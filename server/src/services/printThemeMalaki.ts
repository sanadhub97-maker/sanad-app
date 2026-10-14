import type { PrintTheme, ShellContext } from "@/services/printThemes";

/*
 * الملكي (Malaki), the house print design, as the site's Royale look on
 * paper: a white page held in a double gold frame on every page (its sides
 * are the page background, its top and bottom the running header and the
 * footer), a letterhead repeated on every page — the company's mark in a gold
 * medallion, its name, the issue details, the title between ornaments over a
 * jewelled rule — figure tiles with engraved gold corners, tables with an
 * ink head in gold letters, ivory rows on gold hairlines, an ink panel for
 * totals, and signatures with a double-ringed seal. Deep ink and old gold.
 *
 * PDF rules kept: no transparent gradient stops, no repeating gradients.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const PAGE_NO = `صفحة <span class="pageNumber"></span> من <span class="totalPages"></span>`;
const dataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export interface Palette { INK: string; INK2: string; GOLD: string; GOLD_L: string; GOLD_P: string; IVORY: string; IVORY2: string; LINE: string; MUTED: string; PAPER: string }
/** `band`: the letterhead on an ink band; `frame`: two gold rules, or a border of eight-pointed stars. */
export interface Style { band?: boolean; frame?: "rules" | "stars" }

function build(id: string, P: Palette, style: Style = {}): PrintTheme {
const { INK, INK2, GOLD, GOLD_L, GOLD_P, IVORY, IVORY2, LINE, MUTED, PAPER } = P;
void INK2;
const stars = style.frame === "stars";

/** The frame's sides: two gold rules 6mm and 7.4mm in from each edge, over the paper (one opaque gradient). */
/** A tile of the star border: an eight-pointed star (two squares) with a dot, on the paper. */
const STAR = dataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><rect width="12" height="12" fill="${PAPER}"/><polygon points="6.00 0.80 6.88 3.88 9.68 2.32 8.12 5.12 11.20 6.00 8.12 6.88 9.68 9.68 6.88 8.12 6.00 11.20 5.12 8.12 2.32 9.68 3.88 6.88 0.80 6.00 3.88 5.12 2.32 2.32 5.12 3.88" fill="${GOLD_L}" stroke="${GOLD}" stroke-width=".45"/><circle cx="6" cy="6" r="1.1" fill="${PAPER}"/></svg>`);

function frameSides() {
  if (stars) {
    // The star bands 5mm in, and one fine rule inside them.
    const g = (a: string, b: string) => `${GOLD} ${a} ${b}`;
    const p = (a: string, b: string) => `${PAPER} ${a} ${b}`;
    const rule = `linear-gradient(90deg, ${[p("0", "10.8mm"), g("10.8mm", "11.05mm"), p("11.05mm", "calc(100% - 11.05mm)"), g("calc(100% - 11.05mm)", "calc(100% - 10.8mm)"), p("calc(100% - 10.8mm)", "100%")].join(", ")})`;
    return `url("${STAR}") left 5mm top / 4.8mm 4.8mm repeat-y, url("${STAR}") right 5mm top / 4.8mm 4.8mm repeat-y, ${rule}`;
  }
  const g = (a: string, b: string) => `${GOLD} ${a} ${b}`;
  const p = (a: string, b: string) => `${PAPER} ${a} ${b}`;
  return `linear-gradient(90deg, ${[
    p("0", "6mm"), g("6mm", "6.5mm"), p("6.5mm", "7.4mm"), g("7.4mm", "7.65mm"),
    p("7.65mm", "calc(100% - 7.65mm)"),
    g("calc(100% - 7.65mm)", "calc(100% - 7.4mm)"), p("calc(100% - 7.4mm)", "calc(100% - 6.5mm)"),
    g("calc(100% - 6.5mm)", "calc(100% - 6mm)"), p("calc(100% - 6mm)", "100%"),
  ].join(", ")})`;
}


/** Security-print guilloche: interlaced sine bands, stretched to their box. */
function waves(color: string, opacity = 1) {
  const [w, h, lines] = [600, 60, 18];
  const paths: string[] = [];
  for (let k = 0; k < lines; k++) {
    const pts: string[] = [];
    for (let i = 0; i <= 300; i++) {
      const t = (i / 300) * w;
      const u = (t / w) * Math.PI * 2;
      const v = h / 2 + h * 0.42 * Math.sin(u * 6 + k * 0.35) * Math.cos(u * 2 - k * 0.17);
      pts.push(`${t.toFixed(1)} ${v.toFixed(1)}`);
    }
    paths.push(`<path d="M${pts.join("L")}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><g fill="none" stroke="${color}" stroke-width=".6" opacity="${opacity}" vector-effect="non-scaling-stroke">${paths.join("")}</g></svg>`;
}

/** A guilloche rosette (rippled rings between two rims), drawn at (cx, cy) with radius r. */
function rosette(color: string, cx: number, cy: number, r: number, opacity: number) {
  const rings: string[] = [];
  for (let k = 0; k < 22; k++) {
    const pts: string[] = [];
    for (let i = 0; i <= 360; i++) {
      const t = (i / 360) * Math.PI * 2;
      const rr = r * (0.62 + 0.3 * (0.5 + 0.5 * Math.sin(24 * t + k * 0.29)) * (k / 22 + 0.3));
      pts.push(`${(cx + rr * Math.cos(t)).toFixed(1)} ${(cy + rr * Math.sin(t)).toFixed(1)}`);
    }
    rings.push(`<path d="M${pts.join("L")}Z"/>`);
  }
  return `<g fill="none" stroke="${color}" stroke-width=".35" opacity="${opacity}">${rings.join("")}<circle cx="${cx}" cy="${cy}" r="${r}" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="${r * 1.04}" stroke-width=".4"/><circle cx="${cx}" cy="${cy}" r="${r * 0.5}" stroke-width=".6"/></g>`;
}

/** The watermark: one faint rosette in the middle of each page. The tile is as tall as a page's writing area (297 − 42 − 20 mm), so each page gets one. */
const WATERMARK = dataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130">${rosette(GOLD, 65, 65, 62, 0.09)}</svg>`);

/** An ornament for the frame's corners: a diamond in a diamond, centred on the corner. */
function cornerJewel(pos: string) {
  if (stars) pos = pos.replace(/6\.25mm/g, "7.4mm");
  return `<div style="position:absolute;${pos};width:3.4mm;height:3.4mm;transform:translate(var(--tx),var(--ty)) rotate(45deg);background:#fff;border:.4mm solid ${GOLD};box-sizing:border-box;"><div style="position:absolute;inset:.7mm;background:${GOLD};"></div></div>`;
}

function tpl(height: string, inner: string) {
  return `<style>#header, #footer { padding: 0 !important; margin: 0 !important; } html, body { margin: 0 !important; padding: 0 !important; background: transparent !important; }</style><div dir="rtl" style="position:relative;width:100%;height:${height};margin:0;padding:0;font-family:'Zain','Cairo',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${inner}</div>`;
}

/** The frame's top or bottom edge with its corner returns, matching the page-background sides. */
function frameEdge(where: "top" | "bottom", at: string) {
  const side = where === "top" ? "top" : "bottom";
  if (stars)
    return `<div style="position:absolute;left:5mm;right:5mm;${side}:5mm;height:4.8mm;background:url(&quot;${STAR}&quot;) left top / 4.8mm 4.8mm repeat-x;"></div>
    <div style="position:absolute;left:10.8mm;right:10.8mm;${side}:10.8mm;height:0;border-${side}:.25mm solid ${GOLD};"></div>`;
  return `<div style="position:absolute;left:6mm;right:6mm;${side}:${at};height:0;border-${side}:.5mm solid ${GOLD};"></div>
    <div style="position:absolute;left:7.4mm;right:7.4mm;${side}:calc(${at} + 1.4mm);height:0;border-${side}:.25mm solid ${GOLD};"></div>`;
}

/** The frame's sides inside a header or footer band, from `top` to `bottom`, so they meet the page-background sides. */
function frameSidesIn(top: string, bottom: string) {
  if (stars) {
    const t = top === "0" ? "0" : "5mm", b = bottom === "0" ? "0" : "5mm";
    const ti = top === "0" ? "0" : "10.8mm", bi = bottom === "0" ? "0" : "10.8mm";
    return ["left", "right"].map((side) => `<div style="position:absolute;${side}:5mm;top:${t};bottom:${b};width:4.8mm;background:url(&quot;${STAR}&quot;) left top / 4.8mm 4.8mm repeat-y;"></div><div style="position:absolute;${side}:10.8mm;top:${ti};bottom:${bi};width:.25mm;background:${GOLD};"></div>`).join("");
  }
  // The inner rule turns its corner 1.4mm further in, as the edges do.
  const inner = (x: string) => (x === "0" ? "0" : `calc(${x} + 1.4mm)`);
  const v = (side: "left" | "right", at: string, w: string, t: string, b: string) => `<div style="position:absolute;${side}:${at};top:${t};bottom:${b};width:${w};background:${GOLD};"></div>`;
  return ["left", "right"].map((side) => v(side as "left", "6mm", ".5mm", top, bottom) + v(side as "left", "7.4mm", ".25mm", inner(top), inner(bottom))).join("");
}

/** A small diamond on a rule: the jewel at the middle of the title rule. */
const jewel = (size = "2.2mm") => `<span style="display:inline-block;width:${size};height:${size};background:${GOLD};transform:rotate(45deg);flex:none;"></span>`;

function medallion(ctx: ShellContext) {
  const inner = ctx.logoDataUrl
    ? `<img src="${ctx.logoDataUrl}" alt="" style="width:13mm;height:13mm;object-fit:contain;display:block;border-radius:50%;" />`
    : `<div style="font-size:16pt;font-weight:900;color:${GOLD_P};">${esc(ctx.companyNameAr.trim().charAt(0) || "س")}</div>`;
  const bg = ctx.logoDataUrl ? "#ffffff" : INK;
  return `<div style="width:19mm;height:19mm;border-radius:50%;border:.55mm solid ${GOLD};padding:.9mm;box-sizing:border-box;flex:none;">
      <div style="width:100%;height:100%;border-radius:50%;border:.25mm solid ${GOLD_L};background:${bg};display:flex;align-items:center;justify-content:center;box-sizing:border-box;">${inner}</div>
    </div>`;
}

const RED = ":is(.status-EXPIRED, .status-TERMINATED, .status-INACTIVE)";
const AMBER = ":is(.status-EXPIRING_SOON, .status-ON_LEAVE)";
const GREEN = ":is(.status-VALID, .status-ACTIVE)";

/** Engraved corners on a box: two gold brackets, top-right and bottom-left. */
const corners = (sel: string, inset = "1.6mm", size = "4mm") => `
  ${sel} { position: relative; }
  ${sel}::before, ${sel}::after { content: ""; position: absolute; width: ${size}; height: ${size}; border: 0 solid ${GOLD}; pointer-events: none; }
  ${sel}::before { top: ${inset}; right: ${inset}; border-top-width: .4mm; border-right-width: .4mm; }
  ${sel}::after { bottom: ${inset}; left: ${inset}; border-bottom-width: .4mm; border-left-width: .4mm; }`;

const malaki: PrintTheme = {
  id: id as PrintTheme["id"],
  margin: { top: "46mm", bottom: "20mm" },
  css: `
  html { background: ${frameSides()}; }
  /* the watermark, fixed: drawn on every page, in the middle of its writing area */
  .mk-wm { position: fixed; left: 50%; top: 50%; width: 140mm; height: 140mm; transform: translate(-50%, -50%); background: url("${WATERMARK}") center / contain no-repeat; z-index: -1; pointer-events: none; }
  body.lux { background: transparent; color: ${INK}; padding-inline: 15mm; font-size: 9.2pt; line-height: 1.6; font-variant-numeric: tabular-nums; }
  .lux .ltr { direction: ltr; unicode-bidi: isolate; }
  .lux td[style*="monospace"], .lux tr[style*="monospace"], .lux tr[style*="monospace"] td { font-family: inherit !important; }

  /* sections: a title with a gold diamond and a rule running to the margin */
  .lux .section-card { border: none; border-radius: 0; background: transparent; overflow: visible; margin-bottom: 7mm; }
  .lux .section-body { padding: 0 !important; }
  .lux .section-header { background: none; border: none; padding: 0 0 3mm; display: flex; align-items: center; gap: 3mm; color: ${INK}; font-size: 11.5pt; font-weight: 800; }
  .lux .section-header > span:first-child { display: flex; align-items: center; gap: 2.4mm; white-space: nowrap; }
  .lux .section-header > span:first-child::before { content: ""; width: 2.2mm; height: 2.2mm; background: ${GOLD}; transform: rotate(45deg); flex: none; }
  .lux .section-header::after { content: ""; flex: 1; height: .25mm; background: ${GOLD_L}; order: 1; box-shadow: 0 .7mm 0 ${LINE}; }
  .lux .section-header > span:last-child:not(:first-child) { order: 2; color: ${MUTED} !important; font-weight: 600 !important; font-size: 7.8pt !important; white-space: nowrap; }

  /* tables: an ink head in gold letters, ivory rows on gold hairlines */
  .lux table { border-collapse: collapse; margin-bottom: 0; border: none !important; width: 100%; }
  .lux th, .lux td { border: none !important; padding: 2.5mm 3mm; }
  .lux thead th { background: ${INK}; color: ${GOLD_P}; font-weight: 700; font-size: 8pt; letter-spacing: .02em; text-align: start; border-top: .3mm solid ${GOLD_L} !important; border-bottom: .7mm solid ${GOLD} !important; box-shadow: inset 0 -.5mm 0 ${INK}, inset 0 -.75mm 0 ${GOLD_L}; }
  .lux thead th .th-sub { color: ${GOLD_L}; opacity: .8; }
  .lux tbody td { background: transparent; font-size: 8.8pt; border-bottom: .2mm solid ${LINE} !important; }
  .lux tbody tr:nth-child(even) td { background: rgba(243, 236, 219, 0.55); }
  .lux tbody tr:last-child td { border-bottom: .5mm solid ${GOLD_L} !important; }
  /* wide tables: tighter cells, and a number or a date never split over two lines */
  .lux .report-table td { overflow-wrap: normal; word-break: normal; }
  .lux .report-table.compact th, .lux .report-table.compact td { padding: 2mm 1.8mm; font-size: 7.8pt; }
  .lux .report-table.dense th, .lux .report-table.dense td { padding: 1.8mm 1.4mm; font-size: 7pt; }
  .lux .report-table.dense th, .lux .report-table.compact th { font-size: 7.4pt; }
  .lux .report-table tbody td:first-child { color: ${GOLD} !important; font-weight: 800; white-space: nowrap; }
  .lux .report-table tbody td:first-child::before { content: ""; display: inline-block; width: 1.3mm; height: 1.3mm; background: ${GOLD_L}; transform: rotate(45deg); margin-inline-end: 1.6mm; vertical-align: .3mm; }
  .lux tbody th { background: rgba(236, 226, 200, 0.6); color: ${INK}; font-weight: 700; font-size: 8pt; text-align: start; border-bottom: .2mm solid ${LINE} !important; width: 32%; }
  .lux tbody th + td { background: transparent; }

  /* status: an outlined pill in its colour */
  .lux .badge-status { border: .3mm solid currentColor !important; border-radius: 99px !important; padding: .3mm 2.8mm !important; font-weight: 700; font-size: 7.6pt; background: ${PAPER} !important; }
  .lux .badge-status${RED} { color: #a8281b !important; }
  .lux .badge-status${AMBER} { color: #9a5b00 !important; }
  .lux .badge-status${GREEN} { color: #1d6b40 !important; }

  /* figure tiles with engraved corners and a gold foot */
  .lux .report-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3.5mm; margin-bottom: 8mm; }
  .lux .rs { border: .3mm solid ${GOLD_L}; border-radius: 0; padding: 3.8mm 4.4mm 3.4mm; background: ${PAPER}; border-bottom: 1mm solid var(--c); box-shadow: inset 0 0 0 1.1mm ${PAPER}, inset 0 0 0 1.3mm ${LINE}; }
  ${corners(".lux .rs", "1.2mm", "3.2mm")}
  .lux .rs b { display: block; font-size: 19pt; font-weight: 900; line-height: 1.1; color: var(--c); }
  .lux .rs span { font-size: 7.8pt; color: ${MUTED}; font-weight: 600; }
  .lux .rs-red { --c: #a8281b; } .lux .rs-amber { --c: #9a5b00; } .lux .rs-green { --c: #1d6b40; } .lux .rs-total { --c: ${GOLD}; }

  /* the end-of-report line */
  .lux .report-summary-bar { background: ${IVORY}; border: none; border-top: .3mm solid ${GOLD_L}; border-bottom: .3mm solid ${GOLD_L}; border-radius: 0; color: ${MUTED}; padding: 2.2mm 4mm; margin-top: 4mm; }
  .lux .report-summary-bar .summary-kpi { color: ${INK}; }

  /* totals: an ink panel with a gold double rule and the figure in gold */
  .lux .kpi-total-card { background: ${INK}; color: #fff; border-radius: 1mm; padding: 6mm 8mm; margin-bottom: 7mm; text-align: center; flex-direction: column; justify-content: center; gap: 1mm; box-shadow: inset 0 0 0 1.2mm ${INK}, inset 0 0 0 1.5mm ${GOLD}; }
  .lux .amount-label { font-size: 10pt; font-weight: 700; color: ${GOLD_L}; letter-spacing: .04em; }
  .lux .amount-val { font-size: 28pt; font-weight: 900; color: ${GOLD_P}; }
  .lux .amount-val span { font-family: inherit; }
  .lux .amount-sub { color: #fff; opacity: .7; }
  .lux .total-th { background: ${INK} !important; color: ${GOLD_P} !important; }
  .lux .total-cell { color: ${GOLD}; font-weight: 900; background: ${IVORY} !important; }
  .lux .desc-box { background: ${IVORY}; border: none; border-inline-start: .9mm solid ${GOLD}; border-radius: 0; }
  .lux .ref-code { color: ${GOLD}; font-weight: 700; }
  .lux .empty-state-card { background: ${IVORY}; border: .3mm solid ${LINE}; border-radius: 1mm; }
  ${corners(".lux .empty-state-card")}

  /* signatures: gold-ruled boxes and a double-ringed seal */
  .lux .signature-matrix { margin-top: 10mm; }
  .lux .sig-card { border: .3mm solid ${GOLD_L}; border-radius: 0; background: ${PAPER}; box-shadow: inset 0 0 0 1.1mm ${PAPER}, inset 0 0 0 1.3mm ${LINE}; }
  ${corners(".lux .sig-card", "1.2mm", "3mm")}
  .lux .sig-card-header { background: ${IVORY}; border: none; border-bottom: .4mm solid ${GOLD_L}; padding: 2mm 1mm; }
  .lux .sig-title-ar { color: ${INK}; font-size: 10pt; font-weight: 800; }
  .lux .sig-title-en { color: ${GOLD}; letter-spacing: .08em; }
  .lux .sig-card-body { padding: 3mm 3mm; }
  .lux .sig-dots, .lux .sig-name, .lux .sig-date { border-bottom-color: ${GOLD_L}; }
  .lux .official-seal-circle { border: .6mm solid ${GOLD}; box-shadow: 0 0 0 .8mm ${PAPER}, 0 0 0 1.1mm ${GOLD_L}; }
  .lux .seal-text-ar { color: ${INK}; } .lux .seal-stars, .lux .seal-text-en { color: ${GOLD}; }

  /* the documents' own pieces, in the same hand */
  .lux .sc-sum { border-color: ${LINE}; border-radius: 1mm; }
  .lux .sc-sum div { background: ${IVORY}; }
  .lux .sc-sum b { color: ${INK}; }
  .lux .sc-sec .dm { background: ${GOLD}; } .lux .sc-sec .ln { background: ${GOLD_L}; height: .25mm; }
  .lux .sc-est { border-color: ${LINE}; border-radius: 1mm; }
  .lux .sc-est-h { background: ${IVORY}; border-bottom-color: ${GOLD_L}; }
  .lux .sc-mk { background: ${INK}; color: ${GOLD_P}; box-shadow: 0 0 0 .3mm ${GOLD}; }
  .lux .sc-tbl th { background: ${INK}; color: ${GOLD_P}; }
`,
  letterhead: () => "",
  runningHeader: (ctx) => {
    const meta = [
      ctx.referenceNumber ? `<span>المرجع <b dir="ltr" style="color:${style.band ? "#ffffff" : INK};">${esc(ctx.referenceNumber)}</b></span>` : "",
      `<span>تاريخ الإصدار <b dir="ltr" style="color:${style.band ? "#ffffff" : INK};">${ctx.dateStr}</b></span>`,
      `<span>الوقت <b dir="ltr" style="color:${style.band ? "#ffffff" : INK};">${ctx.timeStr}</b></span>`,
    ].filter(Boolean);
    const cls = ctx.classification.split("|")[0].trim();
    return {
      height: "42mm",
      html: tpl(
        "42mm",
        `${frameEdge("top", "6mm")}${frameSidesIn("6mm", "0")}
         ${style.band ? `<div style="position:absolute;left:${stars ? "12.2mm" : "9mm"};right:${stars ? "12.2mm" : "9mm"};top:${stars ? "12.2mm" : "8.8mm"};height:${stars ? "17.4mm" : "20mm"};background:${INK};box-shadow:inset 0 0 0 .8mm ${INK}, inset 0 0 0 1.05mm ${GOLD_L};border-bottom:.6mm solid ${GOLD};"></div>` : ""}
         <div style="--tx:-50%;--ty:-50%;">${cornerJewel("left:6.25mm;top:6.25mm")}</div><div style="--tx:50%;--ty:-50%;">${cornerJewel("right:6.25mm;top:6.25mm")}</div>
         <div style="position:absolute;left:15mm;right:15mm;top:${style.band ? "9.3mm" : "10mm"};display:flex;align-items:center;gap:4mm;">
           ${medallion(ctx)}
           <div style="flex:1;min-width:0;">
             <div style="font-size:15pt;font-weight:900;color:${style.band ? GOLD_P : INK};line-height:1.2;">${esc(ctx.companyNameAr)}</div>
             <div style="margin-top:1mm;display:flex;gap:4mm;font-size:7.4pt;color:${style.band ? "#d8ccb0" : MUTED};">${meta.join("")}</div>
           </div>
           <div style="flex:none;border:.3mm solid ${style.band ? GOLD_L : GOLD};padding:1mm 3.2mm;font-size:7.2pt;font-weight:800;color:${style.band ? GOLD_P : GOLD};letter-spacing:.04em;">${esc(cls)}</div>
         </div>
         <div style="position:absolute;left:15mm;right:15mm;top:30.5mm;height:8.4mm;border-top:.25mm solid ${GOLD_L};border-bottom:.25mm solid ${GOLD_L};background:url(&quot;${dataUri(waves("#c9a464", 0.55))}&quot;) center / 100% 100% no-repeat;display:flex;align-items:center;justify-content:center;">
           <div style="display:flex;align-items:center;gap:2.4mm;background:#fff;padding:0 3mm;height:100%;">
             ${jewel("1.6mm")}
             <div style="border:.45mm solid ${GOLD};padding:.6mm;background:#fff;"><div style="border:.2mm solid ${GOLD_L};padding:.4mm 6mm;font-size:12.5pt;font-weight:900;color:${INK};white-space:nowrap;line-height:1.35;">${esc(ctx.title)}</div></div>
             ${jewel("1.6mm")}
           </div>
         </div>`
      ),
    };
  },
  decor: `<div class="mk-wm" aria-hidden="true"></div>`,
  headerTemplate: "",
  footerTemplate: (label) =>
    tpl(
      "20mm",
      `<div style="position:absolute;left:15mm;right:15mm;top:3.5mm;display:flex;align-items:center;justify-content:space-between;font-size:7.2pt;color:${MUTED};">
         <span>${label}</span>
         <span style="display:flex;align-items:center;gap:2mm;color:${GOLD};font-weight:800;letter-spacing:.3em;"><span style="width:14mm;height:.25mm;background:${GOLD_L};"></span>${jewel("1.2mm")}SANAD${jewel("1.2mm")}<span style="width:14mm;height:.25mm;background:${GOLD_L};"></span></span>
         <span>${PAGE_NO}</span>
       </div>
       ${frameEdge("bottom", "6mm")}${frameSidesIn("0", "6mm")}
       <div style="--tx:-50%;--ty:50%;">${cornerJewel("left:6.25mm;bottom:6.25mm")}</div><div style="--tx:50%;--ty:50%;">${cornerJewel("right:6.25mm;bottom:6.25mm")}</div>`
    ),
};

return malaki;
}

/** الملكي: deep ink and old gold. */
export const malaki = build("malaki", { INK: "#1a1610", INK2: "#3b3324", GOLD: "#9a7433", GOLD_L: "#c9a464", GOLD_P: "#e8cc8e", IVORY: "#faf6ec", IVORY2: "#f3ecdb", LINE: "#e6dcc4", MUTED: "#7a6c55", PAPER: "#ffffff" });
/** الزمردي الإمبراطوري: deep emerald and gold, the letterhead on an emerald band. */
export const zumurrudi = build("zumurrudi", { INK: "#0e2b23", INK2: "#1d4a3c", GOLD: "#987232", GOLD_L: "#c7a25f", GOLD_P: "#ecd49a", IVORY: "#f6f8f2", IVORY2: "#e9efe6", LINE: "#dfe5da", MUTED: "#5f6f66", PAPER: "#ffffff" }, { band: true });
/** العقيق: deep garnet and gold in a border of eight-pointed stars. */
export const aqiq = build("aqiq", { INK: "#3e0f1a", INK2: "#5c1d2a", GOLD: "#9a7433", GOLD_L: "#c9a464", GOLD_P: "#efd7a0", IVORY: "#fbf6f2", IVORY2: "#f3e8e2", LINE: "#ecdcd5", MUTED: "#7a5f5a", PAPER: "#ffffff" }, { frame: "stars", band: true });
