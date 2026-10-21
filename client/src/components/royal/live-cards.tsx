import type { ReactNode } from "react";
import { tr } from "@/i18n";
import { amountInWords } from "@/lib/money-words";

/* The live pieces of the add forms (styles/royale.css, "live previews"):
   what is being added takes shape beside the form as it is typed — the
   employee's card with a checklist, the Saudi plate with the car's dates,
   the expense voucher with its total, and a ring of days left on a document. */

const MS_DAY = 86_400_000;
const todayUtc = () => {
  const d = new Date();
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
};
/** Days from today to an ISO date (yyyy-mm-dd), or null when there is none. */
export function daysLeft(iso?: string | null): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - todayUtc()) / MS_DAY);
}
const tone = (n: number | null) => (n === null ? "mut" : n < 0 ? "bad" : n <= 30 ? "warn" : "ok");
const leftText = (n: number | null) =>
  n === null ? tr("لم يُحدَّد", "Not set") : n < 0 ? tr(`انتهت منذ ${-n} يوم`, `Ended ${-n}d ago`) : n === 0 ? tr("تنتهي اليوم", "Ends today") : tr(`باقي ${n} يوم`, `${n} days left`);
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The column beside a form that holds its live preview; it stays in view while the form scrolls. */
export function LiveAside({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <aside className="rx-live" aria-label={label ?? tr("معاينة حية", "Live preview")}>
      <span className="rx-live-cap">{label ?? tr("معاينة حية", "Live preview")}</span>
      {children}
    </aside>
  );
}

/** The employee's card, filled in as the form is typed, and what is still missing. */
export function LiveIdCard({ nameAr, nameEn, number, job, branch, nationality, iqama, iqamaExpiry, status, checks }: {
  nameAr?: string; nameEn?: string; number?: string; job?: string; branch?: string; nationality?: string;
  iqama?: string; iqamaExpiry?: string; status?: string; checks: { label: string; ok: boolean }[];
}) {
  const initial = (nameAr || nameEn || "").trim().charAt(0) || "؟";
  const left = daysLeft(iqamaExpiry);
  const done = checks.filter((c) => c.ok).length;
  return (
    <>
      <div className="rx-idcard">
        <div className="top2">
          <span>{tr("بطاقة موظف", "Employee card")}</span>
          {status && <span className="rx-idstatus">{status}</span>}
          <i className="chipg" aria-hidden="true" />
        </div>
        <div className="mid">
          <span className="ph2">{initial}</span>
          <div className="min-w-0">
            <h4>{nameAr?.trim() || tr("اسم الموظف", "Employee name")}</h4>
            <small dir="ltr">{nameEn?.trim() || "—"}</small>
          </div>
        </div>
        <div className="meta">
          <div><span>{tr("الرقم", "No.")}</span><b dir="ltr">{number || "—"}</b></div>
          <div><span>{tr("المسمى", "Title")}</span><b>{job || "—"}</b></div>
          <div><span>{tr("المؤسسة", "Establishment")}</span><b>{branch || "—"}</b></div>
          <div><span>{tr("الجنسية", "Nationality")}</span><b>{nationality || "—"}</b></div>
          <div><span>{tr("الإقامة", "Iqama")}</span><b dir="ltr">{iqama || "—"}</b></div>
          <div><span>{tr("انتهاء الإقامة", "Iqama ends")}</span><b className={`rx-t-${tone(left)}`}>{iqamaExpiry ? leftText(left) : "—"}</b></div>
        </div>
      </div>
      <div className="rx-check">
        <div className="rx-check-h">
          <b>{tr("اكتمال الملف", "Profile completeness")}</b>
          <span dir="ltr">{done}/{checks.length}</span>
        </div>
        <div className="rx-check-bar"><u style={{ width: `${checks.length ? (done / checks.length) * 100 : 0}%` }} /></div>
        {checks.map((c) => (
          <div key={c.label} className={c.ok ? "ok" : undefined}>
            <i aria-hidden="true">{c.ok ? "✓" : ""}</i>
            {c.label}
          </div>
        ))}
      </div>
    </>
  );
}

