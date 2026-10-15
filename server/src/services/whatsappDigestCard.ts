import { L, isEn } from "@/services/lang";
import { type AlertContext, type TaskLine } from "@/services/whatsappTemplates";
import { urgency, urgencyCounts, urgencyLabel, type Urgency } from "@/services/urgency";

/* The morning summary as one designed picture, in four designs. The page is a
   report: a letterhead with the company and a calendar leaf for the day, a
   strip of counts with their share, the documents grouped by urgency (each
   with a drawn icon, its details and a day counter), then the open tasks. */

export const DIGEST_CARD_IDS = ["noir", "ivory", "emerald", "sapphire"] as const;
export type DigestCardId = (typeof DIGEST_CARD_IDS)[number];
export type DigestCardSetting = DigestCardId | "none";
export const isDigestCardSetting = (v: unknown): v is DigestCardSetting => v === "none" || (DIGEST_CARD_IDS as readonly string[]).includes(String(v));

export const DIGEST_CARD_WIDTH = 1080;
export const FONTS = "https://fonts.googleapis.com/css2?family=Zain:wght@400;700;800;900&family=IBM+Plex+Mono:wght@500;600&display=swap";
const MAX_DOCS = 12;
const MAX_TASKS = 8;

export interface DigestCardData {
  company: string;
  logo: string | null;
  today?: Date;
  documents: (AlertContext & { sourceType?: string })[];
  tasks: TaskLine[];
}

export const esc = (s: string | null | undefined) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const RIYADH = "Asia/Riyadh";
const dateStr = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: RIYADH, day: "2-digit", month: "2-digit", year: "numeric" });

