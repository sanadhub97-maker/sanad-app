import { SIGNATURE_THEMES } from "@/services/printThemesSignature";

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

export const PRINT_THEME_IDS = ["classic", "royal", "emerald", "executive", "burgundy", "sapphire", "bronze", "turquoise", "slate", "amethyst", "olive", "crimson",
  "ledger", "blueprint", "mono", "ribbon", "mosaic", "ocean", "sadu", "glass", "gazette", "prism",
  "pearl", "passport", "airmail", "bauhaus", "palm", "circuit", "topo", "marble", "ticket", "calligraphy",
  "studio_executive", "studio_heritage", "studio_editorial", "studio_minimal", "studio_blueprint", "studio_royal", "studio_ledger", "studio_atelier", "studio_modern", "studio_archive",
  "munassa", "janib", "bitaqa", "qutri", "fatih",
] as const;
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
  /** A letterhead repeated at the top of every page (a Puppeteer header built from the document), with its height; replaces headerTemplate and margin.top. */
  runningHeader?: (ctx: ShellContext) => { html: string; height: string };
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
//
// PDF rule for every design: no linear gradient may contain a transparent
// stop (Chrome 148+ drops those from PDFs) and no repeating-linear-gradient
// (never printed reliably) — fade into the paper colour, and draw stripes and
// grids as SVG tiles instead.

/** Two thin rules 7mm in from both side edges, over the paper colour —
 * one opaque gradient across the page. */
function doubleRules(color: string, paper: string) {
  const r = (a: string, b: string) => `${color} ${a} ${b}`;
  const p = (a: string, b: string) => `${paper} ${a} ${b}`;
  return `linear-gradient(90deg, ${[
    p("0", "7mm"), r("7mm", "7.35mm"), p("7.35mm", "7.85mm"), r("7.85mm", "8.2mm"),
    p("8.2mm", "calc(100% - 8.2mm)"),
    r("calc(100% - 8.2mm)", "calc(100% - 7.85mm)"), p("calc(100% - 7.85mm)", "calc(100% - 7.35mm)"),
    r("calc(100% - 7.35mm)", "calc(100% - 7mm)"), p("calc(100% - 7mm)", "100%"),
  ].join(", ")})`;
}

/** 45° two-colour stripes as a seamless tile. */
function stripeTile(a: string, b: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" fill="${b}"/><path d="M-5 5L5-5M-5 25L25-5M15 25L25 15" stroke="${a}" stroke-width="7"/></svg>`;
}

