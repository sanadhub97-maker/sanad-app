import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Building2, CalendarDays, Clock, Edit, FileText, FolderOpen, Hash, Hourglass, LayoutGrid, Printer, Stamp, StickyNote, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { localized, namePair } from "@/lib/names";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { employeesApi } from "@/api/employees";
import { workforceDocumentsApi, type WorkforceDocumentItem } from "@/api/workforceDocuments";
import { EMPLOYEE_DOCUMENT_TYPE_ICONS } from "@/lib/document-type-icons";
import { daysFromToday, dmy } from "@/components/royal/rp";
import { Attachment, DCard, DetailBar, DocHero, Fact, History, MiniDoc, Owner, Reminders, dateEm, estColor, initialsOf, termOf, useBack, useRecordHistory, useReminderDays } from "@/components/royal/cards";
import { WorkforceDocumentDialog } from "./workforce-document-dialog";
import { EmployeeDocumentDialog } from "@/pages/employees/employee-document-dialog";
import { EMP_DOC_KINDS, kindOfDoc } from "./emp-doc-kinds";
import { employeeDocs } from "./employee-docs";

/* One employee document on its own page, as in the approved preview: the
   hero with the days left and its life from issue to expiry, then cards for
   its facts, the attached file, its history, its employee, the alert dates
   and the employee's other documents. */

