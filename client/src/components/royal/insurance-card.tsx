import { HeartPulse } from "lucide-react";
import { daysFromToday, dmy } from "@/components/royal/rp";

/* A domestic worker's medical insurance card. It is not a document of its own:
   it runs with the iqama (server: services/domesticInsurance), so it is valid
   until the iqama ends and renews when the iqama does. The member number is the
   iqama number. Drawn like a real card: the insurer's band, the holder, the
   member number, and the validity with its state. */

export interface InsuranceCardProps {
  isAr: boolean;
  company?: string | null;
  name: string;
  nameEn?: string | null;
  iqamaNumber?: string | null;
  iqamaExpiryDate?: string | null;
  nationality?: string | null;
  profession?: string | null;
}

export function InsuranceCard({ isAr, company, name, nameEn, iqamaNumber, iqamaExpiryDate, nationality, profession }: InsuranceCardProps) {
  const days = daysFromToday(iqamaExpiryDate);
  const state = days === null ? "none" : days < 0 ? "bad" : days <= 30 ? "warn" : "ok";
  const label =
    state === "none"
      ? isAr ? "بانتظار تاريخ الإقامة" : "Awaiting the iqama date"
      : state === "bad"
        ? isAr ? "منتهية مع الإقامة" : "Ended with the iqama"
        : state === "warn"
          ? isAr ? "قاربت على الانتهاء" : "Ending soon"
          : isAr ? "سارية" : "Valid";
  return (
    <div className={`rx-ins rx-ins-${state}`} dir={isAr ? "rtl" : "ltr"}>
      <i className="gw" aria-hidden="true" />
      <i className="holo" aria-hidden="true" />
      <div className="top">
        <span className="ic" aria-hidden="true">
          <HeartPulse />
        </span>
        <span className="t">
          <b>{isAr ? "بطاقة تأمين طبي" : "Medical insurance card"}</b>
          <small>{company || (isAr ? "المنشأة" : "Establishment")}</small>
        </span>
        <span className="st">{label}</span>
      </div>
      <div className="who">
        <b>{name}</b>
        {nameEn && nameEn !== name && <bdi>{nameEn}</bdi>}
      </div>
      <div className="grid">
        <span>
          <small>{isAr ? "رقم العضوية (الإقامة)" : "Member no. (iqama)"}</small>
          <b className="mono">{iqamaNumber || "—"}</b>
        </span>
        <span>
          <small>{isAr ? "سارية حتى" : "Valid until"}</small>
          <b className="mono">{iqamaExpiryDate ? dmy(iqamaExpiryDate) : "—"}</b>
        </span>
        <span>
          <small>{isAr ? "المهنة" : "Profession"}</small>
          <b>{profession || "—"}</b>
        </span>
        <span>
          <small>{isAr ? "الجنسية" : "Nationality"}</small>
          <b>{nationality || "—"}</b>
        </span>
      </div>
      <div className="foot">{isAr ? "مرتبطة بالإقامة · سارية طول ما الإقامة سارية، وبتتجدد مع تجديدها" : "Runs with the iqama · valid while it is, renewed with it"}</div>
    </div>
  );
}
