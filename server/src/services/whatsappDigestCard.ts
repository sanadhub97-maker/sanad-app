import { L, isEn } from "@/services/lang";
import { daysAr, type AlertContext, type TaskLine } from "@/services/whatsappTemplates";
import { CARD_FONTS_HREF } from "@/services/whatsappCards";

/* The morning summary as one designed picture: the company, the day, a count
   at each level, the documents most urgent first, and the open tasks. Three
   designs — black and gold (as the site), ivory paper, and emerald — each with
   drawn icons and real colours, which WhatsApp text cannot carry. */

export const DIGEST_CARD_IDS = ["royal", "ivory", "emerald"] as const;
export type DigestCardId = (typeof DIGEST_CARD_IDS)[number];
export type DigestCardSetting = DigestCardId | "none";
export const isDigestCardSetting = (v: unknown): v is DigestCardSetting => v === "none" || (DIGEST_CARD_IDS as readonly string[]).includes(String(v));

export const DIGEST_CARD_WIDTH = 1080;
const MAX_DOCS = 10;
const MAX_TASKS = 8;

export interface DigestCardData {
  company: string;
  logo: string | null;
  today?: Date;
  documents: (AlertContext & { sourceType?: string })[];
  tasks: TaskLine[];
}

const esc = (s: string | null | undefined) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const RIYADH = "Asia/Riyadh";

// Line icons (24×24, stroke), drawn in the design's colour.
const PATHS: Record<string, string> = {
  iqama: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M6 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h4M14 13h3"/>',
  passport: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6"/>',
  document: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  company: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M8 7h4M8 11h4M8 15h4M3 21h18"/>',
  car: '<path d="M5 17h14M6 17v2M18 17v2M4 13l2-5a2 2 0 0 1 1.9-1.4h8.2A2 2 0 0 1 18 8l2 5v4H4z"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>',
  task: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9"/>',
};
const icon = (name: string, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] ?? PATHS.document}</svg>`;
const docIcon = (sourceType?: string) =>
  sourceType === "EMPLOYEE_IQAMA" ? "iqama" : sourceType === "EMPLOYEE_PASSPORT" ? "passport" : sourceType === "VEHICLE" ? "car" : sourceType === "COMPANY_DOCUMENT" ? "company" : "document";

const tone = (days: number) => (days <= 0 ? "bad" : days <= 7 ? "warn" : "soon");
const statusText = (days: number) =>
  days < 0 ? L(`منتهية منذ ${daysAr(-days)}`, `Expired ${-days}d ago`) : days === 0 ? L("تنتهي اليوم", "Ends today") : L(`باقي ${daysAr(days)}`, `${days} days left`);
const dateStr = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: RIYADH, day: "2-digit", month: "2-digit", year: "numeric" });

function dayLine(today: Date) {
  const g = today.toLocaleDateString(isEn() ? "en-GB" : "ar-EG-u-nu-latn", { timeZone: RIYADH, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  let h = "";
  try {
    h = today.toLocaleDateString(isEn() ? "en-u-ca-islamic-umalqura" : "ar-SA-u-ca-islamic-umalqura-nu-latn", { timeZone: RIYADH, day: "numeric", month: "long", year: "numeric" });
  } catch {
    /* no Hijri calendar here */
  }
  return h ? `${g} · ${h}` : g;
}

/** The picture's height for this much content, so nothing is cut and nothing is left empty. */
export function digestCardHeight(data: DigestCardData) {
  const docs = Math.min(data.documents.length, MAX_DOCS) + (data.documents.length > MAX_DOCS ? 0.6 : 0);
  const tasks = Math.min(data.tasks.length, MAX_TASKS) + (data.tasks.length > MAX_TASKS ? 0.6 : 0);
  const docsBlock = data.documents.length ? 110 + docs * 118 : 190;
  const tasksBlock = data.tasks.length ? 110 + tasks * 104 : 0;
  return Math.round(Math.min(3600, 560 + docsBlock + tasksBlock + 120));
}

const PALETTES: Record<DigestCardId, string> = {
  royal: `--bg: radial-gradient(900px 600px at 85% -5%, rgba(201,164,100,.24), transparent 60%), radial-gradient(700px 520px at 0% 100%, rgba(120,90,40,.18), transparent 60%), #07070a;
    --ink: #f1e9d8; --mut: #a39883; --line: rgba(214,182,120,.22); --panel: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,0)), #101116;
    --gold: #c9a464; --title: linear-gradient(115deg, #8a6a35, #f3dfae 30%, #c9a464 50%, #fff3d6 65%, #a5803f 85%);
    --tile: radial-gradient(circle at 50% 30%, #3a3020, #121009); --tileInk: #f3dfae; --frame: inset 0 0 0 6px #101116, inset 0 0 0 7px rgba(214,182,120,.16);
    --bad: #ef8f86; --warn: #e9b860; --soon: #d8c27a; --ok: #7ccfa2; --pillBg: rgba(255,255,255,.04);`,
  ivory: `--bg: radial-gradient(800px 500px at 90% 0%, rgba(201,164,100,.22), transparent 60%), #f7f1e3;
    --ink: #13213d; --mut: #6f6656; --line: rgba(160,124,60,.32); --panel: #fffdf7;
    --gold: #a07a36; --title: linear-gradient(115deg, #13213d, #24406f 60%, #13213d);
    --tile: linear-gradient(160deg, #13213d, #24406f); --tileInk: #f3dfae; --frame: inset 0 0 0 6px #fffdf7, inset 0 0 0 7px rgba(160,124,60,.22);
    --bad: #b8433a; --warn: #b7741a; --soon: #8a6a1f; --ok: #2f7d57; --pillBg: rgba(19,33,61,.04);`,
  emerald: `--bg: radial-gradient(900px 600px at 85% -5%, rgba(214,182,120,.22), transparent 60%), linear-gradient(170deg, #041c17, #0a3a2f 60%, #052a22);
    --ink: #eef6ef; --mut: #9fc0b2; --line: rgba(214,182,120,.28); --panel: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02)), rgba(3,22,18,.55);
    --gold: #d8b675; --title: linear-gradient(115deg, #b38b45, #f6e3b0 35%, #d8b675 55%, #fff6dc 70%, #b38b45);
    --tile: radial-gradient(circle at 50% 30%, #1d5a49, #062a22); --tileInk: #f6e3b0; --frame: inset 0 0 0 6px rgba(3,22,18,.0), inset 0 0 0 7px rgba(214,182,120,.18);
    --bad: #ff9b8f; --warn: #f2c46b; --soon: #e3d08c; --ok: #8fe0b5; --pillBg: rgba(255,255,255,.06);`,
};

