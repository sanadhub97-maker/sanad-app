import type { ReactNode } from "react";
import { ClipboardCheck, Clock, FileText, Globe2, HeartPulse, IdCard, Landmark, Plane, ShieldCheck, Stamp } from "lucide-react";
import { daysFromToday, dmy } from "@/components/royal/rp";

/* The employee's documents drawn as what they are: the iqama, the passport and
   the health certificate as cards, a visa as a visa sticker, a flight ticket as
   a boarding pass. They are the system's own designs for its records — not
   copies of the official documents (no state emblems or issuer marks), so
   they cannot pass for the originals. Each shows the document's state by its
   end date, and opens its details when pressed. */

export interface DocCardData {
  type: string;
  label: string;
  number?: string | null;
  authority?: string | null;
  issueDate?: string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}
export interface DocHolder {
  name: string;
  nameEn?: string | null;
  nationality?: string | null;
  profession?: string | null;
  establishment?: string | null;
  employeeNumber?: string | null;
}

type Tone = "ok" | "warn" | "bad" | "none";
function stateOf(expiry: string | null | undefined, isAr: boolean): { tone: Tone; label: string; days: number | null } {
  const days = daysFromToday(expiry);
  if (days === null) return { tone: "none", label: isAr ? "بدون تاريخ انتهاء" : "No end date", days };
  if (days < 0) return { tone: "bad", label: isAr ? "منتهية" : "Expired", days };
  if (days <= 30) return { tone: "warn", label: isAr ? `باقي ${days} يوم` : `${days} days left`, days };
  return { tone: "ok", label: isAr ? "سارية" : "Valid", days };
}
const d = (v?: string | null) => (v ? dmy(v) : "—");
const Field = ({ k, v, mono, wide }: { k: string; v: ReactNode; mono?: boolean; wide?: boolean }) => (
  <span className={wide ? "wide" : undefined}>
    <small>{k}</small>
    <b className={mono ? "mono" : undefined}>{v || "—"}</b>
  </span>
);

/** The document's number, centred between two gold rules. */
const Num = ({ v }: { v?: string | null }) => <div className="num mono">{v || "—"}</div>;
/** The dates in one band: two centred columns, a gold divider between. */
const Dates = ({ a, b }: { a: [string, string | null | undefined]; b: [string, string | null | undefined] }) => (
  <div className="dts">
    <span><small>{a[0]}</small><b className="mono">{d(a[1])}</b></span>
    <span><small>{b[0]}</small><b className="mono">{d(b[1])}</b></span>
  </div>
);

/** An establishment document's ground and icon, by its category. */
const EST_LOOK: Record<string, { cls: string; pre: [string, string]; icon: ReactNode }> = {
  COMMERCIAL_REGISTRATION: { cls: "dc-cr", pre: ["شهادة قيد", "Register"], icon: <FileText /> },
  MUNICIPAL_LICENSE: { cls: "dc-muni", pre: ["رخصة نشاط", "Activity licence"], icon: <Landmark /> },
  CIVIL_DEFENSE_LICENSE: { cls: "dc-cd", pre: ["ترخيص سلامة", "Safety licence"], icon: <ShieldCheck /> },
  CIVIL_DEFENSE_REPORT: { cls: "dc-cd", pre: ["شهادة سلامة", "Safety certificate"], icon: <ShieldCheck /> },
  CLEANING_CONTRACT: { cls: "dc-clean", pre: ["عقد خدمات", "Service contract"], icon: <ClipboardCheck /> },
  LEASE_CONTRACT: { cls: "dc-clean", pre: ["عقد إيجار", "Lease"], icon: <ClipboardCheck /> },
  TWENTY_FOUR_HOUR_PERMIT: { cls: "dc-h24", pre: ["تصريح تشغيل", "Operating permit"], icon: <Clock /> },
};

