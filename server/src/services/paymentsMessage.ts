import { prisma } from "@/lib/prisma";
import { L, isEn } from "@/services/lang";
import { paymentCategoryLabel, paymentMethodLabel } from "@/constants/paymentCategories";
import { CSS, FONTS, PALETTES, esc, icon, type DigestCardId } from "@/services/whatsappDigestCard";

/* The evening WhatsApp message (the day's payments) in its two forms, as the
   morning one: a designed picture in the four designs of the morning summary,
   or a text in six designs. Both are built from the same lines. */

import type { PaymentTextId } from "@/services/paymentTextIds";
export { PAYMENT_TEXT_IDS, isPaymentTextId, type PaymentTextId } from "@/services/paymentTextIds";

/** One payment as the message shows it. */
export interface PaymentLine {
  id: string;
  category: string;
  label: string;
  amount: number;
  /** The employee, when the payment is for one. */
  who: string | null;
  /** The establishment: the payment's own, or the employee's. */
  est: string | null;
  /** The transfer party (supplierName), when it is not the establishment itself. */
  supplier: string | null;
  /** Every employee (health certificates) or establishment (wage protection) the payment is for, when more than one. */
  people: string[];
  /** Whether those are employees or establishments. */
  peopleKind: "employees" | "establishments";
  method: string;
  number: string | null;
  description: string | null;
}

type PaymentRow = {
  id: string; category: string; type: string | null; total: unknown; method: string | null; paymentNumber: string | null; description: string | null; supplierName: string | null;
  employee: { fullNameAr: string; fullNameEn: string | null; branch?: { name: string; nameEn: string | null } | null } | null; branch: { name: string; nameEn: string | null } | null;
  employeeIds?: string[]; branchIds?: string[];
};
type Named = { ar: string; en: string | null };

/** The names of every employee and establishment a payment is for (a health certificate for several employees, wage protection for several establishments). */
export async function paymentParties(rows: PaymentRow[]) {
  const empIds = [...new Set(rows.flatMap((r) => (r.employeeIds?.length ?? 0) > 1 ? r.employeeIds! : []))];
  const brIds = [...new Set(rows.flatMap((r) => (r.branchIds?.length ?? 0) > 1 ? r.branchIds! : []))];
  const [emps, brs] = await Promise.all([
    empIds.length ? prisma.employee.findMany({ where: { id: { in: empIds } }, select: { id: true, fullNameAr: true, fullNameEn: true } }) : [],
    brIds.length ? prisma.branch.findMany({ where: { id: { in: brIds } }, select: { id: true, name: true, nameEn: true } }) : [],
  ]);
  const names = new Map<string, Named>([...emps.map((e) => [e.id, { ar: e.fullNameAr, en: e.fullNameEn }] as const), ...brs.map((b) => [b.id, { ar: b.name, en: b.nameEn }] as const)]);
  return names;
}

/** The payment rows (as read for the message) made into lines, in the current language. */
export function paymentLines(rows: PaymentRow[], parties: Map<string, Named> = new Map()): PaymentLine[] {
  const en = isEn();
  const name = (n: Named) => (en ? n.en || n.ar : n.ar).trim();
  return rows.map((p) => {
    const b = p.branch ?? p.employee?.branch ?? null;
    const est = b ? (en ? b.nameEn || b.name : b.name).trim() : null;
    const emp = p.employee ? (en ? p.employee.fullNameEn || p.employee.fullNameAr : p.employee.fullNameAr).trim() : null;
    const supplier = p.supplierName?.trim() || null;
    const ids = (p.employeeIds?.length ?? 0) > 1 ? p.employeeIds! : (p.branchIds?.length ?? 0) > 1 ? p.branchIds! : [];
    const people = ids.map((id) => parties.get(id)).filter((n): n is Named => !!n).map(name);
    const many = people.length > 1;
    const kind = (p.employeeIds?.length ?? 0) > 1 ? "employees" : "establishments";
    // the employee (several: their names below); the establishment and the transfer party always under their own marks
    const who = many ? null : emp;
    return {
      id: p.id,
      category: p.category,
      label: paymentCategoryLabel(p.category, p.type),
      amount: Number(p.total) || 0,
      who,
      people: many ? people : [],
      peopleKind: kind,
      // several establishments are listed together, so the first is not repeated on its own
      est: many && kind === "establishments" ? null : est,
      supplier: supplier && supplier !== est ? supplier : null,
      method: paymentMethodLabel(p.method),
      number: p.paymentNumber,
      description: p.description ? p.description.slice(0, 200) : null,
    };
  });
}

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sar = () => L("ر.س", "SAR");
const countAr = (n: number) => (n === 1 ? "دفعة واحدة" : n === 2 ? "دفعتان" : n <= 10 ? `${n} دفعات` : `${n} دفعة`);
const count = (n: number) => L(countAr(n), `${n} payment${n === 1 ? "" : "s"}`);
const MAX_TEXT = 3500;