const CSS = `
* { box-sizing: border-box; margin: 0; }
html, body { width: ${DIGEST_CARD_WIDTH}px; }
body { font-family: "Zain", -apple-system, "Segoe UI", Tahoma, sans-serif; background: var(--bg); color: var(--ink); }
.page { padding: 64px 64px 56px; display: grid; gap: 34px; }
.head { display: flex; align-items: center; gap: 26px; }
.logo { width: 112px; height: 112px; flex: none; border-radius: 28px; background: #fff; display: grid; place-items: center; overflow: hidden; box-shadow: 0 0 0 2px var(--gold), 0 18px 40px -18px rgba(0,0,0,.6); }
.logo img { max-width: 86%; max-height: 86%; object-fit: contain; }
.logo b { font-size: 56px; font-weight: 900; color: var(--gold); }
.htx { flex: 1; min-width: 0; }
.eyebrow { font-size: 24px; letter-spacing: .12em; color: var(--gold); font-weight: 700; }
h1 { font-size: 76px; line-height: 1.12; font-weight: 900; background: var(--title); -webkit-background-clip: text; background-clip: text; color: transparent; }
.company { font-size: 30px; font-weight: 700; color: var(--ink); margin-top: 4px; }
.day { font-size: 24px; color: var(--mut); margin-top: 6px; }
.rule { height: 2px; background: linear-gradient(90deg, transparent, var(--gold), transparent); position: relative; }
.rule::after { content: ""; position: absolute; top: -7px; left: calc(50% - 8px); width: 16px; height: 16px; transform: rotate(45deg); background: var(--gold); }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.kpi { border-radius: 22px; padding: 22px 22px 20px; background: var(--panel); border: 1px solid var(--line); box-shadow: var(--frame); display: grid; gap: 6px; }
.kpi .t { display: flex; align-items: center; gap: 10px; white-space: nowrap; font-size: 22px; color: var(--mut); font-weight: 700; }
.kpi .t .ic { width: 30px; height: 30px; color: var(--c); }
.kpi b { font-size: 70px; line-height: 1; font-weight: 900; color: var(--c); }
.sec { display: grid; gap: 16px; }
.sh { display: flex; align-items: center; gap: 14px; font-size: 34px; font-weight: 900; color: var(--ink); }
.sh .ic { width: 38px; height: 38px; color: var(--gold); }
.sh small { margin-inline-start: auto; font-size: 24px; color: var(--mut); font-weight: 700; }
.row { display: flex; align-items: center; gap: 22px; min-height: 102px; padding: 18px 22px; border-radius: 22px; background: var(--panel); border: 1px solid var(--line); box-shadow: var(--frame); position: relative; overflow: hidden; }
.row::before { content: ""; position: absolute; inset-block: 18px; inset-inline-start: 0; width: 6px; border-radius: 6px; background: var(--c); }
.tile { width: 68px; height: 68px; flex: none; border-radius: 20px; background: var(--tile); color: var(--tileInk); display: grid; place-items: center; box-shadow: inset 0 0 0 1px rgba(214,182,120,.4); }
.tile .ic { width: 36px; height: 36px; }
.rtx { flex: 1; min-width: 0; }
.rtx b { display: block; font-size: 31px; font-weight: 800; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rtx span { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 23px; color: var(--mut); margin-top: 4px; }
.rtx span i { display: inline-flex; align-items: center; gap: 6px; font-style: normal; white-space: nowrap; }
.rtx span .ic { width: 22px; height: 22px; }
.num { direction: ltr; unicode-bidi: isolate; letter-spacing: .04em; }
.pill { flex: none; font-size: 24px; font-weight: 800; color: var(--c); background: var(--pillBg); border: 2px solid var(--c); border-radius: 999px; padding: 6px 20px; white-space: nowrap; }
.more { text-align: center; font-size: 24px; color: var(--mut); padding: 4px; }
.clear { display: flex; align-items: center; gap: 18px; padding: 30px; border-radius: 22px; background: var(--panel); border: 1px solid var(--line); font-size: 30px; font-weight: 800; color: var(--ok); }
.clear .ic { width: 44px; height: 44px; }
.foot { display: flex; justify-content: space-between; font-size: 22px; color: var(--mut); padding-top: 6px; border-top: 1px solid var(--line); }
.foot b { color: var(--gold); font-weight: 800; }
.bad { --c: var(--bad); } .warn { --c: var(--warn); } .soon { --c: var(--soon); } .ok { --c: var(--ok); } .gold { --c: var(--gold); }
`;

