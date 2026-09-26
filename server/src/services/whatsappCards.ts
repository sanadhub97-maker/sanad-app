import { CARD_CSS } from "@/services/whatsappCards.css";
import { daysAr, type AlertContext } from "@/services/whatsappTemplates";

// The picture sent with a WhatsApp expiry alert, in the design chosen in
// Settings → WhatsApp. Each design is plain HTML/CSS: the server shoots it
// to a 1080×1350 PNG with the PDF browser, and Settings shows the same markup
// live. Designs and CSS are the ones approved in the design preview.

export const WHATSAPP_CARD_IDS = [
  "pass",
  "ios",
  "bento",
  "health",
  "lock",
  "letter",
  "titanium",
  "whitecard",
  "ultra",
  "vision",
  "pearl",
] as const;
export type WhatsappCardId = (typeof WHATSAPP_CARD_IDS)[number];
/** "none" sends the text message alone. */
export type WhatsappCardSetting = WhatsappCardId | "none";

export function isWhatsappCardSetting(value: unknown): value is WhatsappCardSetting {
  return value === "none" || (typeof value === "string" && (WHATSAPP_CARD_IDS as readonly string[]).includes(value));
}

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
export const CARD_FONTS_HREF = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap";

/** Company logo (trimmed) and, when it has one, its symbol on its own. */
export interface CardAssets {
  logo: string | null;
  mark: string | null;
}

// ---------- Context ----------

type Sev = { days: number; c: string; a: string; b: string; text: string; soft: string; label: string; emoji: string };

function severity(daysLeft: number): Omit<Sev, "days"> {
  if (daysLeft <= 0) return { c: "#ff3b30", a: "#ff6b61", b: "#d9261c", text: "#d70015", soft: "#ffe5e3", label: "حرجة", emoji: "🔴" };
  if (daysLeft <= 7) return { c: "#ff9500", a: "#ffb340", b: "#e57c00", text: "#c93400", soft: "#fff0db", label: "عاجلة", emoji: "🟠" };
  if (daysLeft <= 30) return { c: "#ffcc00", a: "#ffd60a", b: "#e0a800", text: "#a05a00", soft: "#fff6d1", label: "تنبيه مبكر", emoji: "🟡" };
  return { c: "#34c759", a: "#4cd964", b: "#1c9e45", text: "#248a3d", soft: "#e3f9e7", label: "للعلم", emoji: "🟢" };
}

const RIYADH = "Asia/Riyadh";
const dmy = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: RIYADH, day: "2-digit", month: "2-digit", year: "numeric" });
const weekday = (d: Date) => d.toLocaleDateString("ar-EG", { timeZone: RIYADH, weekday: "long" });
const longDate = (d: Date) =>
  `${d.toLocaleDateString("en-GB", { timeZone: RIYADH, day: "numeric" })} ${d.toLocaleDateString("ar-EG", { timeZone: RIYADH, month: "long" })} ${d.toLocaleDateString("en-GB", { timeZone: RIYADH, year: "numeric" })}`;
const clock = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: RIYADH, hour: "2-digit", minute: "2-digit" });
const unitAr = (n: number) => (n === 1 ? "يوم" : n <= 10 ? "أيام" : "يومًا");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface CardCtx {
  company: string;
  companyEn: string;
  /** Who or what the alert is about: the employee, or for company documents the document itself. */
  nameAr: string;
  nameEn: string;
  whoLabel: string;
  doc: string;
  docLabel: string;
  number: string;
  branch: string;
  s: Sev;
  expired: boolean;
  expStr: string;
  expLong: string;
  expDay: string;
  status: string;
  headline: string;
  filled: number;
  frac: number;
  today: Date;
  LOGO: string;
  MARK: string;
}