/** An establishment's document as a card in the employee cards' hand: its name and issuer, the number centred, the establishment, the dates. */
export function EstDocCard({ label, category, number, authority, issueDate, expiryDate, establishment, isAr, onOpen }: { label: string; category: string; number?: string | null; authority?: string | null; issueDate?: string | null; expiryDate?: string | null; establishment: string; isAr: boolean; onOpen?: () => void }) {
  const s = stateOf(expiryDate, isAr);
  const look = EST_LOOK[category] ?? { cls: "dc-cr", pre: ["وثيقة منشأة", "Establishment document"] as [string, string], icon: <FileText /> };
  return (
    <button type="button" className={`rx-dc dc-est ${look.cls} t-${s.tone}`} onClick={onOpen} dir={isAr ? "rtl" : "ltr"}>
      <i className="gw" aria-hidden="true" />
      <i className="holo" aria-hidden="true" />
      <div className="hd">
        <span className="ic">{look.icon}</span>
        <span className="tt">
          <b>{label}</b>
          <small>{[isAr ? look.pre[0] : look.pre[1], authority].filter(Boolean).join(" · ")}</small>
        </span>
        <span className="st">{s.label}</span>
      </div>
      <Num v={number} />
      <div className="fl">
        <Field k={isAr ? "المنشأة" : "Establishment"} v={establishment} wide />
      </div>
      <Dates a={[isAr ? "تاريخ الإصدار" : "Issued", issueDate]} b={[isAr ? "تاريخ الانتهاء" : "Expires", expiryDate]} />
    </button>
  );
}

/** The card a document type gets, or null when it has none (it stays a plain row). */
export function hasDocCard(type: string) {
  return ["IQAMA", "PASSPORT", "HEALTH_CERTIFICATE", "VISA", "EXIT_REENTRY_VISA", "FINAL_EXIT_VISA", "FLIGHT_TICKET"].includes(type);
}