/** A blueprint grid tile: fine 5mm lines and a stronger 25mm line. */
function gridTile() {
  const minor = [20, 40, 60, 80].map((v) => `<path d="M${v} 0V100M0 ${v}H100"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><g stroke="#ffffff" fill="none"><g stroke-width=".6" opacity=".09">${minor}</g><path d="M0 .5H100M.5 0V100" stroke-width="1" opacity=".22"/></g></svg>`;
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
  .lux .sig-dots, .lux .sig-name, .lux .sig-date { border-bottom-color: var(--line-strong); }
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
  html { background: ${doubleRules(ROYAL_GOLD, "#fbf8f1")}; }
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
  .r-orn i { width: 32mm; height: .35mm; background: linear-gradient(90deg, #fbf8f1, ${ROYAL_GOLD}); }
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
  html { background: url("${dataUri(wavesSvg(CHAMP, true).replace('<g ', '<g opacity=".7" '))}") left top / 12mm 140mm repeat-y, linear-gradient(90deg, #121110 0 12mm, #ffffff 12mm); }
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
  .m-title i { flex: 1; height: .35mm; background: linear-gradient(90deg, #fcf9f3, ${WINE_GOLD}); }
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
  html { background: url("${dataUri(spineTile("#c98f5f"))}") right top / 18mm 18mm repeat-y, linear-gradient(270deg, ${ESP} 0 18mm, #c98f5f 18mm 18.8mm, #faf6f0 18.8mm); }
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

// 8. Turquoise: turquoise + copper, a mihrab arch holding the logo, copper
// corner brackets on every page.
const TQ = "#0e5e63";
const COPPER = "#b87333";
const STAR8 = (c: string) =>
  `<svg viewBox="0 0 20 20" width="100%" height="100%"><path d="M10 0l2.9 7.1L20 10l-7.1 2.9L10 20l-2.9-7.1L0 10l7.1-2.9z" fill="${c}"/></svg>`;
const corners = (top: boolean, color: string) => {
  const edge = top ? "top" : "bottom";
  const b = `${edge}:5mm;width:14mm;height:9mm;border-${edge}:.8mm solid ${color};`;
  return `<div style="position:absolute;left:6mm;${b}border-left:.8mm solid ${color};"></div><div style="position:absolute;right:6mm;${b}border-right:.8mm solid ${color};"></div>`;
};
const turquoise: PrintTheme = {
  id: "turquoise",
  margin: { top: "16mm", bottom: "18mm" },
  css:
    vars({
      paper: "#fbfaf6", accent: TQ, "accent-ink": "#f6e3cf", metal: COPPER, "metal-deep": "#8c5424",
      "metal-soft": "#eef5f4", row: "#f3f8f7", line: "#dce8e6", "line-strong": "#a9c6c2",
      radius: "3px", heading: "'Amiri', serif", foil: FOIL.bronze, "pad-r": "15mm", "pad-l": "15mm",
      seal: `url("${dataUri(rosetteSvg(TQ))}")`,
    }) +
    LUX_BASE +
    `
  .t-head { display: grid; justify-items: center; gap: 1mm; text-align: center; margin-bottom: 3mm; }
  .t-arch { position: relative; width: 22mm; height: 27mm; }
  .t-arch svg { position: absolute; inset: 0; }
  .t-arch .lg, .t-arch .monogram { position: absolute; left: 50%; top: 58%; transform: translate(-50%, -50%); width: 13mm; height: 13mm; border-radius: 50%; background: #fff; object-fit: contain; padding: 1.3mm; }
  .t-arch .monogram { color: ${TQ}; font-size: 14pt; font-family: 'Amiri', serif; }
  .t-co-ar { font-family: 'Amiri', serif; font-size: 17pt; font-weight: 700; color: ${TQ}; line-height: 1.25; }
  .t-co-en { font-size: 7.6pt; letter-spacing: .16em; color: ${COPPER}; text-transform: uppercase; font-weight: 600; direction: ltr; }
  .t-titlebar { display: flex; align-items: center; justify-content: center; gap: 4mm; border-top: 1px solid #cfe0dd; border-bottom: 1px solid #cfe0dd; padding: 3mm 0; margin-bottom: 1.5mm; background: #eef5f4; }
  .t-titlebar .st { width: 5mm; height: 5mm; }
  .t-titlebar h1 { margin: 0; font-family: 'Amiri', serif; font-size: 20pt; color: ${TQ}; line-height: 1.2; }
  .t-titlebar .en { font-size: 7.4pt; color: ${COPPER}; letter-spacing: .14em; text-transform: uppercase; direction: ltr; text-align: center; font-weight: 600; }
  .t-meta { display: flex; justify-content: center; flex-wrap: wrap; gap: 5mm; font-size: 7.2pt; color: #5d7471; margin-bottom: 5mm; }
  .t-meta b { color: ${TQ}; font-weight: 600; }
`,
  letterhead: (ctx) => `
  <div class="t-head">
    <div class="t-arch"><svg viewBox="0 0 100 120" preserveAspectRatio="none"><path d="M6 118V56Q6 20 50 3Q94 20 94 56V118Z" fill="${TQ}" stroke="${COPPER}" stroke-width="3"/><path d="M16 118V60Q16 30 50 15Q84 30 84 60V118" fill="none" stroke="${COPPER}" stroke-width="1.2" opacity=".7"/></svg>${logo(ctx, "lg")}</div>
    <div class="t-co-ar">${esc(ctx.companyNameAr)}</div>
    <div class="t-co-en">${esc(ctx.companyNameEn)}</div>
  </div>
  <div class="t-titlebar"><span class="st">${STAR8(COPPER)}</span><div><h1>${esc(ctx.title)}</h1>${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}</div><span class="st">${STAR8(COPPER)}</span></div>
  <div class="t-meta">${refLines(ctx)}<span>${esc(ctx.classification.split("|")[0].trim())}</span></div>`,
  decor: "",
  headerTemplate: tpl("16mm", `${corners(true, COPPER)}<div style="position:absolute;left:22mm;right:22mm;top:5mm;height:.5mm;background:${TQ};"></div>`, "#fbfaf6"),
  footerTemplate: (label) =>
    tpl(
      "18mm",
      `${corners(false, COPPER)}<div dir="rtl" style="position:absolute;left:24mm;right:24mm;bottom:5.5mm;display:flex;justify-content:space-between;font-size:7pt;color:#5d7471;"><span>${label}</span><span style="color:${COPPER};">✦</span><span>${PAGE_NO}</span></div>`,
      "#fbfaf6"
    ),
};

// 9. Slate: slate grey + rose gold, split two-tone letterhead, light
// hairline tables instead of a dark header row.
const SLATE = "#2f3e4e";
const ROSE = "#b76e79";
const slate: PrintTheme = {
  id: "slate",
  margin: { top: "11mm", bottom: "15mm" },
  css:
    vars({
      paper: "#ffffff", accent: SLATE, "accent-ink": "#ffffff", metal: ROSE, "metal-deep": "#95525c",
      "metal-soft": "#f6f1f2", row: "#fafafa", line: "#e8e8ea", "line-strong": "#c9b6b9",
      radius: "0px", heading: "'IBM Plex Sans Arabic', sans-serif", foil: "linear-gradient(100deg,#8e5560,#e3b3ba 40%,#b76e79 60%,#d9a3ab)", "pad-r": "14mm", "pad-l": "14mm",
      seal: `url("${dataUri(rosetteSvg(ROSE))}")`,
    }) +
    LUX_BASE +
    `
  .lux thead th { background: transparent; color: ${SLATE}; border-color: transparent; border-bottom: 2px solid ${ROSE}; font-weight: 700; }
  .lux thead th .th-sub { color: #8a8f96; opacity: 1; }
  .lux tbody tr:nth-child(even) td { background: transparent; }
  .lux .section-card { border: none; border-top: 1px solid ${SLATE}; border-radius: 0; }
  .lux .section-header { background: transparent; border-bottom: 1px solid #e8e8ea; }
  .sl-split { display: grid; grid-template-columns: 1fr 58mm; margin: 0 -14mm 6mm; min-height: 44mm; }
  .sl-main { padding: 6mm 14mm 5mm 8mm; display: flex; flex-direction: column; justify-content: space-between; gap: 4mm; border-bottom: 1px solid #e8e8ea; }
  .sl-brand { display: flex; align-items: center; gap: 3mm; }
  .sl-brand .lg { width: 12mm; height: 12mm; object-fit: contain; }
  .sl-brand .monogram { width: 12mm; height: 12mm; background: ${SLATE}; color: #fff; font-size: 13pt; }
  .sl-co-ar { font-size: 11pt; font-weight: 700; color: ${SLATE}; line-height: 1.3; }
  .sl-co-en { font-size: 6.8pt; color: #8a8f96; letter-spacing: .08em; direction: ltr; text-align: right; }
  .sl-main h1 { margin: 0; font-size: 22pt; font-weight: 700; color: ${SLATE}; line-height: 1.15; }
  .sl-main .en { font-size: 7.6pt; color: ${ROSE}; letter-spacing: .18em; text-transform: uppercase; direction: ltr; text-align: right; font-weight: 600; margin-top: 1mm; }
  .sl-side { background: ${SLATE} radial-gradient(rgba(255,255,255,.14) .35mm, transparent .4mm) 0 0 / 3mm 3mm; color: #fff; padding: 6mm 7mm; display: flex; flex-direction: column; justify-content: space-between; gap: 3mm; }
  .sl-big b { display: block; font-family: 'Cormorant Garamond', serif; font-size: 38pt; line-height: .9; font-weight: 700; background: var(--foil); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .sl-big span { font-size: 7pt; color: #c9d1da; }
  .sl-ref { display: grid; gap: .6mm; font-size: 6.8pt; color: #c9d1da; }
  .sl-ref b { color: #fff; font-weight: 600; }
`,
  letterhead: (ctx) => `
  <div class="sl-split">
    <div class="sl-main">
      <div class="sl-brand">${logo(ctx, "lg")}<div><div class="sl-co-ar">${esc(ctx.companyNameAr)}</div><div class="sl-co-en">${esc(ctx.companyNameEn)}</div></div></div>
      <div><h1>${esc(ctx.title)}</h1>${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}</div>
    </div>
    <div class="sl-side">
      ${ctx.highlight ? `<div class="sl-big"><b>${esc(ctx.highlight.value)}</b><span>${esc(ctx.highlight.label)}</span></div>` : `<div class="sl-big"><span>${esc(ctx.classification.split("|")[0].trim())}</span></div>`}
      <div class="sl-ref">${refLines(ctx)}</div>
    </div>
  </div>`,
  decor: "",
  headerTemplate: tpl("11mm", `<div style="position:absolute;left:0;width:58mm;top:0;height:3mm;background:${SLATE};"></div><div style="position:absolute;left:58mm;right:0;top:0;height:.5mm;background:${ROSE};"></div>`),
  footerTemplate: (label) =>
    tpl(
      "15mm",
      `<div dir="rtl" style="position:absolute;left:14mm;right:14mm;top:5mm;display:flex;justify-content:space-between;align-items:center;font-size:7pt;color:#8a8f96;border-top:.3mm solid ${ROSE};padding-top:1.5mm;"><span>${label}</span><span>${PAGE_NO}</span></div>`
    ),
};

// 10. Amethyst: royal purple + gold, a faint damask over the whole page and
// a sash across the first page's corner.
const PUR = "#3b1f4e";
const PUR_GOLD = "#b8954f";
function damaskTile(color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="none" stroke="${color}" stroke-width="1" opacity=".07"><path d="M32 6c7 8 7 16 0 24c-7-8-7-16 0-24zM32 58c7-8 7-16 0-24c-7 8-7 16 0 24zM6 32c8-7 16-7 24 0c-8 7-16 7-24 0zM58 32c-8-7-16-7-24 0c8 7 16 7 24 0z"/><circle cx="32" cy="32" r="3"/><circle cx="0" cy="0" r="6"/><circle cx="64" cy="0" r="6"/><circle cx="0" cy="64" r="6"/><circle cx="64" cy="64" r="6"/></g></svg>`;
}
const amethyst: PrintTheme = {
  id: "amethyst",
  margin: { top: "13mm", bottom: "17mm" },
  css:
    vars({
      paper: "#fdfbf7", accent: PUR, "accent-ink": "#f1ddb0", metal: PUR_GOLD, "metal-deep": "#8f6d31",
      "metal-soft": "#f3edf5", row: "rgba(59,31,78,.035)", line: "#e7e0ea", "line-strong": "#c7b6cd",
      radius: "4px", heading: "'Amiri', serif", foil: FOIL.gold, "pad-r": "16mm", "pad-l": "16mm",
      seal: `url("${dataUri(rosetteSvg(PUR))}")`,
    }) +
    LUX_BASE +
    `
  html { background: url("${dataUri(damaskTile(PUR))}") 0 0 / 17mm 17mm, #fdfbf7; }
  .lux thead th:first-child { border-top-right-radius: 3mm; }
  .lux thead th:last-child { border-top-left-radius: 3mm; }
  .a-sash { position: absolute; top: 9mm; right: -17mm; width: 68mm; height: 8mm; transform: rotate(45deg); background: ${PUR}; border-top: .5mm solid ${PUR_GOLD}; border-bottom: .5mm solid ${PUR_GOLD}; color: #f1ddb0; font-size: 7pt; font-weight: 700; display: grid; place-items: center; letter-spacing: .1em; }
  .a-head { text-align: center; display: grid; justify-items: center; gap: 1mm; margin-bottom: 3mm; }
  .a-medal { width: 25mm; height: 25mm; background: url("${dataUri(rosetteSvg(PUR_GOLD))}") center / contain no-repeat; display: grid; place-items: center; }
  .a-medal .lg { width: 13.5mm; height: 13.5mm; object-fit: contain; border-radius: 50%; }
  .a-medal .monogram { color: ${PUR}; font-family: 'Amiri', serif; font-size: 16pt; }
  .a-co-ar { font-family: 'Amiri', serif; font-size: 17pt; font-weight: 700; color: ${PUR}; line-height: 1.25; }
  .a-co-en { font-family: 'Cormorant Garamond', serif; font-size: 8.6pt; letter-spacing: .2em; color: ${PUR_GOLD}; text-transform: uppercase; font-weight: 700; direction: ltr; }
  .a-title { text-align: center; margin-bottom: 5mm; }
  .a-title h1 { margin: 0; font-family: 'Aref Ruqaa', serif; font-size: 23pt; color: ${PUR}; line-height: 1.25; }
  .a-flour { display: flex; align-items: center; justify-content: center; gap: 2.5mm; color: ${PUR_GOLD}; font-size: 8pt; }
  .a-flour i { width: 26mm; height: .35mm; background: linear-gradient(90deg, #fdfbf7, ${PUR_GOLD}); }
  .a-flour i:last-child { transform: scaleX(-1); }
  .a-meta { display: flex; justify-content: center; gap: 5mm; font-size: 7.1pt; color: #7a6b80; margin-top: 1.5mm; }
  .a-meta b { color: ${PUR}; font-weight: 600; }
`,
  letterhead: (ctx) => `
  <div class="a-sash">OFFICIAL · رسمي</div>
  <div class="a-head">
    <div class="a-medal">${logo(ctx, "lg")}</div>
    <div class="a-co-ar">${esc(ctx.companyNameAr)}</div>
    <div class="a-co-en">${esc(ctx.companyNameEn)}</div>
  </div>
  <div class="a-title">
    <h1>${esc(ctx.title)}</h1>
    <div class="a-flour"><i></i>❦${ctx.titleEn ? ` <span style="letter-spacing:.12em;font-size:7pt;text-transform:uppercase;">${esc(ctx.titleEn)}</span> ` : ""}❦<i></i></div>
    <div class="a-meta">${refLines(ctx)}</div>
  </div>`,
  decor: "",
  headerTemplate: tpl("13mm", `<div style="position:absolute;left:0;right:0;top:0;height:2.2mm;background:${PUR};"></div><div style="position:absolute;left:0;right:0;top:2.2mm;height:.6mm;background:${FOIL.gold};"></div>`, "#fdfbf7"),
  footerTemplate: (label) =>
    tpl(
      "17mm",
      `<div style="position:absolute;left:0;right:0;bottom:0;height:8mm;background:${PUR};"></div><div style="position:absolute;left:0;right:0;bottom:8mm;height:.6mm;background:${FOIL.gold};"></div>
       <div dir="rtl" style="position:absolute;left:16mm;right:16mm;bottom:2.6mm;display:flex;justify-content:space-between;font-size:7pt;color:#e6d3a8;"><span>${label}</span><span>${PAGE_NO}</span></div>`,
      "#fdfbf7"
    ),
};

// 11. Olive: olive + desert sand, a large calligraphic title and a band of
// sand dunes at the foot of every page.
const OLIVE = "#4a5a2a";
const SAND = "#c8a86b";
function duneSvg(color: string) {
  const lines: string[] = [];
  for (let k = 0; k < 6; k++) {
    const pts: string[] = [];
    for (let x = 0; x <= 600; x += 6) {
      const y = 12 + k * 7 + 5 * Math.sin(x / 55 + k * 0.9) + 3 * Math.sin(x / 23 - k);
      pts.push(`${x} ${y.toFixed(1)}`);
    }
    lines.push(`<path d="M${pts.join("L")}" opacity="${(0.35 + k * 0.1).toFixed(2)}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 60" preserveAspectRatio="none" width="100%" height="100%"><g fill="none" stroke="${color}" stroke-width="1.1">${lines.join("")}</g></svg>`;
}
const olive: PrintTheme = {
  id: "olive",
  margin: { top: "10mm", bottom: "22mm" },
  css:
    vars({
      paper: "#fbf8f0", accent: OLIVE, "accent-ink": "#f4ecd6", metal: SAND, "metal-deep": "#8e7440",
      "metal-soft": "#f3ecda", row: "#f6f0e1", line: "#e8dfc9", "line-strong": "#cdbb92",
      radius: "2px", heading: "'Amiri', serif", foil: FOIL.gold, "pad-r": "15mm", "pad-l": "15mm",
      seal: `url("${dataUri(rosetteSvg(OLIVE))}")`,
    }) +
    LUX_BASE +
    `
  .o-top { display: flex; justify-content: space-between; align-items: center; gap: 4mm; padding-bottom: 3mm; border-bottom: 1px solid #e3d8bd; margin-bottom: 5mm; }
  .o-brand { display: flex; align-items: center; gap: 3mm; }
  .o-brand .lg { width: 13mm; height: 13mm; object-fit: contain; }
  .o-brand .monogram { width: 13mm; height: 13mm; border-radius: 50%; background: ${OLIVE}; color: #f4ecd6; font-size: 13pt; }
  .o-co-ar { font-family: 'Amiri', serif; font-size: 13pt; font-weight: 700; color: ${OLIVE}; line-height: 1.3; }
  .o-co-en { font-size: 6.8pt; letter-spacing: .12em; color: #8e7440; text-transform: uppercase; direction: ltr; text-align: right; }
  .o-ref { display: grid; gap: .5mm; font-size: 7pt; color: #857a60; text-align: left; white-space: nowrap; }
  .o-ref b { color: ${OLIVE}; font-weight: 600; }
  .o-title { border-right: 2mm solid ${SAND}; padding: 1mm 5mm 1mm 0; margin-bottom: 6mm; }
  .o-title h1 { margin: 0; font-family: 'Aref Ruqaa', serif; font-size: 30pt; color: ${OLIVE}; line-height: 1.15; }
  .o-title .en { font-size: 8pt; letter-spacing: .24em; color: #8e7440; text-transform: uppercase; direction: ltr; text-align: right; font-weight: 600; }
  .o-title .cls { font-size: 7.2pt; color: #857a60; margin-top: 1mm; }
`,
  letterhead: (ctx) => `
  <div class="o-top">
    <div class="o-brand">${logo(ctx, "lg")}<div><div class="o-co-ar">${esc(ctx.companyNameAr)}</div><div class="o-co-en">${esc(ctx.companyNameEn)}</div></div></div>
    <div class="o-ref">${refLines(ctx)}</div>
  </div>
  <div class="o-title">
    ${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}
    <h1>${esc(ctx.title)}</h1>
    <div class="cls">${esc(ctx.classification.split("|")[0].trim())}${ctx.highlight ? ` · ${esc(ctx.highlight.value)} ${esc(ctx.highlight.label)}` : ""}</div>
  </div>`,
  decor: "",
  headerTemplate: tpl("10mm", `<div style="position:absolute;left:15mm;right:15mm;top:5mm;height:.4mm;background:${OLIVE};"></div>`, "#fbf8f0"),
  footerTemplate: (label) =>
    tpl(
      "22mm",
      `<div style="position:absolute;left:0;right:0;bottom:0;height:13mm;background:#efe3c4;">${duneSvg(SAND)}</div><div style="position:absolute;left:0;right:0;bottom:13mm;height:.5mm;background:${OLIVE};"></div>
       <div dir="rtl" style="position:absolute;left:15mm;right:15mm;bottom:4.5mm;display:flex;justify-content:space-between;font-size:7pt;color:${OLIVE};font-weight:600;"><span>${label}</span><span>${PAGE_NO}</span></div>`,
      "#fbf8f0"
    ),
};

// 12. Crimson: crimson + graphite, a striped graphite bar on every page and
// a diagonally split title block.
const CRIM = "#9b1c31";
const GRAPH = "#2b2d31";
const STRIPES = `url('${dataUri(stripeTile(CRIM, GRAPH))}') 0 0 / 4mm 4mm`;
const crimson: PrintTheme = {
  id: "crimson",
  margin: { top: "12mm", bottom: "15mm" },
  css:
    vars({
      paper: "#ffffff", accent: GRAPH, "accent-ink": "#ffffff", metal: CRIM, "metal-deep": CRIM,
      "metal-soft": "#f7f2f3", row: "#f6f6f7", line: "#e6e6e9", "line-strong": "#b9babf",
      radius: "0px", heading: "'Reem Kufi', 'IBM Plex Sans Arabic', sans-serif", foil: "linear-gradient(100deg,#9b1c31,#d8495f)", "pad-r": "14mm", "pad-l": "14mm",
      seal: `url("${dataUri(rosetteSvg(CRIM))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-header, .lux .sig-title-ar { font-family: 'IBM Plex Sans Arabic', sans-serif; }
  .lux tbody td:first-child { color: ${CRIM}; font-weight: 700; }
  .c-top { display: flex; justify-content: space-between; align-items: center; gap: 4mm; margin-bottom: 4mm; }
  .c-brand { display: flex; align-items: center; gap: 3mm; }
  .c-brand .lg { width: 13mm; height: 13mm; object-fit: contain; }
  .c-brand .monogram { width: 13mm; height: 13mm; background: ${CRIM}; color: #fff; font-size: 13pt; }
  .c-co-ar { font-size: 12pt; font-weight: 700; color: ${GRAPH}; line-height: 1.3; }
  .c-co-en { font-size: 6.8pt; color: #7d7f86; letter-spacing: .08em; direction: ltr; text-align: right; }
  .c-ref { display: grid; gap: .5mm; font-size: 7pt; color: #7d7f86; text-align: left; white-space: nowrap; }
  .c-ref b { color: ${GRAPH}; font-weight: 600; }
  .c-title { margin: 0 -14mm 6mm; display: flex; align-items: stretch; min-height: 24mm; background: linear-gradient(105deg, ${GRAPH} 0 30%, ${CRIM} 30%); color: #fff; }
  .c-title .t { flex: 1; padding: 4mm 14mm 4mm 6mm; display: flex; flex-direction: column; justify-content: center; }
  .c-title h1 { margin: 0; font-family: 'Reem Kufi', sans-serif; font-size: 20pt; line-height: 1.2; font-weight: 700; }
  .c-title .en { font-size: 7.4pt; letter-spacing: .2em; opacity: .85; text-transform: uppercase; direction: ltr; text-align: right; }
  .c-title .n { width: 44mm; display: flex; flex-direction: column; justify-content: center; align-items: center; padding-left: 8mm; }
  .c-title .n b { font-family: 'Cormorant Garamond', serif; font-size: 32pt; line-height: .95; font-weight: 700; }
  .c-title .n span { font-size: 6.8pt; color: #c9cad0; }
`,
  letterhead: (ctx) => `
  <div class="c-top">
    <div class="c-brand">${logo(ctx, "lg")}<div><div class="c-co-ar">${esc(ctx.companyNameAr)}</div><div class="c-co-en">${esc(ctx.companyNameEn)}</div></div></div>
    <div class="c-ref">${refLines(ctx)}</div>
  </div>
  <div class="c-title">
    <div class="t">${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}<h1>${esc(ctx.title)}</h1></div>
    <div class="n">${ctx.highlight ? `<b>${esc(ctx.highlight.value)}</b><span>${esc(ctx.highlight.label)}</span>` : `<span>${esc(ctx.classification.split("|")[0].trim())}</span>`}</div>
  </div>`,
  decor: "",
  headerTemplate: tpl("12mm", `<div style="position:absolute;left:0;right:0;top:0;height:5mm;background:${GRAPH};"></div><div style="position:absolute;left:0;width:60mm;top:0;height:5mm;background:${STRIPES};"></div>`),
  footerTemplate: (label) =>
    tpl(
      "15mm",
      `<div style="position:absolute;left:14mm;right:14mm;top:4mm;height:.6mm;background:${CRIM};"></div>
       <div dir="rtl" style="position:absolute;left:14mm;right:14mm;top:6mm;display:flex;justify-content:space-between;font-size:7pt;color:#7d7f86;"><span>${label}</span><span>${PAGE_NO}</span></div>`
    ),
};

// ---------------------------------------------------------------------------
// Designs 13–22: each with its own letterhead layout and table treatment.
// ---------------------------------------------------------------------------

const cls = (ctx: ShellContext) => esc(ctx.classification.split("|")[0].trim());

// 13. Ledger: forest green + ledger red — accounting paper with a red double
// margin rule, a document-number box and ruled rows.
const LG = "#1f4d3a";
const LR = "#b3261e";
const ledger: PrintTheme = {
  id: "ledger",
  margin: { top: "12mm", bottom: "15mm" },
  css:
    vars({
      paper: "#fbfaf3", accent: LG, "accent-ink": "#ffffff", metal: LR, "metal-deep": LR,
      "metal-soft": "#eef3ee", row: "transparent", line: "rgba(31,77,58,.18)", "line-strong": "rgba(31,77,58,.45)",
      radius: "0px", heading: "'Amiri', serif", foil: FOIL.gold, "pad-r": "27mm", "pad-l": "14mm",
      seal: `url("${dataUri(rosetteSvg(LG))}")`,
    }) +
    LUX_BASE +
    `
  html { background: linear-gradient(270deg, #fbfaf3 20mm, ${LR} 20mm 20.35mm, #fbfaf3 20.35mm 21mm, ${LR} 21mm 21.35mm, #fbfaf3 21.35mm); }
  .lux thead th { background: transparent; color: ${LG}; border-top: 1px solid ${LG}; border-bottom: 3px double ${LG}; font-weight: 700; }
  .lux thead th .th-sub { color: #6b7d72; opacity: 1; }
  .lux tbody td:first-child { color: ${LR}; font-weight: 700; }
  .lux .section-card { border: none; background: transparent; }
  .lux .section-header { background: transparent; border-bottom: 1px solid ${LG}; }
  .lg-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 5mm; margin-bottom: 5mm; }
  .lg-brand { display: flex; align-items: center; gap: 3mm; }
  .lg-brand .lg { width: 14mm; height: 14mm; object-fit: contain; }
  .lg-brand .monogram { width: 14mm; height: 14mm; border: .5mm solid ${LG}; color: ${LG}; font-size: 14pt; }
  .lg-co-ar { font-family: 'Amiri', serif; font-size: 14pt; font-weight: 700; color: ${LG}; line-height: 1.3; }
  .lg-co-en { font-size: 6.8pt; color: #6b7d72; letter-spacing: .1em; direction: ltr; text-align: right; }
  .lg-box { border: 1px solid ${LG}; font-size: 7.2pt; min-width: 52mm; }
  .lg-box div { display: flex; justify-content: space-between; gap: 3mm; padding: 1.1mm 2.5mm; }
  .lg-box div + div { border-top: 1px solid rgba(31,77,58,.25); }
  .lg-box span { color: #6b7d72; } .lg-box b { color: ${LG}; font-weight: 700; }
  .lg-box .hd { background: ${LG}; color: #fff; font-weight: 700; justify-content: center; }
  .lg-title { border-bottom: 3px double ${LG}; padding-bottom: 2mm; margin-bottom: 5mm; display: flex; justify-content: space-between; align-items: flex-end; gap: 4mm; }
  .lg-title h1 { margin: 0; font-family: 'Amiri', serif; font-size: 21pt; color: ${LG}; line-height: 1.2; }
  .lg-title .en { font-size: 7.6pt; letter-spacing: .16em; color: ${LR}; text-transform: uppercase; direction: ltr; font-weight: 600; }
`,
  letterhead: (ctx) => `
  <div class="lg-top">
    <div class="lg-brand">${logo(ctx, "lg")}<div><div class="lg-co-ar">${esc(ctx.companyNameAr)}</div><div class="lg-co-en">${esc(ctx.companyNameEn)}</div></div></div>
    <div class="lg-box">
      <div class="hd">${cls(ctx)}</div>
      ${ctx.referenceNumber ? `<div><span>رقم المستند</span><b class="ltr">${esc(ctx.referenceNumber)}</b></div>` : ""}
      <div><span>تاريخ الإصدار</span><b class="ltr">${ctx.dateStr}</b></div>
      <div><span>وقت الطباعة</span><b class="ltr">${ctx.timeStr}</b></div>
      ${ctx.highlight ? `<div><span>${esc(ctx.highlight.label)}</span><b>${esc(ctx.highlight.value)}</b></div>` : ""}
    </div>
  </div>
  <div class="lg-title"><h1>${esc(ctx.title)}</h1>${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}</div>`,
  decor: "",
  headerTemplate: tpl("12mm", `<div style="position:absolute;left:14mm;right:27mm;top:6mm;height:.4mm;background:${LG};"></div>`, "#fbfaf3"),
  footerTemplate: (label) =>
    tpl("15mm", `<div dir="rtl" style="position:absolute;left:14mm;right:27mm;top:4mm;border-top:3px double ${LG};padding-top:1.5mm;display:flex;justify-content:space-between;font-size:7pt;color:#6b7d72;"><span>${label}</span><span>${PAGE_NO}</span></div>`, "#fbfaf3"),
};

// 14. Blueprint: blueprint blue + cyan — an engineering-grid header with an
// architectural title block, and fully ruled grid tables.
const BP = "#0b3d91";
const CY = "#5ec8f2";
const GRID = `url("${dataUri(gridTile())}") 0 0 / 25mm 25mm`;
const blueprint: PrintTheme = {
  id: "blueprint",
  margin: { top: "10mm", bottom: "15mm" },
  css:
    vars({
      paper: "#ffffff", accent: BP, "accent-ink": "#ffffff", metal: CY, "metal-deep": "#1976b8",
      "metal-soft": "#eaf2fd", row: "#f6f9fe", line: "#c9d8ef", "line-strong": "#8fb0dd",
      radius: "0px", heading: "'IBM Plex Sans Arabic', sans-serif", foil: FOIL.silver, "pad-r": "14mm", "pad-l": "14mm",
      seal: `url("${dataUri(rosetteSvg(BP))}")`,
    }) +
    LUX_BASE +
    `
  .lux table { border: 1px solid ${BP}; }
  .lux th, .lux td { border: 1px solid #c9d8ef; }
  .lux thead th { background: #eaf2fd; color: ${BP}; border: 1px solid #9fbbe3; border-bottom: 2px solid ${BP}; font-weight: 700; }
  .lux thead th .th-sub { color: #1976b8; font-family: 'IBM Plex Mono', monospace; opacity: 1; letter-spacing: .06em; text-transform: uppercase; }
  .lux tbody td:first-child { font-family: 'IBM Plex Mono', monospace; color: ${BP}; }
  .bp-hero { margin: 0 -14mm 6mm; background: ${GRID}, ${BP}; color: #fff; padding: 7mm 14mm 6mm; display: grid; grid-template-columns: 1fr 68mm; gap: 6mm; align-items: end; }
  .bp-brand { display: flex; align-items: center; gap: 3mm; margin-bottom: 5mm; }
  .bp-brand .lg { width: 13mm; height: 13mm; object-fit: contain; background: #fff; padding: 1mm; }
  .bp-brand .monogram { width: 13mm; height: 13mm; border: .4mm solid #fff; color: #fff; font-size: 13pt; }
  .bp-co-ar { font-size: 12pt; font-weight: 700; line-height: 1.3; }
  .bp-co-en { font-family: 'IBM Plex Mono', monospace; font-size: 6.4pt; color: ${CY}; letter-spacing: .08em; direction: ltr; text-align: right; }
  .bp-hero h1 { margin: 0; font-family: 'Reem Kufi', sans-serif; font-size: 22pt; line-height: 1.15; font-weight: 700; }
  .bp-hero .en { font-family: 'IBM Plex Mono', monospace; font-size: 7.2pt; color: ${CY}; letter-spacing: .14em; text-transform: uppercase; direction: ltr; text-align: right; margin-top: 1mm; }
  .bp-block { border: .4mm solid #fff; font-size: 7pt; }
  .bp-block div { display: grid; grid-template-columns: 22mm 1fr; }
  .bp-block div + div { border-top: .25mm solid rgba(255,255,255,.6); }
  .bp-block span { padding: 1.2mm 2mm; color: ${CY}; border-left: .25mm solid rgba(255,255,255,.6); }
  .bp-block b { padding: 1.2mm 2mm; font-family: 'IBM Plex Mono', monospace; font-weight: 600; }
`,
  letterhead: (ctx) => `
  <div class="bp-hero">
    <div>
      <div class="bp-brand">${logo(ctx, "lg")}<div><div class="bp-co-ar">${esc(ctx.companyNameAr)}</div><div class="bp-co-en">${esc(ctx.companyNameEn)}</div></div></div>
      <h1>${esc(ctx.title)}</h1>${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}
    </div>
    <div class="bp-block">
      <div><span>التصنيف</span><b style="font-family:inherit">${cls(ctx)}</b></div>
      ${ctx.referenceNumber ? `<div><span>المرجع</span><b>${esc(ctx.referenceNumber)}</b></div>` : ""}
      <div><span>التاريخ</span><b>${ctx.dateStr}</b></div>
      <div><span>الوقت</span><b>${ctx.timeStr}</b></div>
      ${ctx.highlight ? `<div><span>${esc(ctx.highlight.label)}</span><b>${esc(ctx.highlight.value)}</b></div>` : ""}
    </div>
  </div>`,
  decor: "",
  headerTemplate: tpl("10mm", `<div style="position:absolute;left:0;right:0;top:0;height:2mm;background:${BP};"></div><div style="position:absolute;left:0;right:0;top:2mm;height:.4mm;background:${CY};"></div>`),
  footerTemplate: (label) =>
    tpl("15mm", `<div dir="rtl" style="position:absolute;left:14mm;right:14mm;top:4mm;border-top:.4mm solid ${BP};padding-top:1.5mm;display:flex;justify-content:space-between;font-size:7pt;color:${BP};font-family:'Courier New',monospace;"><span>${label}</span><span>${PAGE_NO}</span></div>`),
};

// 15. Mono: black + highlighter yellow — minimal Swiss layout, an oversized
// title and hairline tables with no fills.
const INK = "#111111";
const YEL = "#f2c230";
const mono: PrintTheme = {
  id: "mono",
  margin: { top: "12mm", bottom: "15mm" },
  css:
    vars({
      paper: "#ffffff", accent: INK, "accent-ink": "#ffffff", metal: YEL, "metal-deep": "#8a6d00",
      "metal-soft": "#fafafa", row: "transparent", line: "#e6e6e6", "line-strong": "#9a9a9a",
      radius: "0px", heading: "'IBM Plex Sans Arabic', sans-serif", foil: `linear-gradient(90deg, ${INK}, ${INK})`, "pad-r": "16mm", "pad-l": "16mm",
      seal: `url("${dataUri(rosetteSvg(INK))}")`,
    }) +
    LUX_BASE +
    `
  .lux thead th { background: transparent; color: ${INK}; border-color: transparent; border-bottom: 2px solid ${INK}; font-weight: 700; font-size: 7.4pt; letter-spacing: .03em; }
  .lux thead th .th-sub { color: #8a8a8a; opacity: 1; }
  .lux .section-card { border: none; border-radius: 0; }
  .lux .section-header { background: transparent; border-bottom: none; padding-inline: 0; font-size: 8pt; letter-spacing: .04em; }
  .lux .report-summary-bar { background: transparent; border: none; border-top: 2px solid ${INK}; border-radius: 0; padding-inline: 0; }
  .mn-top { display: flex; justify-content: space-between; align-items: center; font-size: 7.2pt; color: #6a6a6a; margin-bottom: 9mm; }
  .mn-brand { display: flex; align-items: center; gap: 2.5mm; }
  .mn-brand .lg { width: 11mm; height: 11mm; object-fit: contain; }
  .mn-brand .monogram { width: 11mm; height: 11mm; background: ${INK}; color: #fff; font-size: 12pt; }
  .mn-brand b { display: block; color: ${INK}; font-size: 9.5pt; }
  .mn-ref { display: flex; gap: 5mm; }
  .mn-ref b { color: ${INK}; font-weight: 600; }
  .mn-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; border-bottom: 3mm solid ${INK}; padding-bottom: 3mm; margin-bottom: 6mm; }
  .mn-head h1 { margin: 0; font-size: 30pt; font-weight: 700; line-height: 1.1; color: ${INK}; }
  .mn-head h1 span { background: linear-gradient(#ffffff 58%, ${YEL} 58%, ${YEL} 92%, #ffffff 92%); padding: 0 1mm; }
  .mn-head .en { font-size: 7.4pt; color: #6a6a6a; letter-spacing: .22em; text-transform: uppercase; direction: ltr; text-align: right; margin-bottom: 1.5mm; }
  .mn-num { text-align: left; }
  .mn-num b { display: block; font-size: 36pt; line-height: .9; font-weight: 700; color: ${INK}; }
  .mn-num span { font-size: 7pt; color: #6a6a6a; }
`,
  letterhead: (ctx) => `
  <div class="mn-top">
    <div class="mn-brand">${logo(ctx, "lg")}<div><b>${esc(ctx.companyNameAr)}</b>${esc(ctx.companyNameEn)}</div></div>
    <div class="mn-ref">${refLines(ctx)}</div>
  </div>
  <div class="mn-head">
    <div>${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}<h1><span>${esc(ctx.title)}</span></h1></div>
    ${ctx.highlight ? `<div class="mn-num"><b>${esc(ctx.highlight.value)}</b><span>${esc(ctx.highlight.label)}</span></div>` : ""}
  </div>`,
  decor: "",
  headerTemplate: tpl("12mm", ""),
  footerTemplate: (label) =>
    tpl("15mm", `<div dir="rtl" style="position:absolute;left:16mm;right:16mm;top:4mm;border-top:.8mm solid ${INK};padding-top:1.5mm;display:flex;justify-content:space-between;font-size:7pt;color:#6a6a6a;"><span>${label}</span><span style="color:${INK};font-weight:700;">${PAGE_NO}</span></div>`),
};

// 16. Ribbon: teal + coral — a bookmark ribbon hangs from the top edge with
// the logo; table rows are separate rounded cards.
const RT = "#125b67";
const RC = "#e07a5f";
const ribbon: PrintTheme = {
  id: "ribbon",
  margin: { top: "10mm", bottom: "15mm" },
  css:
    vars({
      paper: "#fffdf9", accent: RT, "accent-ink": "#ffffff", metal: RC, "metal-deep": "#b8543a",
      "metal-soft": "#f6f1ea", row: "#f6f1ea", line: "transparent", "line-strong": "#d9c9b8",
      radius: "3mm", heading: "'Reem Kufi', 'IBM Plex Sans Arabic', sans-serif", foil: FOIL.bronze, "pad-r": "15mm", "pad-l": "15mm",
      seal: `url("${dataUri(rosetteSvg(RT))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-header, .lux .sig-title-ar { font-family: 'IBM Plex Sans Arabic', sans-serif; }
  .lux .report-table, .lux .section-body > table { border-collapse: separate; border-spacing: 0 1.3mm; }
  .lux .report-table tbody td, .lux .section-body > table tbody td { background: #f6f1ea; border: none; }
  .lux .report-table tbody tr:nth-child(even) td { background: #efe7dc; }
  .lux .report-table tbody td:first-child, .lux .report-table thead th:first-child { border-radius: 0 2.2mm 2.2mm 0; }
  .lux .report-table tbody td:last-child, .lux .report-table thead th:last-child { border-radius: 2.2mm 0 0 2.2mm; }
  .lux thead th { border-bottom: none; }
  .lux tbody td:first-child { color: ${RC}; font-weight: 700; }
  .lux .section-card { border: none; background: transparent; }
  .lux .section-header { background: transparent; border-bottom: 2px solid ${RC}; border-radius: 0; }
  .rb-head { position: relative; padding-right: 30mm; min-height: 44mm; margin-bottom: 4mm; }
  .rb-ribbon { position: absolute; right: 3mm; top: 0; width: 21mm; height: 42mm; background: ${RT}; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 84%, 0 100%); display: flex; align-items: flex-start; justify-content: center; padding-top: 5mm; }
  .rb-ribbon::after { content: ""; position: absolute; inset: 0 2.2mm; border-left: .3mm dashed rgba(255,255,255,.5); border-right: .3mm dashed rgba(255,255,255,.5); }
  .rb-ribbon .lg, .rb-ribbon .monogram { width: 14mm; height: 14mm; border-radius: 50%; background: #fff; object-fit: contain; padding: 1.4mm; position: relative; z-index: 1; }
  .rb-ribbon .monogram { color: ${RT}; font-size: 13pt; }
  .rb-co-ar { font-size: 12pt; font-weight: 700; color: ${RT}; line-height: 1.3; padding-top: 3mm; }
  .rb-co-en { font-size: 6.8pt; color: #8a7d70; letter-spacing: .1em; direction: ltr; text-align: right; }
  .rb-head h1 { margin: 5mm 0 0; font-family: 'Reem Kufi', sans-serif; font-size: 22pt; color: ${RT}; line-height: 1.2; }
  .rb-head .en { font-size: 7.4pt; color: ${RC}; letter-spacing: .18em; text-transform: uppercase; direction: ltr; text-align: right; font-weight: 600; }
  .rb-chips { display: flex; flex-wrap: wrap; gap: 2mm; margin-top: 3mm; }
  .rb-chips span { border: .3mm solid ${RC}; border-radius: 99px; padding: .6mm 3mm; font-size: 7pt; color: #7a6a5d; }
  .rb-chips b { color: ${RT}; font-weight: 600; }
`,
  letterhead: (ctx) => `
  <div class="rb-head">
    <div class="rb-ribbon">${logo(ctx, "lg")}</div>
    <div class="rb-co-ar">${esc(ctx.companyNameAr)}</div>
    <div class="rb-co-en">${esc(ctx.companyNameEn)}</div>
    <h1>${esc(ctx.title)}</h1>${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}
    <div class="rb-chips">${refLines(ctx)}${ctx.highlight ? `<span>${esc(ctx.highlight.label)} <b>${esc(ctx.highlight.value)}</b></span>` : ""}</div>
  </div>`,
  decor: "",
  // The ribbon's top reaches the page edge on every page, like a bookmark.
  headerTemplate: tpl("10mm", `<div style="position:absolute;right:18mm;width:21mm;top:0;bottom:0;background:${RT};"></div><div style="position:absolute;left:0;right:0;top:0;height:.8mm;background:${RC};"></div>`, "#fffdf9"),
  footerTemplate: (label) =>
    tpl("15mm", `<div dir="rtl" style="position:absolute;left:15mm;right:15mm;top:5mm;display:flex;justify-content:space-between;align-items:center;font-size:7pt;color:#8a7d70;"><span>${label}</span><span style="background:${RT};color:#fff;border-radius:99px;padding:.6mm 3mm;">${PAGE_NO}</span></div>`, "#fffdf9"),
};

// 17. Mosaic: cobalt + terracotta + saffron — a Moroccan zellige tile band
// at the top and bottom of every page.
const COB = "#1c3f94";
const TER = "#c1502e";
const SAF = "#e0a526";
function zelligeTile() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="#fbf4e6"/><path d="M20 4l4.2 9.8L34 18l-9.8 4.2L20 32l-4.2-9.8L6 18l9.8-4.2z" fill="${COB}" transform="translate(0 2)"/><circle cx="20" cy="20" r="3.2" fill="${SAF}"/><path d="M0 0h7L0 7zM40 0h-7l7 7zM0 40h7l-7-7zM40 40h-7l7-7z" fill="${TER}"/></svg>`;
}
const mosaic: PrintTheme = {
  id: "mosaic",
  margin: { top: "15mm", bottom: "18mm" },
  css:
    vars({
      paper: "#fdfaf4", accent: COB, "accent-ink": "#fbf4e6", metal: SAF, "metal-deep": TER,
      "metal-soft": "#f6ecda", row: "#f7efe0", line: "#eadcc3", "line-strong": "#d2b98e",
      radius: "2px", heading: "'Amiri', serif", foil: FOIL.gold, "pad-r": "15mm", "pad-l": "15mm",
      seal: `url("${dataUri(rosetteSvg(COB))}")`,
    }) +
    LUX_BASE +
    `
  .lux thead th { border-bottom: 1mm solid ${SAF}; }
  .lux tbody td:first-child { color: ${TER}; font-weight: 700; }
  .mz-head { text-align: center; display: grid; justify-items: center; gap: 1mm; margin-bottom: 4mm; }
  .mz-oct { width: 22mm; height: 22mm; background: ${COB}; clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%); display: grid; place-items: center; }
  .mz-oct .lg, .mz-oct .monogram { width: 15mm; height: 15mm; object-fit: contain; background: #fff; padding: 1.3mm; clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%); }
  .mz-oct .monogram { color: ${COB}; font-size: 14pt; }
  .mz-co-ar { font-family: 'Amiri', serif; font-size: 17pt; font-weight: 700; color: ${COB}; line-height: 1.25; }
  .mz-co-en { font-size: 7.4pt; letter-spacing: .18em; color: ${TER}; text-transform: uppercase; font-weight: 600; direction: ltr; }
  .mz-title { text-align: center; margin-bottom: 5mm; }
  .mz-title h1 { margin: 0; font-family: 'Reem Kufi', sans-serif; font-size: 21pt; color: ${TER}; line-height: 1.25; }
  .mz-title .rule { width: 36mm; height: 1.2mm; margin: 1.5mm auto; background: linear-gradient(90deg, ${COB} 0 33%, ${SAF} 33% 66%, ${TER} 66%); }
  .mz-meta { display: flex; justify-content: center; gap: 5mm; font-size: 7.2pt; color: #7a6b58; }
  .mz-meta b { color: ${COB}; font-weight: 600; }
`,
  letterhead: (ctx) => `
  <div class="mz-head">
    <div class="mz-oct">${logo(ctx, "lg")}</div>
    <div class="mz-co-ar">${esc(ctx.companyNameAr)}</div>
    <div class="mz-co-en">${esc(ctx.companyNameEn)}</div>
  </div>
  <div class="mz-title">
    <h1>${esc(ctx.title)}</h1>
    <div class="rule"></div>
    <div class="mz-meta">${ctx.titleEn ? `<span>${esc(ctx.titleEn)}</span>` : ""}${refLines(ctx)}</div>
  </div>`,
  decor: "",
  headerTemplate: tpl("15mm", `<div style="position:absolute;left:0;right:0;top:0;height:8mm;background:url('${dataUri(zelligeTile())}') 0 0 / 8mm 8mm;"></div><div style="position:absolute;left:0;right:0;top:8mm;height:.8mm;background:${COB};"></div>`, "#fdfaf4"),
  footerTemplate: (label) =>
    tpl("18mm", `<div dir="rtl" style="position:absolute;left:15mm;right:15mm;top:2mm;display:flex;justify-content:space-between;font-size:7pt;color:#7a6b58;"><span>${label}</span><span>${PAGE_NO}</span></div><div style="position:absolute;left:0;right:0;bottom:6mm;height:.8mm;background:${COB};"></div><div style="position:absolute;left:0;right:0;bottom:0;height:6mm;background:url('${dataUri(zelligeTile())}') 0 0 / 6mm 6mm;"></div>`, "#fdfaf4"),
};

// 18. Ocean: deep ocean blue + turquoise — a gradient header with a wave
// edge and light aqua tables.
const OC = "#0a4d68";
const AQ = "#05bfdb";
const ocean: PrintTheme = {
  id: "ocean",
  margin: { top: "9mm", bottom: "16mm" },
  css:
    vars({
      paper: "#ffffff", accent: OC, "accent-ink": OC, metal: AQ, "metal-deep": "#088395",
      "metal-soft": "#e6f7fb", row: "#f6fbfd", line: "#e0eef2", "line-strong": "#9fd3de",
      radius: "3px", heading: "'Reem Kufi', 'IBM Plex Sans Arabic', sans-serif", foil: `linear-gradient(90deg, ${OC}, ${AQ})`, "pad-r": "15mm", "pad-l": "15mm",
      seal: `url("${dataUri(rosetteSvg(OC))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-header, .lux .sig-title-ar { font-family: 'IBM Plex Sans Arabic', sans-serif; }
  .lux thead th { background: #e6f7fb; color: ${OC}; border-color: #e6f7fb; border-bottom: 2px solid ${AQ}; font-weight: 700; }
  .lux thead th .th-sub { color: #088395; opacity: 1; }
  .lux .kpi-total-card { background: linear-gradient(120deg, ${OC}, #088395); color: #fff; }
  .lux .amount-val { background: none; color: #fff; }
  .oc-hero { position: relative; margin: 0 -15mm 5mm; padding: 8mm 15mm 16mm; background: linear-gradient(120deg, ${OC}, #088395 55%, ${AQ}); color: #fff; }
  .oc-hero svg { position: absolute; left: 0; right: 0; bottom: -1px; width: 100%; height: 11mm; }
  .oc-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 5mm; }
  .oc-brand { display: flex; align-items: center; gap: 3mm; }
  .oc-brand .lg, .oc-brand .monogram { width: 14mm; height: 14mm; border-radius: 50%; background: #fff; object-fit: contain; padding: 1.4mm; }
  .oc-brand .monogram { color: ${OC}; font-size: 13pt; }
  .oc-co-ar { font-size: 12pt; font-weight: 700; line-height: 1.3; }
  .oc-co-en { font-size: 6.8pt; opacity: .8; letter-spacing: .1em; direction: ltr; text-align: right; }
  .oc-ref { display: grid; gap: .5mm; font-size: 7pt; opacity: .9; text-align: left; white-space: nowrap; }
  .oc-ref b { font-weight: 600; }
  .oc-hero h1 { margin: 6mm 0 0; font-family: 'Reem Kufi', sans-serif; font-size: 22pt; line-height: 1.2; }
  .oc-hero .en { font-size: 7.4pt; letter-spacing: .18em; opacity: .85; text-transform: uppercase; direction: ltr; text-align: right; }
`,
  letterhead: (ctx) => `
  <div class="oc-hero">
    <div class="oc-row">
      <div class="oc-brand">${logo(ctx, "lg")}<div><div class="oc-co-ar">${esc(ctx.companyNameAr)}</div><div class="oc-co-en">${esc(ctx.companyNameEn)}</div></div></div>
      <div class="oc-ref">${refLines(ctx)}${ctx.highlight ? `<span>${esc(ctx.highlight.label)} <b>${esc(ctx.highlight.value)}</b></span>` : ""}</div>
    </div>
    <h1>${esc(ctx.title)}</h1>${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}
    <svg viewBox="0 0 600 60" preserveAspectRatio="none"><path d="M0 34Q75 4 150 28T300 24T450 30T600 16V60H0Z" fill="#ffffff"/><path d="M0 44Q90 18 180 38T360 34T600 30" fill="none" stroke="${AQ}" stroke-width="2" opacity=".6"/></svg>
  </div>`,
  decor: "",
  headerTemplate: tpl("9mm", `<div style="position:absolute;left:0;right:0;top:0;height:2.2mm;background:linear-gradient(90deg,${OC},${AQ});"></div>`),
  footerTemplate: (label) =>
    tpl("16mm", `<div dir="rtl" style="position:absolute;left:15mm;right:15mm;top:5mm;display:flex;justify-content:space-between;align-items:center;gap:4mm;font-size:7pt;color:#5d7f8a;"><span>${label}</span><span style="flex:1;height:.4mm;background:linear-gradient(90deg,${AQ},${OC});"></span><span>${PAGE_NO}</span></div>`),
};

// 19. Sadu: Sadu red + black + ivory + ochre — the Najdi Al-Sadu weave down
// the side of every page and along the top.
const SR = "#8e1b1b";
const SB = "#1a1a1a";
const SI = "#f7f0e1";
const SO = "#c8963e";
function saduTile(vertical: boolean) {
  const h = `<rect width="24" height="12" fill="${SB}"/><path d="M0 12L6 1 12 12zM12 12L18 1 24 12z" fill="${SR}"/><path d="M12 3.5L14 6 12 8.5 10 6z" fill="${SI}"/><path d="M0 0h24v1.2H0zM0 10.8h24V12H0z" fill="${SO}"/>`;
  return vertical
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="24" viewBox="0 0 12 24"><g transform="rotate(90 6 6) translate(0 0)">${h}</g></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="12" viewBox="0 0 24 12">${h}</svg>`;
}
const sadu: PrintTheme = {
  id: "sadu",
  margin: { top: "13mm", bottom: "16mm" },
  css:
    vars({
      paper: SI, accent: SB, "accent-ink": SI, metal: SR, "metal-deep": SR,
      "metal-soft": "#f1e6cf", row: "rgba(200,150,62,.1)", line: "#e4d6b8", "line-strong": "#c7ad7c",
      radius: "0px", heading: "'Amiri', serif", foil: FOIL.gold, "pad-r": "15mm", "pad-l": "21mm",
      seal: `url("${dataUri(rosetteSvg(SR))}")`,
    }) +
    LUX_BASE +
    `
  html { background: url("${dataUri(saduTile(true))}") left top / 10mm 20mm repeat-y, ${SI}; }
  .lux thead th { border-bottom: 1mm solid ${SR}; }
  .lux tbody td:first-child { color: ${SR}; font-weight: 700; }
  .sd-head { display: grid; grid-template-columns: 1fr 58mm; gap: 5mm; align-items: stretch; margin-bottom: 5mm; }
  .sd-brand { display: flex; align-items: center; gap: 3mm; margin-bottom: 3mm; }
  .sd-brand .lg { width: 14mm; height: 14mm; object-fit: contain; }
  .sd-brand .monogram { width: 14mm; height: 14mm; background: ${SR}; color: ${SI}; font-size: 14pt; }
  .sd-co-ar { font-family: 'Amiri', serif; font-size: 14pt; font-weight: 700; color: ${SB}; line-height: 1.3; }
  .sd-co-en { font-size: 6.8pt; color: #7a6a4f; letter-spacing: .12em; direction: ltr; text-align: right; text-transform: uppercase; }
  .sd-head h1 { margin: 0; font-family: 'Aref Ruqaa', serif; font-size: 25pt; color: ${SR}; line-height: 1.2; }
  .sd-head .en { font-size: 7.4pt; color: ${SO}; letter-spacing: .2em; text-transform: uppercase; direction: ltr; text-align: right; font-weight: 700; }
  .sd-box { background: ${SB}; color: ${SI}; padding: 4mm 5mm; display: flex; flex-direction: column; justify-content: center; gap: 1mm; font-size: 7.2pt; border-bottom: 1.2mm solid ${SR}; }
  .sd-box b { color: #fff; font-weight: 600; }
  .sd-box .big { font-family: 'Cormorant Garamond', serif; font-size: 26pt; line-height: 1; color: ${SO}; }
`,
  letterhead: (ctx) => `
  <div class="sd-head">
    <div>
      <div class="sd-brand">${logo(ctx, "lg")}<div><div class="sd-co-ar">${esc(ctx.companyNameAr)}</div><div class="sd-co-en">${esc(ctx.companyNameEn)}</div></div></div>
      ${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}<h1>${esc(ctx.title)}</h1>
    </div>
    <div class="sd-box">
      ${ctx.highlight ? `<div class="big">${esc(ctx.highlight.value)}</div><div>${esc(ctx.highlight.label)}</div>` : `<div><b>${cls(ctx)}</b></div>`}
      ${refLines(ctx)}
    </div>
  </div>`,
  decor: "",
  headerTemplate: tpl("13mm", `<div style="position:absolute;left:0;width:10mm;top:0;bottom:0;background:${SB};"></div><div style="position:absolute;left:10mm;right:0;top:0;height:5mm;background:url('${dataUri(saduTile(false))}') 0 0 / 10mm 5mm;"></div>`, SI),
  footerTemplate: (label) =>
    tpl("16mm", `<div style="position:absolute;left:0;width:10mm;top:0;bottom:0;background:${SB};"></div><div dir="rtl" style="position:absolute;left:21mm;right:15mm;top:4mm;border-top:.8mm solid ${SR};padding-top:1.5mm;display:flex;justify-content:space-between;font-size:7pt;color:#7a6a4f;"><span>${label}</span><span>${PAGE_NO}</span></div>`, SI),
};

// 20. Glass: graphite + indigo — a modern rounded card with a soft glow and a
// rounded table with a light header.
const GL = "#334155";
const IND = "#6366f1";
const glass: PrintTheme = {
  id: "glass",
  margin: { top: "11mm", bottom: "15mm" },
  css:
    vars({
      paper: "#f6f8fb", accent: GL, "accent-ink": "#475569", metal: IND, "metal-deep": "#4f46e5",
      "metal-soft": "#eef2ff", row: "transparent", line: "#e8edf3", "line-strong": "#c3cbd8",
      radius: "4mm", heading: "'IBM Plex Sans Arabic', sans-serif", foil: `linear-gradient(90deg, ${IND}, #a855f7)`, "pad-r": "14mm", "pad-l": "14mm",
      seal: `url("${dataUri(rosetteSvg(IND))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-card { overflow: hidden; box-shadow: 0 .4mm 1.6mm rgba(15,23,42,.06); }
  .lux .section-header { background: #fff; border-bottom: 1px solid #e8edf3; color: ${GL}; }
  .lux thead th { background: #f1f5f9; color: #475569; border-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
  .lux thead th .th-sub { color: #94a3b8; opacity: 1; }
  .lux .report-summary-bar, .lux .kpi-total-card { border-radius: 4mm; }
  .lux .kpi-total-card { background: linear-gradient(120deg, ${GL}, ${IND}); color: #fff; border: none; }
  .lux .amount-val { background: none; color: #fff; }
  .gl-card { position: relative; overflow: hidden; background: #fff; border-radius: 5mm; padding: 6mm 7mm; margin-bottom: 5mm; box-shadow: 0 .6mm 2.4mm rgba(15,23,42,.08); }
  .gl-card::before { content: ""; position: absolute; left: -14mm; top: -18mm; width: 62mm; height: 62mm; border-radius: 50%; background: radial-gradient(circle, rgba(99,102,241,.28), rgba(168,85,247,.12) 45%, transparent 70%); }
  .gl-in { position: relative; display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; }
  .gl-brand { display: flex; align-items: center; gap: 3mm; margin-bottom: 5mm; }
  .gl-brand .lg { width: 12mm; height: 12mm; object-fit: contain; border-radius: 3mm; }
  .gl-brand .monogram { width: 12mm; height: 12mm; border-radius: 3mm; background: linear-gradient(135deg, ${IND}, #a855f7); color: #fff; font-size: 12pt; }
  .gl-co-ar { font-size: 11pt; font-weight: 700; color: ${GL}; line-height: 1.3; }
  .gl-co-en { font-size: 6.6pt; color: #94a3b8; direction: ltr; text-align: right; }
  .gl-card h1 { margin: 0; font-size: 21pt; font-weight: 700; color: #0f172a; line-height: 1.2; }
  .gl-card .en { font-size: 7.2pt; color: ${IND}; letter-spacing: .14em; text-transform: uppercase; direction: ltr; text-align: right; font-weight: 600; margin-top: .8mm; }
  .gl-pills { display: flex; flex-wrap: wrap; gap: 1.5mm; margin-top: 3mm; }
  .gl-pills span { background: #f1f5f9; border-radius: 99px; padding: .6mm 2.6mm; font-size: 6.8pt; color: #64748b; }
  .gl-pills b { color: ${GL}; font-weight: 600; }
  .gl-num { text-align: center; background: #eef2ff; border-radius: 4mm; padding: 3mm 5mm; }
  .gl-num b { display: block; font-size: 24pt; line-height: 1; color: ${IND}; font-weight: 700; }
  .gl-num span { font-size: 6.8pt; color: #64748b; }
`,
  letterhead: (ctx) => `
  <div class="gl-card"><div class="gl-in">
    <div>
      <div class="gl-brand">${logo(ctx, "lg")}<div><div class="gl-co-ar">${esc(ctx.companyNameAr)}</div><div class="gl-co-en">${esc(ctx.companyNameEn)}</div></div></div>
      <h1>${esc(ctx.title)}</h1>${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}
      <div class="gl-pills">${refLines(ctx)}</div>
    </div>
    ${ctx.highlight ? `<div class="gl-num"><b>${esc(ctx.highlight.value)}</b><span>${esc(ctx.highlight.label)}</span></div>` : ""}
  </div></div>`,
  decor: "",
  headerTemplate: tpl("11mm", "", "#f6f8fb"),
  footerTemplate: (label) =>
    tpl("15mm", `<div dir="rtl" style="position:absolute;left:14mm;right:14mm;top:4.5mm;display:flex;justify-content:space-between;align-items:center;font-size:7pt;color:#94a3b8;"><span>${label}</span><span style="background:#fff;border:1px solid #e2e8f0;border-radius:99px;padding:.6mm 3mm;color:#475569;">${PAGE_NO}</span></div>`, "#f6f8fb"),
};

// 21. Gazette: ink black + dark red — a newspaper masthead, serif type and
// three-rule "booktabs" tables.
const GZ = "#1a1a1a";
const GR = "#8b0000";
const gazette: PrintTheme = {
  id: "gazette",
  margin: { top: "12mm", bottom: "15mm" },
  css:
    vars({
      paper: "#fbf9f4", accent: GZ, "accent-ink": GZ, metal: GR, "metal-deep": GR,
      "metal-soft": "#f3efe6", row: "transparent", line: "transparent", "line-strong": "#8a8579",
      radius: "0px", heading: "'Amiri', serif", foil: `linear-gradient(90deg, ${GZ}, ${GZ})`, "pad-r": "16mm", "pad-l": "16mm",
      seal: `url("${dataUri(rosetteSvg(GZ))}")`,
    }) +
    LUX_BASE +
    `
  body.lux { font-family: 'Amiri', 'IBM Plex Sans Arabic', serif; }
  .lux table { border-top: 2px solid ${GZ}; border-bottom: 2px solid ${GZ}; }
  .lux thead th { background: transparent; color: ${GZ}; border-color: transparent; border-bottom: 1px solid ${GZ}; font-weight: 700; }
  .lux thead th .th-sub { color: #6b665c; opacity: 1; font-style: italic; }
  .lux th, .lux td { border-bottom-color: transparent; }
  .lux tbody td { padding-top: 1.4mm; padding-bottom: 1.4mm; }
  .lux tbody td:first-child { color: ${GR}; }
  .lux .section-card { border: none; background: transparent; }
  .lux .section-header { background: transparent; border-bottom: 1px solid ${GZ}; padding-inline: 0; font-size: 10pt; }
  .lux .report-summary-bar { background: transparent; border: none; border-radius: 0; padding-inline: 0; }
  .gz-date { display: flex; justify-content: space-between; font-size: 7.2pt; color: #6b665c; border-top: 1px solid ${GZ}; border-bottom: 1px solid ${GZ}; padding: 1mm 0; }
  .gz-date b { color: ${GZ}; }
  .gz-mast { text-align: center; padding: 3mm 0 2mm; border-bottom: 3px double ${GZ}; margin-bottom: 4mm; display: grid; justify-items: center; gap: 1mm; }
  .gz-mast .lg { height: 13mm; max-width: 40mm; object-fit: contain; }
  .gz-mast .monogram { width: 13mm; height: 13mm; border: 1px solid ${GZ}; font-size: 14pt; }
  .gz-mast .co { font-family: 'Amiri', serif; font-size: 27pt; font-weight: 700; color: ${GZ}; line-height: 1.15; }
  .gz-mast .coen { font-family: 'Cormorant Garamond', serif; font-size: 9pt; letter-spacing: .3em; text-transform: uppercase; color: #3d3a34; direction: ltr; font-weight: 700; }
  .gz-kicker { font-size: 7.6pt; color: ${GR}; font-weight: 700; letter-spacing: .08em; }
  .gz-head { margin-bottom: 5mm; }
  .gz-head h1 { margin: .5mm 0 0; font-family: 'Amiri', serif; font-size: 24pt; color: ${GZ}; line-height: 1.2; }
  .gz-head .deck { font-size: 8.4pt; color: #4d4a43; font-style: italic; margin-top: .6mm; }
`,
  letterhead: (ctx) => `
  <div class="gz-date"><span>${ctx.referenceNumber ? `العدد <b class="ltr">${esc(ctx.referenceNumber)}</b>` : cls(ctx)}</span><span>تاريخ الإصدار <b class="ltr">${ctx.dateStr}</b></span><span>وقت الطباعة <b class="ltr">${ctx.timeStr}</b></span></div>
  <div class="gz-mast">${logo(ctx, "lg")}<div class="co">${esc(ctx.companyNameAr)}</div><div class="coen">${esc(ctx.companyNameEn)}</div></div>
  <div class="gz-head">
    <div class="gz-kicker">${cls(ctx)}${ctx.highlight ? ` — ${esc(ctx.highlight.value)} ${esc(ctx.highlight.label)}` : ""}</div>
    <h1>${esc(ctx.title)}</h1>
    ${ctx.titleEn ? `<div class="deck">${esc(ctx.titleEn)}</div>` : ""}
  </div>`,
  decor: "",
  headerTemplate: tpl("12mm", `<div style="position:absolute;left:16mm;right:16mm;top:6mm;border-top:3px double ${GZ};"></div>`, "#fbf9f4"),
  footerTemplate: (label) =>
    tpl("15mm", `<div dir="rtl" style="position:absolute;left:16mm;right:16mm;top:4mm;border-top:1px solid ${GZ};padding-top:1.5mm;display:flex;justify-content:space-between;font-size:7pt;color:#6b665c;font-family:Georgia,serif;"><span>${label}</span><span>${PAGE_NO}</span></div>`, "#fbf9f4"),
};

// 22. Prism: black + silver + ice blue — a faceted, crystal-cut header.
const PB = "#1c1c1e";
const SIL = "#c0c4cc";
const ICE = "#7dd3fc";
function prismSvg() {
  // A jittered point grid split into triangles, shaded by position.
  const W = 600, H = 170, C = 12, R = 4;
  const pt = (i: number, j: number) => {
    const edgeX = i === 0 || i === C, edgeY = j === 0 || j === R;
    const jx = edgeX ? 0 : Math.sin(i * 12.9898 + j * 78.233) * 18;
    const jy = edgeY ? 0 : Math.cos(i * 39.346 + j * 11.135) * 12;
    return [(i * W) / C + jx, (j * H) / R + jy];
  };
  const shades = ["#1c1c1e", "#232327", "#2b2c31", "#34363c", "#3d4047"];
  const tris: string[] = [];
  for (let i = 0; i < C; i++) {
    for (let j = 0; j < R; j++) {
      const [a, b, c, d] = [pt(i, j), pt(i + 1, j), pt(i, j + 1), pt(i + 1, j + 1)];
      const k = Math.abs(Math.round(Math.sin(i * 3.7 + j * 1.3) * 4));
      const ice = (i * 7 + j * 3) % 11 === 0;
      const f1 = ice ? ICE : shades[k % shades.length];
      const f2 = shades[(k + 2) % shades.length];
      const P = (p: number[]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
      tris.push(`<polygon points="${P(a)} ${P(b)} ${P(c)}" fill="${f1}"${ice ? ' opacity=".35"' : ""}/>`);
      tris.push(`<polygon points="${P(b)} ${P(d)} ${P(c)}" fill="${f2}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" width="100%" height="100%"><rect width="${W}" height="${H}" fill="${PB}"/>${tris.join("")}<g stroke="rgba(255,255,255,.06)" stroke-width=".6">${tris.length ? "" : ""}</g></svg>`;
}
const prism: PrintTheme = {
  id: "prism",
  margin: { top: "10mm", bottom: "15mm" },
  css:
    vars({
      paper: "#ffffff", accent: PB, "accent-ink": SIL, metal: ICE, "metal-deep": "#0369a1",
      "metal-soft": "#f1f5f9", row: "#f4f5f7", line: "#e5e7eb", "line-strong": "#b8bcc4",
      radius: "0px", heading: "'Reem Kufi', 'IBM Plex Sans Arabic', sans-serif", foil: FOIL.silver, "pad-r": "14mm", "pad-l": "14mm",
      seal: `url("${dataUri(rosetteSvg(PB))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-header, .lux .sig-title-ar { font-family: 'IBM Plex Sans Arabic', sans-serif; }
  .lux thead th { border-bottom: 1mm solid ${ICE}; }
  .lux tbody td:first-child { color: #0369a1; font-weight: 700; }
  .pr-hero { position: relative; margin: 0 -14mm 6mm; height: 46mm; color: #fff; overflow: hidden; }
  .pr-hero .art { position: absolute; inset: 0; }
  .pr-in { position: relative; height: 100%; padding: 7mm 14mm; display: flex; flex-direction: column; justify-content: space-between; }
  .pr-row { display: flex; justify-content: space-between; align-items: center; gap: 4mm; }
  .pr-brand { display: flex; align-items: center; gap: 3mm; }
  .pr-hex { width: 15mm; height: 15mm; clip-path: polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%); background: ${FOIL.silver}; display: grid; place-items: center; }
  .pr-hex .lg { width: 10mm; height: 10mm; object-fit: contain; }
  .pr-hex .monogram { color: ${PB}; font-size: 13pt; }
  .pr-co-ar { font-size: 12pt; font-weight: 700; line-height: 1.3; }
  .pr-co-en { font-size: 6.8pt; color: ${SIL}; letter-spacing: .1em; direction: ltr; text-align: right; }
  .pr-ref { display: grid; gap: .5mm; font-size: 7pt; color: ${SIL}; text-align: left; white-space: nowrap; }
  .pr-ref b { color: #fff; font-weight: 600; }
  .pr-in h1 { margin: 0; font-family: 'Reem Kufi', sans-serif; font-size: 22pt; line-height: 1.15; }
  .pr-in .en { font-size: 7.4pt; color: ${ICE}; letter-spacing: .2em; text-transform: uppercase; direction: ltr; text-align: right; }
  .pr-num { text-align: center; }
  .pr-num b { display: block; font-family: 'Cormorant Garamond', serif; font-size: 34pt; line-height: .9; font-weight: 700; background: ${FOIL.silver}; -webkit-background-clip: text; background-clip: text; color: transparent; }
  .pr-num span { font-size: 6.8pt; color: ${SIL}; }
`,
  letterhead: (ctx) => `
  <div class="pr-hero"><div class="art">${prismSvg()}</div>
    <div class="pr-in">
      <div class="pr-row">
        <div class="pr-brand"><div class="pr-hex">${logo(ctx, "lg")}</div><div><div class="pr-co-ar">${esc(ctx.companyNameAr)}</div><div class="pr-co-en">${esc(ctx.companyNameEn)}</div></div></div>
        <div class="pr-ref">${refLines(ctx)}</div>
      </div>
      <div class="pr-row" style="align-items:flex-end">
        <div>${ctx.titleEn ? `<div class="en">${esc(ctx.titleEn)}</div>` : ""}<h1>${esc(ctx.title)}</h1></div>
        ${ctx.highlight ? `<div class="pr-num"><b>${esc(ctx.highlight.value)}</b><span>${esc(ctx.highlight.label)}</span></div>` : ""}
      </div>
    </div>
  </div>`,
  decor: "",
  headerTemplate: tpl("10mm", `<div style="position:absolute;left:0;right:0;top:0;height:3mm;background:${PB};"></div><div style="position:absolute;left:0;right:0;top:3mm;height:.5mm;background:${ICE};"></div>`),
  footerTemplate: (label) =>
    tpl("15mm", `<div dir="rtl" style="position:absolute;left:14mm;right:14mm;top:5mm;display:flex;justify-content:space-between;align-items:center;gap:4mm;font-size:7pt;color:#6b7280;"><span>${label}</span><span style="flex:1;height:.4mm;background:${FOIL.silver};"></span><span>${PAGE_NO}</span></div>`),
};


// ===========================================================================
// Ten more designs (23–32), each built on an idea none of the others use.
// ===========================================================================

/** A small seeded random, so every PDF of a design draws the same art. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const titleEn = (ctx: ShellContext, c: string) => (ctx.titleEn ? `<div class="${c}">${esc(ctx.titleEn)}</div>` : "");
const hl = (ctx: ShellContext, c: string) => (ctx.highlight ? `<div class="${c}"><b>${esc(ctx.highlight.value)}</b><span>${esc(ctx.highlight.label)}</span></div>` : "");

// 23. Pearl: the SanaD site itself — pearl paper, soft pastel light, rounded glass cards.
const PL_SKY = "#0a84c6";
const PL_VIO = "#8b5cf6";
const pearl: PrintTheme = {
  id: "pearl",
  margin: { top: "10mm", bottom: "15mm" },
  css:
    vars({
      paper: "#f2f4f9", accent: "#172033", "accent-ink": "#ffffff", metal: PL_SKY, "metal-deep": "#0a6fa8",
      "metal-soft": "#e7f4fc", row: "#f8fafc", line: "#e6e9f1", "line-strong": "#c7cedb",
      radius: "3.5mm", heading: "'Reem Kufi', 'IBM Plex Sans Arabic', sans-serif", foil: `linear-gradient(120deg, ${PL_SKY}, ${PL_VIO})`, "pad-r": "13mm", "pad-l": "13mm",
      seal: `url("${dataUri(rosetteSvg(PL_SKY))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-header, .lux .sig-title-ar { font-family: 'IBM Plex Sans Arabic', sans-serif; }
  .lux .section-card { border: none; box-shadow: 0 .5mm 2mm rgba(23,32,51,.07); overflow: hidden; }
  .lux .section-header { background: #fff; border-bottom: 1px solid #e6e9f1; }
  .lux table { border-radius: 3mm; overflow: hidden; }
  .lux thead th { background: linear-gradient(120deg, ${PL_SKY}, ${PL_VIO}); color: #fff; border: none; }
  .lux thead th .th-sub { color: #fff; opacity: .75; }
  .lux tbody td { background: #fff; }
  .lux tbody tr:nth-child(even) td { background: #f6f8fc; }
  .lux .kpi-total-card { background: linear-gradient(120deg, ${PL_SKY}, ${PL_VIO}); border: none; }
  .lux .amount-val { background: none; color: #fff; }
  .pl-card { position: relative; overflow: hidden; margin: 0 0 5mm; border-radius: 6mm; background: #fff; padding: 6mm 7mm 5.5mm; box-shadow: 0 .8mm 3mm rgba(23,32,51,.08); }
  .pl-card .blob { position: absolute; border-radius: 50%; }
  .pl-card .b1 { width: 70mm; height: 70mm; left: -18mm; top: -30mm; background: radial-gradient(circle, rgba(205,233,249,1), rgba(205,233,249,0) 68%); }
  .pl-card .b2 { width: 60mm; height: 60mm; left: 34mm; top: -26mm; background: radial-gradient(circle, rgba(227,214,255,1), rgba(227,214,255,0) 68%); }
  .pl-card .b3 { width: 50mm; height: 50mm; left: 4mm; bottom: -30mm; background: radial-gradient(circle, rgba(250,214,219,.9), rgba(250,214,219,0) 68%); }
  .pl-in { position: relative; display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; }
  .pl-brand { display: flex; align-items: center; gap: 3mm; margin-bottom: 5mm; }
  .pl-brand .lg { width: 13mm; height: 13mm; border-radius: 4mm; object-fit: contain; background: #fff; box-shadow: 0 .6mm 2mm rgba(10,25,70,.18); padding: .8mm; }
  .pl-brand .monogram { width: 13mm; height: 13mm; border-radius: 4mm; background: linear-gradient(135deg, ${PL_SKY}, ${PL_VIO}); color: #fff; font-size: 13pt; }
  .pl-co-ar { font-size: 11.5pt; font-weight: 700; color: #172033; line-height: 1.3; }
  .pl-co-en { font-size: 6.6pt; color: #5e6a7d; direction: ltr; text-align: right; }
  .pl-card h1 { margin: 0; font-family: 'Reem Kufi', sans-serif; font-size: 22pt; line-height: 1.2; color: #172033; }
  .pl-en { font-size: 7.2pt; letter-spacing: .16em; text-transform: uppercase; color: ${PL_VIO}; font-weight: 600; direction: ltr; text-align: right; margin-top: .6mm; }
  .pl-chips { display: flex; flex-wrap: wrap; gap: 1.6mm; margin-top: 3.5mm; }
  .pl-chips span { border-radius: 99px; padding: .7mm 3mm; font-size: 6.8pt; color: #0a6fa8; background: #e7f4fc; }
  .pl-chips span:nth-child(2) { background: #f3edff; color: #6d3fd6; }
  .pl-chips span:nth-child(3) { background: #e4f7f4; color: #0b7a6d; }
  .pl-chips b { font-weight: 600; }
  .pl-num { text-align: center; border-radius: 5mm; padding: 3.5mm 6mm; background: linear-gradient(135deg, #e7f4fc, #f3edff); }
  .pl-num b { display: block; font-family: 'Reem Kufi', sans-serif; font-size: 25pt; line-height: 1; background: linear-gradient(120deg, ${PL_SKY}, ${PL_VIO}); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .pl-num span { font-size: 6.8pt; color: #5e6a7d; }
`,
  letterhead: (ctx) => `
  <div class="pl-card"><i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i>
    <div class="pl-in">
      <div>
        <div class="pl-brand">${logo(ctx, "lg")}<div><div class="pl-co-ar">${esc(ctx.companyNameAr)}</div><div class="pl-co-en">${esc(ctx.companyNameEn)}</div></div></div>
        <h1>${esc(ctx.title)}</h1>${titleEn(ctx, "pl-en")}
        <div class="pl-chips">${refLines(ctx)}</div>
      </div>
      ${hl(ctx, "pl-num")}
    </div>
  </div>`,
  decor: "",
  headerTemplate: tpl("10mm", `<div style="position:absolute;left:13mm;right:13mm;top:4mm;height:1.2mm;border-radius:1mm;background:linear-gradient(90deg,${PL_SKY},${PL_VIO});"></div>`, "#f2f4f9"),
  footerTemplate: (label) =>
    tpl("15mm", `<div dir="rtl" style="position:absolute;left:13mm;right:13mm;top:4mm;display:flex;justify-content:space-between;align-items:center;font-size:7pt;color:#5e6a7d;"><span>${label}</span><span style="background:#fff;border-radius:99px;padding:.7mm 3.4mm;color:${PL_SKY};font-weight:700;box-shadow:0 .4mm 1.4mm rgba(23,32,51,.1);">${PAGE_NO}</span></div>`, "#f2f4f9"),
};

// 24. Passport: security-engraved green and gold, a holographic stripe and a machine-readable line.
const PP = "#0d4f3a";
const PP_GOLD = "#b8914a";
function mrz(ctx: ShellContext) {
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "<").replace(/^<+|<+$/g, "");
  const name = clean(ctx.companyNameEn || "SANAD").slice(0, 30);
  const ref = clean(ctx.referenceNumber ?? ctx.dateStr.replace(/\//g, "")).slice(0, 14);
  const pad = (s: string) => (s + "<".repeat(44)).slice(0, 44);
  return [pad(`P<SAU${name}`), pad(`${ref}<<SAU<${ctx.dateStr.replace(/\//g, "")}<SANAD<HR`)];
}
const passport: PrintTheme = {
  id: "passport",
  margin: { top: "12mm", bottom: "16mm" },
  css:
    vars({
      paper: "#fbfaf4", accent: PP, "accent-ink": "#f2e2b6", metal: PP_GOLD, "metal-deep": "#8a6b2f",
      "metal-soft": "#eef3ec", row: "#f5f7f1", line: "#dfe6dc", "line-strong": "#aebcab",
      radius: "1.5mm", heading: "'Amiri', serif", foil: FOIL.gold, "pad-r": "15mm", "pad-l": "15mm",
      seal: `url("${dataUri(rosetteSvg(PP))}")`,
    }) +
    LUX_BASE +
    `
  html { background: #fbfaf4 url("${dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><g fill="none" stroke="${PP}" stroke-width=".35" opacity=".07">${Array.from({ length: 9 }, (_, k) => `<circle cx="120" cy="120" r="${20 + k * 13}"/>`).join("")}</g></svg>`)}") center 60% / 150mm 150mm no-repeat; }
  .pp-page { position: relative; margin: 0 -15mm 5mm; padding: 7mm 15mm 5mm; background: #eef3ec; overflow: hidden; border-bottom: 1.4mm solid ${PP}; }
  .pp-page .g { position: absolute; inset: 0; opacity: .35; }
  .pp-holo { position: absolute; top: 0; bottom: 0; left: 22mm; width: 9mm; background: linear-gradient(180deg, #f7e7b4, #bfe3d6, #d9c7f0, #f2d3a7, #bfe3d6); opacity: .75; }
  .pp-in { position: relative; display: grid; grid-template-columns: 30mm 1fr; gap: 6mm; align-items: start; }
  .pp-photo { width: 30mm; height: 36mm; border: .5mm solid ${PP_GOLD}; background: #fff; display: grid; place-items: center; border-radius: 1mm; }
  .pp-photo .lg { width: 24mm; height: 24mm; object-fit: contain; }
  .pp-photo .monogram { width: 24mm; height: 24mm; color: ${PP}; font-size: 26pt; font-family: 'Amiri', serif; }
  .pp-kicker { font-size: 7pt; letter-spacing: .3em; color: ${PP_GOLD}; font-weight: 700; direction: ltr; text-align: right; text-transform: uppercase; }
  .pp-co { font-family: 'Amiri', serif; font-size: 16pt; font-weight: 700; color: ${PP}; line-height: 1.25; margin-top: 1mm; }
  .pp-coen { font-size: 7pt; color: #5d6b5a; direction: ltr; text-align: right; letter-spacing: .06em; }
  .pp-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm 4mm; margin-top: 4mm; }
  .pp-fields div { border-bottom: .3mm solid #b9c6b6; padding-bottom: .6mm; }
  .pp-fields small { display: block; font-size: 5.8pt; color: #6b7a68; letter-spacing: .04em; }
  .pp-fields b { font-size: 8pt; color: #1e2b1c; font-weight: 600; }
  .pp-mrz { position: relative; margin-top: 5mm; padding: 2mm 3mm; background: #fff; border: .3mm solid #cfd8cc; font-family: 'IBM Plex Mono', monospace; font-size: 8.4pt; letter-spacing: .12em; color: #1e2b1c; direction: ltr; text-align: left; line-height: 1.5; white-space: pre; overflow: hidden; }
  .pp-title { display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; margin-bottom: 4mm; }
  .pp-title h1 { margin: 0; font-family: 'Amiri', serif; font-size: 22pt; color: ${PP}; line-height: 1.2; }
  .pp-title .en { font-size: 7.4pt; letter-spacing: .24em; color: ${PP_GOLD}; text-transform: uppercase; direction: ltr; text-align: right; font-weight: 700; }
  .pp-num { border: .5mm solid ${PP_GOLD}; padding: 1.5mm 5mm; text-align: center; background: #fff; }
  .pp-num b { display: block; font-family: 'Amiri', serif; font-size: 20pt; line-height: 1; color: ${PP}; }
  .pp-num span { font-size: 6.6pt; color: #6b7a68; }
`,
  letterhead: (ctx) => {
    const [l1, l2] = mrz(ctx);
    return `
  <div class="pp-page"><div class="g">${wavesSvg(PP)}</div><i class="pp-holo"></i>
    <div class="pp-in">
      <div class="pp-photo">${logo(ctx, "lg")}</div>
      <div>
        <div class="pp-kicker">Kingdom of Saudi Arabia · Official Document</div>
        <div class="pp-co">${esc(ctx.companyNameAr)}</div>
        <div class="pp-coen">${esc(ctx.companyNameEn)}</div>
        <div class="pp-fields">
          <div><small>${ctx.referenceNumber ? "رقم المرجع" : "التصنيف"}</small><b class="${ctx.referenceNumber ? "ltr" : ""}">${ctx.referenceNumber ? esc(ctx.referenceNumber) : cls(ctx)}</b></div>
          <div><small>تاريخ الإصدار</small><b class="ltr">${ctx.dateStr}</b></div>
          <div><small>وقت الطباعة</small><b class="ltr">${ctx.timeStr}</b></div>
        </div>
      </div>
    </div>
    <div class="pp-mrz">${esc(l1)}\n${esc(l2)}</div>
  </div>
  <div class="pp-title"><div><h1>${esc(ctx.title)}</h1>${titleEn(ctx, "en")}</div>${hl(ctx, "pp-num")}</div>`;
  },
  decor: "",
  headerTemplate: tpl("12mm", `<div style="position:absolute;left:0;right:0;top:0;height:3mm;background:${PP};"></div><div style="position:absolute;left:0;right:0;top:3mm;height:.8mm;background:${FOIL.gold};"></div>`, "#fbfaf4"),
  footerTemplate: (label) =>
    tpl("16mm", `<div dir="rtl" style="position:absolute;left:15mm;right:15mm;top:4mm;display:flex;justify-content:space-between;font-size:7pt;color:#6b7a68;border-top:.3mm solid #b9c6b6;padding-top:1.5mm;"><span>${label}</span><span style="font-family:'Courier New',monospace;letter-spacing:.2em;color:${PP};">&lt;&lt;SANAD&lt;&lt;</span><span>${PAGE_NO}</span></div>`, "#fbfaf4"),
};

// 25. Airmail: red and blue airmail edges on every page, a postmark and a perforated stamp.
const AM_R = "#c8102e";
const AM_B = "#1d3f8f";
function airmailTile() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="#fdfbf6"/><g stroke-width="7"><path d="M-10 10L10-10M-10 50L50-10M30 50L50 30" stroke="${AM_R}"/><path d="M-10 30L30-10M10 50L50 10" stroke="${AM_B}"/></g></svg>`;
}
function postmarkSvg(date: string) {
  const waves = Array.from({ length: 5 }, (_, k) => `<path d="M110 ${36 + k * 9} q 12 -6 24 0 t 24 0 t 24 0 t 24 0 t 24 0" />`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 100" width="100%" height="100%"><g fill="none" stroke="${AM_B}" stroke-width="2" opacity=".75"><circle cx="55" cy="50" r="42"/><circle cx="55" cy="50" r="33"/>${waves}</g><text x="55" y="46" text-anchor="middle" font-family="Courier New, monospace" font-size="11" fill="${AM_B}" opacity=".85">SANAD</text><text x="55" y="61" text-anchor="middle" font-family="Courier New, monospace" font-size="10" fill="${AM_B}" opacity=".85">${date}</text></svg>`;
}
const airmail: PrintTheme = {
  id: "airmail",
  margin: { top: "13mm", bottom: "15mm" },
  css:
    vars({
      paper: "#fdfbf6", accent: AM_B, "accent-ink": "#ffffff", metal: AM_R, "metal-deep": "#9c0c23",
      "metal-soft": "#f4f1ea", row: "#faf7f0", line: "#e8e1d3", "line-strong": "#c7bca6",
      radius: "0px", heading: "'IBM Plex Sans Arabic', sans-serif", foil: `linear-gradient(90deg, ${AM_R}, ${AM_B})`, "pad-r": "16mm", "pad-l": "16mm",
      seal: `url("${dataUri(rosetteSvg(AM_B))}")`,
    }) +
    LUX_BASE +
    `
  html { background: url("${dataUri(airmailTile())}") left top / 6mm 6mm repeat-y, url("${dataUri(airmailTile())}") right top / 6mm 6mm repeat-y, #fdfbf6; }
  .lux thead th { border-bottom: 1mm solid ${AM_R}; }
  .am-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 6mm; margin-bottom: 5mm; }
  .am-from small { display: block; font-size: 6.4pt; color: ${AM_R}; letter-spacing: .25em; font-weight: 700; direction: ltr; text-align: right; }
  .am-co { font-size: 13pt; font-weight: 700; color: ${AM_B}; line-height: 1.3; margin-top: .8mm; }
  .am-coen { font-size: 7pt; color: #7a705f; direction: ltr; text-align: right; }
  .am-refs { display: flex; flex-wrap: wrap; gap: 1mm 4mm; margin-top: 2mm; font-size: 7pt; color: #7a705f; }
  .am-refs b { color: #2c2a26; }
  .am-post { display: flex; align-items: center; gap: 2mm; }
  .am-mark { width: 50mm; height: 21mm; }
  .am-stamp { position: relative; width: 24mm; height: 28mm; padding: 2mm; background: #fff; flex: none; transform: rotate(3deg);
    -webkit-mask: radial-gradient(circle at 1.2mm 1.2mm, #0000 .9mm, #000 .95mm) -1.2mm -1.2mm / 2.4mm 2.4mm; mask: radial-gradient(circle at 1.2mm 1.2mm, #0000 .9mm, #000 .95mm) -1.2mm -1.2mm / 2.4mm 2.4mm; }
  .am-stamp-in { height: 100%; border: .4mm solid ${AM_R}; background: #fdf1ef; display: grid; place-items: center; }
  .am-stamp .lg { width: 15mm; height: 15mm; object-fit: contain; }
  .am-stamp .monogram { width: 15mm; height: 15mm; color: ${AM_R}; font-size: 16pt; }
  .am-title { border-top: .6mm dashed ${AM_B}; border-bottom: .6mm dashed ${AM_B}; padding: 3mm 0; margin-bottom: 5mm; display: flex; justify-content: space-between; align-items: center; gap: 5mm; }
  .am-title h1 { margin: 0; font-size: 20pt; font-weight: 700; color: ${AM_B}; line-height: 1.2; }
  .am-title .en { font-family: 'Courier New', monospace; font-size: 7.6pt; letter-spacing: .2em; color: ${AM_R}; text-transform: uppercase; direction: ltr; text-align: right; }
  .am-num { font-family: 'Courier New', monospace; text-align: center; border: .5mm solid ${AM_R}; padding: 1.2mm 4mm; color: ${AM_R}; transform: rotate(-3deg); }
  .am-num b { display: block; font-size: 18pt; line-height: 1; }
  .am-num span { font-size: 6.5pt; }
`,
  letterhead: (ctx) => `
  <div class="am-head">
    <div class="am-from"><small>PAR AVION · BY AIR MAIL · بريد جوي</small><div class="am-co">${esc(ctx.companyNameAr)}</div><div class="am-coen">${esc(ctx.companyNameEn)}</div><div class="am-refs">${refLines(ctx)}</div></div>
    <div class="am-post"><div class="am-mark">${postmarkSvg(ctx.dateStr)}</div><div class="am-stamp"><div class="am-stamp-in">${logo(ctx, "lg")}</div></div></div>
  </div>
  <div class="am-title"><div><h1>${esc(ctx.title)}</h1>${titleEn(ctx, "en")}</div>${hl(ctx, "am-num")}</div>`,
  decor: "",
  headerTemplate: tpl("13mm", `<div style="position:absolute;left:0;right:0;top:0;height:6mm;background:url('${dataUri(airmailTile())}') left top / 6mm 6mm repeat-x;"></div>`, "#fdfbf6"),
  footerTemplate: (label) =>
    tpl("15mm", `<div style="position:absolute;left:0;right:0;bottom:0;height:6mm;background:url('${dataUri(airmailTile())}') left top / 6mm 6mm repeat-x;"></div><div dir="rtl" style="position:absolute;left:16mm;right:16mm;top:1.5mm;display:flex;justify-content:space-between;font-size:7pt;color:#7a705f;font-family:'Courier New',monospace;"><span>${label}</span><span>${PAGE_NO}</span></div>`, "#fdfbf6"),
};

// 26. Bauhaus: primary red, yellow and blue shapes, heavy black rules, a strict grid.
const BH_R = "#d62828";
const BH_Y = "#f2b705";
const BH_B = "#1d4e89";
const BH_K = "#111111";
const bauhaus: PrintTheme = {
  id: "bauhaus",
  margin: { top: "12mm", bottom: "15mm" },
  css:
    vars({
      paper: "#f7f3ea", accent: BH_K, "accent-ink": "#ffffff", metal: BH_R, "metal-deep": "#a61d1d",
      "metal-soft": "#efe9dc", row: "#f1ece0", line: "#dcd4c3", "line-strong": BH_K,
      radius: "0px", heading: "'Reem Kufi', 'IBM Plex Sans Arabic', sans-serif", foil: `linear-gradient(90deg, ${BH_R}, ${BH_Y})`, "pad-r": "14mm", "pad-l": "14mm",
      seal: `url("${dataUri(rosetteSvg(BH_K))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-header, .lux .sig-title-ar { font-family: 'IBM Plex Sans Arabic', sans-serif; }
  .lux thead th { border-bottom: 1.4mm solid ${BH_Y}; }
  .lux .section-card { border: .6mm solid ${BH_K}; }
  .bh-head { display: grid; grid-template-columns: 1fr 58mm; border: .9mm solid ${BH_K}; margin-bottom: 5mm; background: #fff; }
  .bh-main { padding: 5mm 6mm; border-inline-start: .9mm solid ${BH_K}; }
  .bh-art { position: relative; background: ${BH_Y}; overflow: hidden; }
  .bh-art svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .bh-brand { display: flex; align-items: center; gap: 3mm; }
  .bh-brand .lg { width: 12mm; height: 12mm; object-fit: contain; }
  .bh-brand .monogram { width: 12mm; height: 12mm; background: ${BH_R}; color: #fff; font-size: 13pt; border-radius: 50%; }
  .bh-co { font-size: 11pt; font-weight: 800; color: ${BH_K}; line-height: 1.3; }
  .bh-coen { font-size: 6.6pt; color: #555; letter-spacing: .12em; text-transform: uppercase; direction: ltr; text-align: right; }
  .bh-main h1 { margin: 5mm 0 0; font-family: 'Reem Kufi', sans-serif; font-size: 25pt; line-height: 1.1; color: ${BH_K}; }
  .bh-en { display: inline-block; margin-top: 1.5mm; background: ${BH_K}; color: #fff; font-size: 7pt; letter-spacing: .22em; padding: .6mm 2.5mm; text-transform: uppercase; direction: ltr; font-weight: 700; }
  .bh-strip { display: grid; grid-template-columns: repeat(3, 1fr) auto; border: .9mm solid ${BH_K}; border-top: none; margin: -5mm 0 5mm; background: #fff; }
  .bh-strip > div { padding: 1.8mm 3mm; border-inline-start: .6mm solid ${BH_K}; font-size: 6.8pt; color: #555; }
  .bh-strip > div:first-child { border-inline-start: none; }
  .bh-strip b { display: block; font-size: 8.4pt; color: ${BH_K}; }
  .bh-strip .num { background: ${BH_R}; color: #fff; text-align: center; min-width: 30mm; }
  .bh-strip .num b { color: #fff; font-size: 16pt; line-height: 1; }
`,
  letterhead: (ctx) => `
  <div class="bh-head">
    <div class="bh-main">
      <div class="bh-brand">${logo(ctx, "lg")}<div><div class="bh-co">${esc(ctx.companyNameAr)}</div><div class="bh-coen">${esc(ctx.companyNameEn)}</div></div></div>
      <h1>${esc(ctx.title)}</h1>${ctx.titleEn ? `<span class="bh-en">${esc(ctx.titleEn)}</span>` : ""}
    </div>
    <div class="bh-art"><svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice"><rect x="0" y="0" width="160" height="120" fill="${BH_Y}"/><circle cx="54" cy="52" r="38" fill="${BH_R}"/><rect x="92" y="0" width="68" height="62" fill="${BH_B}"/><polygon points="92,120 160,120 126,62" fill="${BH_K}"/><rect x="0" y="100" width="92" height="20" fill="${BH_K}"/><circle cx="126" cy="31" r="12" fill="${BH_Y}"/></svg></div>
  </div>
  <div class="bh-strip">
    <div><span>${ctx.referenceNumber ? "رقم المرجع" : "التصنيف"}</span><b class="${ctx.referenceNumber ? "ltr" : ""}">${ctx.referenceNumber ? esc(ctx.referenceNumber) : cls(ctx)}</b></div>
    <div><span>تاريخ الإصدار</span><b class="ltr">${ctx.dateStr}</b></div>
    <div><span>وقت الطباعة</span><b class="ltr">${ctx.timeStr}</b></div>
    ${ctx.highlight ? `<div class="num"><b>${esc(ctx.highlight.value)}</b>${esc(ctx.highlight.label)}</div>` : "<div></div>"}
  </div>`,
  decor: "",
  headerTemplate: tpl("12mm", `<div style="position:absolute;left:14mm;right:14mm;top:5mm;height:2.4mm;display:flex;"><span style="flex:3;background:${BH_K};"></span><span style="flex:1;background:${BH_R};"></span><span style="flex:1;background:${BH_Y};"></span><span style="flex:1;background:${BH_B};"></span></div>`, "#f7f3ea"),
  footerTemplate: (label) =>
    tpl("15mm", `<div dir="rtl" style="position:absolute;left:14mm;right:14mm;top:3.5mm;border-top:.9mm solid ${BH_K};padding-top:1.5mm;display:flex;justify-content:space-between;font-size:7pt;color:#333;font-weight:600;"><span>${label}</span><span style="background:${BH_R};color:#fff;padding:0 2.5mm;">${PAGE_NO}</span></div>`, "#f7f3ea"),
};

// 27. Palm: sage green and sand, line-drawn palm fronds framing the heading.
const PM = "#3f5b45";
const PM_SAND = "#c9a66b";
function frondSvg(color: string, flip = false) {
  const leaves = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    const x = 20 + t * 150;
    const y = 150 - t * 110 - Math.sin(t * Math.PI) * 18;
    const len = 46 - t * 28;
    return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} q ${(-len * 0.3).toFixed(1)} ${(-len * 0.75).toFixed(1)} ${(-len * 0.1).toFixed(1)} ${(-len).toFixed(1)}"/><path d="M${x.toFixed(1)} ${y.toFixed(1)} q ${(len * 0.72).toFixed(1)} ${(-len * 0.2).toFixed(1)} ${len.toFixed(1)} ${(-len * 0.1).toFixed(1)}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 170" width="100%" height="100%"${flip ? ' style="transform:scaleX(-1)"' : ""}><g fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round"><path d="M20 150 C 70 110 120 70 170 40" stroke-width="2.4"/>${leaves}</g></svg>`;
}
const palm: PrintTheme = {
  id: "palm",
  margin: { top: "11mm", bottom: "16mm" },
  css:
    vars({
      paper: "#fbf8f1", accent: PM, "accent-ink": "#f4ecd9", metal: PM_SAND, "metal-deep": "#9c7a43",
      "metal-soft": "#f1ede1", row: "#f7f3e9", line: "#e5dfcf", "line-strong": "#c4b89c",
      radius: "2.5mm", heading: "'Aref Ruqaa', 'Amiri', serif", foil: FOIL.gold, "pad-r": "15mm", "pad-l": "15mm",
      seal: `url("${dataUri(rosetteSvg(PM))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-header, .lux .sig-title-ar { font-family: 'IBM Plex Sans Arabic', sans-serif; }
  html { background: #fbf8f1 url("${dataUri(frondSvg("#3f5b45"))}") left 118mm / 70mm 60mm no-repeat; }
  .pm-head { position: relative; text-align: center; padding: 3mm 34mm 4mm; margin-bottom: 4mm; }
  .pm-fr { position: absolute; top: -2mm; width: 34mm; height: 30mm; opacity: .8; }
  .pm-fr.r { right: 0; }
  .pm-fr.l { left: 0; }
  .pm-logo .lg { width: 15mm; height: 15mm; object-fit: contain; }
  .pm-logo .monogram { width: 15mm; height: 15mm; margin: 0 auto; border-radius: 50%; border: .5mm solid ${PM_SAND}; color: ${PM}; font-size: 15pt; }
  .pm-co { font-size: 12pt; font-weight: 700; color: ${PM}; margin-top: 1.5mm; line-height: 1.3; }
  .pm-coen { font-size: 6.8pt; color: #8c8468; letter-spacing: .16em; text-transform: uppercase; direction: ltr; }
  .pm-rule { display: flex; align-items: center; gap: 3mm; margin: 3mm auto 0; width: 70%; color: ${PM_SAND}; }
  .pm-rule i { flex: 1; height: .3mm; background: ${PM_SAND}; }
  .pm-title { text-align: center; margin-bottom: 4mm; }
  .pm-title h1 { margin: 0; font-family: 'Aref Ruqaa', serif; font-size: 25pt; color: ${PM}; line-height: 1.25; }
  .pm-title .en { font-size: 7.4pt; letter-spacing: .28em; color: #9c7a43; text-transform: uppercase; font-weight: 700; direction: ltr; }
  .pm-meta { display: flex; justify-content: center; flex-wrap: wrap; gap: 2mm; margin-bottom: 5mm; }
  .pm-meta span { border-radius: 99px; border: .3mm solid #d9cfb6; padding: .8mm 3.5mm; font-size: 7pt; color: #6f6852; background: #fff; }
  .pm-meta b { color: ${PM}; }
  .pm-meta .hi { background: ${PM}; color: #f4ecd9; border-color: ${PM}; }
  .pm-meta .hi b { color: #fff; }
`,
  letterhead: (ctx) => `
  <div class="pm-head">
    <div class="pm-fr r">${frondSvg(PM)}</div><div class="pm-fr l">${frondSvg(PM, true)}</div>
    <div class="pm-logo">${logo(ctx, "lg")}</div>
    <div class="pm-co">${esc(ctx.companyNameAr)}</div>
    <div class="pm-coen">${esc(ctx.companyNameEn)}</div>
    <div class="pm-rule"><i></i>✦<i></i></div>
  </div>
  <div class="pm-title"><h1>${esc(ctx.title)}</h1>${titleEn(ctx, "en")}</div>
  <div class="pm-meta">${refLines(ctx)}${ctx.highlight ? `<span class="hi"><b>${esc(ctx.highlight.value)}</b> ${esc(ctx.highlight.label)}</span>` : ""}</div>`,
  decor: "",
  headerTemplate: tpl("11mm", `<div style="position:absolute;left:15mm;right:15mm;top:5mm;height:.4mm;background:${PM_SAND};"></div><div style="position:absolute;left:50%;top:3.6mm;width:3mm;height:3mm;margin-left:-1.5mm;transform:rotate(45deg);background:${PM};"></div>`, "#fbf8f1"),
  footerTemplate: (label) =>
    tpl("16mm", `<div dir="rtl" style="position:absolute;left:15mm;right:15mm;top:4.5mm;display:flex;justify-content:space-between;align-items:center;gap:4mm;font-size:7pt;color:#8c8468;"><span>${label}</span><span style="flex:1;height:.3mm;background:#d9cfb6;"></span><span style="color:${PM};font-weight:700;">${PAGE_NO}</span></div>`, "#fbf8f1"),
};

// 28. Circuit: a dark teal board with traces and nodes, mint signal lines.
const CT = "#0b2e33";
const CT_MINT = "#2de2b4";
function circuitSvg() {
  const r = seeded(7);
  const paths: string[] = [];
  const dots: string[] = [];
  for (let k = 0; k < 26; k++) {
    let x = Math.round(r() * 60) * 10;
    let y = Math.round(r() * 17) * 10;
    let d = `M${x} ${y}`;
    for (let s = 0; s < 4; s++) {
      if (s % 2 === 0) x += (r() > 0.5 ? 1 : -1) * Math.round(20 + r() * 80);
      else y += (r() > 0.5 ? 1 : -1) * Math.round(10 + r() * 40);
      d += ` L${x} ${y}`;
    }
    paths.push(`<path d="${d}"/>`);
    dots.push(`<circle cx="${x}" cy="${y}" r="3.2"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 170" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"><rect width="600" height="170" fill="${CT}"/><g fill="none" stroke="${CT_MINT}" stroke-width="1.3" opacity=".42">${paths.join("")}</g><g fill="${CT}" stroke="${CT_MINT}" stroke-width="1.4" opacity=".75">${dots.join("")}</g></svg>`;
}
const circuit: PrintTheme = {
  id: "circuit",
  margin: { top: "10mm", bottom: "15mm" },
  css:
    vars({
      paper: "#ffffff", accent: CT, "accent-ink": "#c9fff0", metal: CT_MINT, "metal-deep": "#0f9e7c",
      "metal-soft": "#ecfbf6", row: "#f5fbf9", line: "#e0ece8", "line-strong": "#a9c7bf",
      radius: "1mm", heading: "'IBM Plex Sans Arabic', sans-serif", foil: `linear-gradient(90deg, ${CT_MINT}, #7dd3fc)`, "pad-r": "14mm", "pad-l": "14mm",
      seal: `url("${dataUri(rosetteSvg(CT))}")`,
    }) +
    LUX_BASE +
    `
  .lux thead th { border-bottom: .8mm solid ${CT_MINT}; }
  .lux tbody td:first-child { font-family: 'IBM Plex Mono', monospace; }
  .ct-hero { position: relative; margin: 0 -14mm 5mm; height: 44mm; color: #fff; overflow: hidden; }
  .ct-hero .art { position: absolute; inset: 0; }
  .ct-in { position: relative; height: 100%; padding: 6mm 14mm; display: flex; flex-direction: column; justify-content: space-between; }
  .ct-row { display: flex; justify-content: space-between; align-items: center; gap: 4mm; }
  .ct-chip { display: flex; align-items: center; gap: 3mm; }
  .ct-chip .pad { width: 14mm; height: 14mm; border-radius: 1.5mm; background: #0f3d43; border: .4mm solid ${CT_MINT}; display: grid; place-items: center; box-shadow: 0 0 0 1mm rgba(45,226,180,.12); }
  .ct-chip .lg { width: 10mm; height: 10mm; object-fit: contain; }
  .ct-chip .monogram { color: ${CT_MINT}; font-size: 13pt; }
  .ct-co { font-size: 11.5pt; font-weight: 700; line-height: 1.3; }
  .ct-coen { font-family: 'IBM Plex Mono', monospace; font-size: 6.4pt; color: #86d9c3; direction: ltr; text-align: right; }
  .ct-log { font-family: 'IBM Plex Mono', monospace; font-size: 6.6pt; color: #86d9c3; text-align: left; line-height: 1.6; white-space: nowrap; direction: ltr; }
  .ct-log b { color: #fff; font-weight: 600; }
  .ct-in h1 { margin: 0; font-size: 21pt; line-height: 1.15; font-weight: 700; }
  .ct-in .en { font-family: 'IBM Plex Mono', monospace; font-size: 7pt; color: ${CT_MINT}; direction: ltr; text-align: right; }
  .ct-num { font-family: 'IBM Plex Mono', monospace; text-align: center; border: .4mm solid ${CT_MINT}; border-radius: 1.5mm; padding: 1.5mm 4mm; background: rgba(11,46,51,.85); }
  .ct-num b { display: block; font-size: 20pt; line-height: 1; color: ${CT_MINT}; }
  .ct-num span { font-size: 6.4pt; color: #86d9c3; }
`,
  letterhead: (ctx) => `
  <div class="ct-hero"><div class="art">${circuitSvg()}</div>
    <div class="ct-in">
      <div class="ct-row">
        <div class="ct-chip"><div class="pad">${logo(ctx, "lg")}</div><div><div class="ct-co">${esc(ctx.companyNameAr)}</div><div class="ct-coen">${esc(ctx.companyNameEn)}</div></div></div>
        <div class="ct-log">${ctx.referenceNumber ? `REF &nbsp;<b>${esc(ctx.referenceNumber)}</b><br>` : ""}DATE <b>${ctx.dateStr}</b><br>TIME <b>${ctx.timeStr}</b></div>
      </div>
      <div class="ct-row" style="align-items:flex-end">
        <div>${ctx.titleEn ? `<div class="en">&gt;_ ${esc(ctx.titleEn)}</div>` : ""}<h1>${esc(ctx.title)}</h1></div>
        ${hl(ctx, "ct-num")}
      </div>
    </div>
  </div>`,
  decor: "",
  headerTemplate: tpl("10mm", `<div style="position:absolute;left:0;right:0;top:0;height:2.4mm;background:${CT};"></div><div style="position:absolute;left:14mm;width:30mm;top:2.4mm;height:.6mm;background:${CT_MINT};"></div>`),
  footerTemplate: (label) =>
    tpl("15mm", `<div dir="rtl" style="position:absolute;left:14mm;right:14mm;top:4.5mm;display:flex;justify-content:space-between;align-items:center;gap:3mm;font-size:7pt;color:#5d7a73;font-family:'Courier New',monospace;"><span>${label}</span><span style="flex:1;border-top:.3mm dashed #a9c7bf;"></span><span style="color:${CT};font-weight:700;">${PAGE_NO}</span></div>`),
};

// 29. Topographic: contour lines of a map, terracotta and charcoal, coordinates as meta.
const TP = "#2b2b2b";
const TP_T = "#c65d3b";
function contoursSvg() {
  const r = seeded(11);
  const hills = [
    [420, 70],
    [120, 120],
    [560, 150],
  ];
  const rings: string[] = [];
  for (const [cx, cy] of hills) {
    const phase = r() * 6;
    for (let k = 1; k <= 9; k++) {
      const pts: string[] = [];
      for (let i = 0; i <= 72; i++) {
        const t = (i / 72) * Math.PI * 2;
        const rad = k * 13 * (1 + 0.18 * Math.sin(3 * t + phase + k * 0.3) + 0.1 * Math.cos(5 * t - phase));
        pts.push(`${(cx + rad * 1.5 * Math.cos(t)).toFixed(1)} ${(cy + rad * Math.sin(t)).toFixed(1)}`);
      }
      rings.push(`<path d="M${pts.join("L")}Z" stroke-width="${k % 3 === 0 ? 1.4 : 0.7}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"><rect width="600" height="180" fill="#f6efe6"/><g fill="none" stroke="${TP_T}" opacity=".55">${rings.join("")}</g></svg>`;
}
const topo: PrintTheme = {
  id: "topo",
  margin: { top: "11mm", bottom: "15mm" },
  css:
    vars({
      paper: "#fffdf9", accent: TP, "accent-ink": "#f6e2d6", metal: TP_T, "metal-deep": "#9e4527",
      "metal-soft": "#f8ede4", row: "#fbf5ef", line: "#ece1d6", "line-strong": "#c9b5a3",
      radius: "0px", heading: "'Reem Kufi', 'IBM Plex Sans Arabic', sans-serif", foil: `linear-gradient(90deg, ${TP_T}, #e8a33d)`, "pad-r": "14mm", "pad-l": "14mm",
      seal: `url("${dataUri(rosetteSvg(TP_T))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-header, .lux .sig-title-ar { font-family: 'IBM Plex Sans Arabic', sans-serif; }
  .lux thead th { border-bottom: .8mm solid ${TP_T}; }
  .tp-map { position: relative; margin: 0 -14mm 5mm; height: 48mm; overflow: hidden; border-bottom: .5mm solid ${TP}; }
  .tp-map .art { position: absolute; inset: 0; }
  .tp-grid { position: absolute; inset: 0; background: url("${dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><path d="M0 .5H80M.5 0V80" stroke="${TP}" stroke-width=".6" opacity=".18"/></svg>`)}") 0 0 / 20mm 20mm; }
  .tp-card { position: absolute; right: 14mm; top: 7mm; bottom: 7mm; width: 110mm; background: rgba(255,253,249,.94); border: .4mm solid ${TP}; padding: 4mm 5mm; display: flex; flex-direction: column; justify-content: space-between; }
  .tp-brand { display: flex; align-items: center; gap: 2.5mm; }
  .tp-brand .lg { width: 10mm; height: 10mm; object-fit: contain; }
  .tp-brand .monogram { width: 10mm; height: 10mm; background: ${TP}; color: #fff; font-size: 11pt; }
  .tp-co { font-size: 10pt; font-weight: 700; color: ${TP}; line-height: 1.25; }
  .tp-coen { font-size: 6.3pt; color: #8d7b6c; direction: ltr; text-align: right; }
  .tp-card h1 { margin: 0; font-family: 'Reem Kufi', sans-serif; font-size: 20pt; line-height: 1.15; color: ${TP}; }
  .tp-card .en { font-size: 6.8pt; letter-spacing: .2em; text-transform: uppercase; color: ${TP_T}; direction: ltr; text-align: right; font-weight: 700; }
  .tp-coords { position: absolute; left: 14mm; bottom: 5mm; font-family: 'IBM Plex Mono', monospace; font-size: 6.6pt; color: ${TP}; direction: ltr; line-height: 1.6; background: rgba(255,253,249,.85); padding: 1mm 2mm; }
  .tp-pin { position: absolute; left: 60mm; top: 12mm; width: 7mm; height: 7mm; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: ${TP_T}; box-shadow: 0 0 0 1.2mm rgba(198,93,59,.25); }
  .tp-meta { display: grid; grid-template-columns: repeat(3, 1fr) auto; gap: 3mm; margin-bottom: 5mm; }
  .tp-meta > div { border-top: .8mm solid ${TP}; padding-top: 1.2mm; font-size: 6.8pt; color: #8d7b6c; }
  .tp-meta b { display: block; font-size: 8.5pt; color: ${TP}; }
  .tp-meta .num { border-top-color: ${TP_T}; text-align: center; }
  .tp-meta .num b { font-size: 17pt; line-height: 1; color: ${TP_T}; }
`,
  letterhead: (ctx) => `
  <div class="tp-map"><div class="art">${contoursSvg()}</div><div class="tp-grid"></div><i class="tp-pin"></i>
    <div class="tp-coords">24.7136° N · 46.6753° E<br>ELEV 612 m · SANAD</div>
    <div class="tp-card">
      <div class="tp-brand">${logo(ctx, "lg")}<div><div class="tp-co">${esc(ctx.companyNameAr)}</div><div class="tp-coen">${esc(ctx.companyNameEn)}</div></div></div>
      <div><h1>${esc(ctx.title)}</h1>${titleEn(ctx, "en")}</div>
    </div>
  </div>
  <div class="tp-meta">
    <div>${ctx.referenceNumber ? "رقم المرجع" : "التصنيف"}<b class="${ctx.referenceNumber ? "ltr" : ""}">${ctx.referenceNumber ? esc(ctx.referenceNumber) : cls(ctx)}</b></div>
    <div>تاريخ الإصدار<b class="ltr">${ctx.dateStr}</b></div>
    <div>وقت الطباعة<b class="ltr">${ctx.timeStr}</b></div>
    ${ctx.highlight ? `<div class="num"><b>${esc(ctx.highlight.value)}</b>${esc(ctx.highlight.label)}</div>` : "<div></div>"}
  </div>`,
  decor: "",
  headerTemplate: tpl("11mm", `<div style="position:absolute;left:14mm;right:14mm;top:5mm;height:.4mm;background:${TP};"></div><div style="position:absolute;right:14mm;top:3.8mm;width:14mm;height:2.8mm;background:${TP_T};"></div>`),
  footerTemplate: (label) =>
    tpl("15mm", `<div dir="rtl" style="position:absolute;left:14mm;right:14mm;top:4mm;display:flex;justify-content:space-between;font-size:7pt;color:#8d7b6c;"><span>${label}</span><span style="font-family:'Courier New',monospace;color:${TP};">N 24°43′ · E 46°40′</span><span>${PAGE_NO}</span></div>`),
};

// 30. Marble: white marble veined in grey, with fine gold hairlines.
const MB = "#2a2a2e";
const MB_GOLD = "#b89a5a";
function marbleSvg() {
  const r = seeded(23);
  const veins: string[] = [];
  for (let k = 0; k < 14; k++) {
    let x = r() * 600;
    let y = r() * 190;
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let s = 0; s < 5; s++) {
      const nx = x + 40 + r() * 110;
      const ny = y + (r() - 0.5) * 70;
      d += ` Q ${(x + (nx - x) / 2 + (r() - 0.5) * 60).toFixed(1)} ${(y + (r() - 0.5) * 80).toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`;
      x = nx;
      y = ny;
    }
    const w = (0.4 + r() * 1.8).toFixed(2);
    const o = (0.12 + r() * 0.3).toFixed(2);
    veins.push(`<path d="${d}" stroke-width="${w}" opacity="${o}"/>`);
  }
  const gold = `<path d="M0 150 Q 150 110 300 140 T 600 120" stroke="${MB_GOLD}" stroke-width="1.1" opacity=".8"/><path d="M0 40 Q 200 70 330 30 T 600 55" stroke="${MB_GOLD}" stroke-width=".7" opacity=".6"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 190" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"><rect width="600" height="190" fill="#f7f6f3"/><g fill="none" stroke="#6b6b72">${veins.join("")}</g><g fill="none">${gold}</g></svg>`;
}
const marble: PrintTheme = {
  id: "marble",
  margin: { top: "12mm", bottom: "16mm" },
  css:
    vars({
      paper: "#ffffff", accent: MB, "accent-ink": "#ecdcb4", metal: MB_GOLD, "metal-deep": "#8e7440",
      "metal-soft": "#f6f3ec", row: "#faf9f6", line: "#ebe8e1", "line-strong": "#c9c2b2",
      radius: "0px", heading: "'Amiri', serif", foil: FOIL.gold, "pad-r": "16mm", "pad-l": "16mm",
      seal: `url("${dataUri(rosetteSvg(MB_GOLD))}")`,
    }) +
    LUX_BASE +
    `
  .mb-slab { position: relative; margin: 0 -16mm 6mm; height: 50mm; overflow: hidden; border-bottom: .5mm solid ${MB_GOLD}; }
  .mb-slab .art { position: absolute; inset: 0; }
  .mb-in { position: relative; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 1.5mm; }
  .mb-medal { width: 18mm; height: 18mm; border-radius: 50%; background: #fff; border: .5mm solid ${MB_GOLD}; box-shadow: 0 0 0 1.5mm rgba(255,255,255,.8), 0 0 0 1.8mm ${MB_GOLD}; display: grid; place-items: center; }
  .mb-medal .lg { width: 12mm; height: 12mm; object-fit: contain; }
  .mb-medal .monogram { color: ${MB}; font-size: 15pt; font-family: 'Amiri', serif; }
  .mb-co { font-family: 'Amiri', serif; font-size: 15pt; font-weight: 700; color: ${MB}; line-height: 1.25; margin-top: 1mm; }
  .mb-coen { font-family: 'Cormorant Garamond', serif; font-size: 8pt; letter-spacing: .3em; color: #8e7440; text-transform: uppercase; font-weight: 700; direction: ltr; }
  .mb-title { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 5mm; margin-bottom: 2mm; }
  .mb-title i { height: .3mm; background: ${MB_GOLD}; }
  .mb-title h1 { margin: 0; font-family: 'Amiri', serif; font-size: 23pt; color: ${MB}; line-height: 1.2; text-align: center; }
  .mb-en { text-align: center; font-family: 'Cormorant Garamond', serif; font-size: 9pt; letter-spacing: .35em; color: #8e7440; text-transform: uppercase; font-weight: 700; margin-bottom: 3mm; }
  .mb-meta { display: flex; justify-content: center; gap: 6mm; margin-bottom: 5mm; font-size: 7pt; color: #7b776e; }
  .mb-meta b { color: ${MB}; }
  .mb-meta .hi { color: #8e7440; font-weight: 700; }
`,
  letterhead: (ctx) => `
  <div class="mb-slab"><div class="art">${marbleSvg()}</div>
    <div class="mb-in"><div class="mb-medal">${logo(ctx, "lg")}</div><div class="mb-co">${esc(ctx.companyNameAr)}</div><div class="mb-coen">${esc(ctx.companyNameEn)}</div></div>
  </div>
  <div class="mb-title"><i></i><h1>${esc(ctx.title)}</h1><i></i></div>
  ${ctx.titleEn ? `<div class="mb-en">${esc(ctx.titleEn)}</div>` : ""}
  <div class="mb-meta">${refLines(ctx)}${ctx.highlight ? `<span class="hi">${esc(ctx.highlight.value)} ${esc(ctx.highlight.label)}</span>` : ""}</div>`,
  decor: "",
  headerTemplate: tpl("12mm", `<div style="position:absolute;left:16mm;right:16mm;top:5mm;height:.3mm;background:${MB_GOLD};"></div><div style="position:absolute;left:16mm;right:16mm;top:6.2mm;height:.15mm;background:${MB_GOLD};"></div>`),
  footerTemplate: (label) =>
    tpl("16mm", `<div dir="rtl" style="position:absolute;left:16mm;right:16mm;top:4mm;border-top:.3mm solid ${MB_GOLD};padding-top:1.5mm;display:flex;justify-content:space-between;font-size:7pt;color:#7b776e;"><span>${label}</span><span style="letter-spacing:.3em;color:#8e7440;font-family:Georgia,serif;">SANAD</span><span>${PAGE_NO}</span></div>`),
};

// 31. Ticket: the heading as a boarding pass — a torn stub with a barcode.
const TK = "#3b1d6e";
const TK_O = "#f07f2e";
function barcodeSvg(seedText: string) {
  const r = seeded([...seedText].reduce((a, c) => a + c.charCodeAt(0), 0));
  let x = 0;
  const bars: string[] = [];
  while (x < 190) {
    const w = 1 + Math.floor(r() * 4);
    if (r() > 0.35) bars.push(`<rect x="${x}" y="0" width="${w}" height="50"/>`);
    x += w + 1;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 50" preserveAspectRatio="none" width="100%" height="100%"><g fill="${TK}">${bars.join("")}</g></svg>`;
}
const ticket: PrintTheme = {
  id: "ticket",
  margin: { top: "11mm", bottom: "15mm" },
  css:
    vars({
      paper: "#faf8fd", accent: TK, "accent-ink": "#ffe3cf", metal: TK_O, "metal-deep": "#c4601b",
      "metal-soft": "#f3eefa", row: "#f8f5fc", line: "#e7e0f1", "line-strong": "#bfb2d6",
      radius: "2.5mm", heading: "'Reem Kufi', 'IBM Plex Sans Arabic', sans-serif", foil: `linear-gradient(90deg, ${TK_O}, #ffb347)`, "pad-r": "14mm", "pad-l": "14mm",
      seal: `url("${dataUri(rosetteSvg(TK))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-header, .lux .sig-title-ar { font-family: 'IBM Plex Sans Arabic', sans-serif; }
  .lux thead th { border-bottom: .8mm solid ${TK_O}; }
  .tk { position: relative; display: grid; grid-template-columns: 1fr 50mm; margin-bottom: 6mm; filter: drop-shadow(0 .6mm 1.4mm rgba(59,29,110,.18)); }
  .tk-main { background: #fff; border-radius: 4mm 0 0 4mm; padding: 5mm 6mm; }
  [dir="rtl"] .tk-main { border-radius: 0 4mm 4mm 0; }
  .tk-stub { position: relative; background: ${TK}; color: #fff; border-radius: 0 4mm 4mm 0; padding: 5mm 5mm; display: flex; flex-direction: column; justify-content: space-between; border-inline-start: .6mm dashed #fff; }
  [dir="rtl"] .tk-stub { border-radius: 4mm 0 0 4mm; }
  .tk-stub::before, .tk-stub::after { content: ""; position: absolute; inset-inline-start: -3.3mm; width: 6mm; height: 6mm; border-radius: 50%; background: #faf8fd; }
  .tk-stub::before { top: -3mm; }
  .tk-stub::after { bottom: -3mm; }
  .tk-row { display: flex; justify-content: space-between; align-items: center; gap: 4mm; }
  .tk-brand { display: flex; align-items: center; gap: 2.5mm; }
  .tk-brand .lg { width: 11mm; height: 11mm; object-fit: contain; }
  .tk-brand .monogram { width: 11mm; height: 11mm; border-radius: 50%; background: ${TK}; color: #fff; font-size: 11pt; }
  .tk-co { font-size: 10pt; font-weight: 700; color: ${TK}; line-height: 1.25; }
  .tk-coen { font-size: 6.3pt; color: #8878a6; direction: ltr; text-align: right; }
  .tk-class { font-size: 6.6pt; letter-spacing: .2em; color: ${TK_O}; font-weight: 700; text-transform: uppercase; direction: ltr; }
  .tk-route { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 3mm; margin: 4mm 0 3mm; }
  .tk-route .dot { width: 3mm; height: 3mm; border-radius: 50%; border: .6mm solid ${TK}; }
  .tk-route .ln { height: .4mm; background: #d6cbe8; position: relative; }
  .tk-route .ln::after { content: "✈"; position: absolute; left: 50%; top: -2.6mm; transform: translateX(-50%); color: ${TK_O}; font-size: 9pt; background: #fff; padding: 0 1mm; }
  .tk-main h1 { margin: 0; font-family: 'Reem Kufi', sans-serif; font-size: 20pt; line-height: 1.2; color: ${TK}; }
  .tk-main .en { font-size: 6.8pt; letter-spacing: .2em; text-transform: uppercase; color: #8878a6; direction: ltr; text-align: right; font-weight: 600; }
  .tk-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-top: 3.5mm; }
  .tk-fields small { display: block; font-size: 5.8pt; color: #8878a6; letter-spacing: .1em; }
  .tk-fields b { font-size: 8.4pt; color: ${TK}; }
  .tk-stub small { font-size: 6pt; letter-spacing: .15em; color: #d6c6f2; direction: ltr; }
  .tk-stub .big { font-family: 'Reem Kufi', sans-serif; font-size: 20pt; line-height: 1; color: ${TK_O}; }
  .tk-stub .bc { height: 12mm; background: #fff; border-radius: 1mm; padding: 1.2mm; }
`,
  letterhead: (ctx) => `
  <div class="tk">
    <div class="tk-main">
      <div class="tk-row"><div class="tk-brand">${logo(ctx, "lg")}<div><div class="tk-co">${esc(ctx.companyNameAr)}</div><div class="tk-coen">${esc(ctx.companyNameEn)}</div></div></div><div class="tk-class">Official · Pass</div></div>
      <div class="tk-route"><i class="dot"></i><i class="ln"></i><i class="dot" style="background:${TK}"></i></div>
      <h1>${esc(ctx.title)}</h1>${titleEn(ctx, "en")}
      <div class="tk-fields">
        <div><small>${ctx.referenceNumber ? "رقم المرجع" : "التصنيف"}</small><b class="${ctx.referenceNumber ? "ltr" : ""}">${ctx.referenceNumber ? esc(ctx.referenceNumber) : cls(ctx)}</b></div>
        <div><small>تاريخ الإصدار</small><b class="ltr">${ctx.dateStr}</b></div>
        <div><small>وقت الطباعة</small><b class="ltr">${ctx.timeStr}</b></div>
      </div>
    </div>
    <div class="tk-stub">
      <div><small>BOARDING · SANAD</small>${ctx.highlight ? `<div class="big">${esc(ctx.highlight.value)}</div><small>${esc(ctx.highlight.label)}</small>` : `<div class="big ltr">${ctx.dateStr.slice(0, 5)}</div>`}</div>
      <div class="bc">${barcodeSvg(ctx.title + ctx.dateStr)}</div>
    </div>
  </div>`,
  decor: "",
  headerTemplate: tpl("11mm", `<div style="position:absolute;left:14mm;right:14mm;top:5mm;border-top:.5mm dashed #bfb2d6;"></div>`, "#faf8fd"),
  footerTemplate: (label) =>
    tpl("15mm", `<div dir="rtl" style="position:absolute;left:14mm;right:14mm;top:4mm;display:flex;justify-content:space-between;align-items:center;font-size:7pt;color:#8878a6;"><span>${label}</span><span style="background:${TK};color:#fff;border-radius:99px;padding:.6mm 3mm;">${PAGE_NO}</span></div>`, "#faf8fd"),
};

// 32. Calligraphy: a sweeping ink brush stroke behind the title and a red seal.
const CL = "#161616";
const CL_R = "#b3261e";
function brushSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 120" preserveAspectRatio="none" width="100%" height="100%"><path d="M8 78 C 70 40 150 30 250 44 C 340 56 420 30 520 36 C 560 38 590 50 596 62 C 560 58 520 60 470 70 C 380 88 300 70 210 80 C 140 88 70 98 8 78 Z" fill="${CL}" opacity=".9"/><path d="M40 70 C 120 52 200 50 300 58" stroke="#fff" stroke-width="1.2" fill="none" opacity=".18"/><g fill="${CL}" opacity=".55"><circle cx="560" cy="80" r="3"/><circle cx="578" cy="72" r="1.8"/><circle cx="24" cy="92" r="2.2"/></g></svg>`;
}
const calligraphy: PrintTheme = {
  id: "calligraphy",
  margin: { top: "12mm", bottom: "16mm" },
  css:
    vars({
      paper: "#fbf7ee", accent: CL, "accent-ink": "#f3e6cf", metal: CL_R, "metal-deep": "#8c1c16",
      "metal-soft": "#f3ece0", row: "#f8f2e7", line: "#e6dccb", "line-strong": "#bfae93",
      radius: "0px", heading: "'Aref Ruqaa', 'Amiri', serif", foil: `linear-gradient(90deg, ${CL}, ${CL_R})`, "pad-r": "16mm", "pad-l": "16mm",
      seal: `url("${dataUri(rosetteSvg(CL_R))}")`,
    }) +
    LUX_BASE +
    `
  .lux .section-header, .lux .sig-title-ar { font-family: 'IBM Plex Sans Arabic', sans-serif; }
  .cl-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 5mm; margin-bottom: 3mm; }
  .cl-brand .lg { width: 12mm; height: 12mm; object-fit: contain; }
  .cl-brand { display: flex; align-items: center; gap: 3mm; }
  .cl-brand .monogram { width: 12mm; height: 12mm; color: ${CL}; font-size: 16pt; font-family: 'Aref Ruqaa', serif; }
  .cl-co { font-size: 11pt; font-weight: 700; color: ${CL}; line-height: 1.3; }
  .cl-coen { font-size: 6.6pt; color: #8a7d68; direction: ltr; text-align: right; letter-spacing: .08em; }
  .cl-seal { width: 20mm; height: 20mm; flex: none; background: ${CL_R}; color: #fbf7ee; display: grid; place-items: center; transform: rotate(-4deg); border-radius: 1.2mm; box-shadow: inset 0 0 0 1mm ${CL_R}, inset 0 0 0 1.4mm #fbf7ee; }
  .cl-seal span { font-family: 'Aref Ruqaa', serif; font-size: 9pt; line-height: 1.15; text-align: center; font-weight: 700; }
  .cl-stroke { position: relative; margin: 0 -8mm 3mm; height: 34mm; display: grid; place-items: center; }
  .cl-stroke .ink { position: absolute; inset: 0; }
  .cl-stroke h1 { position: relative; margin: 0; font-family: 'Aref Ruqaa', serif; font-size: 27pt; line-height: 1.2; color: #fbf7ee; text-align: center; padding: 0 10mm; }
  .cl-en { text-align: center; font-family: 'Cormorant Garamond', serif; font-size: 9pt; letter-spacing: .32em; color: ${CL_R}; text-transform: uppercase; font-weight: 700; margin-bottom: 3mm; }
  .cl-meta { display: flex; justify-content: center; flex-wrap: wrap; gap: 5mm; margin-bottom: 5mm; font-size: 7pt; color: #8a7d68; border-top: .3mm solid #d8cbb3; border-bottom: .3mm solid #d8cbb3; padding: 1.8mm 0; }
  .cl-meta b { color: ${CL}; }
  .cl-meta .hi { color: ${CL_R}; font-weight: 700; }
`,
  letterhead: (ctx) => `
  <div class="cl-top">
    <div class="cl-brand">${logo(ctx, "lg")}<div><div class="cl-co">${esc(ctx.companyNameAr)}</div><div class="cl-coen">${esc(ctx.companyNameEn)}</div></div></div>
    <div class="cl-seal"><span>${esc((ctx.companyNameAr.split(" ").filter(Boolean).slice(0, 2).join("<br>")) || "سند")}</span></div>
  </div>
  <div class="cl-stroke"><div class="ink">${brushSvg()}</div><h1>${esc(ctx.title)}</h1></div>
  ${ctx.titleEn ? `<div class="cl-en">${esc(ctx.titleEn)}</div>` : ""}
  <div class="cl-meta">${refLines(ctx)}${ctx.highlight ? `<span class="hi">${esc(ctx.highlight.value)} ${esc(ctx.highlight.label)}</span>` : ""}</div>`,
  decor: "",
  headerTemplate: tpl("12mm", `<div style="position:absolute;left:16mm;top:4mm;width:8mm;height:3mm;background:${CL_R};"></div><div style="position:absolute;left:26mm;right:16mm;top:5.3mm;height:.3mm;background:#bfae93;"></div>`, "#fbf7ee"),
  footerTemplate: (label) =>
    tpl("16mm", `<div dir="rtl" style="position:absolute;left:16mm;right:16mm;top:4mm;display:flex;justify-content:space-between;font-size:7pt;color:#8a7d68;"><span>${label}</span><span style="color:${CL_R};font-weight:700;">${PAGE_NO}</span></div>`, "#fbf7ee"),
};

/** The ten approved preview concepts, adapted to flowing, multipage documents. */
function studioTheme(id: PrintThemeId, ink: string, metal: string, variant: string): PrintTheme {
  const variations: Record<string, string> = {
    heritage: `.st-head{border-bottom-color:${metal}}.st-title{text-align:center;justify-content:center}.st-head:before{content:'';position:absolute;top:-4mm;left:0;right:0;height:2mm;background:repeating-linear-gradient(45deg,${ink} 0 2mm,#fff 2mm 4mm)}html{background:${doubleRules(metal, "#ffffff")}}`,
    editorial: `.st-title{border-bottom:1.2mm solid ${ink};padding-bottom:5mm}.st-title h1{font-size:27pt!important}.st-logo{border-radius:0!important;background:${ink};color:white!important}.lux thead th{background:white;color:${ink};border-top:2px solid ${ink};border-bottom:1px solid ${ink}}`,
    minimal: `.st-logo{border:0!important}.st-title h1{font-weight:400!important}.lux thead th{background:#f4f4f4;color:${ink};border-color:#ccc}.lux tbody tr:nth-child(even) td{background:white}.lux .section-header{background:white;border-bottom:1px solid #ddd}.st-head{border-bottom:1px solid #ddd!important}`,
    blueprint: `.st-head{border:1px solid ${ink};padding:4mm}.st-logo{border-radius:0!important;border-width:2px!important}.lux th,.lux td{border:1px solid #b4c8da}.st-title{border-bottom:1px solid ${ink};padding-bottom:4mm}`,
    royal: `html{background:${doubleRules(metal,"#ffffff")}}.st-head{justify-content:center;text-align:center;border-bottom-color:${metal}}.st-brand{flex-direction:column}.st-meta{display:none}.st-title{justify-content:center;text-align:center}.lux thead th{background:#f3eff7;color:${ink};border-color:${metal}}`,
    ledger: `.st-head{border-bottom:1mm double ${ink}}.st-logo{border-radius:0!important}.lux th,.lux td{border:1px solid #bdccc5}.lux thead th{background:#e6eeea;color:${ink}}.lux .section-card{border-color:#bdccc5}`,
    atelier: `html{background:linear-gradient(to left,${ink} 0 5mm,#fff 5mm 100%)}.st-logo{border-radius:50%!important;background:#f6f1ec}.st-title h1{font-weight:400!important}.lux thead th{background:#f2eae3;color:${ink}}.st-head{border-bottom:1px solid #d7c8bd}`,
    modern: `.st-title{background:${ink};color:white;margin-inline:-16mm;padding:5mm 16mm}.st-title h1,.st-title .st-sub{color:white!important}.st-logo{border-radius:3mm!important;background:${ink};color:white!important}.st-head{border:0}`,
    archive: `.st-head{border:1px solid ${ink};border-inline-start:4px solid ${ink};padding:4mm}.st-logo{display:none!important}.st-meta{border:1px solid #bac2cc;padding:2mm}.st-title{border-bottom:1px dashed #bac2cc;padding-bottom:4mm}.lux thead th{background:#e9edf2;color:${ink}}.lux .section-card{border-style:dashed}`,
  };
  return {
    id, margin: { top: "13mm", bottom: "17mm" },
    css: vars({ paper: "#ffffff", accent: ink, "accent-ink": "#ffffff", metal, "metal-deep": metal,
      "metal-soft": "#f4f5f6", row: "#f6f7f8", line: "#dfe3e6", "line-strong": "#bbc3cb", radius: "0px",
      heading: "'IBM Plex Sans Arabic',Tahoma,sans-serif", foil: `linear-gradient(${ink},${ink})`, "pad-r": "16mm", "pad-l": "16mm",
      seal: `url("${dataUri(rosetteSvg(metal))}")`,
    }) + LUX_BASE + `
      .st-head{display:flex;align-items:center;justify-content:space-between;gap:5mm;border-bottom:2px solid ${ink};padding-bottom:5mm;position:relative;break-inside:avoid}
      .st-brand{display:flex;align-items:center;gap:3mm;min-width:0}.st-logo{width:13mm;height:15mm;object-fit:contain;flex:none;border:1px solid ${ink};border-radius:7mm 7mm 1mm 1mm;color:${ink};font-size:23pt}
      .st-company{font-size:14pt;color:${ink};font-weight:700;line-height:1.5;overflow-wrap:anywhere}.st-company-en{font-size:7pt;color:#77818a;direction:ltr}
      .st-meta{font-size:7pt;color:#7a838b;display:flex;flex-direction:column;gap:1mm;flex-shrink:0}.st-meta b{color:${ink}}
      .st-title{display:flex;justify-content:space-between;align-items:center;gap:4mm;margin:5mm 0;break-inside:avoid}.st-title h1{font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;font-size:21pt;color:${ink};margin:0;line-height:1.5;overflow-wrap:anywhere}.st-sub{font-size:7pt;color:${metal};letter-spacing:.5px;margin-top:1mm}
      .lux .section-card,.lux .report-summary-bar{box-shadow:none}.lux .section-header{font-size:10pt}.lux .amount-val{color:${ink};background:none}.lux .kpi-total-card{background:#f4f5f6;color:${ink};border-bottom:2px solid ${metal}}.lux .amount-sub{color:#6b7680}
    ` + (variations[variant] ?? ""),
    letterhead: ctx => `<div class="st-head"><div class="st-brand">${logo(ctx,"st-logo")}<div><div class="st-company">${esc(ctx.companyNameAr)}</div><div class="st-company-en">${esc(ctx.companyNameEn)}</div></div></div><div class="st-meta">${refLines(ctx)}</div></div><div class="st-title"><div><h1>${esc(ctx.title)}</h1>${ctx.titleEn ? `<div class="st-sub">${esc(ctx.titleEn)}</div>` : ""}</div></div>`,
    decor: "", headerTemplate: tpl("13mm", "", "#ffffff"),
    footerTemplate: label => tpl("17mm", `<div dir="rtl" style="position:absolute;left:16mm;right:16mm;top:3mm;border-top:1px solid ${metal};padding-top:2mm;display:flex;justify-content:space-between;gap:4mm;font-size:7pt;color:${ink}"><span>${label}</span><span>${PAGE_NO}</span></div>`, "#ffffff"),
  };
}

const THEMES: Record<PrintThemeId, PrintTheme> = { classic, royal, emerald, executive, burgundy, sapphire, bronze, turquoise, slate, amethyst, olive, crimson, ledger, blueprint, mono, ribbon, mosaic, ocean, sadu, glass, gazette, prism, pearl, passport, airmail, bauhaus, palm, circuit, topo, marble, ticket, calligraphy,
  studio_executive: studioTheme("studio_executive", "#183c55", "#af8751", "executive"),
  studio_heritage: studioTheme("studio_heritage", "#225244", "#b49655", "heritage"),
  studio_editorial: studioTheme("studio_editorial", "#262626", "#b65940", "editorial"),
  studio_minimal: studioTheme("studio_minimal", "#343b44", "#8993a0", "minimal"),
  studio_blueprint: studioTheme("studio_blueprint", "#245a8b", "#6596ae", "blueprint"),
  studio_royal: studioTheme("studio_royal", "#45335b", "#b28d59", "royal"),
  studio_ledger: studioTheme("studio_ledger", "#24564d", "#637c71", "ledger"),
  studio_atelier: studioTheme("studio_atelier", "#735749", "#c19578", "atelier"),
  studio_modern: studioTheme("studio_modern", "#145d69", "#c9914b", "modern"),
  studio_archive: studioTheme("studio_archive", "#303d53", "#8994a7", "archive"),
  ...SIGNATURE_THEMES,
};

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