export const PATHS: Record<string, string> = {
  iqama: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16.2c.7-1.6 1.8-2.4 3.2-2.4s2.5.8 3.2 2.4M14.5 10h4M14.5 13.5h3"/>',
  passport: '<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><circle cx="12" cy="10" r="3.2"/><path d="M8.8 10h6.4M12 6.8c1 .9 1.4 2 1.4 3.2s-.4 2.3-1.4 3.2c-1-.9-1.4-2-1.4-3.2s.4-2.3 1.4-3.2M9 17h6"/>',
  document: '<path d="M14 2.5H7A2.5 2.5 0 0 0 4.5 5v14A2.5 2.5 0 0 0 7 21.5h10a2.5 2.5 0 0 0 2.5-2.5V8z"/><path d="M14 2.5V8h5.5M8.5 13h7M8.5 17h4.5"/>',
  company: '<path d="M3 21h18M5 21V7.5L12 3l7 4.5V21"/><path d="M9.5 21v-5h5v5M8.5 10h1M14.5 10h1M8.5 13.5h1M14.5 13.5h1"/>',
  car: '<path d="M3.5 13.5 5.4 8a2.5 2.5 0 0 1 2.4-1.7h8.4A2.5 2.5 0 0 1 18.6 8l1.9 5.5V18H3.5z"/><path d="M3.5 13.5h17M6 18v2M18 18v2"/><circle cx="7.5" cy="15.8" r=".9"/><circle cx="16.5" cy="15.8" r=".9"/>',
  task: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m8 12.2 2.8 2.8L16.5 9"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c1.4-3.7 4.2-5.6 7.5-5.6s6.1 1.9 7.5 5.6"/>',
  alert: '<path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  hourglass: '<path d="M6.5 2.5h11M6.5 21.5h11M7.5 2.5c0 4.8 9 5.2 9 9.5s-9 4.7-9 9.5M16.5 2.5c0 4.8-9 5.2-9 9.5s9 4.7 9 9.5"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  hash: '<path d="M5 9h14M5 15h14M10 3.5 8 20.5M16 3.5l-2 17"/>',
  flag: '<path d="M5 21V4M5 4.5c4-2 7 2 14 0v9c-7 2-10-2-14 0"/>',
  shield: '<path d="M12 2.8 4.5 5.8v5.4c0 4.7 3.2 8.3 7.5 10 4.3-1.7 7.5-5.3 7.5-10V5.8z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
};
export const icon = (name: string, cls = "ic") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] ?? PATHS.document}</svg>`;
const docIcon = (t?: string) => (t === "EMPLOYEE_IQAMA" ? "iqama" : t === "EMPLOYEE_PASSPORT" ? "passport" : t === "VEHICLE" ? "car" : t === "COMPANY_DOCUMENT" ? "company" : "document");

export const PALETTES: Record<DigestCardId, string> = {
  // Black velvet and gold, as the site.
  noir: `--ground: radial-gradient(1100px 700px at 100% 0%, rgba(201,164,100,.20), transparent 60%), radial-gradient(800px 600px at 0% 100%, rgba(120,90,40,.16), transparent 60%), #09090c;
    --ink: #f3ebda; --ink2: #d9cfbb; --mut: #9c927e; --line: rgba(214,182,120,.20); --hair: rgba(214,182,120,.12);
    --panel: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.008)); --panel2: rgba(255,255,255,.025);
    --accent: #d2ad6b; --accent2: #f3dfae; --foil: linear-gradient(110deg, #8a6a35, #f3dfae 30%, #c9a464 50%, #fff3d6 64%, #a5803f 86%);
    --tile: linear-gradient(160deg, #2b2416, #14110b); --tileInk: #f3dfae; --tileRing: rgba(214,182,120,.45);
    --leaf: linear-gradient(180deg, #1a1710, #0f0d09); --leafTop: linear-gradient(90deg, #8a6a35, #d2ad6b, #8a6a35); --leafInk: #f3dfae;
    --bad: #f08a80; --warn: #eab05c; --soon: #d9c278; --ok: #84d1a8; --badT: rgba(240,138,128,.12); --warnT: rgba(234,176,92,.12); --soonT: rgba(217,194,120,.12); --next: #8fb3f0; --nextT: rgba(143,179,240,.12); --okT: rgba(132,209,168,.12);`,
  // Ivory paper, navy and gold: a printed report.
  ivory: `--ground: radial-gradient(900px 600px at 100% 0%, rgba(201,164,100,.18), transparent 60%), #f6f0e2;
    --ink: #14213d; --ink2: #2c3a57; --mut: #6e6655; --line: rgba(150,118,60,.30); --hair: rgba(150,118,60,.18);
    --panel: #fffdf8; --panel2: #fbf7ee;
    --accent: #9c7634; --accent2: #c9a464; --foil: linear-gradient(110deg, #14213d, #2a4677 55%, #14213d);
    --tile: linear-gradient(160deg, #1d3157, #111d36); --tileInk: #f3dfae; --tileRing: rgba(201,164,100,.6);
    --leaf: #fffdf8; --leafTop: linear-gradient(90deg, #14213d, #2a4677); --leafInk: #14213d;
    --bad: #b3392f; --warn: #b26b12; --soon: #8a6d1e; --ok: #2e7a55; --badT: rgba(179,57,47,.09); --warnT: rgba(178,107,18,.09); --soonT: rgba(138,109,30,.09); --next: #2f5aa8; --nextT: rgba(143,179,240,.12); --okT: rgba(46,122,85,.09);`,
  // Deep emerald with gold.
  emerald: `--ground: radial-gradient(1000px 700px at 100% 0%, rgba(214,182,120,.18), transparent 60%), linear-gradient(165deg, #04201a, #0a3a30 55%, #052a22);
    --ink: #eef6f0; --ink2: #cfe4d8; --mut: #93b6a6; --line: rgba(214,182,120,.26); --hair: rgba(214,182,120,.14);
    --panel: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02)); --panel2: rgba(255,255,255,.04);
    --accent: #dcbb7c; --accent2: #f6e3b0; --foil: linear-gradient(110deg, #b38b45, #f6e3b0 35%, #d8b675 55%, #fff6dc 70%, #b38b45);
    --tile: linear-gradient(160deg, #1b5a48, #083026); --tileInk: #f6e3b0; --tileRing: rgba(214,182,120,.45);
    --leaf: linear-gradient(180deg, #0c3a30, #062a22); --leafTop: linear-gradient(90deg, #b38b45, #f0d79e, #b38b45); --leafInk: #f6e3b0;
    --bad: #ff9a8e; --warn: #f3c46c; --soon: #e5d18e; --ok: #93e2b8; --badT: rgba(255,154,142,.12); --warnT: rgba(243,196,108,.12); --soonT: rgba(229,209,142,.12); --next: #8fb3f0; --nextT: rgba(143,179,240,.12); --okT: rgba(147,226,184,.12);`,
  // Midnight sapphire with silver: cool and corporate.
  sapphire: `--ground: radial-gradient(1000px 700px at 100% 0%, rgba(120,160,255,.20), transparent 60%), linear-gradient(165deg, #070d1f, #0d1a3a 55%, #08112a);
    --ink: #eef2fb; --ink2: #ccd6ee; --mut: #8d9bbd; --line: rgba(170,190,235,.22); --hair: rgba(170,190,235,.12);
    --panel: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.015)); --panel2: rgba(255,255,255,.035);
    --accent: #a9bff0; --accent2: #e6edff; --foil: linear-gradient(110deg, #8ea3d6, #ffffff 35%, #b9c8ef 55%, #ffffff 70%, #8ea3d6);
    --tile: linear-gradient(160deg, #22356b, #0f1a3b); --tileInk: #e6edff; --tileRing: rgba(170,190,235,.45);
    --leaf: linear-gradient(180deg, #14234d, #0b1532); --leafTop: linear-gradient(90deg, #5b78c7, #a9bff0, #5b78c7); --leafInk: #e6edff;
    --bad: #ff8f9a; --warn: #f5b862; --soon: #e3d17e; --ok: #7fd6b0; --badT: rgba(255,143,154,.12); --warnT: rgba(245,184,98,.12); --soonT: rgba(227,209,126,.12); --next: #8fb3f0; --nextT: rgba(143,179,240,.12); --okT: rgba(127,214,176,.12);`,
};

export const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html { background: var(--ground); background-color: #000; }
html, body { width: ${DIGEST_CARD_WIDTH}px; }
body { font-family: "Zain", -apple-system, "Segoe UI", Tahoma, sans-serif; color: var(--ink); min-height: 100vh; background: var(--ground); }
.page { min-height: 100vh; padding: 60px 60px 44px; display: flex; flex-direction: column; gap: 30px; }
.num { font-family: "IBM Plex Mono", ui-monospace, monospace; direction: ltr; unicode-bidi: isolate; font-weight: 600; letter-spacing: .02em; }
.ic { width: 1em; height: 1em; flex: none; }

/* letterhead */
.lh { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 26px; }
.logo { width: 116px; height: 116px; border-radius: 30px; background: #fff; display: grid; place-items: center; overflow: hidden; box-shadow: 0 0 0 1.5px var(--accent), 0 0 0 7px var(--hair), 0 24px 46px -24px rgba(0,0,0,.7); }
.logo img { max-width: 84%; max-height: 84%; object-fit: contain; }
.logo b { font-size: 60px; font-weight: 900; color: #9c7634; }
.lt { min-width: 0; display: grid; gap: 2px; }
.eyebrow { display: flex; align-items: center; gap: 10px; font-size: 21px; font-weight: 800; letter-spacing: .16em; color: var(--accent); }
.eyebrow::after { content: ""; flex: 1; max-width: 120px; height: 1.5px; background: linear-gradient(90deg, var(--accent), transparent); }
[dir="rtl"] .eyebrow::after { background: linear-gradient(270deg, var(--accent), transparent); }
h1 { font-size: 78px; line-height: 1.08; font-weight: 900; background: var(--foil); -webkit-background-clip: text; background-clip: text; color: transparent; padding-bottom: 4px; }
.company { font-size: 29px; font-weight: 800; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hijri { font-size: 21px; color: var(--mut); }
.leaf { width: 150px; border-radius: 22px; overflow: hidden; background: var(--leaf); box-shadow: 0 0 0 1px var(--line), 0 24px 46px -24px rgba(0,0,0,.65); text-align: center; color: var(--leafInk); }
.leaf .top { background: var(--leafTop); color: #fff; font-size: 20px; font-weight: 800; padding: 8px 0 6px; letter-spacing: .04em; }
.leaf b { display: block; font-family: "IBM Plex Mono", monospace; font-size: 74px; line-height: 1; font-weight: 600; padding: 12px 0 4px; }
.leaf small { display: block; font-size: 20px; font-weight: 700; padding-bottom: 14px; opacity: .85; }

/* counts */
.kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.kpi { position: relative; border-radius: 22px; padding: 20px 22px 18px; background: var(--panel); border: 1px solid var(--line); display: grid; gap: 10px; overflow: hidden; }
.kpi .t { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 800; color: var(--mut); line-height: 1.2; min-height: 48px; align-self: start; }
.kpi { grid-template-rows: 1fr auto auto; }
.kpi .t span.d { flex: none; }
.kpi .t span.d { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: var(--t); color: var(--c); font-size: 22px; }
.kpi b { font-family: "IBM Plex Mono", monospace; font-size: 64px; line-height: .95; font-weight: 600; color: var(--c); }
.kpi .bar { height: 6px; border-radius: 6px; background: var(--hair); overflow: hidden; }
.kpi .bar u { display: block; height: 100%; border-radius: 6px; background: var(--c); }

/* sections */
.sec { display: grid; gap: 12px; }
.sh { display: flex; align-items: center; gap: 14px; padding: 0 4px; }
.sh .ic { font-size: 34px; color: var(--accent); }
.sh h2 { font-size: 34px; font-weight: 900; }
.sh .cnt { margin-inline-start: auto; font-family: "IBM Plex Mono", monospace; font-size: 22px; font-weight: 600; color: var(--mut); border: 1px solid var(--line); border-radius: 999px; padding: 2px 16px; }
.grp { display: flex; align-items: center; gap: 12px; font-size: 22px; font-weight: 800; color: var(--c); padding: 6px 6px 0; }
.grp i { width: 12px; height: 12px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 5px var(--t); }
.grp::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--line), transparent); }
[dir="rtl"] .grp::after { background: linear-gradient(270deg, var(--line), transparent); }
.list { border-radius: 24px; background: var(--panel); border: 1px solid var(--line); overflow: hidden; }
.row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 20px; padding: 18px 22px; }
.row + .row { border-top: 1px solid var(--hair); }
.tile { width: 64px; height: 64px; border-radius: 18px; background: var(--tile); color: var(--tileInk); display: grid; place-items: center; font-size: 34px; box-shadow: inset 0 0 0 1px var(--tileRing), 0 10px 22px -14px rgba(0,0,0,.7); }
.rtx { min-width: 0; display: grid; gap: 6px; }
.rtx b { font-size: 29px; font-weight: 800; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rtx b em { font-style: normal; color: var(--ink2); font-weight: 700; }
.meta { display: flex; flex-wrap: wrap; gap: 6px 20px; font-size: 21px; color: var(--mut); }
.meta span { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.meta .ic { font-size: 21px; color: var(--accent); opacity: .9; }
.days { min-width: 128px; text-align: center; border-radius: 18px; padding: 10px 14px 9px; background: var(--t); color: var(--c); box-shadow: inset 0 0 0 1.5px var(--c); }
.days b { display: block; font-family: "IBM Plex Mono", monospace; font-size: 40px; line-height: 1; font-weight: 600; }
.days small { display: block; font-size: 18px; font-weight: 800; margin-top: 4px; white-space: nowrap; }
.more { padding: 14px; text-align: center; font-size: 21px; color: var(--mut); border-top: 1px solid var(--hair); background: var(--panel2); }
.clear { display: flex; align-items: center; gap: 18px; padding: 28px; border-radius: 24px; background: var(--okT); border: 1px solid var(--ok); color: var(--ok); font-size: 29px; font-weight: 800; }
.clear .ic { font-size: 44px; }
.check { width: 40px; height: 40px; border-radius: 12px; border: 2px solid var(--c); display: grid; place-items: center; color: var(--c); font-size: 24px; }

.foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-top: 18px; border-top: 1px solid var(--line); font-size: 20px; color: var(--mut); }
.foot .brand { display: inline-flex; align-items: center; gap: 10px; }
.foot .brand .ic { font-size: 26px; color: var(--accent); }
.foot b { color: var(--accent); font-weight: 900; letter-spacing: .04em; }
.next { --c: var(--next); --t: var(--nextT); } .bad { --c: var(--bad); --t: var(--badT); } .warn { --c: var(--warn); --t: var(--warnT); } .soon { --c: var(--soon); --t: var(--soonT); } .ok { --c: var(--ok); --t: var(--okT); }
.gold { --c: var(--accent); --t: var(--hair); }
`;

/** The tallest the picture may be; longer lists end with a "more on the site" line. */
export const DIGEST_CARD_MAX_HEIGHT = 4000;

/** A whole page holding the picture, ready to be shot to PNG. */
export function digestCardDocument(id: DigestCardId, data: DigestCardData): string {
  const en = isEn();
  const today = data.today ?? new Date();
  const docs = data.documents;
  // Expired, this week, later this calendar month, next month (services/urgency).
  const CLS = ["bad", "warn", "soon", "next"] as const;
  const level = (n: number) => CLS[urgency(n, today)];
  const c = urgencyCounts(docs.map((d) => d.daysLeft), today);
  const share = (n: number, of: number) => (of ? Math.max(n ? 6 : 0, Math.round((n / of) * 100)) : 0);
  const kpi = (cls: string, ic: string, label: string, n: number, of: number) =>
    `<div class="kpi ${cls}"><span class="t"><span class="d">${icon(ic)}</span>${esc(label)}</span><b>${n}</b><i class="bar"><u style="width:${share(n, of)}%"></u></i></div>`;

  const docRow = (d: DigestCardData["documents"][number]) => {
    const who = en ? d.employeeEn ?? d.employeeAr : d.employeeAr;
    const doc = en ? d.documentEn : d.documentAr;
    const branch = en ? d.branchEn ?? d.branch : d.branch;
    const meta = [
      d.number && `<span>${icon("hash")}<span class="num">${esc(d.number)}</span></span>`,
      branch && branch !== doc && branch !== who && `<span>${icon("pin")}${esc(branch)}</span>`,
      `<span>${icon("calendar")}<span class="num">${dateStr(d.expiryDate)}</span></span>`,
    ].filter(Boolean).join("");
    const n = Math.abs(d.daysLeft);
    const label = d.daysLeft < 0 ? L("يوم مضى", "days ago") : d.daysLeft === 0 ? L("اليوم", "today") : L("يوم باقٍ", "days left");
    return `<div class="row ${level(d.daysLeft)}"><span class="tile">${icon(docIcon(d.sourceType))}</span><div class="rtx"><b>${esc(doc)}${who ? ` <em>· ${esc(who)}</em>` : ""}</b><div class="meta">${meta}</div></div><div class="days"><b>${d.daysLeft === 0 ? "0" : n}</b><small>${esc(label)}</small></div></div>`;
  };
  const shown = docs.slice(0, MAX_DOCS);
  const GROUPS = ([0, 1, 2, 3] as Urgency[]).map((u) => [CLS[u], urgencyLabel(u, true), (d: { daysLeft: number }) => urgency(d.daysLeft, today) === u] as const);
  const docsHtml = shown.length
    ? GROUPS.map(([cls, title, test]) => {
        const g = shown.filter(test);
        return g.length ? `<div class="grp ${cls}"><i></i>${esc(title)} · <span class="num">${docs.filter(test).length}</span></div><div class="list">${g.map(docRow).join("")}</div>` : "";
      }).join("") + (docs.length > MAX_DOCS ? `<div class="list"><div class="more">${esc(L(`و${docs.length - MAX_DOCS} وثائق أخرى في الموقع`, `and ${docs.length - MAX_DOCS} more on the site`))}</div></div>` : "")
    : `<div class="clear">${icon("shield")}${esc(L("كل الوثائق سارية، ولا شيء قريب من الانتهاء.", "Every document is valid; nothing ends soon."))}</div>`;

  const PRI = { URGENT: ["bad", L("عاجلة", "Urgent")], HIGH: ["warn", L("مهمة", "High")], NORMAL: ["gold", L("عادية", "Normal")] } as const;
  const taskRows = data.tasks.slice(0, MAX_TASKS).map((t) => {
    const [cls, label] = PRI[t.priority];
    const meta = [
      `<span>${icon("flag")}${esc(label)}</span>`,
      t.time && `<span>${icon("clock")}<span class="num">${esc(t.time)}</span></span>`,
      t.assignee && `<span>${icon("user")}${esc(t.assignee)}</span>`,
    ].filter(Boolean).join("");
    const state = t.daysLate > 0
      ? `<div class="days bad"><b>${t.daysLate}</b><small>${esc(L("يوم تأخير", "days late"))}</small></div>`
      : `<div class="days ok"><b>${icon("task")}</b><small>${esc(L("اليوم", "Today"))}</small></div>`;
    return `<div class="row ${cls}"><span class="check">${icon("task")}</span><div class="rtx"><b>${esc(t.title)}</b><div class="meta">${meta}</div></div>${state}</div>`;
  });
  const tasksHtml = data.tasks.length
    ? `<section class="sec"><div class="sh">${icon("task")}<h2>${esc(L("المهام المطلوب إنجازها", "Open tasks"))}</h2><span class="cnt">${data.tasks.length}</span></div><div class="list">${taskRows.join("")}${data.tasks.length > MAX_TASKS ? `<div class="more">${esc(L(`و${data.tasks.length - MAX_TASKS} مهام أخرى في صفحة المهام اليومية`, `and ${data.tasks.length - MAX_TASKS} more on the Daily tasks page`))}</div>` : ""}</div></section>`
    : "";

  const weekday = today.toLocaleDateString(en ? "en-GB" : "ar-EG", { timeZone: RIYADH, weekday: "long" });
  const dayNum = today.toLocaleDateString("en-GB", { timeZone: RIYADH, day: "2-digit" });
  const monthYear = today.toLocaleDateString(en ? "en-GB" : "ar-EG-u-nu-latn", { timeZone: RIYADH, month: "long", year: "numeric" });
  let hijri = "";
  try {
    hijri = today.toLocaleDateString(en ? "en-u-ca-islamic-umalqura" : "ar-SA-u-ca-islamic-umalqura-nu-latn", { timeZone: RIYADH, day: "numeric", month: "long", year: "numeric" });
  } catch {
    /* no Hijri calendar here */
  }
  const time = today.toLocaleTimeString("en-GB", { timeZone: RIYADH, hour: "2-digit", minute: "2-digit" });
  const logo = data.logo ? `<img src="${data.logo}" alt="">` : `<b>${esc(data.company.trim().charAt(0) || "S")}</b>`;
  const total = docs.length + data.tasks.length;

  return `<!doctype html><html lang="${en ? "en" : "ar"}" dir="${en ? "ltr" : "rtl"}"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS}">
<style>:root { ${PALETTES[id]} } ${CSS}</style></head><body><div class="page">
  <header class="lh">
    <span class="logo">${logo}</span>
    <div class="lt">
      <div class="eyebrow">${esc(L("تقرير الصباح", "MORNING REPORT"))}</div>
      <h1>${esc(L("الملخص اليومي", "Daily summary"))}</h1>
      <div class="company">${esc(data.company)}</div>
      ${hijri ? `<div class="hijri">${esc(hijri)}</div>` : ""}
    </div>
    <div class="leaf"><div class="top">${esc(weekday)}</div><b>${dayNum}</b><small>${esc(monthYear)}</small></div>
  </header>
  <div class="kpis" style="grid-template-columns: repeat(${c[3] ? 5 : 4}, minmax(0, 1fr))">
    ${kpi("bad", "alert", urgencyLabel(0), c[0], total)}
    ${kpi("warn", "hourglass", urgencyLabel(1), c[1], total)}
    ${kpi("soon", "calendar", urgencyLabel(2), c[2], total)}
    ${c[3] ? kpi("next", "calendar", urgencyLabel(3), c[3], total) : ""}
    ${kpi("gold", "task", L("المهام المطلوب إنجازها", "Open tasks"), data.tasks.length, total)}
  </div>
  <section class="sec"><div class="sh">${icon("document")}<h2>${esc(L("الوثائق", "Documents"))}</h2><span class="cnt">${docs.length}</span></div>${docsHtml}</section>
  ${tasksHtml}
  <footer class="foot"><span class="brand">${icon("shield")}<span><b>SanaD</b> · ${esc(L("إدارة الوثائق والتراخيص", "Documents & Licenses"))}</span></span><span>${esc(L("أُرسل تلقائيًا", "Sent automatically"))} · <span class="num">${time}</span></span></footer>
</div></body></html>`;
}

/** The two-line caption sent with the picture. */
export function digestCardCaption(data: DigestCardData) {
  const docs = data.documents;
  const c = urgencyCounts(docs.map((d) => d.daysLeft), data.today ?? new Date());
  return [
    `📋 *${L("الملخص اليومي", "Daily summary")}* · ${data.company}`,
    `🔴 ${c[0]}  ·  🟠 ${c[1]}  ·  🟡 ${c[2]}${c[3] ? `  ·  🔵 ${c[3]}` : ""}  ·  📌 ${data.tasks.length}`,
    `_${L(`${docs.length} وثيقة و${data.tasks.length} مهمة للمتابعة، والتفاصيل في الصورة.`, `${docs.length} documents and ${data.tasks.length} tasks to follow; the details are in the picture.`)}_`,
  ].join("\n");
}
