import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Building2, CalendarDays, Clock, Edit, FileText, FolderOpen, Hash, Hourglass, LayoutGrid, MapPin, Printer, Stamp, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { localized, localizedCity } from "@/lib/names";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { companyDocumentsApi, COMPANY_DOCUMENT_CATEGORIES } from "@/api/companyDocuments";
import { COMPANY_DOCUMENT_CATEGORY_ICONS } from "@/lib/document-type-icons";
import { daysFromToday, dmy } from "@/components/royal/rp";
import { Attachment, DCard, DetailBar, DocHero, Fact, History, MiniDoc, Owner, Reminders, dateEm, estColor, initialsOf, termOf, useBack, useRecordHistory, useReminderDays } from "@/components/royal/cards";
import { CompanyDocumentDialog } from "@/pages/companyDocuments/company-document-dialog";

/* One company document on its own page, as in the approved preview: the hero
   with the days left and its life from issue to expiry, then cards for its
   facts, the attached file, its history, its establishment, the alert dates
   and the establishment's other documents. */

export default function CompanyDocumentDetailsPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const remind = useReminderDays();
  const back = useBack("/company-documents");

  const { data: doc, isLoading, isError } = useQuery({ queryKey: ["companyDocuments", "detail", id], queryFn: () => companyDocumentsApi.getById(id!), enabled: Boolean(id) });
  const { data: siblings } = useQuery({
    queryKey: ["companyDocuments", "branch", doc?.branchId],
    queryFn: () => companyDocumentsApi.list({ branchId: doc!.branchId, pageSize: 50 }),
    enabled: Boolean(doc?.branchId),
  });
  const { data: history } = useRecordHistory(id);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (isError || !doc)
    return (
      <div className="rp rc">
        <DetailBar from={t("companyDocuments.title")} here="—" onBack={() => navigate("/company-documents")} />
        <div className="rp-card rp-empty">{isAr ? "المستند غير موجود أو تم حذفه" : "This document was not found or was deleted"}</div>
      </div>
    );

  const kind = t(`documentCategories.${doc.category}`);
  const Icon = COMPANY_DOCUMENT_CATEGORY_ICONS[doc.category] ?? FileText;
  const number = doc.documentNumber || doc.licenseNumber;
  const issued = doc.issueDate || doc.startDate;
  const days = daysFromToday(doc.expiryDate);
  const branchName = localized(doc.branch?.name, doc.branch?.nameEn) || localized(doc.name, doc.nameEn) || "—";
  const term = termOf(issued, doc.expiryDate);
  const others = (siblings?.data ?? []).filter((d) => d.id !== doc.id).sort((a, b) => (daysFromToday(a.expiryDate) ?? 99999) - (daysFromToday(b.expiryDate) ?? 99999));
  const canEdit = hasPermission("companyDocuments.edit");

  async function remove() {
    try {
      await companyDocumentsApi.remove(doc!.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["companyDocuments"] });
      navigate("/company-documents", { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="rp rc">
      <DetailBar from={t("companyDocuments.title")} here={kind} onBack={back} />

      <DocHero
        kind={kind}
        kindCode={doc.category}
        icon={Icon}
        owner={branchName}
        ownerIcon={Building2}
        number={number}
        issueDate={issued}
        expiryDate={doc.expiryDate}
        chips={
          <>
            {doc.issuingAuthority && (
              <span>
                <small>{isAr ? "الجهة" : "Authority"}</small>
                {doc.issuingAuthority}
              </span>
            )}
            {issued && doc.expiryDate && (
              <span>
                <small>{isAr ? "المدة" : "Term"}</small>
                {term >= 365 ? (isAr ? `${Math.round(term / 365)} سنة` : `${Math.round(term / 365)} yr`) : isAr ? `${term} يوم` : `${term} days`}
              </span>
            )}
            <span>
              <FileText />
              {doc.fileId ? (isAr ? "مرفق" : "Attached") : isAr ? "بدون مرفق" : "No file"}
            </span>
          </>
        }
        actions={
          <>
            {canEdit && (
              <button type="button" className="rc-btn pri" onClick={() => setEditOpen(true)} style={{ height: 38 }}>
                <Edit />
                {days !== null && days <= 30 ? (isAr ? "تجديد المستند" : "Renew") : isAr ? "تعديل" : "Edit"}
              </button>
            )}
            <button type="button" className="rc-btn" onClick={() => window.print()} style={{ height: 38 }}>
              <Printer />
              {isAr ? "طباعة" : "Print"}
            </button>
            {hasPermission("companyDocuments.delete") && (
              <button type="button" className="rc-btn" onClick={() => setDeleting(true)} style={{ height: 38, color: "var(--bad)" }}>
                <Trash2 />
                {isAr ? "حذف" : "Delete"}
              </button>
            )}
          </>
        }
      />

      <div className="rc-dgrid">
        <div className="rc-dcol">
          <DCard title={isAr ? "بيانات المستند" : "Document details"} icon={FileText}>
            <div className="rc-facts">
              <Fact label={isAr ? "رقم المستند" : "Document number"} icon={Hash} value={<span className="rp-mono" style={{ fontSize: 14 }}>{number || "—"}</span>} copy={number} />
              <Fact label={isAr ? "نوع المستند" : "Kind"} icon={LayoutGrid} value={kind} />
              <Fact label={isAr ? "تاريخ الإصدار" : "Issue date"} icon={Clock} value={<span className="rp-num">{issued ? dmy(issued) : "—"}</span>} em={dateEm(issued)} />
              <Fact label={isAr ? "تاريخ الانتهاء" : "Expiry date"} icon={Hourglass} value={<span className="rp-num">{doc.expiryDate ? dmy(doc.expiryDate) : "—"}</span>} em={dateEm(doc.expiryDate)} />
              <Fact label={isAr ? "الجهة المصدرة" : "Issuing authority"} icon={Stamp} value={doc.issuingAuthority || "—"} />
              <Fact label={isAr ? "المدينة" : "City"} icon={MapPin} value={localizedCity(doc.city, null) || "—"} />
              <Fact
                label={isAr ? "المتبقي" : "Time left"}
                icon={Hourglass}
                value={days === null ? "—" : days < 0 ? <span style={{ color: "var(--bad)" }}>{isAr ? `انتهى منذ ${-days} يوم` : `Ended ${-days} days ago`}</span> : isAr ? `${days} يوم` : `${days} days`}
                em={days === null ? undefined : days < 0 ? (isAr ? "يلزم التجديد فورًا" : "Renew now") : days >= 30 ? (isAr ? `${Math.floor(days / 30)} شهر و${days % 30} يوم` : `${Math.floor(days / 30)} mo ${days % 30} d`) : isAr ? "أقل من شهر" : "Under a month"}
              />
              <Fact label={isAr ? "أُضيف في" : "Added on"} icon={CalendarDays} value={<span className="rp-num">{dmy(doc.createdAt)}</span>} em={dateEm(doc.createdAt)} />
              {doc.notes && <Fact label={isAr ? "ملاحظات" : "Notes"} icon={StickyNote} value={<span style={{ whiteSpace: "pre-wrap", fontWeight: 500 }}>{doc.notes}</span>} wide />}
            </div>
          </DCard>
          <DCard title={isAr ? "المرفق" : "Attachment"} icon={FolderOpen} color="var(--teal)" i={4}>
            <Attachment fileId={doc.fileId} fileName={`${kind} - ${branchName}.pdf`} color={`var(--pri)`} onAdd={canEdit ? () => setEditOpen(true) : undefined} />
          </DCard>
          {hasPermission("auditLogs.view") && (
            <DCard title={isAr ? "سجل المستند" : "Document history"} icon={Clock} color="var(--vio)" right={history ? (isAr ? `${history.data.length} أحداث` : `${history.data.length} events`) : undefined} i={5}>
              <History items={history?.data} createdAt={doc.createdAt} />
            </DCard>
          )}
        </div>
        <div className="rc-dcol">
          <DCard title={isAr ? "المؤسسة المالكة" : "Establishment"} icon={Building2}>
            <Owner
              tile={initialsOf(branchName)}
              color={estColor(doc.branch?.code || doc.branchId)}
              title={branchName}
              sub={[doc.branch?.code, localizedCity(doc.city, null)].filter(Boolean).join(" · ")}
              onOpen={doc.branchId && hasPermission("branches.view") ? () => navigate(`/branches/${doc.branchId}`) : undefined}
            />
          </DCard>
          <DCard title={isAr ? "مواعيد التنبيه" : "Alert dates"} icon={Bell} color="var(--warn)" right={isAr ? "قبل الانتهاء" : "Before expiry"} i={4}>
            <Reminders expiryDate={doc.expiryDate} days={remind} />
          </DCard>
          {others.length > 0 && (
            <DCard title={isAr ? "مستندات أخرى للمؤسسة" : "Other documents"} icon={LayoutGrid} color="var(--sky)" right={others.length} i={5}>
              <div className="rc-mdocs one">
                {others.slice(0, 6).map((o) => (
                  <MiniDoc key={o.id} title={t(`documentCategories.${o.category}`)} sub={<span className="rp-mono">{o.documentNumber || o.licenseNumber || "—"}</span>} expiryDate={o.expiryDate} onClick={() => navigate(`/company-documents/${o.id}`)} />
                ))}
              </div>
            </DCard>
          )}
        </div>
      </div>

      <CompanyDocumentDialog api={companyDocumentsApi} categories={COMPANY_DOCUMENT_CATEGORIES} queryKey="companyDocuments" open={editOpen} document={doc} onOpenChange={setEditOpen} />
      <ConfirmDialog open={deleting} onOpenChange={setDeleting} title={t("companyDocuments.deleteConfirmTitle")} onConfirm={remove} />
    </div>
  );
}
