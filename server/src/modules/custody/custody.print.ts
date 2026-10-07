import QRCode from "qrcode";
import { escapeHtml as esc } from "@/lib/security";
import { L, isEn } from "@/services/lang";

/**
 * The royal letterhead the custody handover and the clearance certificate print
 * on: an Islamic-pattern border, a dark band in the establishment's own colour
 * with its name in gold foil, its logo in a medallion, a gold seal and a footer
 * band with a QR code. One A4 sheet; a long list is shrunk to fit (fitSelector).
 */

export interface PrintEstablishment {
  name: string;
  nameEn: string | null;
  cr: string | null;
  vat: string | null;
  city: string | null;
  phone: string | null;
  logoDataUrl: string | null;
  brandColor: string | null;
  /** A see-through logo also prints faintly behind the page; a solid one would show as a grey block. */
  logoTransparent?: boolean;
}
export interface PrintEmployee {
  name: string;
  number: string;
  iqama: string | null;
  job: string | null;
  nationality: string | null;
}
export interface PrintItem {
  kind: string;
  description: string | null;
  serialNumber: string | null;
  condition: string;
  value: number;
}

export const CONDITION_LABELS: Record<string, [string, string]> = {
  new: ["جديدة", "New"],
  good: ["سليمة", "Good"],
  used: ["مستعملة", "Used"],
  damaged: ["تالفة", "Damaged"],
  lost: ["مفقودة", "Lost"],
};
export const REASON_LABELS: Record<string, [string, string]> = {
  resignation: ["استقالة", "Resignation"],
  contractEnd: ["انتهاء العقد", "End of contract"],
  termination: ["إنهاء خدمات", "Termination"],
  transfer: ["نقل خدمات", "Transfer of sponsorship"],
  retirement: ["تقاعد", "Retirement"],
  other: ["أخرى", "Other"],
};
export const DEPARTMENT_LABELS: Record<string, [string, string]> = {
  hr: ["الموارد البشرية", "Human resources"],
  fin: ["المالية", "Finance"],
  it: ["تقنية المعلومات", "IT"],
  store: ["المستودع والعهد", "Stores & custody"],
  mgr: ["المدير المباشر", "Line manager"],
};
const label = (map: Record<string, [string, string]>, key: string) => (map[key] ? L(map[key][0], map[key][1]) : key);

