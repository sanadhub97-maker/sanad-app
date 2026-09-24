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
  .a-flour i { width: 26mm; height: .35mm; background: linear-gradient(90deg, transparent, ${PUR_GOLD}); }
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
const STRIPES = `repeating-linear-gradient(-45deg, ${CRIM} 0 2mm, ${GRAPH} 2mm 4mm)`;
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
  .c-title { margin: 0 -14mm 6mm; display: flex; align-items: stretch; min-height: 24mm; background: linear-gradient(105deg, ${GRAPH} 0 30%, transparent 30%), ${CRIM}; color: #fff; }
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
  html { background: linear-gradient(270deg, transparent 20mm, ${LR} 20mm 20.35mm, transparent 20.35mm 21mm, ${LR} 21mm 21.35mm, transparent 21.35mm), #fbfaf3; }
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
const GRID = `linear-gradient(rgba(255,255,255,.22) .25mm, transparent .25mm) 0 0 / 25mm 25mm, linear-gradient(90deg, rgba(255,255,255,.22) .25mm, transparent .25mm) 0 0 / 25mm 25mm, linear-gradient(rgba(255,255,255,.09) .15mm, transparent .15mm) 0 0 / 5mm 5mm, linear-gradient(90deg, rgba(255,255,255,.09) .15mm, transparent .15mm) 0 0 / 5mm 5mm`;
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
  .mn-head h1 span { background: linear-gradient(transparent 58%, ${YEL} 58%, ${YEL} 92%, transparent 92%); padding: 0 1mm; }
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

const THEMES: Record<PrintThemeId, PrintTheme> = { classic, royal, emerald, executive, burgundy, sapphire, bronze, turquoise, slate, amethyst, olive, crimson, ledger, blueprint, mono, ribbon, mosaic, ocean, sadu, glass, gazette, prism };

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
