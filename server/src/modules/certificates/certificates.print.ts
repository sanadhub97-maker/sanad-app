import { escapeHtml as esc } from "@/lib/security";
import { L, isEn } from "@/services/lang";
import { dmy, royalSheet, starRule, type PrintEmployee, type PrintEstablishment } from "@/modules/custody/custody.print";
import { amountInWords } from "./money-words";

/**
 * The experience certificate, on the same royal letterhead as the clearance:
 * "To whom it may concern", the employee written into a framed text over an
 * engraved rosette, a strip with the job and the service dates and length,
 * and two signatures, the last under the establishment's seal.
 */

/** The signatures closing a certificate, from Settings → Print → Certificates, with this print's names. */
export interface CertSigners {
  boxes: { title: string; name: string; image: string | null }[];
  seal: { show: boolean; stamp: string | null };
}

export interface ExperienceInput {
  est: PrintEstablishment;
  emp: PrintEmployee & { female: boolean };
  number: string;
  issueDate: Date;
  job: string | null;
  start: Date | null;
  end: Date | null;
  stillWorking: boolean;
  conduct: boolean;
  note: string | null;
  signers: CertSigners;
}

/** Whole years, months and days from a to b (b counted as a working day). */
export function serviceLength(a: Date, b: Date) {
  const end = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate() + 1));
  let y = end.getUTCFullYear() - a.getUTCFullYear();
  let m = end.getUTCMonth() - a.getUTCMonth();
  let d = end.getUTCDate() - a.getUTCDate();
  if (d < 0) {
    m -= 1;
    d += new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0)).getUTCDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return { y: Math.max(0, y), m: Math.max(0, m), d: Math.max(0, d) };
}

