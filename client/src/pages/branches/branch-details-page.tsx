import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Building2, Calendar, Clock, Edit, FileText, Hash, Mail, MapPin, Phone, Plus, Printer, StickyNote, Trash2, User, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SaudiAvatar } from "@/components/avatars/saudi-avatar";
import { localized, localizedCity, namePair } from "@/lib/names";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { branchesApi } from "@/api/branches";
import { employeesApi } from "@/api/employees";
import { companyDocumentsApi, COMPANY_DOCUMENT_CATEGORIES } from "@/api/companyDocuments";
import { paymentsApi } from "@/api/payments";
import { daysFromToday, dmy, weekday } from "@/components/royal/rp";
import { BigRing, CoverHero, DCard, DetailBar, Fact, History, MiniDoc, Ticker, compColor, dateEm, estColor, initialsOf, useBack, useRecordHistory, useReminderDays } from "@/components/royal/cards";
import { BranchDialog } from "@/pages/branches/branch-dialog";
import { CompanyDocumentDialog } from "@/pages/companyDocuments/company-document-dialog";

/* One establishment on its own page, as in the approved preview: a cover hero
   with its compliance, the rotating ticker of what ends soon, then cards for
   its documents, its employees, its details, the latest payments, the next
   alerts and the latest activity. */

