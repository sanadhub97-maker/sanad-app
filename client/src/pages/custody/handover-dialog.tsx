import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Printer, Save, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/i18n";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmployeePicker } from "@/components/common/employee-picker";
import { getErrorMessage } from "@/lib/api";
import { openPdfInNewTab } from "@/lib/download";
import { useAuthStore } from "@/stores/authStore";
import { CONDITIONS, ITEM_KINDS, RETURN_CONDITIONS, custodyApi, type CustodyHandover, type ItemCondition, type ReturnCondition } from "@/api/custody";
import { PrintsAs, money, todayRiyadh, usePickerData } from "@/pages/custody/custody-shared";

type Row = { key: string; id?: string; kind: string; description: string; serialNumber: string; condition: ItemCondition; value: string; locked?: boolean };
let seq = 0;
const blank = (): Row => ({ key: `n${++seq}`, kind: "", description: "", serialNumber: "", condition: "good", value: "" });

export function printHandover(h: { id: string; number: string }) {
  return openPdfInNewTab(`/custody/handovers/${h.id}/pdf`, {}, `${h.number}.pdf`).catch(() => undefined);
}

/** New custody handover, or editing one: who, what (item rows), when; save and print. */
export function HandoverDialog({ open, onOpenChange, handover }: { open: boolean; onOpenChange: (o: boolean) => void; handover?: CustodyHandover | null }) {
  useTranslation();
  const qc = useQueryClient();
  const canExport = useAuthStore((s) => s.hasPermission("custody.export"));
  const { employees, branches } = usePickerData(open);
  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [date, setDate] = useState(todayRiyadh());
  const [deliveredBy, setDeliveredBy] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTried(false);
    if (handover) {
      setEmployeeId(handover.employeeId);
      setDate(handover.date.slice(0, 10));
      setDeliveredBy(handover.deliveredBy ?? "");
      setNotes(handover.notes ?? "");
      setRows(handover.items.map((i) => ({ key: i.id, id: i.id, kind: i.kind, description: i.description ?? "", serialNumber: i.serialNumber ?? "", condition: i.condition, value: i.value ? String(i.value) : "", locked: Boolean(i.returnedAt) })));
    } else {
      setEmployeeId(undefined);
      setDate(todayRiyadh());
      setDeliveredBy(useAuthStore.getState().user?.fullName ?? "");
      setNotes("");
      setRows([blank()]);
    }
  }, [open, handover]);

  const employee = employees.find((e) => e.id === employeeId);
  const branch = useMemo(() => {
    const id = employee?.branchId ?? handover?.employee.branchId;
    return branches.find((b) => b.id === id) ?? (handover?.employee.branch && handover.employee.branch.id === id ? handover.employee.branch : null);
  }, [employee, branches, handover]);
  const total = rows.reduce((a, r) => a + (Number(r.value) || 0), 0);
  const set = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const filled = rows.filter((r) => r.kind.trim());

  async function save(print: boolean) {
    setTried(true);
    if (!employeeId) return toast.error(tr("اختار الموظف الأول", "Choose the employee first"));
    if (!filled.length) return toast.error(tr("ضيف صنف واحد على الأقل", "Add at least one item"));
    setSaving(true);
    const body = {
      date,
      deliveredBy: deliveredBy.trim(),
      notes: notes.trim(),
      items: filled.map((r) => ({ id: r.id, kind: r.kind.trim(), description: r.description.trim(), serialNumber: r.serialNumber.trim(), condition: r.condition, value: Number(r.value) || 0 })),
    };
    try {
      const saved = handover ? await custodyApi.updateHandover(handover.id, body) : await custodyApi.createHandover({ ...body, employeeId });
      toast.success(tr(`تم حفظ المحضر ${saved.number}`, `Saved ${saved.number}`));
      qc.invalidateQueries({ queryKey: ["custody"] });
      onOpenChange(false);
      if (print) printHandover(saved);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cu cu-dlg w-full sm:max-w-3xl lg:max-w-4xl max-h-[92vh] rounded-3xl">
        <div className="cu-dhead">
          <DialogTitle asChild>
            <h2 className="cu-foil">{handover ? tr(`تعديل المحضر ${handover.number}`, `Edit ${handover.number}`) : tr("تسليم عهدة جديدة", "New custody handover")}</h2>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="sub">{tr("اختار الموظف، وضيف اللي استلمه، وبعدين احفظ واطبع.", "Choose the employee, add what they received, then save and print.")}</div>
          </DialogDescription>
        </div>
        <div className="cu-dbody">
          <div className="cu-grid2">
            <div className="cu-f">
              <label>{tr("الموظف", "Employee")} <i>*</i></label>
              <EmployeePicker employees={employees} value={employeeId} onChange={setEmployeeId} invalid={tried && !employeeId} disabled={Boolean(handover)} />
            </div>
            <div className="cu-f">
              <label htmlFor="ho-date">{tr("تاريخ التسليم", "Handover date")} <i>*</i></label>
              <input id="ho-date" type="date" className="cu-in" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          {(employee || handover) && <PrintsAs branch={branch} />}

          <div className="cu-sec">{tr("العهد المسلّمة", "Items handed over")}</div>
          <datalist id="cu-kinds">{ITEM_KINDS.map((k) => <option key={k} value={k} />)}</datalist>
          <div className="cu-items">
            {rows.map((r, n) => (
              <div key={r.key} className={`cu-item ${r.locked ? "locked" : ""}`}>
                <div className="cu-f">
                  <label htmlFor={`k-${r.key}`}>{tr("الصنف", "Item")} {n === 0 && <i>*</i>}</label>
                  <input id={`k-${r.key}`} className="cu-in" list="cu-kinds" value={r.kind} disabled={r.locked} onChange={(e) => set(r.key, { kind: e.target.value })} placeholder={tr("لابتوب، جوال، سيارة…", "Laptop, phone, car…")} maxLength={100} />
                </div>
                <div className="cu-f wide">
                  <label htmlFor={`d-${r.key}`}>{tr("الوصف", "Description")}</label>
                  <input id={`d-${r.key}`} className="cu-in" value={r.description} disabled={r.locked} onChange={(e) => set(r.key, { description: e.target.value })} placeholder={tr("الموديل والملحقات", "Model and accessories")} maxLength={300} />
                </div>
                <div className="cu-f">
                  <label htmlFor={`s-${r.key}`}>{tr("الرقم التسلسلي", "Serial no.")}</label>
                  <input id={`s-${r.key}`} className="cu-in" dir="ltr" value={r.serialNumber} disabled={r.locked} onChange={(e) => set(r.key, { serialNumber: e.target.value })} maxLength={120} />
                </div>
                <div className="cu-f">
                  <label htmlFor={`c-${r.key}`}>{tr("الحالة", "Condition")}</label>
                  <select id={`c-${r.key}`} className="cu-in" value={r.condition} disabled={r.locked} onChange={(e) => set(r.key, { condition: e.target.value as ItemCondition })}>
                    {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{tr(c.ar, c.en)}</option>)}
                  </select>
                </div>
                <div className="cu-f">
                  <label htmlFor={`v-${r.key}`}>{tr("القيمة (ر.س)", "Value (SAR)")}</label>
                  <input id={`v-${r.key}`} className="cu-in" type="number" min={0} step="0.01" dir="ltr" value={r.value} disabled={r.locked} onChange={(e) => set(r.key, { value: e.target.value })} />
                </div>
                <button type="button" className="cu-btn icon ghost danger" disabled={r.locked || rows.length === 1} aria-label={tr("شيل الصنف", "Remove item")} title={r.locked ? tr("الصنف ده رجع، فبيفضل في المحضر", "Returned items stay on the record") : undefined} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                  <Trash2 />
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" className="cu-btn sm" onClick={() => setRows((rs) => [...rs, blank()])} disabled={rows.length >= 100}>
              <Plus /> {tr("ضيف صنف", "Add item")}
            </button>
          </div>
          <div className="cu-total">
            <span>{tr(`الإجمالي · ${filled.length} صنف`, `Total · ${filled.length} items`)}</span>
            <span dir="ltr">{money(total)} {tr("ر.س", "SAR")}</span>
          </div>

          <div className="cu-grid2">
            <div className="cu-f">
              <label htmlFor="ho-by">{tr("المسلّم (أمين العهد)", "Handed over by")}</label>
              <input id="ho-by" className="cu-in" value={deliveredBy} onChange={(e) => setDeliveredBy(e.target.value)} maxLength={150} />
            </div>
            <div className="cu-f">
              <label htmlFor="ho-notes">{tr("ملاحظات", "Notes")}</label>
              <textarea id="ho-notes" className="cu-in" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
            </div>
          </div>
        </div>
        <div className="cu-dfoot">
          <button type="button" className="cu-btn" onClick={() => onOpenChange(false)}>{tr("إلغاء", "Cancel")}</button>
          <button type="button" className="cu-btn" disabled={saving} onClick={() => save(false)}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} {tr("حفظ", "Save")}
          </button>
          {canExport && (
            <button type="button" className="cu-btn gold" disabled={saving} onClick={() => save(true)}>
              <Printer /> {tr("حفظ وطباعة", "Save & print")}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Checking items back in on their own, outside a clearance. */
export function ReturnDialog({ handover, onOpenChange }: { handover: CustodyHandover | null; onOpenChange: (o: boolean) => void }) {
  useTranslation();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayRiyadh());
  const [picked, setPicked] = useState<Record<string, ReturnCondition | "">>({});
  const [saving, setSaving] = useState(false);
  const out = handover?.items.filter((i) => !i.returnedAt) ?? [];

  useEffect(() => {
    if (handover) {
      setDate(todayRiyadh());
      setPicked({});
    }
  }, [handover]);

  async function save() {
    if (!handover) return;
    const items = Object.entries(picked).filter(([, c]) => c).map(([id, c]) => ({ id, condition: c as ReturnCondition }));
    if (!items.length) return toast.error(tr("علّم على الأصناف اللي رجعت", "Tick the items that came back"));
    setSaving(true);
    try {
      await custodyApi.returnItems(handover.id, date, items);
      toast.success(tr("تم تسجيل الاسترجاع", "Return recorded"));
      qc.invalidateQueries({ queryKey: ["custody"] });
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(handover)} onOpenChange={onOpenChange}>
      <DialogContent className="cu cu-dlg w-full sm:max-w-xl rounded-3xl">
        <div className="cu-dhead">
          <DialogTitle asChild>
            <h2 className="cu-foil">{tr("استرجاع عهدة", "Return items")}</h2>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="sub">{tr("علّم على اللي رجع وحالته وقت الاستلام.", "Tick what came back and its condition.")}</div>
          </DialogDescription>
        </div>
        <div className="cu-dbody">
          <div className="cu-f">
            <label htmlFor="ret-date">{tr("تاريخ الاسترجاع", "Return date")}</label>
            <input id="ret-date" type="date" className="cu-in" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {out.length === 0 ? (
            <p className="cu-hint">{tr("كل أصناف المحضر ده رجعت.", "Every item on this record is back.")}</p>
          ) : (
            out.map((i) => {
              const c = picked[i.id] ?? "";
              return (
                <label key={i.id} className={`cu-chk ${c ? "ok" : ""}`}>
                  <input type="checkbox" checked={Boolean(c)} onChange={(e) => setPicked((p) => ({ ...p, [i.id]: e.target.checked ? "good" : "" }))} />
                  <span>
                    <b>{i.kind}</b>
                    <small>{[i.description, i.serialNumber].filter(Boolean).join(" · ") || "—"}</small>
                  </span>
                  <select value={c} disabled={!c} aria-label={tr("الحالة عند الاسترجاع", "Condition on return")} onChange={(e) => setPicked((p) => ({ ...p, [i.id]: e.target.value as ReturnCondition }))}>
                    {!c && <option value="">—</option>}
                    {RETURN_CONDITIONS.map((r) => <option key={r.value} value={r.value}>{tr(r.ar, r.en)}</option>)}
                  </select>
                </label>
              );
            })
          )}
        </div>
        <div className="cu-dfoot">
          <button type="button" className="cu-btn" onClick={() => onOpenChange(false)}>{tr("إلغاء", "Cancel")}</button>
          <button type="button" className="cu-btn gold" disabled={saving || !out.length} onClick={save}>
            {saving ? <Loader2 className="animate-spin" /> : <Undo2 />} {tr("تسجيل الاسترجاع", "Record return")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