export function DocCard({ doc, holder, isAr, onOpen }: { doc: DocCardData; holder: DocHolder; isAr: boolean; onOpen?: () => void }) {
  const s = stateOf(doc.expiryDate, isAr);
  const wrap = (cls: string, body: ReactNode) => (
    <button type="button" className={`rx-dc ${cls} t-${s.tone}`} onClick={onOpen} dir={isAr ? "rtl" : "ltr"}>
      <i className="gw" aria-hidden="true" />
      <i className="holo" aria-hidden="true" />
      {body}
    </button>
  );
  const st = <span className="st">{s.label}</span>;

  if (doc.type === "IQAMA")
    return wrap(
      "dc-iqama",
      <>
        <div className="hd">
          <span className="ic"><IdCard /></span>
          <span className="tt"><b>{isAr ? "بطاقة الإقامة" : "Iqama card"}</b><small>{isAr ? "هوية مقيم" : "Resident ID"}</small></span>
          {st}
        </div>
        <div className="who"><b>{holder.name}</b>{holder.nameEn && holder.nameEn !== holder.name && <bdi>{holder.nameEn}</bdi>}</div>
        <Num v={doc.number} />
        <div className="fl">
          <Field k={isAr ? "المهنة" : "Profession"} v={holder.profession} />
          <Field k={isAr ? "الجنسية" : "Nationality"} v={holder.nationality} />
          <Field k={isAr ? "صاحب العمل" : "Employer"} v={holder.establishment} wide />
        </div>
        <Dates a={[isAr ? "تاريخ الإصدار" : "Issued", doc.issueDate]} b={[isAr ? "تاريخ الانتهاء" : "Expires", doc.expiryDate]} />
      </>
    );

  if (doc.type === "PASSPORT")
    return wrap(
      "dc-passport",
      <>
        <div className="hd">
          <span className="ic"><Globe2 /></span>
          <span className="tt"><b>{isAr ? "جواز السفر" : "Passport"}</b><small>{doc.authority || (isAr ? "بلد الإصدار" : "Issuing country")}</small></span>
          {st}
        </div>
        <div className="pp">
          <div className="ph" aria-hidden="true">{(holder.name.trim()[0] || "؟").toUpperCase()}</div>
          <div className="fl">
            <Field k={isAr ? "الاسم" : "Name"} v={holder.name} wide />
            <Field k={isAr ? "الجنسية" : "Nationality"} v={holder.nationality} wide />
          </div>
        </div>
        <Num v={doc.number} />
        <Dates a={[isAr ? "تاريخ الإصدار" : "Issued", doc.issueDate]} b={[isAr ? "تاريخ الانتهاء" : "Expires", doc.expiryDate]} />
        <div className="mrz mono" aria-hidden="true">{`P<${(doc.number || "").replace(/\W/g, "").toUpperCase()}<<<<<<<<<<<<<<<<<<<<`.slice(0, 34)}</div>
      </>
    );

  if (doc.type === "HEALTH_CERTIFICATE")
    return wrap(
      "dc-health",
      <>
        <div className="hd">
          <span className="ic"><HeartPulse /></span>
          <span className="tt"><b>{isAr ? "الشهادة الصحية" : "Health certificate"}</b><small>{doc.authority || (isAr ? "الجهة المصدرة" : "Issuer")}</small></span>
          {st}
        </div>
        <div className="who"><b>{holder.name}</b>{holder.profession && <small>{holder.profession}</small>}</div>
        <Num v={doc.number} />
        <Dates a={[isAr ? "تاريخ الإصدار" : "Issued", doc.issueDate]} b={[isAr ? "تاريخ الانتهاء" : "Expires", doc.expiryDate]} />
      </>
    );

  if (doc.type === "VISA" || doc.type === "EXIT_REENTRY_VISA" || doc.type === "FINAL_EXIT_VISA") {
    const kind = doc.type === "EXIT_REENTRY_VISA" ? (isAr ? "خروج وعودة" : "Exit & re-entry") : doc.type === "FINAL_EXIT_VISA" ? (isAr ? "خروج نهائي" : "Final exit") : isAr ? "تأشيرة" : "Visa";
    const from = doc.startDate || doc.issueDate;
    const span = from && doc.expiryDate ? Math.max(0, Math.round((new Date(doc.expiryDate).getTime() - new Date(from).getTime()) / 864e5)) : null;
    return wrap(
      "dc-visa",
      <>
        <div className="vs-band">
          <b>{isAr ? "تأشيرة" : "VISA"}</b>
          <span>{kind}</span>
          {st}
        </div>
        <div className="vs-body">
          <div className="vs-stamp" aria-hidden="true"><Stamp /><small>{kind}</small></div>
          <div className="fl">
            <Field k={isAr ? "الاسم" : "Name"} v={holder.name} wide />
            <Field k={isAr ? "المدة" : "Duration"} v={span !== null ? (isAr ? `${span} يوم` : `${span} days`) : "—"} wide />
          </div>
        </div>
        <div className="vs-foot">
          <Num v={doc.number} />
          <Dates a={[isAr ? "صالحة من" : "Valid from", from]} b={[isAr ? "صالحة حتى" : "Valid until", doc.expiryDate]} />
        </div>
        <div className="mrz mono" aria-hidden="true">{`V<${(doc.number || "").replace(/\W/g, "").toUpperCase()}<<${(holder.employeeNumber || "").replace(/\W/g, "").toUpperCase()}<<<<<<<<<<<<<<<<`.slice(0, 34)}</div>
      </>
    );
  }

  if (doc.type === "FLIGHT_TICKET") {
    const route = (doc.notes || "").split(/\n/)[0].trim();
    const [from, to] = route.includes("-") || route.includes("–") || route.includes("←") || route.includes("→") ? route.split(/\s*[-–←→]\s*/) : ["", ""];
    return wrap(
      "dc-ticket",
      <>
        <div className="tk-main">
          <div className="hd">
            <span className="ic"><Plane /></span>
            <span className="tt"><b>{isAr ? "تذكرة سفر" : "Flight ticket"}</b><small>{doc.authority || (isAr ? "شركة الطيران" : "Airline")}</small></span>
            {st}
          </div>
          <div className="route">
            <b>{from || (isAr ? "من" : "From")}</b>
            <span className="ln" aria-hidden="true"><Plane /></span>
            <b>{to || (isAr ? "إلى" : "To")}</b>
          </div>
          <div className="fl">
            <Field k={isAr ? "المسافر" : "Passenger"} v={holder.name} wide />
          </div>
          <Dates a={[isAr ? "تاريخ السفر" : "Travel date", doc.startDate || doc.issueDate]} b={[isAr ? "صالحة حتى" : "Valid until", doc.expiryDate]} />
        </div>
        <div className="tk-stub">
          <small>{isAr ? "رقم التذكرة" : "Ticket no."}</small>
          <b className="mono">{doc.number || "—"}</b>
          <span className="bars" aria-hidden="true" />
        </div>
      </>
    );
  }
  return null;
}

