// Print designs for every server-rendered PDF (reports, payment voucher,
// employee profile). "classic" is the original design; the others are the
// luxury designs picked in Settings → Print.
//
// Layout model: the PDF has no left/right page margin, so a theme can draw
// full-bleed side columns; the body's own side padding keeps the content in.
// Per-page decoration comes from three places that together repeat on every
// page: Puppeteer's header/footer templates (drawn in the top/bottom margins)
// and position:fixed elements in the body (drawn in between). The first
// page additionally gets the theme's letterhead.

export const PRINT_THEME_IDS = ["classic", "royal", "emerald", "executive", "burgundy", "sapphire", "bronze"] as const;
export type PrintThemeId = (typeof PRINT_THEME_IDS)[number];
export const DEFAULT_PRINT_THEME: PrintThemeId = "classic";

export function isPrintThemeId(v: unknown): v is PrintThemeId {
  return typeof v === "string" && (PRINT_THEME_IDS as readonly string[]).includes(v);
}

export interface ShellContext {
  title: string;
  titleEn?: string;
  companyNameAr: string;
  companyNameEn: string;
  logoDataUrl?: string | null;
  referenceNumber?: string;
  classification: string;
  dateStr: string;
  timeStr: string;
  /** A headline figure some designs show large, e.g. a report's row count. */
  highlight?: { value: string; label: string };
}

export interface PrintTheme {
  id: PrintThemeId;
  margin: { top: string; bottom: string };
  /** CSS appended after the shared base styles. */
  css: string;
  /** The first page's letterhead (replaces the classic header and title banner). */
  letterhead: (ctx: ShellContext) => string;
  /** position:fixed decoration, repeated on every page between the margins. */
  decor: string;
  headerTemplate: string;
  footerTemplate: (label: string) => string;
}

// ---------------------------------------------------------------------------
// Generated line art (security-print "guilloche" and seals)
// ---------------------------------------------------------------------------

function wavePaths(w: number, h: number, lines: number, vertical: boolean) {
  const L = vertical ? h : w;
  const T = vertical ? w : h;
  const paths: string[] = [];
  for (let k = 0; k < lines; k++) {
    const pts: string[] = [];
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * L;
      const u = (t / L) * Math.PI * 2;
      const v = T / 2 + T * 0.42 * Math.sin(u * 3 + k * 0.24) * Math.cos(u * 1.5 - k * 0.12);
      pts.push(vertical ? `${v.toFixed(1)} ${t.toFixed(1)}` : `${t.toFixed(1)} ${v.toFixed(1)}`);
    }
    paths.push(`<path d="M${pts.join("L")}" opacity="${(0.35 + 0.5 * Math.abs(Math.sin(k * 0.4))).toFixed(2)}"/>`);
  }
  return paths.join("");
}

/** Interlaced sine bands, stretched to fill their box. */
export function wavesSvg(color: string, vertical = false) {
  const [w, h] = vertical ? [120, 600] : [600, 120];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="100%" height="100%"><g fill="none" stroke="${color}" stroke-width=".7" vector-effect="non-scaling-stroke">${wavePaths(w, h, 24, vertical)}</g></svg>`;
}

/** A circular seal: rippled rings between two solid rims, white centre. */
export function rosetteSvg(color: string) {
  const c = 100;
  const R = 97;
  const rings: string[] = [];
  for (let k = 0; k < 16; k++) {
    const pts: string[] = [];
    for (let i = 0; i <= 360; i++) {
      const t = (i / 360) * Math.PI * 2;
      const r = R * (0.8 + 0.1 * Math.sin(18 * t + k * 0.39));
      pts.push(`${(c + r * Math.cos(t)).toFixed(1)} ${(c + r * Math.sin(t)).toFixed(1)}`);
    }
    rings.push(`<path d="M${pts.join("L")}Z"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${color}" stroke-width=".55">${rings.join("")}</g><circle cx="100" cy="100" r="${R}" fill="none" stroke="${color}" stroke-width="2"/><circle cx="100" cy="100" r="58" fill="#fff" stroke="${color}" stroke-width="2"/></svg>`;
}

const dataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// Page-level art is drawn as the page background rather than with
// position:fixed, which Chrome does not reliably repeat onto the first page.
// It is vertical (side rules, side columns), so it lines up on every page.

/** Two thin rules 7mm in from one side edge (direction 90deg = left). */
function doubleRule(direction: string, color: string) {
  return `linear-gradient(${direction}, transparent 7mm, ${color} 7mm 7.35mm, transparent 7.35mm 7.85mm, ${color} 7.85mm 8.2mm, transparent 8.2mm)`;
}

/** One 18mm-square tile of the mashrabiya lattice for the bronze side column. */
function spineTile(color: string) {
  const cell = (x: number, y: number) =>
    `<g transform="translate(${x} ${y})"><path d="M10 1l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"/><circle cx="10" cy="10" r="2"/><path d="M0 0l4 4M20 0l-4 4M0 20l4-4M20 20l-4-4"/></g>`;
  const cells = [0, 20, 40].flatMap((y) => [0, 20, 40].map((x) => cell(x, y))).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60"><g fill="none" stroke="${color}" stroke-width=".8" opacity=".5">${cells}</g></svg>`;
}

