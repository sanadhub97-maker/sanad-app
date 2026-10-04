import { useState } from "react";
import { localized, localizedCity } from "@/lib/names";
import { namePair } from "@/lib/names";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Briefcase, Gavel, Building2, Calendar, CheckCircle2, Clock, Edit, Globe, Hash, IdCard, Mail, MapPin, Phone, Plus, Printer, ShieldCheck, Sparkles, StickyNote, User, UserCheck, Wallet } from "lucide-react";
import { SaudiAvatar } from "@/components/avatars/saudi-avatar";
import { AvatarPickerDialog } from "@/components/avatars/avatar-picker-dialog";
import { EmployeeDialog } from "@/pages/employees/employee-dialog";
import { employeesApi, employeePdfUrl } from "@/api/employees";
import { paymentsApi } from "@/api/payments";
import { violationsApi } from "@/api/violations";
import { STATE_LOOK } from "@/lib/violations";
import { openPdfInNewTab } from "@/lib/download";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { EmployeeDocumentDialog } from "@/pages/employees/employee-document-dialog";
import { PrintDocumentHeader, PrintDocumentFooter } from "@/components/common/print-document-header";
import { Pill, daysFromToday, dmy, weekday } from "@/components/royal/rp";
import { BigRing, CoverHero, DCard, DetailBar, Fact, History, MiniDoc, Owner, compColor, dateEm, estColor, initialsOf, useBack, useRecordHistory } from "@/components/royal/cards";
import { employeeDocs } from "@/pages/workforce/employee-docs";

/* The employee's own page, as in the approved preview: a cover hero with the
   avatar, the status and how many documents are valid, then cards for the
   documents, the personal and work details, the payments, what the file is
   missing, the establishment and the latest activity. */

