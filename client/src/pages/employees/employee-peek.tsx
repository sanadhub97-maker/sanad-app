import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Pencil, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PxBadge, PxDrawer, PxTabs, type BadgeTone } from "@/components/royal/px";
import { dmy } from "@/components/royal/rp";
import { SaudiAvatar } from "@/components/avatars/saudi-avatar";
import { employeeDocumentsApi, employeePdfUrl } from "@/api/employees";
import { openPdfInNewTab } from "@/lib/download";
import { localized, namePair } from "@/lib/names";
import type { Employee } from "@/types/models";

/* The side panel an employee row opens (as in the approved preview): who they
   are, their status, and two tabs — their details and their documents — with
   renew/edit, print and the full profile at the bottom. */

const toneOf = (s?: string | null): BadgeTone => (s === "EXPIRED" ? "bad" : s === "EXPIRING_SOON" ? "warn" : s === "VALID" ? "ok" : "mut");

export function EmployeePeek({ employee: e, isAr, onClose, onEdit }: { employee: Employee | null; isAr: boolean; onClose: () => void; onEdit?: (e: Employee) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"info" | "docs">("info");
  const { data: docs } = useQuery({ queryKey: ["employee-documents", e?.id], queryFn: () => employeeDocumentsApi.list(e!.id), enabled: Boolean(e) && tab === "docs" });
  if (!e) return null;
  const { primary: name, secondary } = namePair(e.fullNameAr, e.fullNameEn, isAr);
  const job = localized(e.jobTitle, e.jobTitleEn);
  const branch = localized(e.branch?.name, e.branch?.nameEn);
  const statusText = (s?: string | null) => (s ? t(`status.${s}`, { defaultValue: s }) : isAr ? "غير مسجّلة" : "Not recorded");
  const info: [string, string | null | undefined][] = [
    [isAr ? "الرقم الوظيفي" : "Employee number", e.employeeNumber],
    [isAr ? "المسمى الوظيفي" : "Job title", job],
    [isAr ? "المؤسسة" : "Establishment", branch],
    [isAr ? "الجنسية" : "Nationality", isAr ? e.nationality || e.nationalityEn : e.nationalityEn || e.nationality],
    [isAr ? "رقم الإقامة" : "Iqama number", e.iqamaNumber],
    [isAr ? "انتهاء الإقامة" : "Iqama expiry", e.iqamaExpiryDate ? dmy(e.iqamaExpiryDate) : null],
    [isAr ? "الجوال" : "Mobile", e.mobile],
    [isAr ? "تاريخ الالتحاق" : "Joined", e.joiningDate ? dmy(e.joiningDate) : null],
  ];
  const own: { label: string; date?: string | null; status?: string | null }[] = [
    { label: isAr ? "الإقامة" : "Iqama", date: e.iqamaExpiryDate, status: e.iqamaStatus },
    { label: isAr ? "جواز السفر" : "Passport", date: e.passportExpiryDate, status: e.passportStatus },
  ];

  return (
    <PxDrawer open onClose={onClose} label={name}>
      <div className="px-dh">
        <span className="px-av">
          <SaudiAvatar gender={e.gender} size="md" className="h-full w-full" />
        </span>
        <div className="min-w-0">
          <b>{name}</b>
          <small>{[job, branch].filter(Boolean).join(" · ") || secondary}</small>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <PxBadge tone={toneOf(e.iqamaStatus)}>
              {isAr ? "الإقامة: " : "Iqama: "}
              {statusText(e.iqamaStatus)}
            </PxBadge>
            <PxBadge tone={e.employmentStatus === "ACTIVE" ? "ok" : "mut"}>{t(`status.${e.employmentStatus}`, { defaultValue: e.employmentStatus })}</PxBadge>
          </div>
        </div>
      </div>
      <PxTabs
        value={tab}
        onChange={setTab}
        items={[
          { key: "info", label: isAr ? "البيانات" : "Details" },
          { key: "docs", label: isAr ? "الوثائق" : "Documents" },
        ]}
      />
      <div className="px-db">
        {tab === "info" ? (
          <div className="px-kv">
            {info.map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b dir={/\d/.test(v ?? "") ? "ltr" : undefined}>{v || "—"}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-kv">
            {own.map((d) => (
              <div key={d.label}>
                <span>
                  {d.label}
                  <br />
                  <small dir="ltr">{d.date ? dmy(d.date) : "—"}</small>
                </span>
                <PxBadge tone={toneOf(d.status)}>{statusText(d.status)}</PxBadge>
              </div>
            ))}
            {(docs ?? []).map((d) => (
              <div key={d.id}>
                <span>
                  {d.name || t(`documentTypes.${d.type}`, { defaultValue: d.type })}
                  <br />
                  <small dir="ltr">{d.expiryDate ? dmy(d.expiryDate) : "—"}</small>
                </span>
                <PxBadge tone={toneOf(d.status)}>{statusText(d.status)}</PxBadge>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-df">
        {onEdit && (
          <Button onClick={() => onEdit(e)}>
            <Pencil className="h-4 w-4" /> {isAr ? "تعديل البيانات" : "Edit"}
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate(`/employees/${e.id}`)}>
          <ExternalLink className="h-4 w-4" /> {isAr ? "الملف كامل" : "Full profile"}
        </Button>
        <span className="sp" />
        <Button variant="ghost" onClick={() => openPdfInNewTab(employeePdfUrl(e.id))}>
          <Printer className="h-4 w-4" /> {isAr ? "طباعة الملف" : "Print"}
        </Button>
      </div>
    </PxDrawer>
  );
}
