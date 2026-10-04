import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, CheckCircle2, ChevronLeft, ChevronRight, Clock, Edit, FileText, Gavel, IdCard, Pencil, Plus, Printer, Send, ShieldCheck, Trash2, User, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Attachment, DCard, DetailBar, Fact, dateEm, useBack } from "@/components/royal/cards";
import { Pill, dmy } from "@/components/royal/rp";
import { violationsApi, type ViolationEvent } from "@/api/violations";
import { EVENT_LOOK, STATE_LOOK, authorityOf, daysAr } from "@/lib/violations";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { PayDialog, StepDialog, ViolationDialog } from "@/pages/violations/violation-dialogs";
import "@/styles/violations.css";

/* One violation on its own page, as in the approved preview: a red hero with
   the amount and the deadlines counting down, its details and notice, what
   happened to it, the actions its state allows, and what it is tied to. */

const EVENT_ICON: Record<ViolationEvent["type"], typeof Plus> = { created: Plus, objection: Send, accepted: CheckCircle2, rejected: XCircle, paid: Wallet, applied: CheckCircle2, edited: Pencil };

/** Where the document behind a violation lives. */
function documentPath(type: string | null, id: string | null, employeeId?: string) {
  if (!type || !id) return null;
  if (type === "COMPANY_DOCUMENT") return `/company-documents/${id}`;
  if (type === "EMPLOYEE_IQAMA") return `/employee-documents/${id}/IQAMA`;
  if (type === "EMPLOYEE_PASSPORT") return `/employee-documents/${id}/PASSPORT`;
  return employeeId ? `/employee-documents/${employeeId}/${id}` : null;
}