// Repeating geometric patterns, as data URIs for background-image.
const PATTERNS = {
  star: (c: string) =>
    dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><g fill="none" stroke="${c}" stroke-width=".8" opacity=".38"><path d="M18 4l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="M8 8h20v20H8z" transform="rotate(45 18 18)"/><path d="M8 8h20v20H8z"/></g></svg>`),
  lattice: (c: string) =>
    dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><g fill="none" stroke="${c}" stroke-width=".9" opacity=".6"><circle cx="0" cy="12" r="12"/><circle cx="24" cy="12" r="12"/><circle cx="12" cy="0" r="12"/><circle cx="12" cy="24" r="12"/></g></svg>`),
  diamond: (c: string) =>
    dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><g fill="none" stroke="${c}" stroke-width=".7" opacity=".3"><path d="M20 0L40 20 20 40 0 20z"/><path d="M20 10L30 20 20 30 10 20z"/></g></svg>`),
  mashrabiya: (c: string) =>
    dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><g fill="none" stroke="${c}" stroke-width=".8" opacity=".5"><path d="M10 1l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"/><circle cx="10" cy="10" r="2"/><path d="M0 0l4 4M20 0l-4 4M0 20l4-4M20 20l-4-4"/></g></svg>`),
};

const FOIL = {
  gold: "linear-gradient(100deg,#8a6a2f 0%,#d9bd7c 22%,#f6e7b8 38%,#b8924a 55%,#e9d39a 72%,#8f6d31 100%)",
  silver: "linear-gradient(100deg,#7d8794 0%,#d9dee5 25%,#ffffff 40%,#a8b1bd 58%,#e7ebf0 75%,#7a8490 100%)",
  bronze: "linear-gradient(100deg,#7a4a28 0%,#c98f5f 24%,#f1cfa8 40%,#a8683c 58%,#deae82 76%,#6f4222 100%)",
};

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function logo(ctx: ShellContext, cls: string) {
  if (ctx.logoDataUrl) return `<img class="${cls}" src="${ctx.logoDataUrl}" alt="" />`;
  // No logo uploaded: a monogram of the company's first letter.
  return `<span class="${cls} monogram">${esc(ctx.companyNameAr.trim().charAt(0) || "س")}</span>`;
}

function refLines(ctx: ShellContext) {
  return [
    ctx.referenceNumber ? `<span>المرجع <b class="ltr">${esc(ctx.referenceNumber)}</b></span>` : "",
    `<span>تاريخ الإصدار <b class="ltr">${ctx.dateStr}</b></span>`,
    `<span>وقت الطباعة <b class="ltr">${ctx.timeStr}</b></span>`,
  ].join("");
}

/** Wraps a Puppeteer header/footer template. Templates don't see the page's
 * CSS, so everything is inline; backgrounds need print-color-adjust. Chrome
 * pads its #header/#footer boxes by default, which would push the art ~4mm in. */
function tpl(height: string, inner: string, paper = "transparent") {
  return `<style>#header, #footer { padding: 0 !important; margin: 0 !important; } html, body { margin: 0 !important; padding: 0 !important; background: transparent !important; }</style><div style="position:relative;width:100%;height:${height};margin:0;padding:0;background:${paper};font-family:'Segoe UI',Tahoma,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${inner}</div>`;
}
const PAGE_NO = `صفحة <span class="pageNumber"></span> من <span class="totalPages"></span>`;

/** Styles every luxury design shares, driven by the design's variables. */
const LUX_BASE = `
  html { background: var(--paper); }
  body.lux { background: transparent; font-family: 'IBM Plex Sans Arabic', 'Cairo', 'Segoe UI', sans-serif; color: #1e1b17; padding-right: var(--pad-r); padding-left: var(--pad-l); }
  .ltr { direction: ltr; unicode-bidi: isolate; font-family: 'IBM Plex Mono', monospace; }
  .monogram { display: grid; place-items: center; font-weight: 800; }
  .foil-text { background: var(--foil); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .lux table { border-radius: 0; }
  .lux th, .lux td { border-inline: none; border-bottom: 1px solid var(--line); }
  .lux thead th { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); border-bottom: 2px solid var(--metal); font-weight: 600; }
  .lux thead th .th-sub { color: var(--accent-ink); opacity: .65; }
  .lux tbody th { background: var(--metal-soft); color: var(--accent); font-weight: 700; text-align: start; border-color: var(--line); }
  .lux tbody tr:nth-child(even) td { background: var(--row); }
  .lux .section-card { border: 1px solid var(--line); border-radius: var(--radius); background: #fff; }
  .lux .section-header { background: var(--metal-soft); color: var(--accent); border-bottom: 2px solid var(--metal); font-family: var(--heading); font-weight: 700; }
  .lux .report-summary-bar { background: var(--metal-soft); border: 1px solid var(--line); border-radius: var(--radius); color: #5f574c; }
  .lux .report-summary-bar .summary-kpi { color: var(--accent); }
  .lux .kpi-total-card { background: var(--accent); color: var(--accent-ink); border-radius: var(--radius); border-bottom: 3px solid var(--metal); }
  .lux .amount-val { background: var(--foil); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .lux .amount-sub { color: var(--accent-ink); opacity: .7; }
  .lux .ref-code { color: var(--metal-deep); }
  .lux .total-th { background: var(--metal-deep) !important; }
  .lux .total-cell { color: var(--accent); background: var(--metal-soft); }
  .lux .desc-box { background: var(--row); border-color: var(--line); }
  .lux .sig-card { border: none; background: transparent; border-radius: 0; }
  .lux .sig-card-header { background: transparent; border: none; border-bottom: 1.5px solid var(--accent); padding: 4px 2px; }
  .lux .sig-title-ar { font-family: var(--heading); color: var(--accent); font-size: 10pt; }
  .lux .sig-title-en { color: var(--metal-deep); letter-spacing: .06em; }
  .lux .sig-card-body { padding: 10px 2px; }
  .lux .sig-dots { border-bottom-color: var(--line-strong); }
  .lux .official-seal-circle { width: 96px; height: 96px; border: none; border-radius: 50%; background: var(--seal) center / contain no-repeat; padding: 0; }
  .lux .seal-stars { color: var(--metal-deep); font-size: 5.5pt; }
  .lux .seal-text-ar { color: var(--accent); font-size: 6.6pt; }
  .lux .seal-text-en { color: var(--metal-deep); font-size: 4.8pt; }
  .lux .empty-state-card { background: var(--row); border-color: var(--line); }
  .lux .badge-status { border-radius: 3px; }
`;

