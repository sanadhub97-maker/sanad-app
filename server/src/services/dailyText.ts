import { L, isEn } from "@/services/lang";
import { daysAr, type TaskLine } from "@/services/whatsappTemplates";
import type { DailyDoc } from "@/services/dailySummary";
import { dailyMessageParts } from "@/services/whatsappDigest";
import { URGENCY, urgency, urgencyCounts, urgencyLabel, type Urgency } from "@/services/urgency";
import type { DailyTextId } from "@/services/dailyTextIds";
export { DAILY_TEXT_IDS, isDailyTextId, type DailyTextId } from "@/services/dailyTextIds";

/* The morning summary as text, in the design chosen in Settings → WhatsApp.
   Each design lays out the same data its own way with WhatsApp's markup —
   *bold*, _italic_, `monospace`, "> " panels and "- " lists — and a shared set
   of ornaments (gold stars, rules, diamonds) so all of them read as one house.
   A design gives a heading, one text per document (in the documents' order,
   so the sender can track them), an all-clear line and a closing section. */

const RIYADH = "Asia/Riyadh";
const CROWN = "✦ ━━━━━━━ ❖ ━━━━━━━ ✦";
const THIN = "┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈";
const mono = (s: string) => `\`${s}\``;
const dateStr = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: RIYADH, day: "2-digit", month: "2-digit", year: "numeric" });
const daysEn = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
const KIND: Record<string, string> = { EMPLOYEE_IQAMA: "🪪", EMPLOYEE_PASSPORT: "🛂", EMPLOYEE_DOCUMENT: "📄", COMPANY_DOCUMENT: "🏢", VEHICLE: "🚗" };
const PRI = { URGENT: ["🔴", "عاجلة", "Urgent"], HIGH: ["🟠", "مهمة", "High"], NORMAL: ["⚪", "عادية", "Normal"] } as const;