/* Saudi plate letters and their Latin twins, as printed on the plate. */
const PLATE_EN: Record<string, string> = { "أ": "A", "ا": "A", "ب": "B", "ح": "J", "د": "D", "ر": "R", "س": "S", "ص": "X", "ط": "T", "ع": "E", "ق": "G", "ك": "K", "ل": "L", "م": "Z", "ن": "N", "ه": "H", "هـ": "H", "و": "U", "ى": "V", "ي": "V" };
const toIndic = (s: string) => s.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
const toWestern = (s: string) => s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** A Saudi plate drawn from what is typed: Arabic above, Latin below. */
export function LivePlate({ letters, number }: { letters: string; number: string }) {
  const chars = letters.replace(/\s+/g, "").split("").filter(Boolean);
  const digits = toWestern(number.replace(/\s+/g, ""));
  return (
    <div className="rx-plate" dir="ltr" aria-label={tr("اللوحة", "Plate")}>
      <div className="pn">
        <b>{digits ? toIndic(digits).split("").join(" ") : "—"}</b>
        <span>{digits ? digits.split("").join(" ") : "—"}</span>
      </div>
      <div className="pl">
        {/* The Arabic letters read right to left; each Latin letter sits under its Arabic twin. */}
        <b dir="rtl">{chars.length ? chars.join(" ") : "—"}</b>
        <span>{chars.length ? [...chars].reverse().map((c) => PLATE_EN[c] ?? "?").join(" ") : "—"}</span>
      </div>
      <div className="k">
        <i className="palm" aria-hidden="true">✦</i>
        <i>السعودية</i>
        <i>KSA</i>
      </div>
    </div>
  );
}

/** Bars for the car's dates, coloured by how near each one is. */
export function LiveDates({ items }: { items: { label: string; date?: string }[] }) {
  return (
    <div className="rx-dates">
      {items.map((d) => {
        const n = daysLeft(d.date);
        const w = n === null ? 0 : n < 0 ? 100 : Math.max(4, Math.min(100, 100 - (n / 365) * 100));
        return (
          <div key={d.label} className={`rx-t-${tone(n)}`}>
            <span>{d.label}</span>
            <i className="tr"><u style={{ width: `${w}%` }} /></i>
            <b>{leftText(n)}</b>
          </div>
        );
      })}
    </div>
  );
}