/** The payments grouped by category, largest total first. */
function byCategory(lines: PaymentLine[]) {
  const map = new Map<string, { label: string; total: number; lines: PaymentLine[] }>();
  for (const l of lines) {
    const g = map.get(l.category) ?? { label: paymentCategoryLabel(l.category), total: 0, lines: [] };
    g.total += l.amount;
    g.lines.push(l);
    map.set(l.category, g);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Splits blocks into WhatsApp messages, each block kept whole; the header starts every message, the footer ends the last. */
function messages(header: string, blocks: string[], footer: string) {
  const out: string[] = [];
  let cur = header;
  for (const b of blocks) {
    if (cur.length + b.length + 2 > MAX_TEXT && cur !== header) {
      out.push(cur);
      cur = header;
    }
    cur += `\n\n${b}`;
  }
  out.push(`${cur}\n\n${footer}`);
  return out;
}

const bar = (share: number) => {
  const full = Math.max(share > 0 ? 1 : 0, Math.round(share * 10));
  return "▰".repeat(full) + "▱".repeat(10 - full);
};

/** The evening message as text, in one of the six designs. */
export function paymentsTextMessages(id: PaymentTextId, company: string | null | undefined, day: string, lines: PaymentLine[]): string[] {
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const title = `💰 *${L("مدفوعات اليوم", "Today's payments")}* — ${day}`;
  const head = [title, company || ""].filter(Boolean).join("\n");
  const sum = `*${L("الإجمالي", "Total")}: ${money(total)} ${sar()}* · ${count(lines.length)}`;
  // the who, the method and number; then everyone paid for; then the establishment and the transfer party
  const meta = (l: PaymentLine) =>
    [
      [l.who, l.method, l.number].filter(Boolean).join(" · "),
      l.people.length ? `${l.peopleKind === "employees" ? "👥" : "🏢"} ${l.people.join("، ")}` : "",
      [l.est && `🏢 ${l.est}`, l.supplier && `↪️ ${L("جهة التحويل", "Paid to")}: ${l.supplier}`].filter(Boolean).join(" · "),
    ].filter(Boolean).join("\n");
  const groups = byCategory(lines);

  switch (id) {
    case "ledger": {
      const blocks = lines.map((l, i) => `${i + 1}) *${money(l.amount)}* ${sar()} — ${l.label}\n    ${meta(l)}`);
      return messages(`📒 ${head}`, blocks, `━━━━━━━━━━━━\n${sum}`);
    }
    case "grouped": {
      const blocks = groups.map((g) => [`🗂️ *${g.label}* — ${money(g.total)} ${sar()}`, ...g.lines.map((l) => `   • ${money(l.amount)} — ${meta(l)}`)].join("\n"));
      return messages(head, blocks, sum);
    }
    case "executive": {
      const biggest = [...lines].sort((a, b) => b.amount - a.amount)[0];
      const top = groups[0];
      const para = L(
        `سُجّلت اليوم ${countAr(lines.length)} بإجمالي *${money(total)} ر.س*. أكبر بند «${top.label}» بقيمة ${money(top.total)} ر.س، وأكبر دفعة ${money(biggest.amount)} ر.س (${biggest.label}${biggest.who ? ` · ${biggest.who}` : ""}).`,
        `${lines.length} payment${lines.length === 1 ? "" : "s"} today, *${money(total)} SAR* in all. The largest item is “${top.label}” at ${money(top.total)} SAR; the largest payment ${money(biggest.amount)} SAR (${biggest.label}${biggest.who ? ` · ${biggest.who}` : ""}).`
      );
      const blocks = [`💡 ${para}`, ...[...lines].sort((a, b) => b.amount - a.amount).map((l, i) => `${i + 1}. ${l.label} — *${money(l.amount)}*\n    ${meta(l)}`)];
      return messages(head, blocks, sum);
    }
    case "dashboard": {
      const blocks = [
        groups.map((g) => `${bar(total ? g.total / total : 0)} ${g.label}\n*${money(g.total)}* ${sar()} · ${count(g.lines.length)}`).join("\n\n"),
        ...lines.map((l) => `▪️ ${l.label} — ${money(l.amount)}\n    ${meta(l)}`),
      ];
      return messages(`📊 ${head}`, blocks, sum);
    }
    case "brief": {
      const top = [...lines].sort((a, b) => b.amount - a.amount).slice(0, 3);
      const body = [
        `*${money(total)} ${sar()}* · ${count(lines.length)}`,
        ...top.map((l) => `• ${l.label} — ${money(l.amount)}`),
        lines.length > 3 ? `_${L(`و${lines.length - 3} دفعات أخرى في صفحة المدفوعات`, `and ${lines.length - 3} more on the Payments page`)}_` : "",
      ].filter(Boolean).join("\n");
      return [`⚡ ${head}\n\n${body}`];
    }
    case "receipt":
    default: {
      const blocks = lines.map((l) => [`• ${l.label} — ${money(l.amount)} ${sar()}`, meta(l), l.description ?? ""].filter(Boolean).join("\n"));
      return messages(head, blocks, sum);
    }
  }
}

const PAY_ICONS: Record<string, string> = {
  wallet: '<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h12.5v3"/><rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M16 13.5h2.5"/>',
  receipt: '<path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
  layers: '<path d="m12 3 9 4.5-9 4.5-9-4.5z"/><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6 15h4"/>',
  send: '<path d="M4 12h13M13 7l5 5-5 5"/><path d="M4 6v12"/>',
};
const pic = (name: string) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PAY_ICONS[name]}</svg>`;
const MAX_ROWS = 14;
const EXTRA = `.meta span.ppl { white-space: normal; overflow: visible; align-items: flex-start; flex-basis: 100%; line-height: 1.45; } .meta span.ppl .ic { margin-top: 4px; } .meta span.ppl > span { white-space: normal; overflow: visible; display: block; min-width: 0; } .days.amt { min-width: 200px; } .days.amt b { font-size: 36px; } .grp .sub { margin-inline-start: auto; font-family: "IBM Plex Mono", monospace; font-size: 22px; } .kpi b.money { font-size: 40px; white-space: nowrap; } .kpi b.money.m2 { font-size: 34px; } .kpi b.money.m3 { font-size: 28px; }`;

/** The evening message as one designed picture (the morning summary's four designs). */
export function paymentsCardDocument(cardId: DigestCardId, data: { company: string; logo: string | null; day: string; lines: PaymentLine[]; today?: Date }) {
  const en = isEn();
  const today = data.today ?? new Date();
  const lines = data.lines;
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const groups = byCategory(lines);
  const top = groups[0];
  const methods = new Set(lines.map((l) => l.method)).size;
  const kpi = (cls: string, ic: string, label: string, value: string, isMoney = false) =>
    `<div class="kpi ${cls}"><span class="t"><span class="d">${pic(ic)}</span>${esc(label)}</span><b class="${isMoney ? `money ${fit(value)}` : ""}">${value}</b><i class="bar"><u style="width:100%"></u></i></div>`;
  // a long amount steps down so it stays inside its box
  const fit = (v: string) => { const n = v.replace(/<[^>]+>/g, "").length; return n > 12 ? "m3" : n > 9 ? "m2" : ""; };
  let shown = 0;
  const groupsHtml = groups
    .map((g) => {
      const rows = g.lines.filter(() => shown++ < MAX_ROWS);
      if (!rows.length) return "";
      return `<div class="grp gold"><i></i>${esc(g.label)} · <span class="num">${g.lines.length}</span><span class="sub">${money(g.total)}</span></div><div class="list">${rows
        .map((l) => {
          const meta = [
            l.who && `<span>${icon("user")}${esc(l.who)}</span>`,
            l.people.length && `<span class="ppl">${icon(l.peopleKind === "employees" ? "user" : "company")}<span>${l.people.map(esc).join("، ")}</span></span>`,
            `<span>${pic("card")}${esc(l.method)}</span>`,
            l.number && `<span>${icon("hash")}<span class="num">${esc(l.number)}</span></span>`,
            l.est && `<span>${icon("company")}${esc(l.est)}</span>`,
            l.supplier && `<span>${pic("send")}${esc(L("جهة التحويل", "Paid to"))}: ${esc(l.supplier)}</span>`,
          ].filter(Boolean).join("");
          return `<div class="row gold"><span class="tile">${pic("receipt")}</span><div class="rtx"><b>${esc(l.label)}</b><div class="meta">${meta}</div></div><div class="days amt"><b>${money(l.amount)}</b><small>${esc(sar())}</small></div></div>`;
        })
        .join("")}</div>`;
    })
    .join("") + (lines.length > MAX_ROWS ? `<div class="list"><div class="more">${esc(L(`و${lines.length - MAX_ROWS} دفعات أخرى في صفحة المدفوعات`, `and ${lines.length - MAX_ROWS} more on the Payments page`))}</div></div>` : "");

  const RIYADH = "Asia/Riyadh";
  const weekday = today.toLocaleDateString(en ? "en-GB" : "ar-EG", { timeZone: RIYADH, weekday: "long" });
  const dayNum = today.toLocaleDateString("en-GB", { timeZone: RIYADH, day: "2-digit" });
  const monthYear = today.toLocaleDateString(en ? "en-GB" : "ar-EG-u-nu-latn", { timeZone: RIYADH, month: "long", year: "numeric" });
  const time = today.toLocaleTimeString("en-GB", { timeZone: RIYADH, hour: "2-digit", minute: "2-digit" });
  const logo = data.logo ? `<img src="${data.logo}" alt="">` : `<b>${esc(data.company.trim().charAt(0) || "S")}</b>`;

  return `<!doctype html><html lang="${en ? "en" : "ar"}" dir="${en ? "ltr" : "rtl"}"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS}">