const money = (n: number) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** 2026-10-07 → 07/10/2026 */
export const dmy = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");
export function hijri(d: Date) {
  try {
    return new Intl.DateTimeFormat(isEn() ? "en-SA-u-ca-islamic-umalqura" : "ar-SA-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  } catch {
    return "";
  }
}

/** #rrggbb times k per channel (k < 1 darkens). */
export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}
const validHex = (v: string | null | undefined) => (v && /^#[0-9a-f]{6}$/i.test(v) ? v : null);

const svgUrl = (s: string) => `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(s).replace(/'/g, "%27")}')`;
// An eight-point geometric star with its interlace.
function star(cx: number, cy: number, r: number, color: string, sw: number) {
  const pts = (rot: number) => Array.from({ length: 4 }, (_, i) => { const a = rot + (i * Math.PI) / 2; return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`; }).join(" ");
  return `<polygon points="${pts(0)}" fill="none" stroke="${color}" stroke-width="${sw}"/><polygon points="${pts(Math.PI / 4)}" fill="none" stroke="${color}" stroke-width="${sw}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.42}" fill="none" stroke="${color}" stroke-width="${sw * 0.8}"/>`;
}
// The repeating tile of the border and the header band.
const tile = (size: number, color: string, sw: number) => svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="${size}" height="${size}">${star(18, 18, 12, color, sw)}<circle cx="18" cy="18" r="1.6" fill="${color}"/><path d="M0 0 L6 6 M36 0 L30 6 M0 36 L6 30 M36 36 L30 30" stroke="${color}" stroke-width="${sw}"/></svg>`);
// A tapering gold rule with a diamond and a star beside the title.
function starRule(id: string) {
  return `<svg viewBox="0 0 220 26" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#b48a3c" stop-opacity="0"/><stop offset=".55" stop-color="#c9a253"/><stop offset="1" stop-color="#e8cf8b"/></linearGradient></defs>
    <path d="M0 13 L170 11.6 L170 14.4 Z" fill="url(#${id})"/><path d="M40 18.5 H160" stroke="url(#${id})" stroke-width=".5"/><path d="M40 7.5 H160" stroke="url(#${id})" stroke-width=".5"/>
    <rect x="176" y="10" width="6" height="6" transform="rotate(45 179 13)" fill="#c9a253"/>${star(202, 13, 9, "#b48a3c", 1.1)}<circle cx="202" cy="13" r="1.8" fill="#c9a253"/></svg>`;
}
// A gold serrated seal with ribbon tails and the establishment's name round the ring.
function royalSeal(name: string, deep: string) {
  let teeth = "";
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, r = i % 2 ? 46 : 50; teeth += `${(60 + r * Math.cos(a)).toFixed(2)},${(56 + r * Math.sin(a)).toFixed(2)} `; }
  const ring = `${name.split(/\s+/).slice(0, 4).join(" ")} ✦ ${L("مختوم ومعتمد", "Sealed & approved")} ✦`;
  return `<svg class="ry-seal" viewBox="0 0 120 150" aria-hidden="true"><defs>
      <linearGradient id="rsg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a5a22"/><stop offset=".3" stop-color="#ecd594"/><stop offset=".5" stop-color="#b48a3c"/><stop offset=".72" stop-color="#f7e7b0"/><stop offset="1" stop-color="#8f6a2a"/></linearGradient>
      <path id="rsp" d="M60 56 m-31 0 a31 31 0 1 1 62 0 a31 31 0 1 1 -62 0"/></defs>
    <path d="M38 88 L30 146 L46 134 L56 150 L60 92 Z" fill="${deep}"/><path d="M82 88 L90 146 L74 134 L64 150 L60 92 Z" fill="${shade(deep, 1.6)}"/>
    <polygon points="${teeth}" fill="url(#rsg)"/>
    <circle cx="60" cy="56" r="40" fill="${deep}"/><circle cx="60" cy="56" r="37" fill="none" stroke="url(#rsg)" stroke-width="1.2"/>
    <text font-size="7.4" font-weight="700" fill="#ecd594" letter-spacing=".4"><textPath href="#rsp">${esc(ring)}</textPath></text>
    ${star(60, 56, 15, "#ecd594", 1.2)}<text x="60" y="59.5" text-anchor="middle" font-size="8.6" font-weight="700" fill="#ecd594">${L("معتمد", "Approved")}</text></svg>`;
}

/**
 * Gold-foil text drawn as SVG with a gradient fill. Text clipped to a CSS
 * background (background-clip: text) leaves hairlines along the box in PDFs.
 */
let foilSeq = 0;
function foilText(text: string, size: number, opts: { head?: boolean; maxChars?: number } = {}) {
  const id = `fg${++foilSeq}`;
  // Long names step down so they stay inside the band.
  const fit = opts.maxChars && text.length > opts.maxChars ? Math.max(0.6, opts.maxChars / text.length) : 1;
  const px = +(size * fit).toFixed(1);
  const family = opts.head ? "'Alexandria', 'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans Arabic', sans-serif";
  return `<svg class="foil-svg" height="${Math.round(px * 1.5)}" aria-label="${esc(text)}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9c7631"/><stop offset=".28" stop-color="#e8cf8b"/><stop offset=".46" stop-color="#c49a48"/><stop offset=".64" stop-color="#f7e7b0"/><stop offset=".82" stop-color="#b48a3c"/><stop offset="1" stop-color="#e2c37c"/></linearGradient></defs><text x="50%" y="${(px * 1.08).toFixed(1)}" text-anchor="middle" fill="url(#${id})" style="font-family: ${family} !important; font-size: ${px}px; font-weight: 700">${esc(text)}</text></svg>`;
}

const CSS = `
@page { size: A4; margin: 0; }
html, body { margin: 0; padding: 0; background: #fffdf7; }
.n { font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate; }
.foil-svg { display: block; width: 100%; overflow: visible; }
.ry-tbl th span { color: #e8cf8b; }
.ry { width: 794px; height: 1123px; background: #fffdf7; color: #1a2130; position: relative; overflow: hidden; font: 11.8px/1.6 'IBM Plex Sans Arabic', sans-serif;
  --foil: linear-gradient(135deg, #7a5a22 0%, #e8cf8b 28%, #b48a3c 46%, #f7e7b0 64%, #9c7631 82%, #e2c37c 100%); --gold: #b08a40; --gold-l: #e3cd97; --ink2: #3c4659; }
.ry .edge { position: absolute; background-color: var(--deep); background-size: 18px 18px; }
.ry .edge.t, .ry .edge.b { left: 0; right: 0; height: 18px; } .ry .edge.t { top: 0; } .ry .edge.b { bottom: 0; }
.ry .edge.r, .ry .edge.l { top: 0; bottom: 0; width: 18px; } .ry .edge.r { right: 0; } .ry .edge.l { left: 0; }
.ry .rule { position: absolute; inset: 22px; border: 1.2px solid transparent; border-image: var(--foil) 1; }
.ry .rule::after { content: ""; position: absolute; inset: 3px; border: .5px solid var(--gold-l); }
.ry .bg { position: absolute; left: 50%; top: 58%; width: 520px; max-height: 520px; object-fit: contain; transform: translate(-50%, -50%); opacity: .045; }
.ry-band { position: absolute; top: 26px; left: 26px; right: 26px; height: 150px; background-color: var(--deep); background-image: radial-gradient(120% 140% at 50% -20%, color-mix(in srgb, var(--brand) 55%, transparent), transparent 70%); overflow: hidden; }
.ry-band .pat { position: absolute; inset: 0; opacity: .14; background-size: 34px 34px; }
.ry-band .fl { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: var(--foil); }
.ry-band .txt { position: relative; display: grid; justify-items: stretch; gap: 2px; padding: 22px 30px 0; text-align: center; }
.ry-band h1 { margin: 0; font-size: 25px; line-height: 1.25; font-weight: 700; }
.ry-band .en { font-size: 9.6px; font-weight: 600; letter-spacing: .38em; text-transform: uppercase; color: #e9d6a6; direction: ltr; }
.ry-band .meta { display: flex; gap: 0 12px; flex-wrap: wrap; justify-content: center; margin-top: 6px; font-size: 9.6px; color: #c9d2e3; }
.ry-band .meta b { color: #fff; font-weight: 600; }
.ry-band .meta i { color: #e8cf8b; font-style: normal; }
/* The gold ring is the medal's own background; the white disc sits inside it. */
.ry-medal { position: absolute; top: 126px; left: 345px; width: 104px; height: 104px; box-sizing: border-box; padding: 3px; border-radius: 50%; background: var(--foil); z-index: 2; box-shadow: 0 10px 24px -10px rgba(0, 0, 0, .55); }
.ry-medal .disc { width: 100%; height: 100%; box-sizing: border-box; border-radius: 50%; background: #fff; border: 3px solid #fffdf7; display: grid; place-items: center; overflow: hidden; }
.ry-medal img { max-width: 70%; max-height: 70%; object-fit: contain; }
.ry-medal .ini { font-size: 30px; font-weight: 700; color: var(--deep); }
.ry .body { position: absolute; top: 232px; bottom: 96px; left: 58px; right: 58px; display: flex; flex-direction: column; }
.ry-title { display: grid; grid-template-columns: minmax(0, 1fr) 340px minmax(0, 1fr); align-items: center; gap: 10px; }
.ry-title > div:not(.t) svg { width: 100%; height: 26px; display: block; }
.ry-title .t { text-align: center; }
.ry-title h2 { margin: 0; font-size: 27px; line-height: 1.15; font-weight: 700; }
.ry-title .sub { margin-top: 5px; font-size: 9px; font-weight: 600; letter-spacing: .42em; color: var(--gold); direction: ltr; text-transform: uppercase; }
.ry-ribbon { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 12px; border-top: 1px solid var(--gold); border-bottom: 1px solid var(--gold); background: linear-gradient(#fffaf0, #fbf3e1); }
.ry-ribbon div { text-align: center; padding: 6px 8px; }
.ry-ribbon div + div { border-inline-start: .6px solid var(--gold-l); }
.ry-ribbon small { display: block; font-size: 8.8px; color: var(--ink2); letter-spacing: .05em; }
.ry-ribbon b { font-size: 12.8px; font-weight: 700; color: var(--deep); }
.ry-sec { margin-top: 14px; }
.ry-sec h4 { margin: 0 0 6px; display: flex; align-items: center; gap: 8px; font-size: 12.2px; font-weight: 700; color: var(--deep); }
.ry-sec h4 .dm { width: 9px; height: 9px; background: var(--foil); transform: rotate(45deg); flex: none; }
.ry-sec h4::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--gold-l)); }
.ry-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); background: #fff; border: .6px solid var(--gold-l); box-shadow: inset 0 2px 0 var(--deep); }
.ry-grid div { padding: 6px 10px; border-top: .5px solid #eee4cc; min-width: 0; }
.ry-grid div:nth-child(-n+3) { border-top: 0; }
.ry-grid div:not(:nth-child(3n+1)) { border-inline-start: .5px solid #eee4cc; }
.ry-grid span { display: block; font-size: 9.2px; color: var(--ink2); }
.ry-grid b { font-weight: 600; color: #111827; font-size: 12px; overflow-wrap: anywhere; }
.ry-tbl { width: 100%; border-collapse: collapse; background: #fff; }
.ry-tbl th { background: var(--deep); padding: 7px 9px; text-align: start; font-size: 10.4px; font-weight: 700; }
.ry-tbl thead tr { border-bottom: 2px solid var(--gold); }
.ry-tbl td { padding: 6.5px 9px; border-bottom: .5px solid #eee4cc; font-size: 11.2px; overflow-wrap: anywhere; }
.ry-tbl td.no { font-size: 11px; font-weight: 700; color: var(--gold); width: 28px; }
.ry-tbl .tot td { background: linear-gradient(#fffaf0, #f8eed6); border-top: 1px solid var(--gold); border-bottom: 3px double var(--gold); font-weight: 700; color: var(--deep); }
.ry-decl { position: relative; margin: 0; padding: 11px 18px; background: #fff; border: .6px solid var(--gold-l); font-size: 11.3px; line-height: 1.85; color: #1f2937; white-space: pre-line; }
.ry-decl::before { content: ""; position: absolute; top: -.6px; bottom: -.6px; inset-inline-start: -3px; width: 3px; background: var(--foil); }
.ry-cert { margin-top: 2px; padding: 10px 22px; text-align: center; background: radial-gradient(120% 160% at 50% 0%, #fff, #fbf3e0); border: 1px solid var(--gold); }
.ry-cert b.big { display: block; font-size: 17px; font-weight: 700; margin-bottom: 3px; }
.ry-cert.draft { border-style: dashed; }
.ry-depts { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); background: #fff; border: .6px solid var(--gold-l); box-shadow: inset 0 2px 0 var(--deep); }
.ry-depts div { padding: 7px 4px 6px; text-align: center; font-size: 10.2px; }
.ry-depts div + div { border-inline-start: .5px solid #eee4cc; }
.ry-depts .ck { width: 18px; height: 18px; margin: 0 auto 3px; border-radius: 50%; display: grid; place-items: center; background: var(--foil); color: var(--deep); font-size: 10px; font-weight: 700; }
.ry-depts .ck.off { background: none; border: 1px dashed var(--gold); }
.ry-depts small { display: block; color: var(--ink2); font-size: 8.6px; }
.ry-sigs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin-top: 6px; align-items: end; }
.ry-sig { position: relative; text-align: center; padding-top: 112px; }
.ry-sig .ln { height: 1px; background: linear-gradient(90deg, transparent, #1f2937 18%, #1f2937 82%, transparent); }
.ry-sig b { display: block; margin-top: 5px; font-size: 11.2px; font-weight: 700; color: var(--deep); }
.ry-sig small { font-size: 9.8px; color: var(--ink2); }
.ry-seal { position: absolute; left: 50%; top: -2px; width: 86px; transform: translateX(-50%); z-index: 1; }
.ry .grow { flex: 1; }
.ry-foot { position: absolute; bottom: 26px; left: 26px; right: 26px; height: 52px; background: var(--deep); display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 0 16px; color: #c9d2e3; font-size: 9.4px; }
.ry-foot::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--foil); }
.ry-foot .qr { width: 40px; height: 40px; background: #fff; padding: 2px; outline: 1.5px solid var(--gold); }
.ry-foot .qr img { width: 100%; height: 100%; display: block; }
.ry-foot .mid { text-align: center; line-height: 1.5; }
.ry-foot .mid b { color: #fff; font-weight: 600; }
.ry-foot .pg { color: #e8cf8b; letter-spacing: .12em; font-weight: 600; }
.ry-micro { position: absolute; bottom: 80px; left: 58px; right: 58px; font-size: 4.4px; line-height: 1; letter-spacing: .1em; color: var(--gold); white-space: nowrap; overflow: hidden; direction: ltr; }
`;

interface SheetInput {
  est: PrintEstablishment;
  emp: PrintEmployee;
  number: string;
  date: Date;
  title: [string, string];
  subtitle: string;
  extraCells?: [string, string, boolean?][];
  body: (sec: (title: string, inner: string) => string, sigs: (list: [string, string][]) => string, deep: string) => string;
}

async function royalSheet(input: SheetInput) {
  const { est, emp } = input;
  const brand = validHex(est.brandColor) ?? "#1e40af";
  const deep = shade(brand, 0.38);
  const edgeTile = tile(18, "#c9a253", 2.2), bandTile = tile(34, "#e8cf8b", 1.3);
  const sec = (t: string, inner: string) => `<div class="ry-sec"><h4><span class="dm"></span>${t}</h4>${inner}</div>`;
  const cells: [string, string, boolean?][] = [
    [L("الاسم", "Name"), emp.name],
    [L("الرقم الوظيفي", "Employee no."), emp.number, true],
    [L("رقم الإقامة", "Iqama no."), emp.iqama || "—", true],
    [L("المهنة", "Job title"), emp.job || "—"],
    [L("الجنسية", "Nationality"), emp.nationality || "—"],
    [L("المنشأة", "Establishment"), est.name],
    ...(input.extraCells ?? []),
  ];
  const grid = `<div class="ry-grid">${cells.map(([k, v, n]) => `<div><span>${k}</span><b class="${n ? "n" : ""}">${esc(v)}</b></div>`).join("")}</div>`;
  const sigs = (list: [string, string][]) => `<div class="grow"></div>` + sec(L("التوقيعات والاعتماد", "Signatures & approval"), `<div class="ry-sigs">${list.map(([t, n], i) => `<div class="ry-sig">${i === list.length - 1 ? royalSeal(est.name, deep) : ""}<div class="ln"></div><b>${t}</b><small>${esc(n || "")}</small></div>`).join("")}</div>`);
  const meta = [
    est.cr ? `<span>${L("سجل تجاري", "CR")} <b class="n">${esc(est.cr)}</b></span>` : "",
    est.vat ? `<span>${L("الرقم الضريبي", "VAT")} <b class="n">${esc(est.vat)}</b></span>` : "",
    est.city ? `<span>${esc(est.city)}</span>` : "",
    est.phone ? `<span class="n">${esc(est.phone)}</span>` : "",
  ].filter(Boolean).join("<i>◆</i>");
  const contact = [`<b>${esc(est.name)}</b>`, est.city ? esc(est.city) : "", est.phone ? `<span class="n">${esc(est.phone)}</span>` : ""].filter(Boolean).join(" · ");
  const qrText = [input.title[isEn() ? 1 : 0], input.number, est.name, emp.name, emp.iqama ? `${L("إقامة", "Iqama")} ${emp.iqama}` : "", dmy(input.date)].filter(Boolean).join("\n");
  const qr = await QRCode.toDataURL(qrText, { margin: 0, width: 160, errorCorrectionLevel: "M" });
  const logo = est.logoDataUrl;
  const micro = `${est.nameEn || ""} · ${est.name} · ${input.number} · `.repeat(14);
  const html = `<!doctype html><html lang="${isEn() ? "en" : "ar"}" dir="${isEn() ? "ltr" : "rtl"}"><head><meta charset="utf-8"><title>${esc(input.number)}</title><style>${CSS}</style></head><body>
  <div class="ry" style="--brand:${brand};--deep:${deep}">
    <div class="edge t" style="background-image:${edgeTile}"></div><div class="edge b" style="background-image:${edgeTile}"></div><div class="edge r" style="background-image:${edgeTile}"></div><div class="edge l" style="background-image:${edgeTile}"></div>
    <div class="rule"></div>
    ${logo && est.logoTransparent ? `<img class="bg" src="${logo}" alt="">` : ""}
    <div class="ry-band"><div class="pat" style="background-image:${bandTile}"></div><div class="txt"><h1>${foilText(est.name, 25, { head: true, maxChars: 42 })}</h1>${est.nameEn ? `<div class="en">${esc(est.nameEn)}</div>` : ""}
      ${meta ? `<div class="meta">${meta}</div>` : ""}</div><div class="fl"></div></div>
    <div class="ry-medal"><div class="disc">${logo ? `<img src="${logo}" alt="">` : `<span class="ini">${esc(est.name.trim().charAt(0))}</span>`}</div></div>
    <div class="body">
      <div class="ry-title"><div>${starRule("rl")}</div><div class="t"><h2>${foilText(L(...input.title), 27, { head: true })}</h2><div class="sub">${esc(input.subtitle)}</div></div><div style="transform:scaleX(-1)">${starRule("rr")}</div></div>
      <div class="ry-ribbon"><div><small>${L("رقم المستند", "Document no.")}</small><b class="n">${esc(input.number)}</b></div><div><small>${L("التاريخ", "Date")}</small><b class="n">${dmy(input.date)}</b></div><div><small>${L("الموافق", "Hijri")}</small><b>${esc(hijri(input.date))}</b></div></div>
      ${sec(input.extraCells?.length ? L("بيانات الموظف والإخلاء", "Employee & clearance") : L("بيانات الموظف", "Employee"), grid)}
      ${input.body(sec, sigs, deep)}
    </div>
    <div class="ry-micro">${esc(micro)}</div>
    <div class="ry-foot"><div class="qr"><img src="${qr}" alt=""></div><div class="mid">${contact}<br>${L("مستند صادر إلكترونيًا من نظام سند · امسح الرمز لعرض بيانات المستند", "Issued electronically by Sanad · scan the code for the document's details")}</div><div class="pg">${L("صفحة", "Page")} <span class="n">1</span> ${L("من", "of")} <span class="n">1</span></div></div>
  </div></body></html>`;
  return html;
}

const th = (labels: string[]) => `<thead><tr>${labels.map((l) => `<th><span>${l}</span></th>`).join("")}</tr></thead>`;

export function handoverHtml(input: { est: PrintEstablishment; emp: PrintEmployee; number: string; date: Date; deliveredBy: string | null; notes: string | null; items: PrintItem[] }) {
  const { est, emp, items } = input;
  const total = items.reduce((a, i) => a + Number(i.value || 0), 0);
  return royalSheet({
    est, emp, number: input.number, date: input.date,
    title: ["محضر تسليم عهدة", "Custody Handover Record"],
    subtitle: "Custody Handover Record",
    body: (sec, sigs) =>
      sec(L("العهد المسلّمة", "Items handed over"), `<table class="ry-tbl">${th(["#", L("الصنف", "Item"), L("الوصف", "Description"), L("الرقم التسلسلي", "Serial no."), L("الحالة", "Condition"), L("القيمة (ر.س)", "Value (SAR)")])}<tbody>
        ${items.map((i, n) => `<tr><td class="no n">${String(n + 1).padStart(2, "0")}</td><td>${esc(i.kind)}</td><td>${esc(i.description || "—")}</td><td class="n">${esc(i.serialNumber || "—")}</td><td>${label(CONDITION_LABELS, i.condition)}</td><td class="n">${money(i.value)}</td></tr>`).join("")}
        <tr class="tot"><td></td><td colspan="4">${L("الإجمالي", "Total")} · ${items.length} ${L("صنف", "items")}</td><td class="n">${money(total)}</td></tr></tbody></table>`)
      + sec(L("إقرار الاستلام", "Acknowledgement"), `<p class="ry-decl">${L(
        `أقر أنا الموظف المذكور أعلاه بأنني استلمت العهد الموضحة في هذا المحضر بالحالة المبيّنة، وأتعهد بالمحافظة عليها واستخدامها لأغراض العمل فقط، وإعادتها عند الطلب أو عند انتهاء علاقتي التعاقدية مع ${esc(est.name)}، وأتحمل قيمة ما يُفقد أو يتلف منها بسبب الإهمال وفق نظام العمل.`,
        `I, the employee named above, confirm I received the items listed in this record in the condition shown. I will look after them, use them for work only and return them on request or when my contract with ${esc(est.name)} ends, and I bear the value of anything lost or damaged through negligence under the Labour Law.`
      )}</p>`)
      + (input.notes ? sec(L("ملاحظات", "Notes"), `<p class="ry-decl">${esc(input.notes)}</p>`) : "")
      + sigs([[L("المستلم", "Received by"), emp.name], [L("المسلّم · أمين العهد", "Handed over by"), input.deliveredBy || ""], [L("اعتماد الموارد البشرية", "HR approval"), est.name]]),
  });
}

export function clearanceHtml(input: {
  est: PrintEstablishment; emp: PrintEmployee; number: string; lastWorkingDay: Date; reason: string; dues: number; notes: string | null;
  issued: boolean; departments: Record<string, { done: boolean; by?: string }>; items: (PrintItem & { returnCondition: string | null })[];
}) {
  const { est, emp, items } = input;
  const certText = input.issued
    ? L(
        `تشهد ${esc(est.name)} بأن الموظف ${esc(emp.name)}${emp.iqama ? `، إقامة رقم <span class="n">${esc(emp.iqama)}</span>،` : ""} قد سلّم جميع العهد والمستندات التي بحوزته، وأخلى طرفه من جميع الأقسام، ولا توجد عليه أي التزامات تجاه المنشأة حتى تاريخ <span class="n">${dmy(input.lastWorkingDay)}</span>.`,
        `${esc(est.name)} certifies that ${esc(emp.name)}${emp.iqama ? `, iqama <span class="n">${esc(emp.iqama)}</span>,` : ""} has returned every item and document in their care, has been cleared by every department, and has no obligations towards the establishment as of <span class="n">${dmy(input.lastWorkingDay)}</span>.`
      )
    : L("هذه نسخة مسودة: لا تُعتبر إخلاء طرف حتى تُستكمل العهد وتأكيد جميع الأقسام وتُصدر الشهادة.", "Draft copy: not a clearance until every item is back, every department has signed and the certificate is issued.");
  return royalSheet({
    est, emp, number: input.number, date: input.lastWorkingDay,
    title: ["شهادة إخلاء طرف", "Certificate of Clearance"],
    subtitle: "Certificate of Clearance",
    extraCells: [
      [L("سبب الإخلاء", "Reason"), label(REASON_LABELS, input.reason)],
      [L("آخر يوم عمل", "Last working day"), dmy(input.lastWorkingDay), true],
      [L("المستحقات", "Dues"), `${money(input.dues)} ${L("ر.س", "SAR")}`, true],
    ],
    body: (sec, sigs) =>
      sec(L("العهد المسترجعة", "Items returned"), `<table class="ry-tbl">${th(["#", L("الصنف", "Item"), L("الوصف", "Description"), L("الرقم التسلسلي", "Serial no."), L("الحالة عند الاسترجاع", "Condition on return")])}<tbody>
        ${items.length ? items.map((i, n) => `<tr><td class="no n">${String(n + 1).padStart(2, "0")}</td><td>${esc(i.kind)}</td><td>${esc(i.description || "—")}</td><td class="n">${esc(i.serialNumber || "—")}</td><td>${i.returnCondition ? label(CONDITION_LABELS, i.returnCondition) : L("لم تُسترجع بعد", "Not returned yet")}</td></tr>`).join("") : `<tr><td colspan="5">${L("لم تُسلَّم للموظف أي عهد.", "No items were handed to this employee.")}</td></tr>`}</tbody></table>`)
      + sec(L("تأكيد الأقسام", "Department sign-off"), `<div class="ry-depts">${Object.keys(DEPARTMENT_LABELS).map((k) => { const d = input.departments[k]; return `<div><div class="ck ${d?.done ? "" : "off"}">${d?.done ? "✓" : ""}</div>${label(DEPARTMENT_LABELS, k)}${d?.done && d.by ? `<small>${esc(d.by)}</small>` : ""}</div>`; }).join("")}</div>`)
      + (input.notes ? sec(L("ملاحظات", "Notes"), `<p class="ry-decl">${esc(input.notes)}</p>`) : "")
      + `<div class="ry-sec"><div class="ry-cert${input.issued ? "" : " draft"}"><b class="big">${foilText(input.issued ? L("إخلاء طرف نهائي", "Final clearance") : L("مسودة — لم تصدر بعد", "Draft — not issued yet"), 17, { head: true })}</b>${certText}</div></div>`
      + sigs([[L("الموظف", "Employee"), emp.name], [L("مدير الموارد البشرية", "HR manager"), ""], [L("المدير العام", "General manager"), est.name]]),
  });
}