function dayLine(today: Date) {
  const en = isEn();
  const g = today.toLocaleDateString(en ? "en-GB" : "ar-EG-u-nu-latn", { timeZone: RIYADH, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  try {
    const h = today.toLocaleDateString(en ? "en-u-ca-islamic-umalqura" : "ar-SA-u-ca-islamic-umalqura-nu-latn", { timeZone: RIYADH, day: "numeric", month: "long", year: "numeric" });
    return { g, h };
  } catch {
    return { g, h: "" };
  }
}
const names = ({ context: c }: DailyDoc) => {
  const en = isEn();
  return { doc: en ? c.documentEn : c.documentAr, who: en ? c.employeeEn ?? c.employeeAr : c.employeeAr, branch: en ? c.branchEn ?? c.branch : c.branch };
};
const state = (n: number) => (n < 0 ? L(`منتهية منذ ${daysAr(-n)}`, `expired ${daysEn(-n)} ago`) : n === 0 ? L("تنتهي اليوم", "ends today") : L(`باقي ${daysAr(n)}`, `${daysEn(n)} left`));
const moreTasks = (n: number) => `_${L(`و${n} ${n <= 10 ? "مهام" : "مهمة"} أخرى في صفحة المهام اليومية`, `and ${n} more on the Daily tasks page`)}_`;
const lateCount = (tasks: TaskLine[]) => tasks.filter((t) => t.daysLate > 0).length;
const footer = () => [CROWN, `🔱 *SanaD* · _${L("إدارة الوثائق والتراخيص", "Documents & Licenses")}_`].join("\n");
/** The count lines for the groups that have documents (expired is always shown), then the tasks. */
/** `short` is a one-word name: a line of only symbols and digits reads in the wrong order in a right-to-left chat. */
const SHORT = [L("منتهية", "expired"), L("الأسبوع", "week"), L("الشهر", "month"), L("القادم", "next")];
const countRows = (c: number[], tasks: TaskLine[], fmt: (dot: string, label: string, n: number, short: string) => string) => [
  ...([0, 1, 2, 3] as Urgency[]).filter((u) => u === 0 || u === 1 || u === 2 || c[u] > 0).map((u) => fmt(URGENCY[u].dot, urgencyLabel(u), c[u], SHORT[u])),
  fmt("📌", L("المهام المطلوب إنجازها", "Open tasks"), tasks.length, L("مهام", "tasks")),
];

export interface DailyText {
  header: string;
  /** One per document, in the documents' order (an empty one is not sent). */
  entries: string[];
  empty: string;
  tail: string;
}
type Render = (company: string, docs: DailyDoc[], tasks: TaskLine[], today: Date) => DailyText;

const DESIGNS: Record<DailyTextId, Render> = {
  // The royal report: a crowned letterhead, a panel of counts, then each document on three lines.
  report: (company, docs, tasks, today) => {
    const c = urgencyCounts(docs.map((d) => d.context.daysLeft), today);
    const { g, h } = dayLine(today);
    const SHOWN = 25;
    // Each task by its title (and its time when set): no lateness or assignee line.
    const taskRows = tasks.slice(0, SHOWN).map((t) => `${PRI[t.priority][0]} *${t.title}*${t.time ? `  ·  🕘 ${mono(t.time)}` : ""}`);
    return {
      header: [
        CROWN,
        `👑 *${L("الملخص اليومي", "Daily summary")}*`,
        `🏛️ *${company}*`,
        `🗓️ _${g}${h ? ` · ${h}` : ""}_`,
        CROWN,
        "",
        ...countRows(c, tasks, (dot, label, n) => `> ${dot} ${label} ┈┈ *${n}*`),
        "",
        `◈ *${L("الوثائق المطلوب متابعتها", "Documents to follow up")}* · ${docs.length}`,
      ].join("\n"),
      entries: docs.map((d) => {
        const { doc, who, branch } = names(d);
        const n = d.context.daysLeft;
        return [
          `${URGENCY[urgency(n, today)].dot} ${KIND[d.item.sourceType] ?? "📄"} *${doc}${who ? ` — ${who}` : ""}*`,
          `⏳ *${state(n)}*  ·  📅 ${L("الانتهاء", "expires")} ${mono(dateStr(d.context.expiryDate))}`,
          ...[[d.context.number && `🔢 ${L("الرقم", "No.")} ${mono(d.context.number)}`, branch && branch !== doc && branch !== who && `📍 ${branch}`].filter(Boolean).join("  ·  ")].filter(Boolean),
        ].join("\n");
      }),
      empty: `> ✅ _${L("كل الوثائق سارية، ولا شيء قريب من الانتهاء.", "Every document is valid; nothing ends soon.")}_`,
      tail: [
        ...(tasks.length ? [`◈ *${L("المهام المطلوب إنجازها", "Open tasks")}* · ${tasks.length}${lateCount(tasks) ? ` _(${L(`منها ${lateCount(tasks)} متأخرة`, `${lateCount(tasks)} late`)})_` : ""}`, "", taskRows.join("\n\n"), ...(tasks.length > SHOWN ? ["", moreTasks(tasks.length - SHOWN)] : []), ""] : []),
        footer(),
      ].join("\n"),
    };
  },

  // Grouped: a ruled heading for each urgency, the documents listed under it.
  grouped: (company, docs, tasks, today) => {
    const c = urgencyCounts(docs.map((d) => d.context.daysLeft), today);
    const { g } = dayLine(today);
    let shown = -1;
    const entries = docs.map((d) => {
      const u = urgency(d.context.daysLeft, today);
      const { doc, who } = names(d);
      const line = `- *${doc}*${who ? ` · ${who}` : ""}  ┈  _${state(d.context.daysLeft)}_`;
      if (u === shown) return line;
      shown = u;
      return `${URGENCY[u].dot} ━━ *${urgencyLabel(u, true)}* ━━ (${c[u]})\n${line}`;
    });
    const SHOWN = 20;
    return {
      header: [
        CROWN,
        `👑 *${L("الملخص اليومي", "Daily summary")}*  ·  _${company}_`,
        `🗓️ _${g}_`,
        CROWN,
        "",
        countRows(c, tasks, (dot, _l, n, s) => `${dot} *${n}* ${s}`).join("  ┃  "),
      ].join("\n"),
      entries,
      empty: `✅ _${L("مفيش وثائق منتهية أو قريبة من الانتهاء.", "No document has expired or ends soon.")}_`,
      tail: [
        ...(tasks.length
          ? [`📌 ━━ *${L("المهام المطلوب إنجازها", "Open tasks")}* ━━ (${tasks.length})`, ...tasks.slice(0, SHOWN).map((t) => `- ${PRI[t.priority][0]} ${t.title}`), ...(tasks.length > SHOWN ? [moreTasks(tasks.length - SHOWN)] : []), ""]
          : []),
        footer(),
      ].join("\n"),
    };
  },

  // Cards: every document in its own numbered panel.
  cards: (company, docs, tasks, today) => {
    const c = urgencyCounts(docs.map((d) => d.context.daysLeft), today);
    const { g } = dayLine(today);
    const entries = docs.map((d, i) => {
      const { doc, who, branch } = names(d);
      const n = d.context.daysLeft;
      return [
        `> ◆ *${String(i + 1).padStart(2, "0")}*  ┃  ${KIND[d.item.sourceType] ?? "📄"} *${doc}*`,
        ...(who ? [`> 👤 ${who}`] : []),
        ...(branch && branch !== doc && branch !== who ? [`> 📍 ${branch}`] : []),
        `> 📅 ${L("الانتهاء", "Expires")} ${mono(dateStr(d.context.expiryDate))}${d.context.number ? `  ·  🔢 ${L("الرقم", "No.")} ${mono(d.context.number)}` : ""}`,
        `> ${URGENCY[urgency(n, today)].dot} *${state(n)}*`,
      ].join("\n");
    });
    const SHOWN = 15;
    const taskCards = tasks.slice(0, SHOWN).map((t, i) => `> ◇ *${String(i + 1).padStart(2, "0")}*  ┃  ${PRI[t.priority][0]} *${t.title}*${t.time ? `  ·  🕘 ${mono(t.time)}` : ""}`);
    return {
      header: [CROWN, `🏛️ *${company}*`, `👑 _${L("ملخص الوثائق والمهام", "Documents and tasks")}_ · ${g}`, CROWN, "", ...countRows(c, tasks, (dot, label, n) => `> ${dot} *${n}*  ${label}`)].join("\n"),
      entries,
      empty: `> ✅ _${L("كل الوثائق سارية.", "Every document is valid.")}_`,
      tail: [...(tasks.length ? [`◈ *${L("المهام المطلوب إنجازها", "Open tasks")}* · ${tasks.length}`, "", taskCards.join("\n\n"), ...(tasks.length > SHOWN ? ["", moreTasks(tasks.length - SHOWN)] : []), ""] : []), footer()].join("\n"),
    };
  },

  // Brief: the counts and the five most urgent, readable straight from the notification.
  brief: (company, docs, tasks, today) => {
    const c = urgencyCounts(docs.map((d) => d.context.daysLeft), today);
    const TOP = 5;
    const entries = docs.map((d, i) => {
      if (i >= TOP) return "";
      const { doc, who } = names(d);
      return `${URGENCY[urgency(d.context.daysLeft, today)].dot} ${doc}${who ? ` · ${who}` : ""} — *${state(d.context.daysLeft)}*`;
    });
    const rest = docs.length - TOP;
    return {
      header: [`👑 *${company}*  ·  _${L("الملخص اليومي", "Daily summary")}_`, countRows(c, tasks, (dot, _l, n, s) => `${dot} *${n}* ${s}`).join("  ┃  "), THIN].join("\n"),
      entries,
      empty: `✅ _${L("كل الوثائق سارية.", "All documents valid.")}_`,
      tail: [
        THIN,
        ...(rest > 0 ? [`_${L(`و${rest} ${rest <= 10 ? "وثائق" : "وثيقة"} أخرى في الموقع`, `and ${rest} more on the site`)}_`] : []),
        ...(tasks.length ? [`📌 ${L(`${tasks.length} مهمة مطلوب إنجازها، منها ${lateCount(tasks)} متأخرة`, `${tasks.length} open tasks, ${lateCount(tasks)} late`)}`] : []),
        `🔱 _SanaD_`,
      ].join("\n"),
    };
  },

  // A formal letter: a letterhead and subject, a greeting, numbered lists, and a signed closing.
  letter: (company, docs, tasks, today) => {
    const c = urgencyCounts(docs.map((d) => d.context.daysLeft), today);
    const { g, h } = dayLine(today);
    const parts = ([0, 1, 2, 3] as Urgency[]).filter((u) => u < 3 || c[u] > 0).map((u) => L(`*${c[u]}* ${u === 0 ? "وثيقة منتهية" : `تنتهي ${URGENCY[u].ar}`}`, `*${c[u]}* ${URGENCY[u].en.toLowerCase()}`));
    const SHOWN = 20;
    return {
      header: [
        `🏛️ *${company}*`,
        `_${g}${h ? ` ${L("الموافق", "·")} ${h}` : ""}_`,
        CROWN,
        `*${L("الموضوع", "Subject")}:* ${L("ملخص الوثائق والمهام اليومي", "Daily documents and tasks summary")}`,
        "",
        L("السلام عليكم ورحمة الله وبركاته،", "Good morning,"),
        L("تحية طيبة وبعد،", ""),
        L(`نفيدكم بأن لدينا اليوم ${parts.join("، و")}، و*${tasks.length}* مهمة مطلوب إنجازها، وتفاصيلها كما يلي:`, `Today we have ${parts.join(", ")}, and *${tasks.length}* open tasks:`),
        "",
        `◈ *${L("أولًا: الوثائق المطلوب متابعتها", "First: documents to follow up")}*`,
      ]
        .filter((l, i, a) => l !== "" || a[i - 1] !== "")
        .join("\n"),
      entries: docs.map((d, i) => {
        const { doc, who } = names(d);
        const n = d.context.daysLeft;
        return `*${i + 1}.* ${doc}${who ? ` ${L("للموظف", "for")} ${who}` : ""}\n${URGENCY[urgency(n, today)].dot} ${state(n)} · ${L("تاريخ الانتهاء", "expiry")} ${mono(dateStr(d.context.expiryDate))}`;
      }),
      empty: L("لا توجد وثائق منتهية أو قريبة من الانتهاء.", "No document has expired or ends soon."),
      tail: [
        ...(tasks.length ? [`◈ *${L("ثانيًا: المهام المطلوب إنجازها", "Second: open tasks")}*`, ...tasks.slice(0, SHOWN).map((t, i) => `*${i + 1}.* ${t.title}`), ...(tasks.length > SHOWN ? [moreTasks(tasks.length - SHOWN)] : []), ""] : []),
        L("نأمل التكرم بالاطلاع واتخاذ اللازم،", "Kindly review and follow up."),
        L("وتقبلوا خالص التحية والتقدير،", "With our best regards,"),
        "",
        `*${L("نظام سند", "SanaD")}*`,
        `_${L("إدارة الوثائق والتراخيص", "Documents & Licenses")}_`,
      ].join("\n"),
    };
  },

  // Executive: one paragraph that says it all, then numbered actions under each urgency.
  executive: (company, docs, tasks, today) => {
    const c = urgencyCounts(docs.map((d) => d.context.daysLeft), today);
    const { g, h } = dayLine(today);
    const ACTION = [L("إجراء فوري", "Act now"), L("هذا الأسبوع", "This week"), L("قبل نهاية الشهر", "Before the month ends"), L("للتخطيط", "To plan")];
    const said = ([0, 1, 2, 3] as Urgency[]).filter((u) => c[u] > 0).map((u) => L(`*${c[u]}* ${u === 0 ? (c[u] <= 10 ? "وثائق منتهية تحتاج تجديدًا الآن" : "وثيقة منتهية تحتاج تجديدًا الآن") : URGENCY[u].longAr}`, `*${c[u]}* ${URGENCY[u].longEn.toLowerCase()}`));
    const late = lateCount(tasks);
    let shown = -1, k = 0;
    const entries = docs.map((d) => {
      const u = urgency(d.context.daysLeft, today);
      const { doc, who } = names(d);
      const line = `${++k}. *${doc}*${who ? ` — ${who}` : ""}\n${state(d.context.daysLeft)} · ${L("الانتهاء", "expires")} ${mono(dateStr(d.context.expiryDate))}`;
      if (u === shown) return line;
      shown = u;
      return `${URGENCY[u].dot} *${ACTION[u]}* · ${c[u]}\n\n${line}`;
    });
    const SHOWN = 20;
    return {
      header: [
        `🏛️ *${company}*`,
        `_${L("الملخص التنفيذي", "Executive summary")} · ${g}${h ? ` · ${h}` : ""}_`,
        THIN,
        "",
        `> 💡 *${L("الخلاصة", "In short")}:* ${said.length ? said.join(L("، و", ", ")) : L("كل الوثائق سارية", "every document is valid")}${tasks.length ? L(`، ولديك *${tasks.length}* من المهام المطلوب إنجازها${late ? `، منها *${late}* متأخرة` : ""}.`, `; and *${tasks.length}* open tasks${late ? `, *${late}* late` : ""}.`) : "."}`,
      ].join("\n"),
      entries,
      empty: `✅ _${L("لا يوجد ما يحتاج إجراءً في الوثائق اليوم.", "No document needs action today.")}_`,
      tail: [
        ...(tasks.length ? [`📌 *${L("المهام المطلوب إنجازها", "Open tasks")}* · ${tasks.length}`, "", tasks.slice(0, SHOWN).map((t, i) => `${i + 1}. ${PRI[t.priority][0]} *${t.title}*`).join("\n\n"), ...(tasks.length > SHOWN ? [moreTasks(tasks.length - SHOWN)] : []), ""] : []),
        THIN,
        `🔱 *SanaD* · _${L("إدارة الوثائق والتراخيص", "Documents & Licenses")}_`,
      ].join("\n"),
    };
  },

  // Dashboard: a bar for each group showing its share, then compact two-line documents.
  dashboard: (company, docs, tasks, today) => {
    const c = urgencyCounts(docs.map((d) => d.context.daysLeft), today);
    const { g } = dayLine(today);
    const bar = (n: number, of: number) => { const f = of ? Math.max(n ? 1 : 0, Math.round((n / of) * 8)) : 0; return "▰".repeat(f) + "▱".repeat(8 - f); };
    const late = lateCount(tasks);
    const entries = docs.map((d) => {
      const { doc, who, branch } = names(d);
      const n = d.context.daysLeft;
      return [`${URGENCY[urgency(n, today)].dot} *${doc}*${who ? ` · ${who}` : ""}`, `_${state(n)}_ · ${mono(dateStr(d.context.expiryDate))}${branch && branch !== doc && branch !== who ? ` · 📍 ${branch}` : ""}`].join("\n");
    });
    const SHOWN = 20;
    return {
      header: [
        `📊 *${L("لوحة اليوم", "Today's board")}* · ${company}`,
        `_${g}_`,
        "",
        ...([0, 1, 2, 3] as Urgency[]).filter((u) => u < 3 || c[u] > 0).map((u) => `> ${URGENCY[u].dot} ${bar(c[u], docs.length)}  *${c[u]}*  ${urgencyLabel(u)}`),
        `> 📌 ${bar(late, tasks.length)}  *${tasks.length}*  ${L(`المهام المطلوب إنجازها${late ? ` (${late} متأخرة)` : ""}`, `open tasks${late ? ` (${late} late)` : ""}`)}`,
        "",
        `*${L("الوثائق", "Documents")}* · ${docs.length}`,
      ].join("\n"),
      entries,
      empty: `> ✅ _${L("كل الوثائق سارية.", "Every document is valid.")}_`,
      tail: [
        ...(tasks.length ? [`*${L("المهام المطلوب إنجازها", "Open tasks")}* · ${tasks.length}`, "", tasks.slice(0, SHOWN).map((t) => `${PRI[t.priority][0]} *${t.title}*`).join("\n\n"), ...(tasks.length > SHOWN ? [moreTasks(tasks.length - SHOWN)] : []), ""] : []),
        footer(),
      ].join("\n"),
    };
  },

  // Timeline: the documents in date order under the month they end in, like a calendar.
  timeline: (company, docs, tasks, today) => {
    const c = urgencyCounts(docs.map((d) => d.context.daysLeft), today);
    const { g } = dayLine(today);
    const en = isEn();
    const month = (d: Date) => d.toLocaleDateString(en ? "en-GB" : "ar-EG-u-nu-latn", { timeZone: RIYADH, month: "long", year: "numeric" });
    const day = (d: Date) => d.toLocaleDateString(en ? "en-GB" : "ar-EG-u-nu-latn", { timeZone: RIYADH, day: "numeric", month: "long" });
    let shown = "";
    const entries = docs.map((d) => {
      const n = d.context.daysLeft;
      const sec = n <= 0 ? L("⏮️ انتهت سابقًا", "⏮️ Already ended") : `🗓️ ${month(d.context.expiryDate)}`;
      const { doc, who } = names(d);
      const line = `┃ ${URGENCY[urgency(n, today)].dot} *${n <= 0 ? dateStr(d.context.expiryDate) : day(d.context.expiryDate)}* — ${doc}${who ? ` · ${who}` : ""}\n┃ _${state(n)}_`;
      if (sec === shown) return line;
      shown = sec;
      return `━━ *${sec}* ━━\n${line}`;
    });
    const SHOWN = 20;
    return {
      header: [
        CROWN,
        `⏳ *${L("الجدول الزمني للوثائق", "Documents timeline")}*`,
        `🏛️ ${company} · _${g}_`,
        CROWN,
        "",
        countRows(c, tasks, (dot, _l, n, s) => `${dot} *${n}* ${s}`).join("  ┃  "),
      ].join("\n"),
      entries,
      empty: `✅ _${L("لا توجد وثائق على الجدول.", "Nothing on the timeline.")}_`,
      tail: [
        ...(tasks.length ? [`━━ *📌 ${L("المهام المطلوب إنجازها", "Open tasks")}* · ${tasks.length} ━━`, tasks.slice(0, SHOWN).map((t) => `┃ ${PRI[t.priority][0]} *${t.title}*`).join("\n\n"), ...(tasks.length > SHOWN ? [moreTasks(tasks.length - SHOWN)] : []), ""] : []),
        footer(),
      ].join("\n"),
    };
  },
};

export function renderDailyText(id: DailyTextId, company: string, docs: DailyDoc[], tasks: TaskLine[], today = new Date()): DailyText {
  return DESIGNS[id](company, docs, tasks, today);
}

/** The messages a design sends today, in order (empty entries left out). */
export function dailyTextMessages(id: DailyTextId, company: string, docs: DailyDoc[], tasks: TaskLine[], today = new Date()) {
  const t = renderDailyText(id, company, docs, tasks, today);
  return dailyMessageParts(t.entries.filter(Boolean), t.header, t.empty, t.tail);
}
