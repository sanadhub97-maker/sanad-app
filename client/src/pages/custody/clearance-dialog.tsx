import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/i18n";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmployeePicker } from "@/components/common/employee-picker";
import { getErrorMessage } from "@/lib/api";
import { openPdfInNewTab } from "@/lib/download";
import { useAuthStore } from "@/stores/authStore";
import {
  DEPARTMENTS,
  REASONS,
  RETURN_CONDITIONS,
  custodyApi,
  type Clearance,
  type ClearanceReason,
  type CustodyItem,
  type DepartmentKey,
  type ReturnCondition,
} from "@/api/custody";
import { PrintsAs, dmy, money, todayRiyadh, usePickerData } from "@/pages/custody/custody-shared";

export function printClearance(c: { id: string; number: string }) {
  return openPdfInNewTab(`/custody/clearances/${c.id}/pdf`, {}, `${c.number}.pdf`).catch(() => undefined);
}

type Dept = { done: boolean; by: string };
const emptyDepts = (): Record<DepartmentKey, Dept> => Object.fromEntries(DEPARTMENTS.map((d) => [d.key, { done: false, by: "" }])) as Record<DepartmentKey, Dept>;

/**
 * A clearance: the employee's open custody pulled in to be checked back,
 * each department's sign-off, the reason, last day and dues. The certificate
 * is issued only once everything is back and every department has signed.
 */