export default function EmployeeProfilePage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { id } = useParams();
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const back = useBack("/employees");

  const { data: employee, isLoading, isError } = useQuery({ queryKey: ["employees", id], queryFn: () => employeesApi.getById(id!) });
  const { data: payments } = useQuery({
    queryKey: ["payments", "byEmployee", id],
    queryFn: () => paymentsApi.list({ employeeId: id, pageSize: 10 }),
    enabled: hasPermission("payments.view"),
  });
  const { data: violations } = useQuery({
    queryKey: ["violations", "list", { employeeId: id }],
    queryFn: () => violationsApi.list({ employeeId: id, pageSize: 20 }),
    enabled: Boolean(id) && hasPermission("violations.view"),
  });
  const { data: history } = useRecordHistory(id);

  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [customAvatarId, setCustomAvatarId] = useState<string | null>(null);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (isError || !employee)
    return (
      <div className="rp rc">
        <DetailBar from={t("employees.title")} here="—" onBack={() => navigate("/employees")} />
        <div className="rp-card rp-empty">{isAr ? "الموظف غير موجود أو تم حذفه" : "This employee was not found or was deleted"}</div>
      </div>
    );

  const e = employee;
  const names = namePair(e.fullNameAr, e.fullNameEn, isAr);
  const job = localized(e.jobTitle, e.jobTitleEn);
  const nat = localized(e.nationality, e.nationalityEn);
  const branch = localized(e.branch?.name, e.branch?.nameEn);
  const color = estColor(e.branch?.code || e.branchId);
  const docs = employeeDocs(e, isAr).sort((a, b) => (daysFromToday(a.expiryDate) ?? 99999) - (daysFromToday(b.expiryDate) ?? 99999));
  const dated = docs.filter((d) => d.expiryDate);
  const valid = dated.filter((d) => (daysFromToday(d.expiryDate) ?? 0) > 30).length;
  const due = dated.length - valid;
  const pct = dated.length ? Math.round((valid / dated.length) * 100) : 0;
  const months = e.joiningDate ? Math.max(0, Math.round((Date.now() - new Date(e.joiningDate).getTime()) / 864e5 / 30)) : null;
  const statusTone = e.employmentStatus === "ACTIVE" ? ["var(--ok)", "var(--ok-s)"] : e.employmentStatus === "ON_LEAVE" ? ["var(--sky)", "var(--sky-s)"] : ["var(--bad)", "var(--bad-s)"];
  const has = (type: string) => docs.some((d) => d.type === type);
  const checks: [string, boolean][] = [
    [isAr ? "الإقامة" : "Iqama", has("IQAMA")],
    [isAr ? "جواز السفر" : "Passport", has("PASSPORT")],
    [isAr ? "الشهادة الصحية" : "Health certificate", has("HEALTH_CERTIFICATE")],
    [isAr ? "التأمين الطبي" : "Medical insurance", has("MEDICAL_INSURANCE")],
    [isAr ? "عقد العمل" : "Employment contract", has("EMPLOYMENT_CONTRACT")],
    [isAr ? "رقم الجوال" : "Mobile number", Boolean(e.mobile)],
  ];
  const done = checks.filter((c) => c[1]).length;
  const age = e.dateOfBirth ? Math.floor(-(daysFromToday(e.dateOfBirth) ?? 0) / 365.25) : null;

  return (
    <div className="rp rc">
      <PrintDocumentHeader title={t("employees.profile.title")} subtitle={e.fullNameAr || e.fullNameEn || undefined} referenceNumber={e.employeeNumber} />
      <DetailBar from={t("employees.title")} here={names.primary} onBack={back}>
        <div className="rc-acts">
          {hasPermission("employeeDocuments.create") && (
            <button type="button" className="rc-btn pri" style={{ height: 38 }} onClick={() => setDocDialogOpen(true)}>
              <Plus />
              {t("employees.profile.addDocument")}
            </button>
          )}
          {hasPermission("employees.edit") && (
            <button type="button" className="rc-btn" style={{ height: 38 }} onClick={() => setEditOpen(true)}>
              <Edit />
              {isAr ? "تعديل البيانات" : "Edit details"}
            </button>
          )}
          <button type="button" className="rc-btn" style={{ height: 38 }} onClick={() => openPdfInNewTab(employeePdfUrl(e.id))}>
            <Printer />
            {isAr ? "طباعة الملف" : "Print profile"}
          </button>
        </div>
      </DetailBar>

      <CoverHero
        color={color}
        round
        tile={
          <button type="button" className="h-full w-full" onClick={() => setAvatarPickerOpen(true)} title={isAr ? "تغيير الصورة" : "Change avatar"}>
            <SaudiAvatar avatarId={customAvatarId} gender={e.gender} size="xl" className="h-full w-full" />
          </button>
        }
        title={names.primary}
        sub={
          <>
            {names.secondary && <bdi>{names.secondary}</bdi>}
            {job && (
              <span>
                <Briefcase />
                {job}
              </span>
            )}
            {nat && (
              <span>
                <Globe />
                {nat}
              </span>
            )}
            <span className="rp-mono">{e.employeeNumber}</span>
          </>
        }
        chips={
          <>
            <span className="rp-pill" style={{ ["--c" as string]: statusTone[0], ["--t" as string]: statusTone[1] }}>
              {t(`status.${e.employmentStatus}`, { defaultValue: e.employmentStatus })}
            </span>
            {branch && (
              <span>
                <Building2 />
                {branch}
              </span>
            )}
            {e.joiningDate && (
              <span>
                <small>{isAr ? "منذ" : "Since"}</small>
                <span className="rp-num">{dmy(e.joiningDate)}</span>
              </span>
            )}
            <button type="button" className="rc-btn no-print" onClick={() => setAvatarPickerOpen(true)} style={{ height: 28 }}>
              <Sparkles />
              {isAr ? "الصورة" : "Avatar"}
            </button>
          </>
        }
        ring={dated.length ? <BigRing pct={pct} color={compColor(pct)} value={`${pct}%`} sub={isAr ? "اكتمال المستندات" : "Documents in order"} /> : undefined}
        stats={[
          { value: docs.length, label: isAr ? "وثيقة" : "documents" },
          { value: due, label: isAr ? "تحتاج متابعة" : "to follow up", color: due ? "var(--warn)" : "var(--ok)" },
          { value: months ?? "—", label: isAr ? "شهر خدمة" : "months of service" },
          { value: e.iqamaExpiryDate ? <span className="rp-num" style={{ fontSize: 18 }}>{dmy(e.iqamaExpiryDate)}</span> : "—", label: isAr ? "انتهاء الإقامة" : "Iqama expiry" },
        ]}
      />

      <div className="rc-dgrid">
        <div className="rc-dcol">
          <DCard title={isAr ? "الوثائق" : "Documents"} icon={IdCard} right={isAr ? `${docs.length} وثائق · اضغط للتفاصيل` : `${docs.length} documents · open for details`}>
            {docs.length ? (
              <div className="rc-mdocs">
                {docs.map((d) => (
                  <MiniDoc key={d.key} title={d.label} sub={<span className="rp-mono">{d.number || "—"}</span>} expiryDate={d.expiryDate} onClick={() => navigate(`/employee-documents/${e.id}/${d.key}`)} />
                ))}
              </div>
            ) : (
              <div className="rc-none">{t("employees.profile.noDocuments")}</div>
            )}
          </DCard>
          <DCard title={t("employees.profile.personalInfo")} icon={User} color="var(--vio)" i={4}>
            <div className="rc-facts">
              <Fact label={isAr ? "الاسم بالعربي" : "Name in Arabic"} icon={User} value={e.fullNameAr || "—"} />
              <Fact label={isAr ? "الاسم بالإنجليزي" : "Name in English"} icon={User} value={e.fullNameEn ? <bdi>{e.fullNameEn}</bdi> : "—"} />
              <Fact label={t("employees.fields.nationality")} icon={Globe} value={nat || "—"} />
              <Fact label={isAr ? "رقم الإقامة" : "Iqama number"} icon={IdCard} value={<span className="rp-mono" style={{ fontSize: 14 }}>{e.iqamaNumber || "—"}</span>} copy={e.iqamaNumber} />
              <Fact label={isAr ? "تاريخ الميلاد" : "Date of birth"} icon={Calendar} value={<span className="rp-num">{e.dateOfBirth ? dmy(e.dateOfBirth) : "—"}</span>} em={age !== null ? (isAr ? `${age} سنة` : `${age} years`) : undefined} />
              <Fact label={t("employees.fields.mobile")} icon={Phone} value={e.mobile ? <a href={`tel:${e.mobile}`} className="rp-num">{e.mobile}</a> : "—"} copy={e.mobile} />
              <Fact label={t("employees.fields.email")} icon={Mail} value={e.email ? <a href={`mailto:${e.email}`}>{e.email}</a> : "—"} />
              <Fact label={t("employees.fields.city")} icon={MapPin} value={localizedCity(e.city, e.cityEn) || "—"} em={e.address || undefined} />
            </div>
          </DCard>
          <DCard title={isAr ? "بيانات العمل" : "Work details"} icon={Briefcase} color="var(--teal)" i={5}>
            <div className="rc-facts">
              <Fact label={t("employees.fields.employeeNumber")} icon={Hash} value={<span className="rp-mono" style={{ fontSize: 14 }}>{e.employeeNumber}</span>} copy={e.employeeNumber} />
              <Fact label={isAr ? "المسمى الوظيفي" : "Job title"} icon={Briefcase} value={job || "—"} />
              <Fact label={isAr ? "القسم" : "Department"} icon={Building2} value={localized(e.department, e.departmentEn) || "—"} />
              <Fact label={isAr ? "المؤسسة" : "Establishment"} icon={Building2} value={branch || t("employees.profile.noBranch")} em={e.branch?.code} />
              <Fact label={t("employees.fields.joiningDate")} icon={Calendar} value={<span className="rp-num">{e.joiningDate ? dmy(e.joiningDate) : "—"}</span>} em={dateEm(e.joiningDate)} />
              <Fact label={isAr ? "الحالة" : "Status"} icon={CheckCircle2} value={<span style={{ color: statusTone[0] }}>{t(`status.${e.employmentStatus}`, { defaultValue: e.employmentStatus })}</span>} />
              <Fact
                label={t("employees.fields.onSponsorship")}
                icon={ShieldCheck}
                value={e.onSponsorship == null ? "—" : e.onSponsorship ? (isAr ? "نعم، على كفالة المنشأة" : "Yes, on our sponsorship") : isAr ? "لا، ليس على الكفالة" : "No, not on our sponsorship"}
              />
              <Fact label={t("employees.fields.sponsorName")} icon={UserCheck} value={e.sponsorName || "—"} />
              {e.notes && <Fact label={isAr ? "ملاحظات" : "Notes"} icon={StickyNote} value={<span style={{ whiteSpace: "pre-wrap", fontWeight: 500 }}>{e.notes}</span>} wide />}
            </div>
          </DCard>
          {hasPermission("payments.view") && (
            <DCard title={t("employees.profile.tabs.payments")} icon={Wallet} color="var(--gold)" right={payments?.data.length ?? 0} i={6}>
              {payments && payments.data.length > 0 ? (
                <div className="rc-rows">
                  {payments.data.map((p) => (
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
                <div className="rc-none">{t("employees.profile.noPayments", { defaultValue: "لا توجد مدفوعات مسجلة" })}</div>
              )}
            </DCard>
          )}
        </div>
        <div className="rc-dcol">
          <DCard title={isAr ? "اكتمال الملف" : "Profile completeness"} icon={CheckCircle2} color="var(--ok)">
            <div className="rc-cmp">
              <BigRing pct={Math.round((done / checks.length) * 100)} color="var(--ok)" value={`${done}/${checks.length}`} sub={isAr ? "مكتمل" : "complete"} />
              <div className="min-w-0">
                <b className="h">{done === checks.length ? (isAr ? "الملف مكتمل" : "The profile is complete") : isAr ? "ينقص الملف" : "Missing from the profile"}</b>
                <small>{checks.filter((c) => !c[1]).map((c) => c[0]).join(isAr ? "، " : ", ") || (isAr ? "كل المطلوب موجود" : "Everything needed is here")}</small>
              </div>
            </div>
            <div className="rc-chk">
              {checks.map(([l, ok]) => (
                <div key={l} className={ok ? "y" : "n"}>
                  <i>{ok ? <CheckCircle2 /> : <AlertTriangle />}</i>
                  {l}
                </div>
              ))}
            </div>
          </DCard>
          {hasPermission("violations.view") && (
            <DCard title={isAr ? "المخالفات والجزاءات" : "Violations & penalties"} icon={Gavel} color="var(--bad)" right={violations?.meta.total ?? 0} i={3}>
              {violations && violations.data.length > 0 ? (
                <div className="rc-rows">
                  {violations.data.map((v) => (
                    <button key={v.id} type="button" onClick={() => navigate(`/violations/${v.id}`)}>
                      <span className="d">{Number(v.date.slice(8, 10))}</span>
                      <span className="min-w-0">
                        <b>{v.kind === "STAFF" ? v.penalty : v.authorityLabel}</b>
                        <small>{v.reason}</small>
                      </span>
                      <Pill tone={STATE_LOOK[v.state].tone}>{isAr ? STATE_LOOK[v.state].ar : STATE_LOOK[v.state].en}</Pill>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rc-none">{isAr ? "مفيش مخالفات ولا جزاءات على الموظف" : "No violations or penalties"}</div>
              )}
            </DCard>
          )}
          {e.branch && (
            <DCard title={isAr ? "المؤسسة" : "Establishment"} icon={Building2} i={4}>
              <Owner tile={initialsOf(branch || e.branch.code)} color={color} title={branch || e.branch.code} sub={e.branch.code} onOpen={hasPermission("branches.view") ? () => navigate(`/branches/${e.branch!.id}`) : undefined} />
            </DCard>
          )}
          {hasPermission("auditLogs.view") && (
            <DCard title={isAr ? "آخر النشاط" : "Latest activity"} icon={Clock} color="var(--vio)" i={5}>
              <History items={history?.data} createdAt={e.createdAt} />
            </DCard>
          )}
        </div>
      </div>

      <EmployeeDocumentDialog employeeId={e.id} open={docDialogOpen} onOpenChange={setDocDialogOpen} />
      <EmployeeDialog open={editOpen} employee={e} onOpenChange={setEditOpen} />
      <AvatarPickerDialog
        open={avatarPickerOpen}
        onOpenChange={setAvatarPickerOpen}
        gender={e.gender}
        selectedAvatarId={customAvatarId}
        onSelectAvatar={(avatarId) => {
          setCustomAvatarId(avatarId);
          toast.success(isAr ? "تم تطبيق الأفاتار بالزي السعودي بنجاح" : "Saudi avatar applied successfully");
        }}
        isRtl={isAr}
      />
      <PrintDocumentFooter prepTitle={isAr ? "إعداد قسم شؤون الموظفين" : "Prepared by HR"} authTitle={isAr ? "اعتماد الإدارة العامة" : "Approved by the General Manager"} />
    </div>
  );
}