export default function EmployeeDocumentDetailsPage() {
  const { employeeId, docKey } = useParams();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const remind = useReminderDays();
  const back = useBack("/employee-documents");
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: emp, isLoading, isError } = useQuery({ queryKey: ["employees", employeeId], queryFn: () => employeesApi.getById(employeeId!), enabled: Boolean(employeeId) });
  const all = emp ? employeeDocs(emp, isAr) : [];
  const doc = all.find((d) => d.key === docKey);
  const { data: history } = useRecordHistory(doc ? (doc.embedded ? emp?.id : doc.id) : undefined);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>;
  const listTitle = t("employeeDocuments.title", { defaultValue: "مستندات الموظفين" });
  if (isError || !emp || !doc)
    return (
      <div className="rp rc">
        <DetailBar from={listTitle} here="—" onBack={() => navigate("/employee-documents")} />
        <div className="rp-card rp-empty">{isAr ? "الوثيقة غير موجودة أو تم حذفها" : "This document was not found or was deleted"}</div>
      </div>
    );

  const name = namePair(emp.fullNameAr, emp.fullNameEn, isAr).primary;
  const branch = localized(emp.branch?.name, emp.branch?.nameEn);
  const Icon = EMPLOYEE_DOCUMENT_TYPE_ICONS[doc.type] ?? FileText;
  const days = daysFromToday(doc.expiryDate);
  const term = termOf(doc.issueDate, doc.expiryDate);
  const others = all.filter((d) => d.key !== doc.key).sort((a, b) => (daysFromToday(a.expiryDate) ?? 99999) - (daysFromToday(b.expiryDate) ?? 99999));
  const canEdit = hasPermission("employees.edit");
  const { raw, kind } = kindOfDoc({ type: doc.type, iqamaNumber: null });
  const workforceType = kind && EMP_DOC_KINDS.some((k) => k.value === kind.value) ? kind.value : null;
  const asItem: WorkforceDocumentItem = {
    // The API addresses the iqama and passport on the employee as "iqama-<id>" / "passport-<id>".
    id: doc.embedded ? `${doc.type.toLowerCase()}-${emp.id}` : doc.id,
    employeeId: emp.id,
    type: doc.type,
    documentNumber: doc.number,
    issuingAuthority: doc.issuingAuthority,
    passportCountry: doc.type === "PASSPORT" ? emp.passportCountry : null,
    issueDate: doc.issueDate,
    expiryDate: doc.expiryDate,
    fileId: doc.fileId,
    notes: doc.notes,
    status: doc.status ?? "VALID",
  };

  async function remove() {
    try {
      await workforceDocumentsApi.remove(asItem.id, raw);
      toast.success(isAr ? "تم حذف الوثيقة بنجاح" : "Document deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["workforce-documents-unified"] });
      queryClient.invalidateQueries({ queryKey: ["workforce-category-counts"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      navigate("/employee-documents", { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="rp rc">
      <DetailBar from={listTitle} here={doc.label} onBack={back} />

      <DocHero
        kind={doc.label}
        kindCode={doc.type}
        icon={Icon}
        owner={name}
        ownerIcon={User}
        number={doc.number}
        issueDate={doc.issueDate}
        expiryDate={doc.expiryDate}
        chips={
          <>
            {doc.authority && (
              <span>
                <small>{isAr ? "الجهة" : "Authority"}</small>
                {doc.authority}
              </span>
            )}
            {doc.issueDate && doc.expiryDate && (
              <span>
                <small>{isAr ? "المدة" : "Term"}</small>
                {term >= 365 ? (isAr ? `${Math.round(term / 365)} سنة` : `${Math.round(term / 365)} yr`) : isAr ? `${term} يوم` : `${term} days`}
              </span>
            )}
            {doc.linkedToIqama ? (
              <span>
                <small>{isAr ? "مرتبط بالإقامة" : "Follows the iqama"}</small>
                {isAr ? "يتجدد مع الإقامة تلقائيًا" : "Renews with the iqama"}
              </span>
            ) : (
              <span>
                <FileText />
                {doc.fileId ? (isAr ? "مرفق" : "Attached") : isAr ? "بدون مرفق" : "No file"}
              </span>
            )}
          </>
        }
        actions={
          <>
            {/* A domestic worker's insurance changes with the iqama, not on its own. */}
            {doc.linkedToIqama && canEdit && (
              <button type="button" className="rc-btn pri" onClick={() => navigate(`/employee-documents/${emp.id}/IQAMA`)} style={{ height: 38 }}>
                <Edit />
                {isAr ? "افتح الإقامة" : "Open the iqama"}
              </button>
            )}
            {!doc.linkedToIqama && canEdit && (
              <button type="button" className="rc-btn pri" onClick={() => setEditOpen(true)} style={{ height: 38 }}>
                <Edit />
                {days !== null && days <= 30 ? (isAr ? "تجديد الوثيقة" : "Renew") : isAr ? "تعديل" : "Edit"}
              </button>
            )}
            <button type="button" className="rc-btn" onClick={() => window.print()} style={{ height: 38 }}>
              <Printer />
              {isAr ? "طباعة" : "Print"}
            </button>
            {!doc.linkedToIqama && canEdit && (
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
          <DCard title={isAr ? "بيانات الوثيقة" : "Document details"} icon={FileText}>
            <div className="rc-facts">
              <Fact label={isAr ? "رقم الوثيقة" : "Document number"} icon={Hash} value={<span className="rp-mono" style={{ fontSize: 14 }}>{doc.number || "—"}</span>} copy={doc.number} />
              <Fact label={isAr ? "نوع الوثيقة" : "Kind"} icon={LayoutGrid} value={doc.label} />
              <Fact label={isAr ? "تاريخ الإصدار" : "Issue date"} icon={Clock} value={<span className="rp-num">{doc.issueDate ? dmy(doc.issueDate) : "—"}</span>} em={dateEm(doc.issueDate)} />
              <Fact label={isAr ? "تاريخ الانتهاء" : "Expiry date"} icon={Hourglass} value={<span className="rp-num">{doc.expiryDate ? dmy(doc.expiryDate) : "—"}</span>} em={dateEm(doc.expiryDate)} />
              <Fact label={isAr ? "الجهة المصدرة" : "Issuing authority"} icon={Stamp} value={doc.authority || "—"} />
              <Fact
                label={isAr ? "المتبقي" : "Time left"}
                icon={Hourglass}
                value={days === null ? "—" : days < 0 ? <span style={{ color: "var(--bad)" }}>{isAr ? `انتهت منذ ${-days} يوم` : `Ended ${-days} days ago`}</span> : isAr ? `${days} يوم` : `${days} days`}
                em={days === null ? undefined : days < 0 ? (isAr ? "يلزم التجديد فورًا" : "Renew now") : days >= 30 ? (isAr ? `${Math.floor(days / 30)} شهر و${days % 30} يوم` : `${Math.floor(days / 30)} mo ${days % 30} d`) : isAr ? "أقل من شهر" : "Under a month"}
              />
              <Fact label={isAr ? "الرقم الوظيفي" : "Employee no."} icon={User} value={<span className="rp-mono" style={{ fontSize: 14 }}>{emp.employeeNumber}</span>} />
              <Fact label={isAr ? "المؤسسة" : "Establishment"} icon={Building2} value={branch || "—"} />
              {doc.notes && <Fact label={isAr ? "ملاحظات" : "Notes"} icon={StickyNote} value={<span style={{ whiteSpace: "pre-wrap", fontWeight: 500 }}>{doc.notes}</span>} wide />}
            </div>
          </DCard>
          <DCard title={isAr ? "المرفق" : "Attachment"} icon={FolderOpen} color="var(--teal)" i={4}>
            <Attachment fileId={doc.fileId} fileName={`${doc.label} - ${name}.pdf`} onAdd={canEdit && !doc.linkedToIqama ? () => setEditOpen(true) : undefined} />
          </DCard>
          {hasPermission("auditLogs.view") && (
            <DCard title={doc.embedded ? (isAr ? "سجل ملف الموظف" : "Employee record history") : isAr ? "سجل الوثيقة" : "Document history"} icon={Clock} color="var(--vio)" right={history ? (isAr ? `${history.data.length} أحداث` : `${history.data.length} events`) : undefined} i={5}>
              <History items={history?.data} createdAt={doc.embedded ? emp.createdAt : undefined} />
            </DCard>
          )}
        </div>
        <div className="rc-dcol">
          <DCard title={isAr ? "صاحب الوثيقة" : "Employee"} icon={User}>
            <Owner
              tile={initialsOf(name)}
              round
              color={estColor(emp.branch?.code || emp.branchId)}
              title={name}
              sub={[localized(emp.jobTitle, emp.jobTitleEn), emp.employeeNumber, branch].filter(Boolean).join(" · ")}
              onOpen={() => navigate(`/employees/${emp.id}`)}
            />
          </DCard>
          <DCard title={isAr ? "مواعيد التنبيه" : "Alert dates"} icon={Bell} color="var(--warn)" right={isAr ? "قبل الانتهاء" : "Before expiry"} i={4}>
            <Reminders expiryDate={doc.expiryDate} days={remind} />
          </DCard>
          {others.length > 0 && (
            <DCard title={isAr ? "وثائق أخرى للموظف" : "Other documents"} icon={LayoutGrid} color="var(--sky)" right={others.length} i={5}>
              <div className="rc-mdocs one">
                {others.map((o) => (
                  <MiniDoc key={o.key} title={o.label} sub={<span className="rp-mono">{o.number || "—"}</span>} expiryDate={o.expiryDate} onClick={() => navigate(`/employee-documents/${emp.id}/${o.key}`, { replace: true })} />
                ))}
              </div>
            </DCard>
          )}
          <DCard title={isAr ? "أُضيف في" : "Added"} icon={CalendarDays} color="var(--muted)" i={6}>
            <div className="rc-none" style={{ textAlign: "start" }}>
              {dmy(doc.createdAt ?? emp.createdAt)} · {dateEm(doc.createdAt ?? emp.createdAt)}
            </div>
          </DCard>
        </div>
      </div>

      {workforceType ? (
        <WorkforceDocumentDialog open={editOpen} docType={workforceType as never} document={asItem} queryKey="workforce-documents-unified" onOpenChange={setEditOpen} />
      ) : (
        <EmployeeDocumentDialog employeeId={emp.id} open={editOpen} document={emp.documents?.find((d) => d.id === doc.id)} onOpenChange={setEditOpen} />
      )}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("employeeDocuments.deleteConfirmTitle", { defaultValue: "تأكيد حذف الوثيقة؟" })}
        description={t("employeeDocuments.deleteConfirmBody", { defaultValue: "هل أنت متأكد من رغبتك في حذف هذا المستند من سجلات الموظف؟" })}
        onConfirm={remove}
      />
    </div>
  );
}