const vars = (v: Record<string, string>) => `:root{${Object.entries(v).map(([k, val]) => `--${k}:${val};`).join("")}}`;

// ---------------------------------------------------------------------------
// Designs
// ---------------------------------------------------------------------------

const classic: PrintTheme = {
  id: "classic",
  margin: { top: "14mm", bottom: "16mm" },
  css: `body { padding: 0 12mm; }`,
  letterhead: () => "", // the shell renders the original header for classic
  decor: "",
  headerTemplate: "<span></span>",
  footerTemplate: (label) =>
    `<div style="width:100%; font-size:7.5pt; color:#64748b; display:flex; justify-content:space-between; padding:0 12mm; font-family:'Cairo','Segoe UI',sans-serif; border-top:1px solid #cbd5e1; padding-top:3px;" dir="rtl"><span>${label}</span><span>${PAGE_NO}</span></div>`,
};

// 1. Royal: midnight navy + gold, double gold frame on every page.
const ROYAL_GOLD = "#b08d4c";
const royal: PrintTheme = {
  id: "royal",
  margin: { top: "18mm", bottom: "20mm" },
  css:
    vars({
      paper: "#fbf8f1", accent: "#0a1a33", "accent-ink": "#eddcae", metal: ROYAL_GOLD, "metal-deep": "#8f6d31",
      "metal-soft": "#f4ecdc", row: "rgba(176,141,76,.07)", line: "#e6dcc6", "line-strong": "#c9b88f",
      radius: "2px", heading: "'Amiri', serif", foil: FOIL.gold, "pad-r": "17mm", "pad-l": "17mm",
      seal: `url("${dataUri(rosetteSvg(ROYAL_GOLD))}")`,
    }) +
    LUX_BASE +
    `
  html { background: ${doubleRule("90deg", ROYAL_GOLD)}, ${doubleRule("270deg", ROYAL_GOLD)}, #fbf8f1; }
  .watermark { position: fixed; top: 50%; left: 50%; width: 120mm; height: 120mm; transform: translate(-50%, -50%); opacity: .045; }
  .r-hero { position: relative; margin: 0 -8.4mm 5mm; height: 36mm; background: #0a1a33; overflow: hidden; }
  .r-hero .g { position: absolute; inset: 0; opacity: .55; }
  .r-hero-in { position: relative; height: 100%; display: flex; align-items: center; gap: 5mm; padding: 0 7mm; }
  .r-crest { width: 23mm; height: 23mm; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #f6e7b8, #b08d4c 55%, #7a5c26); display: grid; place-items: center; flex: none; }
  .r-crest .lg { width: 19.5mm; height: 19.5mm; border-radius: 50%; background: #fff; object-fit: contain; padding: 2.5mm; }
  .r-crest .monogram { background: #0a1a33; color: #e6cd8c; font-size: 20pt; font-family: 'Amiri', serif; }
  .r-co { flex: 1; min-width: 0; }
  .r-co-ar { font-family: 'Amiri', serif; font-size: 19pt; font-weight: 700; line-height: 1.25; }
  .r-co-en { font-family: 'Cormorant Garamond', serif; font-size: 9pt; color: #c9b98f; letter-spacing: .14em; text-transform: uppercase; font-weight: 700; direction: ltr; text-align: right; }
  .r-ref { display: grid; gap: .6mm; color: #c9b98f; font-size: 7.2pt; text-align: left; white-space: nowrap; }
  .r-ref b { color: #f3e6c2; font-weight: 600; }
  .r-title { text-align: center; margin-bottom: 5mm; }
  .r-title h1 { margin: 0; font-family: 'Aref Ruqaa', serif; font-size: 24pt; line-height: 1.25; color: #0a1a33; font-weight: 700; }
  .r-title .en { font-family: 'Cormorant Garamond', serif; font-size: 9pt; letter-spacing: .35em; color: ${ROYAL_GOLD}; font-weight: 700; text-transform: uppercase; }
  .r-orn { display: flex; align-items: center; justify-content: center; gap: 3mm; color: ${ROYAL_GOLD}; margin-top: 1.5mm; font-size: 8pt; }
  .r-orn i { width: 32mm; height: .35mm; background: linear-gradient(90deg, transparent, ${ROYAL_GOLD}); }
  .r-orn i:last-child { transform: scaleX(-1); }
  .r-class { font-size: 7pt; color: #8a7f6b; margin-top: 1mm; }
`,
  letterhead: (ctx) => `
  <div class="r-hero">
    <div class="g">${wavesSvg("#c9a45c")}</div>
    <div class="r-hero-in">
      <div class="r-crest">${logo(ctx, "lg")}</div>
      <div class="r-co"><div class="r-co-ar foil-text">${esc(ctx.companyNameAr)}</div><div class="r-co-en">${esc(ctx.companyNameEn)}</div></div>
      <div class="r-ref">${refLines(ctx)}</div>
    </div>
  </div>
  <div class="r-title">
    <h1>${esc(ctx.title)}</h1>
    ${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}
    <div class="r-orn"><i></i>❖<i></i></div>
    <div class="r-class">${esc(ctx.classification)}</div>
  </div>`,
  decor: `<svg class="watermark" viewBox="0 0 100 100" fill="#0a1a33"><path d="M50 2l9 21 22-9-9 22 21 9-21 9 9 22-22-9-9 21-9-21-22 9 9-22-21-9 21-9-9-22 22 9z"/><circle cx="50" cy="50" r="14" fill="#fbf8f1"/></svg>`,
  headerTemplate: tpl("18mm", `<div style="position:absolute;left:7mm;right:7mm;top:7mm;bottom:0;border-top:1.2mm double ${ROYAL_GOLD};border-left:1.2mm double ${ROYAL_GOLD};border-right:1.2mm double ${ROYAL_GOLD};"></div>`, "#fbf8f1"),
  footerTemplate: (label) =>
    tpl("20mm", `<div style="position:absolute;left:7mm;right:7mm;top:0;bottom:7mm;border-bottom:1.2mm double ${ROYAL_GOLD};border-left:1.2mm double ${ROYAL_GOLD};border-right:1.2mm double ${ROYAL_GOLD};"></div>
       <div dir="rtl" style="position:absolute;left:17mm;right:17mm;top:4mm;display:flex;justify-content:space-between;font-size:7pt;color:#8a7f6b;"><span>${label}</span><span style="color:${ROYAL_GOLD};letter-spacing:.2em;font-weight:700;">SANAD</span><span>${PAGE_NO}</span></div>`, "#fbf8f1"),
};