export function ClearanceDialog({ open, onOpenChange, clearance }: { open: boolean; onOpenChange: (o: boolean) => void; clearance?: Clearance | null }) {
  useTranslation();
  const qc = useQueryClient();
  const has = useAuthStore((s) => s.hasPermission);
  const { employees, branches } = usePickerData(open);
  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [lastDay, setLastDay] = useState(todayRiyadh());
  const [reason, setReason] = useState<ClearanceReason>("resignation");
  const [dues, setDues] = useState("");
  const [notes, setNotes] = useState("");
  const [depts, setDepts] = useState(emptyDepts());
  const [returns, setReturns] = useState<Record<string, ReturnCondition | "">>({});
  const [busy, setBusy] = useState<"" | "save" | "print" | "issue">("");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTried(false);
    if (clearance) {
      setEmployeeId(clearance.employeeId);
      setLastDay(clearance.lastWorkingDay.slice(0, 10));
      setReason(clearance.reason);
      setDues(clearance.dues ? String(clearance.dues) : "");
      setNotes(clearance.notes ?? "");
      const d = emptyDepts();
      for (const k of DEPARTMENTS) d[k.key] = { done: Boolean(clearance.departments[k.key]?.done), by: clearance.departments[k.key]?.by ?? "" };
      setDepts(d);
      setReturns(Object.fromEntries(clearance.items.filter((i) => i.clearanceId === clearance.id && i.returnCondition).map((i) => [i.id, i.returnCondition as ReturnCondition])));
    } else {
      setEmployeeId(undefined);
      setLastDay(todayRiyadh());
      setReason("resignation");
      setDues("");
      setNotes("");
      setDepts(emptyDepts());
      setReturns({});
    }
  }, [open, clearance]);

  // A new clearance pulls in what the chosen employee still holds.
  const { data: fetched, isFetching } = useQuery({
    queryKey: ["custody", "employee-items", employeeId],
    queryFn: () => custodyApi.employeeItems(employeeId!),
    enabled: open && !clearance && Boolean(employeeId),
  });
  const items: CustodyItem[] = clearance ? clearance.items : fetched ?? [];

  const employee = employees.find((e) => e.id === employeeId);
  const branch = useMemo(() => {
    const id = employee?.branchId ?? clearance?.employee.branchId;
    return branches.find((b) => b.id === id) ?? (clearance?.employee.branch && clearance.employee.branch.id === id ? clearance.employee.branch : null);
  }, [employee, branches, clearance]);

  const out = items.filter((i) => !returns[i.id]);
  const pending = DEPARTMENTS.filter((d) => !depts[d.key].done);
  const ready = Boolean(employeeId) && out.length === 0 && pending.length === 0;
  const outValue = out.reduce((a, i) => a + i.value, 0);

  async function save(then: "save" | "print" | "issue") {
    setTried(true);
    if (!employeeId) return toast.error(tr("اختار الموظف الأول", "Choose the employee first"));
    if (!lastDay) return toast.error(tr("حدد آخر يوم عمل", "Set the last working day"));
    setBusy(then);
    const body = {
      lastWorkingDay: lastDay,
      reason,
      dues: Number(dues) || 0,
      notes: notes.trim(),
      departments: Object.fromEntries(DEPARTMENTS.map((d) => [d.key, { done: depts[d.key].done, by: depts[d.key].by.trim() || undefined }])),
      returns: items.map((i) => ({ id: i.id, condition: returns[i.id] || null })),
    };
    try {
      let saved = clearance ? await custodyApi.updateClearance(clearance.id, body) : await custodyApi.createClearance({ ...body, employeeId });
      if (then === "issue") saved = await custodyApi.issueClearance(saved.id);
      toast.success(then === "issue" ? tr(`صدرت شهادة إخلاء الطرف ${saved.number}`, `Certificate ${saved.number} issued`) : tr(`تم حفظ ${saved.number}`, `Saved ${saved.number}`));
      qc.invalidateQueries({ queryKey: ["custody"] });
      onOpenChange(false);
      if (then !== "save" && has("custody.export")) printClearance(saved);
    } catch (err) {
      toast.error(getErrorMessage(err));
      // The draft may have been saved before the issue failed.
      qc.invalidateQueries({ queryKey: ["custody"] });
    } finally {
      setBusy("");
    }
  }

  const setDept = (k: DepartmentKey, patch: Partial<Dept>) => setDepts((d) => ({ ...d, [k]: { ...d[k], ...patch } }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cu cu-dlg w-full sm:max-w-3xl lg:max-w-4xl max-h-[92vh] rounded-3xl">
        <div className="cu-dhead">
          <DialogTitle asChild>
            <h2 className="cu-foil">{clearance ? tr(`إخلاء الطرف ${clearance.number}`, `Clearance ${clearance.number}`) : tr("إخلاء طرف", "Clearance")}</h2>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="sub">{tr("الشهادة بتتصدر لما العهد كلها ترجع وكل الأقسام تأكّد.", "The certificate is issued once every item is back and every department has signed.")}</div>
          </DialogDescription>
        </div>
        <div className="cu-dbody">
          <div className="cu-grid2">
            <div className="cu-f">
              <label>{tr("الموظف", "Employee")} <i>*</i></label>
              <EmployeePicker employees={employees} value={employeeId} onChange={setEmployeeId} invalid={tried && !employeeId} disabled={Boolean(clearance)} />
            </div>
            <div className="cu-f">
              <label htmlFor="cl-reason">{tr("سبب الإخلاء", "Reason")} <i>*</i></label>
              <select id="cl-reason" className="cu-in" value={reason} onChange={(e) => setReason(e.target.value as ClearanceReason)}>
                {REASONS.map((r) => <option key={r.value} value={r.value}>{tr(r.ar, r.en)}</option>)}
              </select>
            </div>
          </div>
          {(employee || clearance) && <PrintsAs branch={branch} />}
          <div className="cu-grid3">
            <div className="cu-f">
              <label htmlFor="cl-last">{tr("آخر يوم عمل", "Last working day")} <i>*</i></label>
              <input id="cl-last" type="date" className="cu-in" value={lastDay} onChange={(e) => setLastDay(e.target.value)} />
            </div>
            <div className="cu-f">
              <label htmlFor="cl-dues">{tr("المستحقات (ر.س)", "Dues (SAR)")}</label>
              <input id="cl-dues" type="number" step="0.01" dir="ltr" className="cu-in" value={dues} onChange={(e) => setDues(e.target.value)} />
            </div>
            <div className="cu-f">
              <label htmlFor="cl-notes">{tr("ملاحظات", "Notes")}</label>
              <input id="cl-notes" className="cu-in" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
            </div>
          </div>

          <div className="cu-sec">{tr("العهد اللي مع الموظف", "Custody the employee holds")}</div>
          {!employeeId ? (
            <p className="cu-hint">{tr("اختار الموظف وهتظهر عهده هنا تلقائي.", "Choose the employee and their custody shows here.")}</p>
          ) : isFetching && !items.length ? (
            <p className="cu-hint"><Loader2 className="inline h-4 w-4 animate-spin" /> {tr("بنجيب العهد…", "Loading custody…")}</p>
          ) : items.length === 0 ? (
            <p className="cu-hint">{tr("الموظف ده مافيش معاه أي عهد مسجلة.", "This employee holds no recorded custody.")}</p>
          ) : (
            <div className="cu-items">
              {items.map((i) => {
                const c = returns[i.id] ?? "";
                return (
                  <label key={i.id} className={`cu-chk ${c ? "ok" : ""}`}>
                    <input type="checkbox" checked={Boolean(c)} onChange={(e) => setReturns((r) => ({ ...r, [i.id]: e.target.checked ? "good" : "" }))} />
                    <span>
                      <b>{i.kind}{i.serialNumber ? <span className="cu-hint" dir="ltr"> · {i.serialNumber}</span> : null}</b>
                      <small>{[i.description, i.handover ? `${i.handover.number} · ${dmy(i.handover.date)}` : null, i.value ? `${money(i.value)} ${tr("ر.س", "SAR")}` : null].filter(Boolean).join(" · ")}</small>
                    </span>
                    <select value={c} disabled={!c} aria-label={tr("الحالة عند الاسترجاع", "Condition on return")} onChange={(e) => setReturns((r) => ({ ...r, [i.id]: e.target.value as ReturnCondition }))}>
                      {!c && <option value="">{tr("لسه مارجعتش", "Not back")}</option>}
                      {RETURN_CONDITIONS.map((r) => <option key={r.value} value={r.value}>{tr(r.ar, r.en)}</option>)}
                    </select>
                  </label>
                );
              })}
            </div>
          )}

          <div className="cu-sec">{tr("تأكيد الأقسام", "Department sign-off")}</div>
          <div className="cu-depts">
            {DEPARTMENTS.map((d) => (
              <div key={d.key} className={`cu-dept ${depts[d.key].done ? "ok" : ""}`}>
                <label>
                  <input type="checkbox" checked={depts[d.key].done} onChange={(e) => setDept(d.key, { done: e.target.checked })} />
                  {tr(d.ar, d.en)}
                </label>
                <input className="cu-in" value={depts[d.key].by} onChange={(e) => setDept(d.key, { by: e.target.value })} placeholder={tr("اسم اللي أكّد (اختياري)", "Signed by (optional)")} maxLength={150} aria-label={tr(`اسم اللي أكّد من ${d.ar}`, `Signed by for ${d.en}`)} />
              </div>
            ))}
          </div>

          {ready ? (
            <div className="cu-gate ready">{tr("كله تمام: العهد رجعت وكل الأقسام أكّدت. تقدر تصدر الشهادة.", "All set: everything is back and every department has signed. You can issue the certificate.")}</div>
          ) : (
            <div className="cu-gate wait">
              <b>{tr("قبل إصدار الشهادة:", "Before the certificate can be issued:")}</b>
              <ul className="list-inside list-disc">
                {!employeeId && <li>{tr("اختار الموظف", "Choose the employee")}</li>}
                {out.length > 0 && <li>{tr(`${out.length} صنف لسه مارجعش (قيمتهم ${money(outValue)} ر.س)`, `${out.length} items still out (worth ${money(outValue)} SAR)`)}</li>}
                {pending.length > 0 && <li>{tr(`لسه مستني تأكيد: ${pending.map((p) => p.ar).join("، ")}`, `Waiting on: ${pending.map((p) => p.en).join(", ")}`)}</li>}
              </ul>
            </div>
          )}
        </div>
        <div className="cu-dfoot">
          <button type="button" className="cu-btn" onClick={() => onOpenChange(false)}>{tr("إلغاء", "Cancel")}</button>
          <button type="button" className="cu-btn" disabled={Boolean(busy)} onClick={() => save("save")}>
            {busy === "save" ? <Loader2 className="animate-spin" /> : <Save />} {tr("حفظ كمسودة", "Save draft")}
          </button>
          {has("custody.export") && (
            <button type="button" className="cu-btn" disabled={Boolean(busy)} onClick={() => save("print")}>
              {busy === "print" ? <Loader2 className="animate-spin" /> : <Printer />} {tr("حفظ وطباعة المسودة", "Save & print draft")}
            </button>
          )}
          <button type="button" className="cu-btn gold" disabled={!ready || Boolean(busy)} title={ready ? undefined : tr("لازم العهد كلها ترجع وكل الأقسام تأكّد", "Everything must be back and every department signed")} onClick={() => save("issue")}>
            {busy === "issue" ? <Loader2 className="animate-spin" /> : <BadgeCheck />} {tr("إصدار الشهادة", "Issue certificate")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