/** The expense voucher as it will print, with its total worked out. */
export function LiveVoucher({ number, company, rows, amount, vat, tag }: { number?: string; company?: string; rows: [string, string | undefined][]; amount: number; vat: number; tag?: string }) {
  const total = amount + vat;
  const en = !tr("ar", "") ;
  const initial = (company || "").trim().charAt(0) || tr("س", "S");
  return (
    <article className="lv-doc">
      <svg className="lv-rose" viewBox="-100 -100 200 200" aria-hidden="true">
        {Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; return <circle key={i} cx={Math.cos(a) * 34} cy={Math.sin(a) * 34} r={62} fill="none" stroke="currentColor" strokeWidth=".4" />; })}
      </svg>
      <span className="lv-holo" aria-hidden="true" />
      <span className="lv-sweep" aria-hidden="true" />
      {["a", "b", "c", "d"].map((k) => (
        <svg key={k} className={`lv-corner ${k}`} viewBox="0 0 40 40" aria-hidden="true"><path d="M2 38V14C2 7 7 2 14 2h24" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="11" y="11" width="6" height="6" transform="rotate(45 14 14)" fill="currentColor" /></svg>
      ))}
      <div className="lv-band" />
      <div className="lv-top">
        <span className="lv-seal">{initial}</span>
        <div className="lv-t"><b>{tr("سند صرف", "Expense voucher")}</b><small>{company || "—"}</small></div>
        <div className="lv-no"><span>{tr("رقم السند", "VOUCHER NO.")}</span><b dir="ltr">{number || tr("تلقائي", "Auto")}</b></div>
      </div>
      <div className="lv-amt">
        <div className="lbl"><span>{tr("المبلغ الإجمالي", "Total amount")}</span></div>
        <div className="big"><span dir="ltr">{money(total)}</span><small>{tr("ر.س", "SAR")}</small></div>
        <div className="words">{total > 0 ? amountInWords(total, en) : "—"}</div>
      </div>
      <div className="lv-rows">
        {rows.map(([k, v], i) => (
          <div key={k}><span>{k}</span><b className={v ? undefined : "mut"}>{v || "—"}{i === 0 && tag ? <i className="lv-tag">{tag}</i> : null}</b></div>
        ))}
      </div>
      <div className="lv-sum">
        <div><span>{tr("المبلغ", "Amount")}</span><b dir="ltr">{money(amount)}</b></div>
        <div><span>{tr("الضريبة", "VAT")}</span><b dir="ltr">{money(vat)}</b></div>
        <div className="t"><span>{tr("الإجمالي", "Total")}</span><b dir="ltr">{money(total)}</b></div>
      </div>
      <div className="lv-sig">
        <div className="ln"><i />{tr("المحاسب", "Accountant")}</div>
        <div className={`lv-wax${total > 0 ? "" : " draft"}`}><div className="disc"><span>{total > 0 ? <>{tr("معتمد", "APPROVED")}<br />{tr("سند", "SanaD")}</> : tr("مسودة", "DRAFT")}</span></div></div>
        <div className="ln"><i />{tr("المدير المالي", "Finance manager")}</div>
      </div>
      <div className="lv-perf"><i /><i /></div>
      <div className="lv-stub"><span>{tr("كعب السند", "Stub")} · <b dir="ltr">{number || "—"}</b></span><span className="bars" aria-hidden="true" /></div>
    </article>
  );
}

/** A few facts of what is being added, each shown once it is filled. */
export function LiveFacts({ rows }: { rows: [string, string | undefined | null][] }) {
  return (
    <div className="rx-facts">
      {rows.map(([k, v]) => (
        <div key={k} className={v ? "on" : undefined}>
          <span>{k}</span>
          <b dir="auto">{v || "—"}</b>
        </div>
      ))}
    </div>
  );
}

/** A ring of the days left until a document ends. */
export function DaysRing({ expiry, start, title, sub }: { expiry?: string; start?: string; title?: string; sub?: string }) {
  const n = daysLeft(expiry);
  const span = (() => {
    const a = daysLeft(start);
    return a !== null && n !== null && n - a > 0 ? n - a : 365;
  })();
  const frac = n === null ? 0 : n < 0 ? 1 : Math.max(0.02, Math.min(1, n / span));
  const R = 52, L = 2 * Math.PI * R;
  return (
    <div className={`rx-ring rx-t-${tone(n)}`}>
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="10" />
        <circle className="v" cx="70" cy="70" r={R} fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${frac * L} ${L}`} transform="rotate(-90 70 70)" />
        <text x="70" y="70" textAnchor="middle" className="n">{n === null ? "—" : Math.abs(n)}</text>
        <text x="70" y="92" textAnchor="middle" className="l">{n === null ? tr("بدون تاريخ", "No date") : n < 0 ? tr("يوم مضى", "days ago") : tr("يوم باقي", "days left")}</text>
      </svg>
      <div className="tx">
        <b>{title || tr("الوثيقة", "Document")}</b>
        {sub && <small dir="auto">{sub}</small>}
        <span className={`rx-chip rx-t-${tone(n)}`}>{n === null ? tr("حدّد تاريخ الانتهاء", "Set the expiry date") : n < 0 ? tr("منتهية", "Expired") : n <= 30 ? tr("قريبة من الانتهاء", "Ending soon") : tr("سارية", "Valid")}</span>
      </div>
    </div>
  );
}