<style>:root { ${PALETTES[cardId]} } ${CSS} ${EXTRA}</style></head><body><div class="page">
  <header class="lh">
    <span class="logo">${logo}</span>
    <div class="lt">
      <div class="eyebrow">${esc(L("تقرير المساء", "EVENING REPORT"))}</div>
      <h1>${esc(L("مدفوعات اليوم", "Today's payments"))}</h1>
      <div class="company">${esc(data.company)}</div>
    </div>
    <div class="leaf"><div class="top">${esc(weekday)}</div><b>${dayNum}</b><small>${esc(monthYear)}</small></div>
  </header>
  <div class="kpis">
    ${kpi("gold", "wallet", L("الإجمالي (ر.س)", "Total (SAR)"), `<span class="num">${money(total)}</span>`, true)}
    ${kpi("ok", "receipt", L("عدد الدفعات", "Payments"), `<span class="num">${lines.length}</span>`)}
    ${kpi("warn", "layers", L(`أكبر بند: ${top?.label ?? "—"}`, `Largest: ${top?.label ?? "—"}`), `<span class="num">${money(top?.total ?? 0)}</span>`, true)}
    ${kpi("next", "card", L("طرق الدفع", "Methods"), `<span class="num">${methods}</span>`)}
  </div>
  <section class="sec"><div class="sh">${pic("receipt")}<h2>${esc(L("الدفعات حسب البند", "Payments by item"))}</h2><span class="cnt">${lines.length}</span></div>${groupsHtml}</section>
  <footer class="foot"><span class="brand">${icon("shield")}<span><b>SanaD</b> · ${esc(L("إدارة الوثائق والتراخيص", "Documents & Licenses"))}</span></span><span>${esc(L("أُرسل تلقائيًا", "Sent automatically"))} · <span class="num">${time}</span></span></footer>
</div></body></html>`;
}

/** The two lines sent with the picture. */
export function paymentsCardCaption(company: string | null | undefined, lines: PaymentLine[]) {
  const total = lines.reduce((a, l) => a + l.amount, 0);
  return [`💰 *${L("مدفوعات اليوم", "Today's payments")}*${company ? ` · ${company}` : ""}`, `*${money(total)} ${sar()}* · ${count(lines.length)}`, `_${L("التفاصيل في الصورة.", "The details are in the picture.")}_`].join("\n");
}
