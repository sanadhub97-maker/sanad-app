import type { ReactNode } from "react";
import { Globe2, HeartPulse, IdCard, Plane, Stamp } from "lucide-react";
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
        <div className="idrow"><span className="chip" aria-hidden="true"><i /><i /><i /></span><div className="num mono">{doc.number || "—"}</div></div>
        <div className="fl">
          <Field k={isAr ? "المهنة" : "Profession"} v={holder.profession} />
          <Field k={isAr ? "الجنسية" : "Nationality"} v={holder.nationality} />
          <Field k={isAr ? "تاريخ الإصدار" : "Issued"} v={d(doc.issueDate)} mono />
          <Field k={isAr ? "تاريخ الانتهاء" : "Expires"} v={d(doc.expiryDate)} mono />
          <Field k={isAr ? "صاحب العمل" : "Employer"} v={holder.establishment} wide />
        </div>
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
            <Field k={isAr ? "رقم الجواز" : "Passport no."} v={doc.number} mono />
            <Field k={isAr ? "الجنسية" : "Nationality"} v={holder.nationality} />
            <Field k={isAr ? "تاريخ الإصدار" : "Issued"} v={d(doc.issueDate)} mono />
            <Field k={isAr ? "تاريخ الانتهاء" : "Expires"} v={d(doc.expiryDate)} mono />
          </div>
        </div>
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
        <div className="fl">
          <Field k={isAr ? "رقم الشهادة" : "Certificate no."} v={doc.number} mono />
          <Field k={isAr ? "الجنسية" : "Nationality"} v={holder.nationality} />
          <Field k={isAr ? "تاريخ الإصدار" : "Issued"} v={d(doc.issueDate)} mono />
          <Field k={isAr ? "تاريخ الانتهاء" : "Expires"} v={d(doc.expiryDate)} mono />
        </div>
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
            <Field k={isAr ? "رقم التأشيرة" : "Visa no."} v={doc.number} mono />
            <Field k={isAr ? "المدة" : "Duration"} v={span !== null ? (isAr ? `${span} يوم` : `${span} days`) : "—"} />
            <Field k={isAr ? "صالحة من" : "Valid from"} v={d(from)} mono />
            <Field k={isAr ? "صالحة حتى" : "Valid until"} v={d(doc.expiryDate)} mono />
          </div>
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
            <Field k={isAr ? "تاريخ السفر" : "Travel date"} v={d(doc.startDate || doc.issueDate)} mono />
            <Field k={isAr ? "صالحة حتى" : "Valid until"} v={d(doc.expiryDate)} mono />
          </div>
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