export default function ViolationDetailsPage() {
  const { id } = useParams();
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const back = useBack("/violations");
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [step, setStep] = useState<"objection" | "accepted" | "rejected" | "apply" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { data: v, isLoading, isError } = useQuery({ queryKey: ["violations", "detail", id], queryFn: () => violationsApi.get(id!), enabled: Boolean(id) });

  const title = isAr ? "المخالفات" : "Violations";
  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">{isAr ? "جاري التحميل…" : "Loading…"}</div>;
  if (isError || !v)
    return (
      <div className="rp rc">
        <DetailBar from={title} here="—" onBack={() => navigate("/violations")} />
        <div className="rp-card rp-empty">{isAr ? "المخالفة مش موجودة أو اتحذفت" : "This violation was not found or was deleted"}</div>
      </div>
    );

  const staff = v.kind === "STAFF";
  const a = authorityOf(v.authority);
  const look = STATE_LOOK[v.state];
  const empName = v.employee ? (isAr ? v.employee.fullNameAr : v.employee.fullNameEn || v.employee.fullNameAr) : "";
  const branchName = v.branch ? (isAr ? v.branch.name : v.branch.nameEn || v.branch.name) : "";
  const name = staff ? empName : v.authorityLabel ?? "—";
  const docPath = documentPath(v.relatedType, v.relatedId, v.employee?.id);
  const Go = isAr ? ChevronLeft : ChevronRight;
  const clock = (label: string, day: string, n: number | null) => (
    <div className="vio-clk">
      <span>{label}</span>
      <b className="rp-num">{dmy(day)}</b>
      <em>{n === null ? "" : n < 0 ? (isAr ? `فات من ${daysAr(n)}` : `${-n}d ago`) : n === 0 ? (isAr ? "اليوم" : "today") : isAr ? `باقي ${daysAr(n)}` : `${n}d left`}</em>
    </div>
  );

  async function remove() {
    try {
      await violationsApi.remove(v!.id);
      toast.success(isAr ? "اتحذفت المخالفة" : "Deleted");
      qc.invalidateQueries({ queryKey: ["violations"] });
      navigate("/violations", { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const canEdit = hasPermission("violations.edit");
  return (
    <div className="rp rc">
      <DetailBar from={title} here={name} onBack={back} />

      <div className="vio-hero rp-rise" style={{ ["--hc" as string]: staff ? "#4f46e5" : "#b91c1c" }}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="vio-tile" style={{ background: staff ? "#6366f1" : a.color }}>
            {staff ? name.trim().charAt(0) : a.short}
          </span>
          <div className="min-w-0 flex-1">
            <h2>{name}</h2>
            <div className="sub">{[staff ? v.employee?.employeeNumber : v.number, branchName].filter(Boolean).join(" · ")}</div>
          </div>
          <Pill>{isAr ? look.ar : look.en}</Pill>
        </div>
        <div className="vio-big">
          <div>
            {staff ? <b style={{ fontSize: 26 }}>{v.penalty}</b> : <b className="rp-num">{formatCurrency(v.amount)}</b>}
            {staff && v.amount > 0 && <span>{formatCurrency(v.amount)}</span>}
          </div>
          {!staff && v.open && (
            <div className="vio-clocks">
              {v.status === "NEW" && v.objectionDeadline && clock(isAr ? "آخر ميعاد للاعتراض" : "Object by", v.objectionDeadline, v.daysToObject)}
              {v.payDeadline && clock(isAr ? "آخر ميعاد للسداد" : "Pay by", v.payDeadline, v.daysToPay)}
            </div>
          )}
        </div>
      </div>

      <div className="rc-dgrid">
        <div className="rc-dcol">
          <DCard title={isAr ? "بيانات المخالفة" : "Details"} icon={FileText} color="var(--bad)">
            <div className="rc-facts">
              {staff ? (
                <>
                  <Fact label={isAr ? "الموظف" : "Employee"} icon={User} value={empName} />
                  <Fact label={isAr ? "الجزاء" : "Penalty"} icon={Gavel} value={v.penalty || "—"} />
                </>
              ) : (
                <>
                  <Fact label={isAr ? "الجهة" : "Authority"} icon={ShieldCheck} value={v.authorityLabel || "—"} />
                  <Fact label={isAr ? "رقم المخالفة" : "Number"} icon={FileText} value={<span className="rp-mono">{v.number || "—"}</span>} copy={v.number} />
                </>
              )}
              <Fact label={isAr ? "تاريخ المخالفة" : "Date"} icon={Clock} value={<span className="rp-num">{dmy(v.date)}</span>} em={dateEm(v.date)} />
              <Fact label={isAr ? "المؤسسة / الفرع" : "Establishment"} icon={Building2} value={branchName || "—"} />
              <Fact label={isAr ? "المبلغ" : "Amount"} icon={Wallet} value={v.amount ? <span className="rp-num">{formatCurrency(v.amount)}</span> : "—"} />
              <Fact label={isAr ? "سجّلها" : "Recorded by"} icon={User} value={v.createdBy?.fullName || "—"} />
              <Fact label={isAr ? "السبب" : "Reason"} value={<span style={{ whiteSpace: "pre-wrap", fontWeight: 500 }}>{v.reason}</span>} wide />
              {v.notes && <Fact label={isAr ? "ملاحظات" : "Notes"} value={<span style={{ whiteSpace: "pre-wrap", fontWeight: 500 }}>{v.notes}</span>} wide />}
            </div>
            {v.file && <Attachment fileId={v.file.id} fileName={v.file.originalName} color="var(--bad)" />}
          </DCard>

          <DCard title={isAr ? "اللي حصل عليها" : "What happened"} icon={Clock} color="var(--vio)" i={4}>
            <div className="vio-tl">
              {v.events.map((e) => {
                const l = EVENT_LOOK[e.type] ?? EVENT_LOOK.edited;
                const Icon = EVENT_ICON[e.type] ?? Pencil;
                return (
                  <div key={e.id} className="vio-st" style={{ ["--c" as string]: l.c }}>
                    <span className="dot">
                      <Icon />
                    </span>
                    <div>
                      <b>{isAr ? l.ar : l.en}</b>
                      <small>
                        <span className="rp-num">{dmy(e.date)}</span>
                        {e.user ? ` · ${e.user.fullName}` : ""}
                      </small>
                      {e.note && <p>{e.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </DCard>
        </div>

        <div className="rc-dcol">
          <DCard title={isAr ? "الإجراءات" : "Actions"} icon={ShieldCheck} color="var(--pri)">
            <div className="vio-acts">
              {!staff && v.open && hasPermission("violations.pay") && (
                <button type="button" className="rc-btn pri" onClick={() => setPaying(true)}>
                  <Wallet />
                  {isAr ? "سدّد المخالفة" : "Pay"}
                </button>
              )}
              {!staff && v.status === "NEW" && canEdit && (
                <button type="button" className="rc-btn" onClick={() => setStep("objection")}>
                  <Send />
                  {isAr ? "قدّم اعتراض" : "File an objection"}
                </button>
              )}
              {!staff && v.status === "OBJECTION" && canEdit && (
                <>
                  <button type="button" className="rc-btn" onClick={() => setStep("accepted")}>
                    <CheckCircle2 />
                    {isAr ? "الاعتراض اتقبل" : "Objection accepted"}
                  </button>
                  <button type="button" className="rc-btn" onClick={() => setStep("rejected")}>
                    <XCircle />
                    {isAr ? "الاعتراض اترفض" : "Objection rejected"}
                  </button>
                </>
              )}
              {staff && v.status === "OPEN" && canEdit && (
                <button type="button" className="rc-btn pri" onClick={() => setStep("apply")}>
                  <CheckCircle2 />
                  {isAr ? "اتطبّق الجزاء" : "Penalty applied"}
                </button>
              )}
              <button type="button" className="rc-btn" onClick={() => window.print()}>
                <Printer />
                {isAr ? "طباعة" : "Print"}
              </button>
              {canEdit && (
                <button type="button" className="rc-btn" onClick={() => setEditing(true)}>
                  <Edit />
                  {isAr ? "تعديل" : "Edit"}
                </button>
              )}
              {hasPermission("violations.delete") && (
                <button type="button" className="rc-btn" style={{ color: "var(--bad)" }} onClick={() => setDeleting(true)}>
                  <Trash2 />
                  {isAr ? "حذف" : "Delete"}
                </button>
              )}
            </div>
            {!staff && v.status === "NEW" && v.daysToObject !== null && v.daysToObject >= 0 && v.objectionDeadline && (
              <div className="vio-note">
                {isAr ? `لو هتعترض، قدّم الاعتراض قبل ${dmy(v.objectionDeadline)}. لو اترفض، ميعاد السداد بيفضل زي ما هو.` : `File any objection before ${dmy(v.objectionDeadline)}. If it is rejected, the payment deadline stays.`}
              </div>
            )}
          </DCard>

          <DCard title={isAr ? "مربوطة بـ" : "Tied to"} icon={FileText} color="var(--teal)" i={4}>
            <div className="vio-links">
              {v.branch && (
                <button type="button" className="vio-link" style={{ ["--c" as string]: "var(--teal)", ["--t" as string]: "var(--teal-s)" }} onClick={() => navigate(`/branches/${v.branch!.id}`)}>
                  <span className="ic">
                    <Building2 />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b>{branchName}</b>
                    <small>{isAr ? "المؤسسة / الفرع" : "Establishment"}</small>
                  </span>
                  <Go className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {v.employee && (
                <button type="button" className="vio-link" style={{ ["--c" as string]: "var(--vio)", ["--t" as string]: "var(--vio-s)" }} onClick={() => navigate(`/employees/${v.employee!.id}`)}>
                  <span className="ic">
                    <User />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b>{empName}</b>
                    <small>{isAr ? "ملف الموظف" : "Employee file"}</small>
                  </span>
                  <Go className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {v.relatedLabel && (
                <button type="button" className="vio-link" disabled={!docPath} style={{ ["--c" as string]: "var(--warn)", ["--t" as string]: "var(--warn-s)" }} onClick={() => docPath && navigate(docPath)}>
                  <span className="ic">
                    <IdCard />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b>{v.relatedLabel}</b>
                    <small>{isAr ? "الوثيقة اللي سببت المخالفة" : "The document behind it"}</small>
                  </span>
                  {docPath && <Go className="h-4 w-4 text-muted-foreground" />}
                </button>
              )}
              {v.payment && (
                <button type="button" className="vio-link" style={{ ["--c" as string]: "var(--bad)", ["--t" as string]: "var(--bad-s)" }} onClick={() => navigate(`/payments?q=${encodeURIComponent(v.payment!.paymentNumber)}`)}>
                  <span className="ic">
                    <Wallet />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b>
                      {isAr ? "سند صرف" : "Voucher"} <span className="rp-mono">{v.payment.paymentNumber}</span>
                    </b>
                    <small>
                      <span className="rp-num">{formatCurrency(v.payment.total)}</span> · {dmy(v.payment.paymentDate)}
                    </small>
                  </span>
                  <Go className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {!v.branch && !v.employee && !v.relatedLabel && !v.payment && <div className="rc-none">{isAr ? "مش مربوطة بحاجة" : "Not tied to anything"}</div>}
            </div>
            {v.relatedLabel && v.open && (
              <div className="vio-warn">
                <AlertTriangle />
                <span>{isAr ? "اتأكد إن الوثيقة دي اتجددت، عشان المخالفة ماتتكررش." : "Make sure this document is renewed so the violation doesn't repeat."}</span>
              </div>
            )}
          </DCard>
        </div>
      </div>

      <ViolationDialog open={editing} onOpenChange={setEditing} violation={v} />
      {!staff && <PayDialog open={paying} onOpenChange={setPaying} violation={v} />}
      {step && <StepDialog open={Boolean(step)} onOpenChange={(o) => !o && setStep(null)} violation={v} step={step} />}
      <ConfirmDialog open={deleting} onOpenChange={setDeleting} title={isAr ? "تحذف المخالفة؟" : "Delete this violation?"} onConfirm={remove} />
    </div>
  );
}