export default function BranchDetailsPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const back = useBack("/branches");
  const remind = useReminderDays();
  const [editOpen, setEditOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: b, isLoading, isError } = useQuery({ queryKey: ["branches", "detail", id], queryFn: () => branchesApi.getById(id!), enabled: Boolean(id) });
  const { data: staff } = useQuery({ queryKey: ["employees", { branchId: id, pageSize: 100 }], queryFn: () => employeesApi.list({ branchId: id, pageSize: 100 }), enabled: Boolean(id) && hasPermission("employees.view") });
  const { data: docsRes } = useQuery({ queryKey: ["companyDocuments", "branch", id], queryFn: () => companyDocumentsApi.list({ branchId: id, pageSize: 100 }), enabled: Boolean(id) && hasPermission("companyDocuments.view") });
  const { data: pays } = useQuery({ queryKey: ["payments", "byBranch", id], queryFn: () => paymentsApi.list({ branchId: id, pageSize: 6, sortBy: "paymentDate", sortOrder: "desc" }), enabled: Boolean(id) && hasPermission("payments.view") });
  const { data: history } = useRecordHistory(id);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (isError || !b)
    return (
      <div className="rp rc">
        <DetailBar from={t("branches.title")} here="—" onBack={() => navigate("/branches")} />
        <div className="rp-card rp-empty">{isAr ? "المؤسسة غير موجودة أو تم حذفها" : "This establishment was not found or was deleted"}</div>
      </div>
    );

  const name = localized(b.name, b.nameEn) || b.name;
  const other = isAr ? b.nameEn : b.name;
  const city = localizedCity(b.city, b.cityEn);
  const color = estColor(b.code || b.id);
  const docs = (docsRes?.data ?? []).slice().sort((x, y) => (daysFromToday(x.expiryDate) ?? 99999) - (daysFromToday(y.expiryDate) ?? 99999));
  const dated = docs.filter((d) => d.expiryDate);
  const valid = dated.filter((d) => (daysFromToday(d.expiryDate) ?? 0) > 30).length;
  const due = dated.length - valid;
  const pct = dated.length ? Math.round((valid / dated.length) * 100) : 0;
  const people = staff?.data ?? [];
  const paid = (pays?.data ?? []).reduce((n, p) => n + Number(p.total || 0), 0);
  const upcoming = dated.filter((d) => (daysFromToday(d.expiryDate) ?? -1) >= 0).slice(0, 4);

  async function remove() {
    try {
      await branchesApi.remove(b!.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      navigate("/branches", { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="rp rc">
      <DetailBar from={t("branches.title")} here={name} onBack={back} />

      <CoverHero
        color={color}
        tile={initialsOf(name)}
        title={name}
        sub={
          <>
            {other && other !== name && <bdi>{other}</bdi>}
            <span className="rp-mono">{b.code}</span>
          </>
        }
        chips={
          <>
            <span className="rp-pill" style={{ ["--c" as string]: b.status === "INACTIVE" ? "var(--muted)" : "var(--ok)", ["--t" as string]: b.status === "INACTIVE" ? "var(--soft)" : "var(--ok-s)" }}>
              {b.status === "INACTIVE" ? (isAr ? "غير نشطة" : "Inactive") : isAr ? "نشطة" : "Active"}
            </span>
            {city && (
              <span>
                <MapPin />
                {city}
              </span>
            )}
            {b.manager?.fullName && (
              <span>
                <small>{isAr ? "المسؤول" : "Manager"}</small>
                {b.manager.fullName}
              </span>
            )}
          </>
        }
        ring={dated.length ? <BigRing pct={pct} color={compColor(pct)} value={`${pct}%`} sub={isAr ? "الامتثال" : "Compliance"} /> : undefined}
        stats={[
          { value: staff?.meta.total ?? people.length, label: isAr ? "موظف" : "employees" },
          { value: docs.length, label: isAr ? "مستند" : "documents" },
          { value: due, label: isAr ? "تحتاج متابعة" : "to follow up", color: due ? "var(--warn)" : "var(--ok)" },
          { value: hasPermission("payments.view") ? <span className="rp-num">{formatCurrency(paid)}</span> : "—", label: isAr ? "آخر المدفوعات" : "Latest payments" },
        ]}
      />

      <div className="rc-dbar rp-rise no-print" style={{ ["--i" as string]: 2 }}>
        {docs.length > 0 && <Ticker items={docs.map((d) => ({ key: d.id, label: t(`documentCategories.${d.category}`), date: d.expiryDate }))} />}
        <div className="rc-acts">
          {hasPermission("companyDocuments.create") && (
            <button type="button" className="rc-btn pri" style={{ height: 38 }} onClick={() => setDocOpen(true)}>
              <Plus />
              {isAr ? "إضافة مستند" : "Add document"}
            </button>
          )}
          {hasPermission("branches.edit") && (
            <button type="button" className="rc-btn" style={{ height: 38 }} onClick={() => setEditOpen(true)}>
              <Edit />
              {isAr ? "تعديل" : "Edit"}
            </button>
          )}
          <button type="button" className="rc-btn" style={{ height: 38 }} onClick={() => window.print()}>
            <Printer />
            {isAr ? "طباعة" : "Print"}
          </button>
          {hasPermission("branches.delete") && (
            <button type="button" className="rc-btn" style={{ height: 38, color: "var(--bad)" }} onClick={() => setDeleting(true)}>
              <Trash2 />
              {isAr ? "حذف" : "Delete"}
            </button>
          )}
        </div>
      </div>

      <div className="rc-dgrid">
        <div className="rc-dcol">
          {hasPermission("companyDocuments.view") && (
            <DCard title={isAr ? "المستندات" : "Documents"} icon={FileText} right={isAr ? `${docs.length} مستندات · اضغط للتفاصيل` : `${docs.length} documents · open for details`}>
              {docs.length ? (
                <div className="rc-mdocs">
                  {docs.map((d) => (
                    <MiniDoc key={d.id} title={t(`documentCategories.${d.category}`)} sub={<span className="rp-mono">{d.documentNumber || d.licenseNumber || "—"}</span>} expiryDate={d.expiryDate} onClick={() => navigate(`/company-documents/${d.id}`)} />
                  ))}
                </div>
              ) : (
                <div className="rc-none">{isAr ? "لا توجد مستندات لهذه المؤسسة" : "No documents for this establishment"}</div>
              )}
            </DCard>
          )}
          {hasPermission("employees.view") && (
            <DCard title={isAr ? "الموظفون" : "Employees"} icon={Users} color="var(--vio)" right={staff?.meta.total ?? people.length} i={4}>
              {people.length ? (
                <div className="rc-ppl">
                  {people.map((p) => {
                    const worst = Math.min(daysFromToday(p.iqamaExpiryDate) ?? 999, daysFromToday(p.passportExpiryDate) ?? 999);
                    return (
                      <button key={p.id} type="button" className="rc-per" onClick={() => navigate(`/employees/${p.id}`)}>
                        <span className="rp-av">
                          <SaudiAvatar gender={p.gender} size="md" className="h-full w-full" />
                        </span>
                        <span className="t">
                          <b>{namePair(p.fullNameAr, p.fullNameEn, isAr).primary}</b>
                          <small>{localized(p.jobTitle, p.jobTitleEn) || p.employeeNumber}</small>
                        </span>
                        {worst <= 30 && (
                          <span className="rp-pill nodot" style={{ ["--c" as string]: worst < 0 ? "var(--bad)" : "var(--warn)", ["--t" as string]: worst < 0 ? "var(--bad-s)" : "var(--warn-s)" }}>
                            {worst < 0 ? (isAr ? "منتهية" : "Expired") : isAr ? `${worst} يوم` : `${worst}d`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rc-none">{isAr ? "لا يوجد موظفون في هذه المؤسسة" : "No employees in this establishment"}</div>
              )}
            </DCard>
          )}
          <DCard title={isAr ? "بيانات المؤسسة" : "Establishment details"} icon={Building2} color="var(--teal)" i={5}>
            <div className="rc-facts">
              <Fact label={isAr ? "الرمز" : "Code"} icon={Hash} value={<span className="rp-mono" style={{ fontSize: 14 }}>{b.code}</span>} copy={b.code} />
              <Fact label={isAr ? "اسم المالك" : "Owner name"} icon={User} value={b.ownerName || "—"} />
              <Fact label={isAr ? "المدينة" : "City"} icon={MapPin} value={city || "—"} />
              <Fact label={isAr ? "المسؤول" : "Manager"} icon={User} value={b.manager?.fullName || "—"} />
              <Fact label={t("branches.fields.phone")} icon={Phone} value={b.phone ? <a href={`tel:${b.phone}`} className="rp-num">{b.phone}</a> : "—"} copy={b.phone} />
              <Fact label={t("branches.fields.email")} icon={Mail} value={b.email ? <a href={`mailto:${b.email}`}>{b.email}</a> : "—"} />
              <Fact label={isAr ? "تاريخ التسجيل" : "Added on"} icon={Calendar} value={<span className="rp-num">{dmy(b.createdAt)}</span>} em={dateEm(b.createdAt)} />
              {b.address && <Fact label={t("branches.fields.address")} icon={MapPin} value={b.address} wide />}
              {b.notes && <Fact label={t("branches.fields.notes")} icon={StickyNote} value={<span style={{ whiteSpace: "pre-wrap", fontWeight: 500 }}>{b.notes}</span>} wide />}
            </div>
          </DCard>
        </div>
        <div className="rc-dcol">
          {hasPermission("payments.view") && (
            <DCard title={isAr ? "آخر المدفوعات" : "Latest payments"} icon={Wallet} color="var(--gold)" right={pays?.meta.total ?? 0}>
              {pays && pays.data.length ? (
                <div className="rc-rows">
                  {pays.data.map((p) => (
                    <div key={p.id}>
                      <span className="d">{new Date(p.paymentDate).getDate()}</span>
                      <span className="min-w-0">
                        <b>
                          {t(`paymentCategories.${p.category}`, { defaultValue: p.category })} · <span className="rp-num">{formatCurrency(p.total)}</span>
                        </b>
                        <small>
                          {weekday(p.paymentDate)} {dmy(p.paymentDate)}
                        </small>
                      </span>
                      <small className="rp-mono">{p.paymentNumber}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rc-none">{isAr ? "لا توجد مدفوعات" : "No payments"}</div>
              )}
            </DCard>
          )}
          {upcoming.length > 0 && (
            <DCard title={isAr ? "التنبيهات القادمة" : "Next alerts"} icon={Bell} color="var(--warn)" i={4}>
              <div className="rc-rows">
                {upcoming.map((d) => {
                  const n = daysFromToday(d.expiryDate) ?? 0;
                  const k = [...remind].sort((x, y) => y - x).find((x) => x <= n);
                  const on = new Date(d.expiryDate!);
                  if (k !== undefined) on.setDate(on.getDate() - k);
                  return (
                    <button key={d.id} type="button" onClick={() => navigate(`/company-documents/${d.id}`)}>
                      <span className="d">{n}</span>
                      <span className="min-w-0">
                        <b>{t(`documentCategories.${d.category}`)}</b>
                        <small>{k !== undefined ? (isAr ? `التنبيه القادم ${weekday(on)} ${dmy(on)}` : `Next alert ${weekday(on)} ${dmy(on)}`) : isAr ? "لا توجد تنبيهات أخرى" : "No more alerts"}</small>
                      </span>
                      <small className="wait">{k !== undefined ? (isAr ? `قبل ${k} يوم` : `${k}d before`) : ""}</small>
                    </button>
                  );
                })}
              </div>
            </DCard>
          )}
          {hasPermission("auditLogs.view") && (
            <DCard title={isAr ? "آخر النشاط" : "Latest activity"} icon={Clock} color="var(--vio)" i={5}>
              <History items={history?.data} createdAt={b.createdAt} />
            </DCard>
          )}
        </div>
      </div>

      <BranchDialog open={editOpen} branch={b} onOpenChange={setEditOpen} />
      <CompanyDocumentDialog api={companyDocumentsApi} categories={COMPANY_DOCUMENT_CATEGORIES} queryKey="companyDocuments" open={docOpen} onOpenChange={setDocOpen} />
      <ConfirmDialog open={deleting} onOpenChange={setDeleting} title={t("branches.deleteConfirmTitle")} onConfirm={remove} />
    </div>
  );
}