// 2. Emerald: deep green + champagne gold, eight-point star arabesque.
const EM = "#0b3b33";
const EM_GOLD = "#c2a062";
const emerald: PrintTheme = {
  id: "emerald",
  margin: { top: "13mm", bottom: "17mm" },
  css:
    vars({
      paper: "#fdfcf8", accent: EM, "accent-ink": "#f0dca4", metal: EM_GOLD, "metal-deep": "#9a7a3c",
      "metal-soft": "#f5f1e6", row: "#fbf9f2", line: "#ebe5d4", "line-strong": "#c9bfa5",
      radius: "3px", heading: "'Reem Kufi', 'IBM Plex Sans Arabic', sans-serif", foil: FOIL.gold, "pad-r": "15mm", "pad-l": "15mm",
      seal: `url("${dataUri(rosetteSvg("#0f4d42"))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-header, .lux .sig-title-ar { font-family: 'IBM Plex Sans Arabic', sans-serif; }
  .e-band { position: relative; margin: 0 -15mm 5mm; height: 46mm; background: ${EM} url("${PATTERNS.star(EM_GOLD)}"); color: #fff; }
  .e-band::after { content: ""; position: absolute; inset: auto 0 0 0; height: 1.3mm; background: ${FOIL.gold}; }
  .e-band-in { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2mm; text-align: center; padding: 0 20mm; }
  .e-emblem { width: 16mm; height: 16mm; border: .6mm solid ${EM_GOLD}; transform: rotate(45deg); display: grid; place-items: center; background: #0f4d42; overflow: hidden; }
  .e-emblem .lg { transform: rotate(-45deg); width: 13mm; height: 13mm; object-fit: contain; background: #fff; border-radius: 1mm; padding: 1mm; }
  .e-emblem .monogram { transform: rotate(-45deg); color: #f0dca4; font-size: 16pt; }
  .e-co-ar { font-family: 'Reem Kufi', sans-serif; font-size: 16pt; font-weight: 600; margin-top: 1.5mm; line-height: 1.3; }
  .e-co-en { font-size: 7.6pt; letter-spacing: .18em; color: #bcd3cc; text-transform: uppercase; direction: ltr; }
  .e-titlerow { display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; border-bottom: 1px solid #e2dccb; padding-bottom: 3mm; margin-bottom: 4mm; }
  .e-titlerow h1 { margin: 0; font-family: 'Reem Kufi', sans-serif; font-size: 21pt; font-weight: 700; color: ${EM}; line-height: 1.2; }
  .e-titlerow .en { font-size: 8pt; color: #8c8573; letter-spacing: .12em; text-transform: uppercase; direction: ltr; text-align: right; }
  .e-stamp { border: .5mm solid ${EM_GOLD}; padding: 1.5mm 5mm; text-align: center; white-space: nowrap; }
  .e-stamp b { display: block; font-family: 'Reem Kufi', sans-serif; font-size: 18pt; line-height: 1.05; color: ${EM}; }
  .e-stamp span { font-size: 7pt; color: #8c8573; }
  .e-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-bottom: 5mm; }
  .e-fact { border-right: 1.2mm solid ${EM_GOLD}; background: #f5f1e6; padding: 1.5mm 3.5mm; }
  .e-fact span { display: block; font-size: 6.8pt; color: #8c8573; }
  .e-fact b { font-size: 8.5pt; color: ${EM}; font-weight: 600; }
`,
  letterhead: (ctx) => `
  <div class="e-band"><div class="e-band-in">
    <div class="e-emblem">${logo(ctx, "lg")}</div>
    <div class="e-co-ar">${esc(ctx.companyNameAr)}</div>
    <div class="e-co-en">${esc(ctx.companyNameEn)}</div>
  </div></div>
  <div class="e-titlerow">
    <div><h1>${esc(ctx.title)}</h1>${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}</div>
    ${ctx.highlight ? `<div class="e-stamp"><b>${esc(ctx.highlight.value)}</b><span>${esc(ctx.highlight.label)}</span></div>` : ""}
  </div>
  <div class="e-facts">
    <div class="e-fact"><span>${ctx.referenceNumber ? "رقم المرجع" : "التصنيف"}</span><b class="${ctx.referenceNumber ? "ltr" : ""}">${esc(ctx.referenceNumber ?? ctx.classification.split("|")[0].trim())}</b></div>
    <div class="e-fact"><span>تاريخ الإصدار</span><b class="ltr">${ctx.dateStr}</b></div>
    <div class="e-fact"><span>وقت الطباعة</span><b class="ltr">${ctx.timeStr}</b></div>
  </div>`,
  decor: "",
  headerTemplate: tpl("13mm", `<div style="position:absolute;left:0;right:0;top:0;height:4.5mm;background:${EM};"></div><div style="position:absolute;left:0;right:0;top:4.5mm;height:.8mm;background:${FOIL.gold};"></div>`, "#fdfcf8"),
  footerTemplate: (label) =>
    tpl("17mm", `<div style="position:absolute;left:0;right:0;bottom:0;height:9mm;background:${EM};"></div><div style="position:absolute;left:0;right:0;bottom:9mm;height:.8mm;background:${FOIL.gold};"></div>
       <div dir="rtl" style="position:absolute;left:15mm;right:15mm;bottom:3mm;display:flex;justify-content:space-between;font-size:7pt;color:#bcd3cc;"><span>${label}</span><span>${PAGE_NO}</span></div>`, "#fdfcf8"),
};

// 3. Executive: charcoal black + champagne, black spine down the left edge.
const CHAMP = "#c8ab74";
const executive: PrintTheme = {
  id: "executive",
  margin: { top: "12mm", bottom: "16mm" },
  css:
    vars({
      paper: "#ffffff", accent: "#121110", "accent-ink": CHAMP, metal: CHAMP, "metal-deep": "#9c8250",
      "metal-soft": "#f4eee2", row: "#faf8f4", line: "#ebe6dd", "line-strong": "#b9ab93",
      radius: "0px", heading: "'Reem Kufi', 'IBM Plex Sans Arabic', sans-serif", foil: FOIL.gold, "pad-r": "14mm", "pad-l": "26mm",
      seal: `url("${dataUri(rosetteSvg("#121110"))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-header, .lux .sig-title-ar { font-family: 'IBM Plex Sans Arabic', sans-serif; }
  html { background: url("${dataUri(wavesSvg(CHAMP, true).replace('<g ', '<g opacity=".7" '))}") left top / 12mm 140mm repeat-y, linear-gradient(90deg, #121110 0 12mm, transparent 12mm), #ffffff; }
  .x-top { margin: 0 -14mm 5mm -14mm; background: #121110; color: #fff; padding: 9mm 14mm 7mm 14mm; }
  .x-brand { display: flex; justify-content: space-between; align-items: center; gap: 4mm; margin-bottom: 7mm; }
  .x-brand-l { display: flex; align-items: center; gap: 4mm; }
  .x-logo { width: 16mm; height: 16mm; border: .5mm solid ${CHAMP}; object-fit: contain; background: #fff; padding: 1mm; flex: none; }
  .x-logo.monogram { background: transparent; color: ${CHAMP}; font-size: 16pt; }
  .x-co-ar { font-size: 13pt; font-weight: 700; line-height: 1.3; }
  .x-co-en { font-size: 7.4pt; color: #9d958c; letter-spacing: .08em; direction: ltr; text-align: right; }
  .x-ref { display: grid; gap: .5mm; font-size: 7pt; color: #9d958c; text-align: left; white-space: nowrap; }
  .x-ref b { color: #eadcbf; font-weight: 600; }
  .x-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; }
  .x-head .en { font-family: 'Cormorant Garamond', serif; font-size: 8pt; letter-spacing: .3em; color: ${CHAMP}; font-weight: 700; text-transform: uppercase; direction: ltr; text-align: right; }
  .x-head h1 { margin: 1mm 0 0; font-family: 'Reem Kufi', sans-serif; font-size: 23pt; line-height: 1.15; font-weight: 700; }
  .x-big { text-align: center; }
  .x-big b { display: block; font-family: 'Cormorant Garamond', serif; font-size: 40pt; line-height: .9; font-weight: 700; background: ${FOIL.gold}; -webkit-background-clip: text; background-clip: text; color: transparent; }
  .x-big span { font-size: 7pt; color: #9d958c; }
  .x-class { font-size: 7pt; color: #77706a; border-top: 1px solid #121110; border-bottom: 1px solid #e4ded3; padding: 1.5mm 0; margin-bottom: 4mm; }
`,
  letterhead: (ctx) => `
  <div class="x-top">
    <div class="x-brand">
      <div class="x-brand-l">${logo(ctx, "x-logo")}<div><div class="x-co-ar">${esc(ctx.companyNameAr)}</div><div class="x-co-en">${esc(ctx.companyNameEn)}</div></div></div>
      <div class="x-ref">${refLines(ctx)}</div>
    </div>
    <div class="x-head">
      <div>${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}<h1>${esc(ctx.title)}</h1></div>
      ${ctx.highlight ? `<div class="x-big"><b>${esc(ctx.highlight.value)}</b><span>${esc(ctx.highlight.label)}</span></div>` : ""}
    </div>
  </div>
  <div class="x-class">${esc(ctx.classification)}</div>`,
  decor: "",
  headerTemplate: tpl(
    "12mm",
    `<div style="position:absolute;left:0;top:0;bottom:0;width:12mm;background:#121110;"></div><div style="position:absolute;left:12mm;right:0;top:0;height:1.2mm;background:${FOIL.gold};"></div>`
  ),
  footerTemplate: (label) =>
    tpl(
      "16mm",
      `<div style="position:absolute;left:0;top:0;bottom:0;width:12mm;background:#121110;"></div>
       <div dir="rtl" style="position:absolute;left:26mm;right:14mm;top:6mm;display:flex;align-items:center;gap:4mm;font-size:7pt;color:#9d958c;"><span>${label}</span><span style="flex:1;height:.3mm;background:${FOIL.gold};"></span><span>${PAGE_NO}</span></div>`
    ),
};

// 4. Burgundy: wine + antique gold, interlaced lattice strips top and bottom.
const WINE = "#561022";
const WINE_GOLD = "#b3924f";
const burgundy: PrintTheme = {
  id: "burgundy",
  margin: { top: "15mm", bottom: "19mm" },
  css:
    vars({
      paper: "#fcf9f3", accent: WINE, "accent-ink": "#f2dfb4", metal: WINE_GOLD, "metal-deep": "#8f6d31",
      "metal-soft": "#f2e7d3", row: "#f7f0e5", line: "#ece3d3", "line-strong": "#cdb991",
      radius: "2px", heading: "'Amiri', serif", foil: FOIL.gold, "pad-r": "16mm", "pad-l": "16mm",
      seal: `url("${dataUri(rosetteSvg(WINE))}")`,
    }) +
    LUX_BASE +
    `
  .m-head { text-align: center; display: grid; justify-items: center; gap: 1mm; margin-bottom: 4mm; }
  .m-medal { width: 26mm; height: 26mm; background: url("${dataUri(rosetteSvg(WINE_GOLD))}") center / contain no-repeat; display: grid; place-items: center; }
  .m-medal .lg { width: 14mm; height: 14mm; object-fit: contain; border-radius: 50%; }
  .m-medal .monogram { color: ${WINE}; font-family: 'Amiri', serif; font-size: 18pt; }
  .m-co-ar { font-family: 'Amiri', serif; font-size: 18pt; font-weight: 700; color: ${WINE}; line-height: 1.25; }
  .m-co-en { font-family: 'Cormorant Garamond', serif; font-size: 8.6pt; letter-spacing: .2em; color: ${WINE_GOLD}; text-transform: uppercase; font-weight: 700; direction: ltr; }
  .m-meta { display: flex; justify-content: center; gap: 6mm; font-size: 7.2pt; color: #7d6a5d; border-top: 1px solid #e6dccb; border-bottom: 1px solid #e6dccb; padding: 1.2mm 0; width: 100%; margin-top: 1.5mm; }
  .m-meta b { color: ${WINE}; font-weight: 600; }
  .m-title { display: flex; align-items: center; gap: 5mm; margin-bottom: 1mm; }
  .m-title i { flex: 1; height: .35mm; background: linear-gradient(90deg, transparent, ${WINE_GOLD}); }
  .m-title i:last-child { transform: scaleX(-1); }
  .m-title h1 { margin: 0; font-family: 'Aref Ruqaa', serif; font-size: 23pt; color: ${WINE}; line-height: 1.25; white-space: nowrap; }
  .m-sub { text-align: center; font-size: 7.4pt; color: #9a8676; margin-bottom: 5mm; }
`,
  letterhead: (ctx) => `
  <div class="m-head">
    <div class="m-medal">${logo(ctx, "lg")}</div>
    <div class="m-co-ar">${esc(ctx.companyNameAr)}</div>
    <div class="m-co-en">${esc(ctx.companyNameEn)}</div>
    <div class="m-meta">${refLines(ctx)}</div>
  </div>
  <div class="m-title"><i></i><h1>${esc(ctx.title)}</h1><i></i></div>
  <div class="m-sub">${ctx.titleEn ? `${esc(ctx.titleEn)} · ` : ""}${esc(ctx.classification.split("|")[0].trim())}</div>`,
  decor: "",
  headerTemplate: tpl("15mm", `<div style="position:absolute;left:0;right:0;top:0;height:7mm;background:${WINE} url('${PATTERNS.lattice("#d8b878")}');"></div><div style="position:absolute;left:0;right:0;top:7mm;height:.8mm;background:${FOIL.gold};"></div>`, "#fcf9f3"),
  footerTemplate: (label) =>
    tpl("19mm", `<div dir="rtl" style="position:absolute;left:16mm;right:16mm;top:2mm;display:flex;justify-content:space-between;font-size:7pt;color:#8b7a6c;"><span>${label}</span><span>${PAGE_NO}</span></div>
       <div style="position:absolute;left:0;right:0;bottom:7mm;height:.8mm;background:${FOIL.gold};"></div><div style="position:absolute;left:0;right:0;bottom:0;height:7mm;background:${WINE} url('${PATTERNS.lattice("#d8b878")}');"></div>`, "#fcf9f3"),
};

// 5. Sapphire: sapphire blue + platinum silver, slanted diamond-lattice hero.
const SAP = "#0d2a63";
const DEEP = "#081a3f";
const sapphire: PrintTheme = {
  id: "sapphire",
  margin: { top: "9mm", bottom: "16mm" },
  css:
    vars({
      paper: "#ffffff", accent: DEEP, "accent-ink": "#ffffff", metal: "#aeb7c4", "metal-deep": "#173c86",
      "metal-soft": "#f3f6fb", row: "#f7f9fc", line: "#e3e8f0", "line-strong": "#b9c6dc",
      radius: "4px", heading: "'Reem Kufi', 'IBM Plex Sans Arabic', sans-serif", foil: FOIL.silver, "pad-r": "15mm", "pad-l": "15mm",
      seal: `url("${dataUri(rosetteSvg("#173c86"))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-header, .lux .sig-title-ar { font-family: 'IBM Plex Sans Arabic', sans-serif; }
  .lux .amount-val { background: ${FOIL.silver}; -webkit-background-clip: text; background-clip: text; }
  .s-hero { position: relative; margin: 0 -15mm; height: 52mm; background: linear-gradient(135deg, ${DEEP}, ${SAP} 60%, #173c86); clip-path: polygon(0 0, 100% 0, 100% 78%, 0 100%); color: #fff; }
  .s-hero .pat { position: absolute; inset: 0; background: url("${PATTERNS.diamond("#aeb7c4")}"); }
  .s-hero .g { position: absolute; inset: 0; opacity: .45; }
  .s-hero-in { position: relative; display: flex; align-items: flex-start; gap: 5mm; padding: 9mm 15mm 0; }
  .s-gem { width: 19mm; height: 19mm; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); background: ${FOIL.silver}; display: grid; place-items: center; flex: none; }
  .s-gem .lg { width: 10mm; height: 10mm; object-fit: contain; }
  .s-gem .monogram { color: ${DEEP}; font-size: 14pt; }
  .s-co { flex: 1; min-width: 0; }
  .s-co-ar { font-size: 15pt; font-weight: 700; line-height: 1.3; color: #fff; }
  .s-co-en { font-size: 7.6pt; letter-spacing: .14em; color: #b9c6dc; text-transform: uppercase; direction: ltr; text-align: right; }
  .s-ref { display: grid; gap: .5mm; font-size: 7pt; color: #b9c6dc; text-align: left; white-space: nowrap; }
  .s-ref b { color: #fff; font-weight: 600; }
  .s-card { position: relative; z-index: 2; margin: -13mm 0 5mm; background: #fff; box-shadow: 0 1.5mm 6mm -2mm rgba(8,26,63,.35); border-top: 1.2mm solid ${SAP}; padding: 4mm 6mm; display: flex; justify-content: space-between; align-items: center; gap: 5mm; }
  .s-card h1 { margin: 0; font-family: 'Reem Kufi', sans-serif; font-size: 19pt; color: ${DEEP}; line-height: 1.2; }
  .s-card .en { font-size: 7.6pt; color: #7a879b; letter-spacing: .14em; text-transform: uppercase; direction: ltr; text-align: right; }
  .s-card .cls { font-size: 7pt; color: #7a879b; margin-top: 1mm; }
  .s-num { text-align: center; }
  .s-num b { display: block; font-family: 'Cormorant Garamond', serif; font-size: 30pt; line-height: .95; color: ${SAP}; font-weight: 700; }
  .s-num span { font-size: 7pt; color: #7a879b; }
`,
  letterhead: (ctx) => `
  <div class="s-hero"><div class="pat"></div><div class="g">${wavesSvg("#c9d3e1")}</div>
    <div class="s-hero-in">
      <div class="s-gem">${logo(ctx, "lg")}</div>
      <div class="s-co"><div class="s-co-ar">${esc(ctx.companyNameAr)}</div><div class="s-co-en">${esc(ctx.companyNameEn)}</div></div>
      <div class="s-ref">${refLines(ctx)}</div>
    </div>
  </div>
  <div class="s-card">
    <div><h1>${esc(ctx.title)}</h1>${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}<div class="cls">${esc(ctx.classification)}</div></div>
    ${ctx.highlight ? `<div class="s-num"><b>${esc(ctx.highlight.value)}</b><span>${esc(ctx.highlight.label)}</span></div>` : ""}
  </div>`,
  decor: "",
  headerTemplate: tpl(
    "9mm",
    `<div style="position:absolute;left:0;right:0;top:0;height:2.6mm;background:linear-gradient(90deg,${DEEP},${SAP});"></div><div style="position:absolute;left:0;right:0;top:2.6mm;height:.6mm;background:${FOIL.silver};"></div>`
  ),
  footerTemplate: (label) =>
    tpl(
      "16mm",
      `<div dir="rtl" style="position:absolute;left:15mm;right:15mm;top:6mm;display:flex;align-items:center;gap:4mm;font-size:7pt;color:#8d98aa;"><span>${label}</span><span style="flex:1;height:.4mm;background:${FOIL.silver};"></span><span>${PAGE_NO}</span></div>`
    ),
};

// 6. Bronze: espresso + polished bronze, mashrabiya spine down the right edge.
const ESP = "#2e2019";
const BRONZE = "#a8683c";
const bronze: PrintTheme = {
  id: "bronze",
  margin: { top: "13mm", bottom: "16mm" },
  css:
    vars({
      paper: "#faf6f0", accent: ESP, "accent-ink": "#eccaa2", metal: BRONZE, "metal-deep": "#7a4a28",
      "metal-soft": "#f3e9dc", row: "#f4ece1", line: "#ece2d4", "line-strong": "#cfb698",
      radius: "0px", heading: "'Amiri', serif", foil: FOIL.bronze, "pad-r": "30mm", "pad-l": "14mm",
      seal: `url("${dataUri(rosetteSvg(BRONZE))}")`,
    }) +
    LUX_BASE +
    `
  html { background: url("${dataUri(spineTile("#c98f5f"))}") right top / 18mm 18mm repeat-y, linear-gradient(270deg, ${ESP} 0 18mm, #c98f5f 18mm 18.8mm, transparent 18.8mm), #faf6f0; }
  .b-emb { position: absolute; right: 2.5mm; top: 0; width: 13mm; height: 13mm; border-radius: 50%; background: ${FOIL.bronze}; display: grid; place-items: center; }
  .b-emb .lg { width: 11mm; height: 11mm; border-radius: 50%; background: #fff; object-fit: contain; padding: 1.2mm; }
  .b-emb .monogram { width: 11mm; height: 11mm; border-radius: 50%; background: ${ESP}; color: #e6bf94; font-size: 12pt; }
  .b-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 5mm; border-bottom: 1px solid #e5d9c9; padding-bottom: 3mm; margin-bottom: 4mm; }
  .b-co-ar { font-family: 'Amiri', serif; font-size: 17pt; font-weight: 700; color: ${ESP}; line-height: 1.25; }
  .b-co-en { font-family: 'Cormorant Garamond', serif; font-size: 8.4pt; letter-spacing: .14em; color: ${BRONZE}; text-transform: uppercase; font-weight: 700; direction: ltr; text-align: right; }
  .b-ref { display: grid; gap: .5mm; font-size: 7pt; color: #8a7767; text-align: left; white-space: nowrap; }
  .b-ref b { color: ${ESP}; font-weight: 600; }
  .b-title { margin-bottom: 4mm; }
  .b-title .en { font-family: 'Cormorant Garamond', serif; font-size: 8.4pt; letter-spacing: .3em; font-weight: 700; text-transform: uppercase; direction: ltr; text-align: right; background: ${FOIL.bronze}; -webkit-background-clip: text; background-clip: text; color: transparent; }
  .b-title h1 { margin: 0; font-family: 'Aref Ruqaa', serif; font-size: 25pt; color: ${ESP}; line-height: 1.2; }
  .b-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-bottom: 5mm; }
  .b-fact { border: 1px solid #e2d3bf; background: #fff; padding: 2mm 3.5mm; position: relative; }
  .b-fact::before { content: ""; position: absolute; top: -1px; right: -1px; width: 5mm; height: 5mm; border-top: .9mm solid ${BRONZE}; border-right: .9mm solid ${BRONZE}; }
  .b-fact span { display: block; font-size: 6.8pt; color: #8a7767; }
  .b-fact b { font-size: 8.8pt; color: ${ESP}; font-weight: 600; }
  .b-fact b.big { font-family: 'Cormorant Garamond', serif; font-size: 17pt; line-height: 1.05; }
`,
  letterhead: (ctx) => `
  <div class="b-head">
    <div><div class="b-co-ar">${esc(ctx.companyNameAr)}</div><div class="b-co-en">${esc(ctx.companyNameEn)}</div></div>
    <div class="b-ref">${refLines(ctx)}</div>
  </div>
  <div class="b-title">${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}<h1>${esc(ctx.title)}</h1></div>
  <div class="b-facts">
    <div class="b-fact"><span>التصنيف</span><b>${esc(ctx.classification.split("|")[0].trim())}</b></div>
    <div class="b-fact"><span>تاريخ الإصدار</span><b class="ltr">${ctx.dateStr}</b></div>
    ${
      ctx.highlight
        ? `<div class="b-fact"><span>${esc(ctx.highlight.label)}</span><b class="big">${esc(ctx.highlight.value)}</b></div>`
        : `<div class="b-fact"><span>${ctx.referenceNumber ? "رقم المرجع" : "وقت الطباعة"}</span><b class="ltr">${esc(ctx.referenceNumber ?? ctx.timeStr)}</b></div>`
    }
  </div>`,
  decor: "", // built per document: the spine carries the logo
  headerTemplate: tpl("13mm", `<div style="position:absolute;right:0;top:0;bottom:0;width:18mm;background:${ESP};"></div><div style="position:absolute;right:18mm;top:0;bottom:0;width:.8mm;background:${FOIL.bronze};"></div>`, "#faf6f0"),
  footerTemplate: (label) =>
    tpl("16mm", `<div style="position:absolute;right:0;top:0;bottom:0;width:18mm;background:${ESP};"></div><div style="position:absolute;right:18mm;top:0;bottom:0;width:.8mm;background:${FOIL.bronze};"></div>
       <div dir="rtl" style="position:absolute;left:14mm;right:30mm;top:6mm;display:flex;align-items:center;gap:4mm;font-size:7pt;color:#9a8878;"><span>${label}</span><span style="flex:1;height:.3mm;background:${FOIL.bronze};"></span><span>${PAGE_NO}</span></div>`, "#faf6f0"),
};

const THEMES: Record<PrintThemeId, PrintTheme> = { classic, royal, emerald, executive, burgundy, sapphire, bronze };

export function getPrintTheme(id: string | null | undefined): PrintTheme {
  return isPrintThemeId(id) ? THEMES[id] : THEMES[DEFAULT_PRINT_THEME];
}

/** Per-document decoration (the bronze spine shows the company logo on page 1). */
export function themeDecor(theme: PrintTheme, ctx: ShellContext): string {
  if (theme.id === "bronze") {
    return `<div class="b-emb">${logo(ctx, "lg")}</div>`;
  }
  return theme.decor;
}

export const PRINT_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;900&family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Reem+Kufi:wght@500;600;700&family=Cormorant+Garamond:wght@600;700&display=swap";