function cardCtx(a: AlertContext, companyEn: string | null | undefined, assets: CardAssets): CardCtx {
  const days = a.daysLeft;
  const expired = days <= 0;
  const employee = a.employeeAr;
  const nameAr = employee ?? a.documentAr;
  const doc = employee ? a.documentAr : "وثيقة المنشأة";
  const status = days < 0 ? `منتهية منذ ${daysAr(-days)}` : days === 0 ? "تنتهي اليوم" : `باقي ${daysAr(days)}`;
  const subject = employee ? `${a.documentAr} للموظف ${employee}` : a.documentAr;
  // An empty 1×1 image keeps the layout when the company has no logo yet.
  const blank = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  return {
    company: esc(a.company),
    companyEn: esc(companyEn ?? ""),
    nameAr: esc(nameAr),
    nameEn: esc(employee ? a.employeeEn ?? "" : a.documentEn),
    whoLabel: employee ? "الموظف" : "الوثيقة",
    doc: esc(doc),
    docLabel: employee ? "الوثيقة" : "النوع",
    number: esc(a.number ?? "—"),
    branch: esc(a.branch ?? "—"),
    s: { days, ...severity(days) },
    expired,
    expStr: dmy(a.expiryDate),
    expLong: longDate(a.expiryDate),
    expDay: weekday(a.expiryDate),
    status,
    headline: esc(expired ? `${subject} ${days < 0 ? `انتهت منذ ${daysAr(-days)}` : "تنتهي اليوم"}` : `${subject} تنتهي خلال ${daysAr(days)}`),
    filled: expired ? 10 : Math.min(10, Math.max(1, Math.round(10 * (1 - days / 30)))),
    frac: expired ? 1 : Math.max(0.04, 1 - days / 30),
    today: new Date(),
    LOGO: assets.logo ?? assets.mark ?? blank,
    MARK: assets.mark ?? assets.logo ?? blank,
  };
}

// ---------- Pieces ----------

const P: Record<string, string> = {
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  doc: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 13H8M16 17H8M16 13h-2"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  building:
    '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  torch: '<path d="M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V2h12z"/><path d="M6 6h12M12 12v.01"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
};
const glyph = (n: string, sw = 2.1) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
const tile = (tone: string, n: string) => `<span class="tile t-${tone}">${glyph(n)}</span>`;
const sevIcon = (c: CardCtx) => (c.expired ? "alert" : "clock");
const sevVars = (c: CardCtx) => `--sev:${c.s.c};--sev-a:${c.s.a};--sev-b:${c.s.b};--sev-text:${c.s.text};--sev-soft:${c.s.soft}`;
const ring = (c: CardCtx, stroke: number, track: string) => {
  const r = 50 - stroke / 2 - 1;
  const C = 2 * Math.PI * r;
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true"><circle cx="50" cy="50" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${c.s.c}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${(C * c.frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"/></svg>`;
};
// Watch-style dial: one tick per half day of the last 30; days still left glow in the status colour.
const dial = (c: CardCtx) => {
  let t = "";
  const lit = c.expired ? 30 : Math.max(0, Math.min(30, c.s.days));
  for (let i = 0; i < 60; i++) {
    const a = ((i * 6 - 90) * Math.PI) / 180;
    const major = i % 5 === 0;
    const r1 = 95;
    const r2 = major ? 84 : 89;
    const on = c.expired || i / 2 < lit;
    t += `<line x1="${(100 + r1 * Math.cos(a)).toFixed(2)}" y1="${(100 + r1 * Math.sin(a)).toFixed(2)}" x2="${(100 + r2 * Math.cos(a)).toFixed(2)}" y2="${(100 + r2 * Math.sin(a)).toFixed(2)}" stroke="${on ? c.s.c : "rgba(255,255,255,.22)"}" stroke-width="${major ? 2.2 : 1.2}" stroke-linecap="round" opacity="${c.expired ? 0.85 : 1}"/>`;
  }
  return `<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="99" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1"/>${t}</svg>`;
};
const small34 = (svg: string) => svg.replace("<svg", '<svg width="3.4cqw" height="3.4cqw"');

// ---------- Designs ----------