/** A whole page holding the picture, ready to be shot to PNG. */
export function digestCardDocument(id: DigestCardId, data: DigestCardData): string {
  const en = isEn();
  const today = data.today ?? new Date();
  const docs = data.documents;
  const expired = docs.filter((d) => d.daysLeft <= 0).length;
  const week = docs.filter((d) => d.daysLeft > 0 && d.daysLeft <= 7).length;
  const month = docs.length - expired - week;
  const kpi = (cls: string, ic: string, label: string, n: number) => `<div class="kpi ${cls}"><span class="t">${icon(ic)}${esc(label)}</span><b>${n}</b></div>`;

  const docRows = docs.slice(0, MAX_DOCS).map((d) => {
    const who = en ? d.employeeEn ?? d.employeeAr : d.employeeAr;
    const doc = en ? d.documentEn : d.documentAr;
    const branch = en ? d.branchEn ?? d.branch : d.branch;
    const meta = [
      d.number && `<i>${icon("document")}<span class="num">${esc(d.number)}</span></i>`,
      branch && branch !== doc && branch !== who && `<i>${icon("company")}${esc(branch)}</i>`,
      `<i>${icon("calendar")}<span class="num">${dateStr(d.expiryDate)}</span></i>`,
    ].filter(Boolean).join("");
    return `<div class="row ${tone(d.daysLeft)}"><span class="tile">${icon(docIcon(d.sourceType))}</span><div class="rtx"><b>${esc(doc)}${who ? ` — ${esc(who)}` : ""}</b><span>${meta}</span></div><span class="pill">${esc(statusText(d.daysLeft))}</span></div>`;
  });
  if (docs.length > MAX_DOCS) docRows.push(`<div class="more">${esc(L(`و${docs.length - MAX_DOCS} وثائق أخرى في الموقع`, `and ${docs.length - MAX_DOCS} more on the site`))}</div>`);

  const PRI = { URGENT: ["bad", L("عاجلة", "Urgent")], HIGH: ["warn", L("مهمة", "High")], NORMAL: ["gold", L("عادية", "Normal")] } as const;
  const taskRows = data.tasks.slice(0, MAX_TASKS).map((t) => {
    const [cls, label] = PRI[t.priority];
    const meta = [
      t.time && `<i>${icon("clock")}<span class="num">${esc(t.time)}</span></i>`,
      t.assignee && `<i>${icon("user")}${esc(t.assignee)}</i>`,
      `<i>${esc(label)}</i>`,
    ].filter(Boolean).join("");
    const pill = t.daysLate > 0 ? `<span class="pill bad">${esc(L(`متأخرة ${daysAr(t.daysLate)}`, `${t.daysLate}d late`))}</span>` : `<span class="pill ${cls}">${esc(L("اليوم", "Today"))}</span>`;
    return `<div class="row ${cls}"><span class="tile">${icon("task")}</span><div class="rtx"><b>${esc(t.title)}</b><span>${meta}</span></div>${pill}</div>`;
  });
  if (data.tasks.length > MAX_TASKS) taskRows.push(`<div class="more">${esc(L(`و${data.tasks.length - MAX_TASKS} مهام أخرى في صفحة المهام`, `and ${data.tasks.length - MAX_TASKS} more on the Tasks page`))}</div>`);

  const logo = data.logo ? `<img src="${data.logo}" alt="">` : `<b>${esc(data.company.trim().charAt(0) || "S")}</b>`;
  const time = today.toLocaleTimeString("en-GB", { timeZone: RIYADH, hour: "2-digit", minute: "2-digit" });
  return `<!doctype html><html lang="${en ? "en" : "ar"}" dir="${en ? "ltr" : "rtl"}"><head><meta charset="utf-8">
<link rel="stylesheet" href="${CARD_FONTS_HREF}">
<style>:root { ${PALETTES[id]} } ${CSS}</style></head><body><div class="page">
  <div class="head"><span class="logo">${logo}</span><div class="htx">
    <div class="eyebrow">${esc(L("تقرير الصباح", "Morning report"))}</div>
    <h1>${esc(L("الملخص اليومي", "Daily summary"))}</h1>
    <div class="company">${esc(data.company)}</div>
    <div class="day">${esc(dayLine(today))}</div>
  </div></div>
  <div class="rule"></div>
  <div class="kpis">${kpi("bad", "alert", L("منتهية", "Expired"), expired)}${kpi("warn", "hourglass", L("خلال أسبوع", "This week"), week)}${kpi("soon", "calendar", L("خلال شهر", "This month"), month)}${kpi("gold", "task", L("مهام مفتوحة", "Open tasks"), data.tasks.length)}</div>
  <div class="sec"><div class="sh">${icon("document")}${esc(L("الوثائق", "Documents"))}<small>${docs.length}</small></div>
    ${docRows.length ? docRows.join("") : `<div class="clear">${icon("task")}${esc(L("كل الوثائق سارية، ولا شيء قريب من الانتهاء.", "Every document is valid; nothing ends soon."))}</div>`}
  </div>
  ${data.tasks.length ? `<div class="sec"><div class="sh">${icon("task")}${esc(L("المهام المفتوحة", "Open tasks"))}<small>${data.tasks.length}</small></div>${taskRows.join("")}</div>` : ""}
  <div class="foot"><span><b>SanaD</b> · ${esc(L("إدارة الوثائق والتراخيص", "Documents & Licenses"))}</span><span class="num">${time}</span></div>
</div></body></html>`;
}