const arCount = (n: number, one: string, two: string, few: string, many: string) => (n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`);
export function lengthText(a: Date, b: Date) {
  const { y, m, d } = serviceLength(a, b);
  if (isEn()) {
    const part = (n: number, w: string) => (n ? `${n} ${w}${n === 1 ? "" : "s"}` : "");
    return [part(y, "year"), part(m, "month"), y ? "" : part(d, "day")].filter(Boolean).join(", ") || "1 day";
  }
  const parts = [
    y ? arCount(y, "سنة واحدة", "سنتان", "سنوات", "سنة") : "",
    m ? arCount(m, "شهر واحد", "شهران", "أشهر", "شهرًا") : "",
    !y && d ? arCount(d, "يوم واحد", "يومان", "أيام", "يومًا") : "",
  ].filter(Boolean);
  return parts.join(" و") || "يوم واحد";
}

// A faint engraved rosette behind the text, like the guilloche of a banknote.
function rosette() {
  let paths = "";
  for (let k = 0; k < 36; k++) paths += `<ellipse cx="200" cy="200" rx="188" ry="62" transform="rotate(${k * 5} 200 200)"/>`;
  let inner = "";
  for (let k = 0; k < 24; k++) inner += `<ellipse cx="200" cy="200" rx="96" ry="30" transform="rotate(${k * 7.5} 200 200)"/>`;
  return `<svg class="xc-ros" viewBox="0 0 400 400" aria-hidden="true"><g fill="none" stroke="#b08a40" stroke-width=".55">${paths}</g><g fill="none" stroke="#b08a40" stroke-width=".5">${inner}</g><circle cx="200" cy="200" r="194" fill="none" stroke="#b08a40" stroke-width="1"/><circle cx="200" cy="200" r="188" fill="none" stroke="#b08a40" stroke-width=".4"/></svg>`;
}

const XCSS = `
.xc .body { top: 236px; }
.xc-to { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 12px; margin-top: 22px; }
.xc-to svg { width: 100%; height: 20px; display: block; }
.xc-to b { font-size: 17px; font-weight: 700; color: var(--deep); letter-spacing: .02em; }
.xc-card { position: relative; margin-top: 14px; padding: 32px 40px 28px; background: radial-gradient(120% 120% at 50% 0%, #fff, #fdf8ec 70%, #f9f0dc); border: 1px solid var(--gold); outline: .6px solid var(--gold-l); outline-offset: 4px; overflow: hidden; }
.xc-card > * { position: relative; }
/* the letter keeps its height; a long one shrinks the whole sheet to fit (fitSelector) instead of being cut */
.xc-to, .xc-card, .xc-strip { flex: none; }
.xc-ros { position: absolute !important; left: 50%; top: 50%; width: 400px; height: 400px; transform: translate(-50%, -50%); opacity: .085; }
.xc-card .cn { position: absolute; width: 22px; height: 22px; border: 0 solid var(--gold); }
.xc-card .cn.tl { top: 7px; left: 7px; border-top-width: 2px; border-left-width: 2px; }
.xc-card .cn.tr { top: 7px; right: 7px; border-top-width: 2px; border-right-width: 2px; }
.xc-card .cn.bl { bottom: 7px; left: 7px; border-bottom-width: 2px; border-left-width: 2px; }
.xc-card .cn.br { bottom: 7px; right: 7px; border-bottom-width: 2px; border-right-width: 2px; }
.xc-lead { margin: 0 0 10px; font-size: 15px; font-weight: 700; color: var(--gold); }
.xc-p { margin: 0 0 12px; font-size: 16.4px; line-height: 2.2; color: #1f2937; text-align: justify; text-justify: inter-word; }
.xc-p b { color: var(--deep); font-weight: 700; }
.xc-p:last-child { margin-bottom: 0; }
.xc-close { margin: 16px 0 0; padding-top: 12px; border-top: .6px solid var(--gold-l); font-size: 13.6px; line-height: 1.9; color: var(--ink2); text-align: center; }
.xc-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 20px; background: #fff; border: .6px solid var(--gold-l); box-shadow: inset 0 2px 0 var(--deep); }
.xc-strip div { padding: 10px 10px 9px; text-align: center; min-width: 0; }
.xc-strip div + div { border-inline-start: .5px solid #eee4cc; }
.xc-strip small { display: block; font-size: 9.4px; color: var(--ink2); }
.xc-strip b { display: block; margin-top: 1px; font-size: 13px; font-weight: 700; color: var(--deep); overflow-wrap: anywhere; }
.xc .ry-sigs { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 170px; padding-inline: 10px; }
.xc .ry-sigs:has(> .ry-sig:nth-child(3 of .ry-sig)) { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 34px; padding-inline: 0; }
.xc .ry-sigs:not(:has(> .ry-sig:nth-child(2 of .ry-sig))) { grid-template-columns: minmax(0, 300px); justify-content: center; }
/* both signature lines on one level, named or not */
.xc .ry-sig small { display: block; min-height: 3.2em; line-height: 1.6; }
`;

export function experienceHtml(input: ExperienceInput) {
  const { est, emp } = input;
  const f = emp.female;
  const g = (male: string, female: string) => (f ? female : male);
  const name = `<b>${esc(emp.name.trim())}</b>`;
  const job = input.job ? `<b>${esc(input.job)}</b>` : "";
  const from = input.start ? `<b class="n">${dmy(input.start)}</b>` : "";
  const to = input.end ? `<b class="n">${dmy(input.end)}</b>` : "";
  const estName = `<b>${esc(est.name)}</b>`;

  const main = isEn()
    ? `This is to certify that ${g("Mr.", "Ms.")} ${name}${emp.nationality ? `, of ${esc(emp.nationality.trim())} nationality` : ""}${emp.iqama ? `, holder of iqama no. <b class="n">${esc(emp.iqama)}</b>` : ""}, ${input.stillWorking ? "has been working" : "worked"} with ${estName}${job ? ` as ${job}` : ""}${from ? ` from ${from}` : ""}${input.stillWorking ? ` and is still in service to date` : to ? ` to ${to}` : ""}.`
    : `تشهد ${estName} بأن ${g("السيد", "السيدة")}/ ${name}${emp.nationality ? `، ${esc(emp.nationality.trim())} الجنسية` : ""}${emp.iqama ? `، ${g("ويحمل", "وتحمل")} إقامة رقم <b class="n">${esc(emp.iqama)}</b>` : ""}، قد ${g("عمل", "عملت")} لدينا${job ? ` بوظيفة ${job}` : ""}${from ? ` خلال الفترة من ${from}` : ""}${input.stillWorking ? `، ولا ${g("يزال", "تزال")} على رأس العمل حتى تاريخه` : to ? ` إلى ${to}` : ""}.`;
  const conduct = isEn()
    ? `Throughout this period ${g("he", "she")} proved to be diligent, committed, honest and of good conduct. We wish ${g("him", "her")} continued success.`
    : `وقد ${g("كان", "كانت")} خلال فترة ${g("عمله", "عملها")} مثالًا للجدية والالتزام والأمانة وحسن الخلق، ونتمنى ${g("له", "لها")} دوام التوفيق والنجاح.`;
  const close = isEn()
    ? `This certificate has been issued at ${g("his", "her")} request, without any liability on the establishment towards others.`
    : `وقد أُعطيت ${g("له", "لها")} هذه الشهادة بناءً على ${g("طلبه", "طلبها")}، دون أدنى مسؤولية على المنشأة تجاه الغير.`;

  const endOrNow = input.stillWorking ? input.issueDate : input.end;
  const strip = [
    [L("المسمى الوظيفي", "Job title"), esc(input.job || "—"), false],
    [L("تاريخ الالتحاق", "Joined"), input.start ? dmy(input.start) : "—", true],
    [L("تاريخ انتهاء الخدمة", "Service ended"), input.stillWorking ? L("على رأس العمل", "Still in service") : input.end ? dmy(input.end) : "—", !input.stillWorking],
    [L("مدة الخدمة", "Length of service"), input.start && endOrNow ? esc(lengthText(input.start, endOrNow)) : "—", false],
  ] as const;

  return royalSheet({
    est, emp, number: input.number, date: input.issueDate,
    title: ["شهادة خبرة", "Experience Certificate"],
    seal: { ...input.signers.seal, center: true },
    subtitle: "Experience Certificate",
    numberLabel: ["رقم الشهادة", "Certificate no."],
    noGrid: true,
    sheetClass: "xc",
    extraCss: XCSS,
    body: (_sec, sigs) =>
      `<div class="xc-to"><div>${starRule("xl")}</div><b>${L("إلى من يهمه الأمر", "To Whom It May Concern")}</b><div style="transform:scaleX(-1)">${starRule("xr")}</div></div>
      <div class="xc-card">${rosette()}<i class="cn tl"></i><i class="cn tr"></i><i class="cn bl"></i><i class="cn br"></i>
        <p class="xc-lead">${L("تحية طيبة وبعد،", "Greetings,")}</p>
        <p class="xc-p">${main}</p>
        ${input.conduct ? `<p class="xc-p">${conduct}</p>` : ""}
        ${input.note ? `<p class="xc-p">${esc(input.note)}</p>` : ""}
        <p class="xc-close">${close}</p>
      </div>
      ${input.signers.boxes.length ? sigs(input.signers.boxes.map((b) => [esc(b.title), b.name, b.image] as [string, string, string | null])) : ""}`,
  });
}

export interface SalaryInput {
  est: PrintEstablishment;
  emp: PrintEmployee & { female: boolean };
  number: string;
  issueDate: Date;
  job: string | null;
  start: Date | null;
  /** To whom it is addressed; "To whom it may concern" when empty. */
  recipient: string | null;
  /** The salary's parts in print order (basic first); the total is their sum. */
  parts: { label: string; amount: number }[];
  bank: { name: string; iban: string | null } | null;
  note: string | null;
  signers: CertSigners;
}

const sar = (n: number) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SCSS = `
.xs .xc-to { margin-top: 16px; }
.xs .xc-card { padding: 18px 30px 14px; }
.xs .xc-lead { margin-bottom: 4px; }
.xs .xc-p { font-size: 14.2px; line-height: 1.85; margin-bottom: 6px; }
.xs .xc-close { margin-top: 8px; padding-top: 6px; font-size: 12.2px; line-height: 1.7; }
.xs .ry-sig { padding-top: 80px; }
.xs .ry-seal { width: 72px; top: -12px; }
.xs .ry-stamp { width: 96px; height: 96px; top: -10px; }
.xs .ry-sigs.mid { --line: 80px; --stamp: 92px; }
.xs .ry-sec { margin-top: 10px; }
/* the salary in its parts: a formal statement, ruled in gold, the currency once in its head,
   the amounts on one line, the total and the total in words closing the table */
.xs-st { width: 100%; margin: 8px 0 4px; border-collapse: separate; border-spacing: 0; background: #fff; border: 1.2px solid var(--deep); outline: .6px solid var(--gold); outline-offset: 2.5px; }
.xs-st col.c-no { width: 44px; }
.xs-st col.c-am { width: 36%; }
.xs-st th { padding: 8px 12px; background-color: var(--deep); background-image: radial-gradient(120% 220% at 50% -60%, color-mix(in srgb, var(--brand) 55%, transparent), transparent 70%); color: #f1dc9f; font-size: 11.8px; font-weight: 700; text-align: center; letter-spacing: .04em; border-bottom: 2px solid var(--gold); }
.xs-st th + th, .xs-st td + td { border-inline-start: .6px solid var(--gold-l); }
.xs-st th + th { border-inline-start-color: rgba(232, 207, 139, .35); }
.xs-st th.am small { font-size: 9.4px; font-weight: 600; color: #e8cf8b; opacity: .85; }
.xs-st td { padding: 6px 12px; font-size: 13.4px; color: #1f2937; text-align: center; border-bottom: .6px solid #efe3c6; }
.xs-st tbody tr:nth-child(even) td { background: #fcf7ea; }
.xs-st td.no { text-align: center; font-size: 11.6px; font-weight: 700; color: var(--gold); }
.xs-st td.lb { font-weight: 700; }
.xs-st th.am, .xs-st td.am { text-align: center; }
.xs-st td.am b { display: inline-block; text-align: center; direction: ltr; font-weight: 700; color: var(--deep); font-variant-numeric: tabular-nums; }
.xs-st tfoot td { border-bottom: 0; }
.xs-st tr.tot td { padding: 8px 12px; text-align: center; background-color: var(--deep); color: #f7e7b0; font-weight: 700; font-size: 14px; border-top: 2px solid var(--gold); }
.xs-st tr.tot td + td { border-inline-start-color: rgba(232, 207, 139, .35); }
.xs-st tr.tot td.am b { color: #f7e7b0; font-size: 17px; }
.xs-st tr.words td { padding: 7px 14px; text-align: center; font-size: 13.4px; font-weight: 700; color: var(--deep); background: linear-gradient(#fffaf0, #f8eed6); border-top: 1px solid var(--gold); }
.xs-st tr.words small { display: inline-block; margin-inline-end: 8px; padding: 1px 8px; font-size: 9.6px; font-weight: 700; color: #fff; background: var(--gold); vertical-align: .1em; }
`;

export function salaryHtml(input: SalaryInput) {
  const { est, emp } = input;
  const g = (male: string, female: string) => (emp.female ? female : male);
  const name = `<b>${esc(emp.name.trim())}</b>`;
  const job = input.job ? `<b>${esc(input.job)}</b>` : "";
  const since = input.start ? `<b class="n">${dmy(input.start)}</b>` : "";
  const estName = `<b>${esc(est.name)}</b>`;
  const parts = input.parts.filter((p) => p.amount > 0);
  const total = Math.round(parts.reduce((a, p) => a + p.amount, 0) * 100) / 100;
  const words = amountInWords(total, isEn());
  const totalTxt = `<b class="n">${sar(total)}</b> ${L("ريال سعودي", "Saudi riyals")}`;

  const main = isEn()
    ? `This is to certify that ${g("Mr.", "Ms.")} ${name}${emp.nationality ? `, of ${esc(emp.nationality.trim())} nationality` : ""}${emp.iqama ? `, holder of iqama no. <b class="n">${esc(emp.iqama)}</b>` : ""}, works with ${estName}${job ? ` as ${job}` : ""}${since ? ` since ${since}` : ""}, and receives a total monthly salary of ${totalTxt} (${esc(words)}), made up as follows:`
    : `تشهد ${estName} بأن ${g("السيد", "السيدة")}/ ${name}${emp.nationality ? `، ${esc(emp.nationality.trim())} الجنسية` : ""}${emp.iqama ? `، ${g("ويحمل", "وتحمل")} إقامة رقم <b class="n">${esc(emp.iqama)}</b>` : ""}، ${g("يعمل", "تعمل")} لدينا${job ? ` بوظيفة ${job}` : ""}${since ? ` منذ تاريخ ${since}` : ""}، ${g("ويتقاضى", "وتتقاضى")} راتبًا شهريًا إجماليًا قدره ${totalTxt} (${esc(words)})، موزّعًا على النحو التالي:`;
  const amt = (n: number) => `<b>${sar(n)}</b>`;
  const table = `<table class="xs-st"><colgroup><col class="c-no"><col><col class="c-am"></colgroup>
    <thead><tr><th style="text-align:center">${L("م", "#")}</th><th>${L("البند", "Item")}</th><th class="am">${L("المبلغ", "Amount")} <small>(${L("ريال سعودي", "SAR")})</small></th></tr></thead>
    <tbody>${parts.map((p, i) => `<tr><td class="no n">${i + 1}</td><td class="lb">${esc(p.label)}</td><td class="am">${amt(p.amount)}</td></tr>`).join("")}</tbody>
    <tfoot><tr class="tot"><td></td><td>${L("إجمالي الراتب الشهري", "Total monthly salary")}</td><td class="am">${amt(total)}</td></tr>
    <tr class="words"><td colspan="3"><small>${L("المبلغ كتابةً", "In words")}</small>${esc(words)}</td></tr></tfoot></table>`;
  const bank = input.bank
    ? isEn()
      ? `${g("His", "Her")} salary is transferred monthly to ${g("his", "her")} account with <b>${esc(input.bank.name)}</b>${input.bank.iban ? `, IBAN <b class="n">${esc(input.bank.iban)}</b>` : ""}.`
      : `${g("ويُحوَّل راتبه", "ويُحوَّل راتبها")} شهريًا على ${g("حسابه", "حسابها")} لدى <b>${esc(input.bank.name)}</b>${input.bank.iban ? `، رقم الآيبان <b class="n">${esc(input.bank.iban)}</b>` : ""}.`
    : "";
  const to = input.recipient ? esc(input.recipient) : "";
  const close = isEn()
    ? `This letter has been issued at ${g("his", "her")} request${to ? ` to be presented to ${to}` : ""}, without any liability on the establishment towards others.`
    : `وقد أُعطي ${g("له", "لها")} هذا التعريف بناءً على ${g("طلبه", "طلبها")}${to ? ` لتقديمه إلى ${to}` : ""}، دون أدنى مسؤولية على المنشأة تجاه الغير.`;


  return royalSheet({
    est, emp, number: input.number, date: input.issueDate,
    title: ["تعريف بالراتب", "Salary Certificate"],
    seal: { ...input.signers.seal, center: true },
    subtitle: "Salary Certificate",
    numberLabel: ["رقم التعريف", "Letter no."],
    noGrid: true,
    sheetClass: "xc xs",
    extraCss: XCSS + SCSS,
    body: (_sec, sigs) =>
      `<div class="xc-to"><div>${starRule("sl")}</div><b>${to ? `${L("إلى", "To")}: ${to}` : L("إلى من يهمه الأمر", "To Whom It May Concern")}</b><div style="transform:scaleX(-1)">${starRule("sr")}</div></div>
      <div class="xc-card">${rosette()}<i class="cn tl"></i><i class="cn tr"></i><i class="cn bl"></i><i class="cn br"></i>
        <p class="xc-lead">${L("تحية طيبة وبعد،", "Greetings,")}</p>
        <p class="xc-p">${main}</p>
        ${table}
        ${bank ? `<p class="xc-p" style="margin-top:10px">${bank}</p>` : ""}
        ${input.note ? `<p class="xc-p">${esc(input.note)}</p>` : ""}
        <p class="xc-close">${close}</p>
      </div>
      ${input.signers.boxes.length ? sigs(input.signers.boxes.map((b) => [esc(b.title), b.name, b.image] as [string, string, string | null])) : ""}`,
  });
}