const CARDS: Record<WhatsappCardId, (c: CardCtx) => string> = {
  pass: (c) => `<div class="card c-pass" style="${sevVars(c)}">
    <img class="wm" src="${c.MARK}" alt="">
    <div class="top">
      <div class="plate"><img src="${c.LOGO}" alt=""></div>
      <div class="kind"><small>إشعار وثيقة</small><b>${c.expired ? "منتهية الصلاحية" : "قرب الانتهاء"}</b></div>
    </div>
    <div class="primary"><p class="lbl">${c.whoLabel}</p><p class="v">${c.nameAr}</p><p class="en ltr">${c.nameEn}</p></div>
    <div class="fields">
      <div><p class="lbl">${c.docLabel}</p><p class="v">${c.doc}</p></div>
      <div><p class="lbl">الرقم</p><p class="v ltr" style="text-align:right">${c.number}</p></div>
      <div><p class="lbl">تاريخ الانتهاء</p><p class="v">${c.expStr}</p></div>
    </div>
    <div class="perf"></div>
    <div class="status">${tile("sev", sevIcon(c)).replace('class="tile', 'style="--s:11cqw" class="tile')}
      <div class="tx"><b>${c.status}</b><small>${c.expDay} ${c.expLong}</small></div>
      <div class="ring">${ring(c, 14, "#f2f2f7")}</div>
    </div>
    <p class="foot">SanaD · نظام إدارة الوثائق والتراخيص</p>
  </div>`,

  ios: (c) => `<div class="card c-ios" style="${sevVars(c)}">
    <div class="top"><img src="${c.LOGO}" alt=""><small>${weekday(c.today)} ${longDate(c.today)}</small></div>
    <h4>تنبيه انتهاء وثيقة</h4>
    <div class="hero">
      <div class="ring">${ring(c, 12, c.s.soft)}<div>${c.expired ? `<b class="word" style="color:${c.s.text}">منتهية</b>` : `<b>${c.s.days}</b><small>${unitAr(c.s.days)}</small>`}</div></div>
      <div><p class="sev">${small34(glyph(sevIcon(c), 2.4))} ${c.s.label}</p><p class="big">${c.status}</p><p class="sub">${c.expDay} ${c.expLong}</p></div>
    </div>
    <div class="list">
      <div class="row">${tile("blue", "user")}<div class="in"><span>${c.whoLabel}</span><b>${c.nameAr}</b></div></div>
      <div class="row">${tile("green", "doc")}<div class="in"><span>${c.docLabel}</span><b>${c.doc}</b></div></div>
      <div class="row">${tile("indigo", "hash")}<div class="in"><span>الرقم</span><b class="ltr">${c.number}</b></div></div>
      <div class="row">${tile("teal", "building")}<div class="in"><span>الفرع</span><b>${c.branch}</b></div></div>
    </div>
    <p class="foot">أُرسلت تلقائيًا من نظام SanaD</p>
  </div>`,

  bento: (c) => `<div class="card c-bento" style="${sevVars(c)}">
    <div class="top"><span class="plate"><img src="${c.MARK}" alt=""></span><div><b>${c.company}</b><small>تنبيه انتهاء وثيقة</small></div></div>
    <div class="box hero">
      <div class="num">${c.expired ? `<b class="word">منتهية</b>` : `<b>${c.s.days}</b><span>${unitAr(c.s.days)}</span>`}</div>
      <div class="side">${tile("sev", sevIcon(c))}<p>${c.expired ? (c.s.days < 0 ? `منذ ${daysAr(-c.s.days)}` : "اليوم") : `حتى انتهاء ${c.doc}`}</p><small>${c.expDay} ${c.expStr}</small></div>
    </div>
    <div class="segs">${Array.from({ length: 10 }, (_, i) => `<i class="${i < c.filled ? "on" : ""}"></i>`).join("")}</div>
    <div class="box cell">${tile("blue", "user")}<small>${c.whoLabel}</small><b>${c.nameAr}</b></div>
    <div class="box cell">${tile("green", "doc")}<small>${c.docLabel}</small><b>${c.doc}</b></div>
    <div class="box cell">${tile("indigo", "hash")}<small>الرقم</small><b class="ltr" style="text-align:right">${c.number}</b></div>
    <div class="box cell">${tile("teal", "building")}<small>الفرع</small><b>${c.branch}</b></div>
    <p class="foot">SanaD · إدارة الوثائق والتراخيص</p>
  </div>`,

  health: (c) => `<div class="card c-health" style="${sevVars(c)}">
    <div class="cat">${tile("sev", "bell")}<b>تنبيهات الوثائق · ${c.s.label}</b><small>اليوم</small></div>
    <h4>${c.headline}</h4>
    <div class="metric">${c.expired ? `<b class="word">منتهية</b>` : `<b>${c.s.days}</b><span>${unitAr(c.s.days)} متبقية</span>`}</div>
    <div class="track"><i style="width:${Math.round(c.frac * 100)}%"></i></div>
    <div class="scale"><span>30 يومًا</span><span>15</span><span>تاريخ الانتهاء</span></div>
    <div class="rows">
      <div class="r">${tile("indigo", "hash")}<span>رقم الوثيقة</span><b class="ltr">${c.number}</b></div>
      <div class="r">${tile("sev", "cal")}<span>تاريخ الانتهاء</span><b>${c.expDay} ${c.expStr}</b></div>
      <div class="r">${tile("teal", "building")}<span>الفرع</span><b>${c.branch}</b></div>
    </div>
    <div class="foot"><img src="${c.LOGO}" alt=""><small>أُرسلت تلقائيًا من نظام SanaD</small></div>
  </div>`,

  lock: (c) => `<div class="card c-lock" style="${sevVars(c)}">
    <img class="wm" src="${c.MARK}" alt="">
    <span class="lock">${glyph("lock", 2.2)}</span>
    <p class="date">${weekday(c.today)} ${longDate(c.today)}</p>
    <p class="time ltr">${clock(c.today)}</p>
    <div class="stack"><div class="note">
      <div class="hd"><span class="app"><img src="${c.MARK}" alt=""></span><span>SANAD · ${c.company}</span><small>الآن</small></div>
      <h4>${c.s.emoji} ${c.expired ? `${c.doc} ${c.s.days < 0 ? `منتهية منذ ${daysAr(-c.s.days)}` : "تنتهي اليوم"}` : `${c.doc} تنتهي خلال ${daysAr(c.s.days)}`}</h4>
      <p>${c.nameAr} · رقم <span class="ltr">${c.number}</span><br>تاريخ الانتهاء ${c.expDay} ${c.expStr}</p>
    </div></div>
    <div class="qa"><span>${glyph("torch", 2)}</span><span>${glyph("camera", 2)}</span></div>
  </div>`,

  letter: (c) => `<div class="card c-letter" style="${sevVars(c)}">
    <div class="head"><img src="${c.LOGO}" alt=""><p class="en ltr" style="text-align:center">${c.companyEn}</p></div>
    <div class="rule"></div>
    <h4>إشعار ${c.expired ? "انتهاء" : "قرب انتهاء"} صلاحية وثيقة</h4>
    <span class="chip">${small34(glyph(sevIcon(c), 2.4))} ${c.status}</span>
    <div class="tbl">
      <div class="tr">${tile("blue", "user")}<span>${c.whoLabel}</span><b>${c.nameAr}</b></div>
      <div class="tr">${tile("green", "doc")}<span>${c.docLabel}</span><b>${c.doc}</b></div>
      <div class="tr">${tile("indigo", "hash")}<span>الرقم</span><b class="ltr">${c.number}</b></div>
      <div class="tr">${tile("sev", "cal")}<span>تاريخ الانتهاء</span><b>${c.expDay} ${c.expStr}</b></div>
      <div class="tr">${tile("teal", "building")}<span>الفرع</span><b>${c.branch}</b></div>
    </div>
    <div class="band"><span>SanaD · إدارة الوثائق والتراخيص</span><span class="ltr">${dmy(c.today)}</span></div>
  </div>`,

  titanium: (c) => `<div class="card c-ti" style="${sevVars(c)}">
    <div class="top"><img src="${c.MARK}" alt=""><span class="ltr">SANAD</span></div>
    <p class="kick">إشعار ${c.expired ? "انتهاء" : "قرب انتهاء"} ${c.doc}</p>
    <h4 class="silver-txt">${c.status}</h4>
    <span class="led"><i></i>${c.s.label}</span>
    <div class="rule"></div>
    <div class="grid2">
      <div><small>${c.whoLabel}</small><b>${c.nameAr}</b></div>
      <div><small>${c.docLabel}</small><b>${c.doc}</b></div>
      <div><small>الرقم</small><b class="ltr" style="display:block;text-align:right">${c.number}</b></div>
      <div><small>تاريخ الانتهاء</small><b>${c.expStr}</b></div>
    </div>
    <div class="foot"><span>${c.company}</span><span class="ltr">${dmy(c.today)}</span></div>
  </div>`,

  whitecard: (c) => `<div class="card c-card" style="${sevVars(c)}">
    <div class="top"><img src="${c.LOGO}" alt=""><img class="mk" src="${c.MARK}" alt=""></div>
    <div class="mid">
      <small>${c.expired ? (c.s.days < 0 ? `${c.doc} منتهية منذ` : `${c.doc} تنتهي`) : `متبقٍ على انتهاء ${c.doc}`}</small>
      <div class="num">${c.expired ? `<b class="word">${c.s.days < 0 ? daysAr(-c.s.days) : "اليوم"}</b>` : `<b>${c.s.days}</b><span>${unitAr(c.s.days)}</span>`}</div>
      <span class="pill"><i></i>${c.s.label} · ${c.expDay} ${c.expLong}</span>
    </div>
    <p class="holder">${c.nameAr}</p>
    <div class="meta2"><span>${c.doc}</span><span class="ltr">${c.number}</span><span>${c.branch}</span></div>
  </div>`,

  ultra: (c) => `<div class="card c-dial" style="${sevVars(c)}">
    <div class="top"><img class="etched" src="${c.MARK}" alt=""><span>${weekday(c.today)} ${longDate(c.today)}</span></div>
    <div class="dial">${dial(c)}
      <div class="ctr"><small>${c.s.label}</small>${c.expired ? `<b class="word">منتهية</b><span>${c.s.days < 0 ? `منذ ${daysAr(-c.s.days)}` : "اليوم"}</span>` : `<b>${c.s.days}</b><span>${unitAr(c.s.days)} متبقية</span>`}</div>
    </div>
    <div class="who"><b>${c.nameAr}</b><span>${c.doc} · <span class="ltr">${c.number}</span></span></div>
    <div class="comps">
      <div>${tile("sev", "cal")}${c.expStr}</div>
      <div>${tile("teal", "building")}${c.branch.split(" ").slice(0, 3).join(" ")}</div>
    </div>
  </div>`,

  vision: (c) => `<div class="card c-vision" style="${sevVars(c)}">
    <div class="win">
      <div class="hd"><span class="orn"><img src="${c.MARK}" alt=""></span><div><b>${c.company}</b><small>تنبيه انتهاء وثيقة · SanaD</small></div></div>
      <div class="status"><div><small>${c.s.label}</small><b>${c.status}</b><small>${c.expDay} ${c.expLong}</small></div><div class="ring">${ring(c, 13, "rgba(255,255,255,.18)")}</div></div>
      <div class="pills">
        <div>${tile("blue", "user")}<span>${c.whoLabel}</span><b>${c.nameAr}</b></div>
        <div>${tile("green", "doc")}<span>${c.docLabel}</span><b>${c.doc}</b></div>
        <div>${tile("indigo", "hash")}<span>الرقم</span><b class="ltr">${c.number}</b></div>
      </div>
    </div>
    <span class="bar"></span>
  </div>`,

  pearl: (c) => `<div class="card c-pearl" style="${sevVars(c)}">
    <div class="sheet">
      <div class="top"><img src="${c.LOGO}" alt=""><small>${weekday(c.today)} ${longDate(c.today)}</small></div>
      <h4>تنبيه انتهاء وثيقة</h4>
      <p class="big">${c.status}</p>
      <p class="nm">${c.nameAr}</p>
      <div class="rows">
        <div class="r">${tile("green", "doc")}<span>${c.docLabel}</span><b>${c.doc}</b></div>
        <div class="r">${tile("indigo", "hash")}<span>الرقم</span><b class="ltr">${c.number}</b></div>
        <div class="r">${tile("sev", "cal")}<span>تاريخ الانتهاء</span><b>${c.expDay} ${c.expStr}</b></div>
        <div class="r">${tile("teal", "building")}<span>الفرع</span><b>${c.branch}</b></div>
      </div>
      <p class="foot">أُرسلت تلقائيًا من نظام SanaD</p>
    </div>
  </div>`,
};

/** The card's markup — for the live preview, inside `.cardbox`. */
export function cardMarkup(id: WhatsappCardId, alert: AlertContext, companyEn: string | null | undefined, assets: CardAssets): string {
  return CARDS[id](cardCtx(alert, companyEn, assets));
}

/** Shared stylesheet for the preview (the markup above goes inside a `.cardbox`). */
export const CARD_PREVIEW_CSS = `:host { --font: "IBM Plex Sans Arabic", -apple-system, "Segoe UI", Tahoma, sans-serif; display: block; }
${CARD_CSS}`;

/** A whole page holding one card at WhatsApp size, ready to be shot to PNG. */
export function cardDocument(id: WhatsappCardId, alert: AlertContext, companyEn: string | null | undefined, assets: CardAssets): string {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<link rel="stylesheet" href="${CARD_FONTS_HREF}">
<style>
:root { --font: "IBM Plex Sans Arabic", -apple-system, "Segoe UI", Tahoma, sans-serif; }
html, body { margin: 0; background: #fff; }
.cardbox { width: ${CARD_WIDTH}px; }
${CARD_CSS}
.card { border-radius: 0; }
</style></head><body><div class="cardbox">${cardMarkup(id, alert, companyEn, assets)}</div></body></html>`;
}
