import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/form-field";
import { DateInput } from "@/components/common/date-input";
import { EmployeePicker } from "@/components/common/employee-picker";
import { FileUpload } from "@/components/common/file-upload";
import { listActiveBranches } from "@/api/branches";
import { employeesApi } from "@/api/employees";
import { violationsApi, type PayMethod, type Violation, type ViolationInput, type ViolationKind } from "@/api/violations";
import { AUTHORITIES, STAFF_PENALTIES, addDays, todayIso } from "@/lib/violations";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

/* The Violations page's forms: a new (or edited) violation, paying one,
   filing an objection and its result, and applying a staff penalty. */

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["violations"] });
    qc.invalidateQueries({ queryKey: ["payments"] });
  };
}

function Shell({ open, onOpenChange, title, sub, children, footer }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; sub?: string; children: ReactNode; footer: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto rounded-[28px]">
        <DialogHeader>
          <DialogTitle className="font-head text-lg">{title}</DialogTitle>
          {sub && <DialogDescription>{sub}</DialogDescription>}
        </DialogHeader>
        {children}
        <div className="flex flex-wrap gap-2 pt-2">{footer}</div>
      </DialogContent>
    </Dialog>
  );
}

/** A new violation, or editing one. */
export function ViolationDialog({ open, onOpenChange, kind: startKind, violation, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; kind?: ViolationKind; violation?: Violation; onSaved?: (v: Violation) => void }) {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const refresh = useRefresh();
  const editing = Boolean(violation);
  const [kind, setKind] = useState<ViolationKind>(violation?.kind ?? startKind ?? "AUTHORITY");
  const [f, setF] = useState<ViolationInput & { fileName?: string }>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof (ViolationInput & { fileName?: string }), v: unknown) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!open) return;
    const today = todayIso();
    setKind(violation?.kind ?? startKind ?? "AUTHORITY");
    setF(
      violation
        ? {
            authority: violation.authority ?? undefined,
            authorityName: violation.authorityName ?? undefined,
            number: violation.number ?? undefined,
            date: violation.date,
            branchId: violation.branch?.id,
            employeeId: violation.employee?.id,
            reason: violation.reason,
            penalty: violation.penalty ?? undefined,
            amount: violation.amount,
            payDeadline: violation.payDeadline,
            objectionDeadline: violation.objectionDeadline,
            relatedType: violation.relatedType ?? undefined,
            relatedId: violation.relatedId ?? undefined,
            relatedLabel: violation.relatedLabel ?? undefined,
            fileId: violation.file?.id,
            fileName: violation.file?.originalName,
            notes: violation.notes ?? undefined,
          }
        : { authority: "labor", date: today, amount: 0, payDeadline: addDays(today, 30), objectionDeadline: addDays(today, 30), penalty: STAFF_PENALTIES[1] }
    );
  }, [open, violation, startKind]);

  const { data: branches } = useQuery({ queryKey: ["branches", "active"], queryFn: listActiveBranches, enabled: open });
  const { data: employeesData } = useQuery({ queryKey: ["employees-selector"], queryFn: () => employeesApi.list({ pageSize: 200 }), enabled: open });
  const { data: related } = useQuery({
    queryKey: ["violations", "related", f.employeeId, f.branchId],
    queryFn: () => violationsApi.related({ employeeId: f.employeeId, branchId: f.branchId }),
    enabled: open && Boolean(f.employeeId || f.branchId),
  });
  const authority = kind === "AUTHORITY";

  async function save() {
    if (authority && !f.authority) return toast.error(isAr ? "اختار الجهة" : "Choose the authority");
    if (!authority && !f.employeeId) return toast.error(isAr ? "اختار الموظف" : "Choose the employee");
    if (!f.reason?.trim()) return toast.error(isAr ? "اكتب سبب المخالفة" : "Enter the reason");
    setBusy(true);
    try {
      const { fileName: _n, ...body } = f;
      const v = editing ? await violationsApi.update(violation!.id, body) : await violationsApi.create({ ...body, kind });
      refresh();
      toast.success(editing ? (isAr ? "اتحفظت التعديلات" : "Saved") : authority ? (isAr ? "اتسجلت المخالفة، وهيوصلك تنبيه قبل مواعيدها" : "Recorded — you'll be reminded before its deadlines") : isAr ? "اتسجل الجزاء" : "Penalty recorded");
      onSaved?.(v);
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? (isAr ? "تعديل المخالفة" : "Edit violation") : isAr ? "مخالفة جديدة" : "New violation"}
      sub={isAr ? "من إشعار المنصة أو الزيارة الميدانية. تقدر ترفع صورة الإشعار." : "From the platform notice or the inspection. You can attach the notice."}
      footer={
        <>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isAr ? "حفظ" : "Save"}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
        </>
      }
    >
      {!editing && (
        <div className="vio-seg" role="group">
          <button type="button" aria-pressed={authority} onClick={() => setKind("AUTHORITY")}>
            {isAr ? "مخالفة جهة حكومية" : "Authority violation"}
          </button>
          <button type="button" aria-pressed={!authority} onClick={() => setKind("STAFF")}>
            {isAr ? "جزاء موظف" : "Staff penalty"}
          </button>
        </div>
      )}
      <div className="vio-form">
        {authority ? (
          <>
            <FormField label={isAr ? "الجهة" : "Authority"} required>
              <select className="vio-select" value={f.authority ?? ""} onChange={(e) => set("authority", e.target.value)}>
                {AUTHORITIES.map((a) => (
                  <option key={a.key} value={a.key}>
                    {isAr ? a.ar : a.en}
                  </option>
                ))}
              </select>
            </FormField>
            {f.authority === "other" ? (
              <FormField label={isAr ? "اسم الجهة" : "Authority name"}>
                <Input value={f.authorityName ?? ""} onChange={(e) => set("authorityName", e.target.value)} />
              </FormField>
            ) : (
              <FormField label={isAr ? "رقم المخالفة" : "Violation number"}>
                <Input value={f.number ?? ""} onChange={(e) => set("number", e.target.value)} dir="ltr" />
              </FormField>
            )}
            {f.authority === "other" && (
              <FormField label={isAr ? "رقم المخالفة" : "Violation number"}>
                <Input value={f.number ?? ""} onChange={(e) => set("number", e.target.value)} dir="ltr" />
              </FormField>
            )}
          </>
        ) : (
          <>
            <FormField label={isAr ? "الموظف" : "Employee"} required>
              <EmployeePicker employees={employeesData?.data ?? []} value={f.employeeId} onChange={(id) => set("employeeId", id)} />
            </FormField>
            <FormField label={isAr ? "الجزاء" : "Penalty"} required>
              <select className="vio-select" value={f.penalty ?? ""} onChange={(e) => set("penalty", e.target.value)}>
                {STAFF_PENALTIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </FormField>
          </>
        )}
        <FormField label={isAr ? "المؤسسة / الفرع" : "Establishment"}>
          <select className="vio-select" value={f.branchId ?? ""} onChange={(e) => set("branchId", e.target.value || undefined)}>
            <option value="">—</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {isAr ? b.name : b.nameEn || b.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={isAr ? "تاريخ المخالفة" : "Date"} required>
          <DateInput value={f.date} onChange={(v) => set("date", v)} />
        </FormField>
        <FormField label={authority ? (isAr ? "مبلغ الغرامة (ر.س)" : "Fine (SAR)") : isAr ? "مبلغ الخصم (ر.س)" : "Deduction (SAR)"}>
          <Input type="number" min={0} value={f.amount || ""} placeholder="0" onChange={(e) => set("amount", Number(e.target.value))} dir="ltr" />
        </FormField>
        {authority && (
          <>
            <FormField label={isAr ? "آخر ميعاد للاعتراض" : "Object by"}>
              <DateInput value={f.objectionDeadline ?? ""} onChange={(v) => set("objectionDeadline", v || null)} />
            </FormField>
            <FormField label={isAr ? "آخر ميعاد للسداد" : "Pay by"}>
              <DateInput value={f.payDeadline ?? ""} onChange={(v) => set("payDeadline", v || null)} />
            </FormField>
            <FormField label={isAr ? "الموظف المعني (لو تخص موظف)" : "Employee concerned (if any)"}>
              <EmployeePicker employees={employeesData?.data ?? []} value={f.employeeId} onChange={(id) => set("employeeId", id)} />
            </FormField>
          </>
        )}
        <FormField label={isAr ? "السبب" : "Reason"} required className="full">
          <Textarea value={f.reason ?? ""} onChange={(e) => set("reason", e.target.value)} rows={3} />
        </FormField>
        {authority && (related?.length ?? 0) > 0 && (
          <FormField label={isAr ? "الوثيقة اللي سببت المخالفة" : "Document behind it"} className="full">
            <select
              className="vio-select"
              value={f.relatedId ? `${f.relatedType}|${f.relatedId}` : ""}
              onChange={(e) => {
                const o = related!.find((r) => `${r.type}|${r.id}` === e.target.value);
                setF((x) => ({ ...x, relatedType: o?.type, relatedId: o?.id, relatedLabel: o?.label }));
              }}
            >
              <option value="">{isAr ? "— مش مرتبطة بوثيقة —" : "— Not about a document —"}</option>
              {related!.map((r) => (
                <option key={`${r.type}|${r.id}`} value={`${r.type}|${r.id}`}>
                  {r.label}
                  {r.expired ? (isAr ? " (منتهية)" : " (expired)") : ""}
                </option>
              ))}
            </select>
          </FormField>
        )}
        <FormField label={isAr ? "صورة الإشعار" : "Notice"} className="full">
          <FileUpload fileId={f.fileId} fileName={f.fileName} module="violation" onUploaded={(id, name) => setF((x) => ({ ...x, fileId: id, fileName: name }))} onRemoved={() => setF((x) => ({ ...x, fileId: undefined, fileName: undefined }))} />
        </FormField>
        <FormField label={isAr ? "ملاحظات" : "Notes"} className="full">
          <Textarea value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </FormField>
      </div>
    </Shell>
  );
}

/** Pays an authority violation: a payment voucher is made in Payments. */
export function PayDialog({ open, onOpenChange, violation }: { open: boolean; onOpenChange: (o: boolean) => void; violation: Violation }) {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const refresh = useRefresh();
  const [date, setDate] = useState(todayIso());
  const [method, setMethod] = useState<PayMethod>("ONLINE");
  const [ref, setRef] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [file, setFile] = useState<{ id?: string; name?: string }>({});
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const v = await violationsApi.pay(violation.id, { date, method, referenceNumber: ref || undefined, paidBy: paidBy || undefined, fileId: file.id });
      refresh();
      toast.success(isAr ? `اتسددت، واتعمل سند صرف ${v.payment?.paymentNumber ?? ""}` : `Paid — voucher ${v.payment?.paymentNumber ?? ""}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const methods: [PayMethod, string, string][] = [
    ["ONLINE", "سداد إلكتروني", "Online"],
    ["BANK_TRANSFER", "تحويل بنكي", "Bank transfer"],
    ["CARD", "بطاقة", "Card"],
    ["CASH", "نقدًا", "Cash"],
    ["OTHER", "أخرى", "Other"],
  ];
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={isAr ? "سداد المخالفة" : "Pay the violation"}
      sub={isAr ? "هيتعمل سند صرف في المدفوعات (بند «غرامات ومخالفات حكومية»)، والمخالفة هتتقفل لوحدها." : "A payment voucher is created in Payments (government fines) and the violation closes."}
      footer={
        <>
          <Button onClick={go} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isAr ? "سدّد واعمل السند" : "Pay and create the voucher"}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
        </>
      }
    >
      <div className="vio-form">
        <FormField label={isAr ? "المبلغ" : "Amount"}>
          <Input value={formatCurrency(violation.amount)} readOnly />
        </FormField>
        <FormField label={isAr ? "تاريخ السداد" : "Paid on"} required>
          <DateInput value={date} onChange={setDate} />
        </FormField>
        <FormField label={isAr ? "طريقة الدفع" : "Method"}>
          <select className="vio-select" value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
            {methods.map(([k, ar, en]) => (
              <option key={k} value={k}>
                {isAr ? ar : en}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={isAr ? "رقم مرجع السداد" : "Payment reference"}>
          <Input value={ref} onChange={(e) => setRef(e.target.value)} dir="ltr" />
        </FormField>
        <FormField label={isAr ? "القائم بالصرف" : "Paid by"} className="full">
          <Input value={paidBy} onChange={(e) => setPaidBy(e.target.value)} />
        </FormField>
        <FormField label={isAr ? "إيصال السداد" : "Receipt"} className="full">
          <FileUpload fileId={file.id} fileName={file.name} module="payment" onUploaded={(id, name) => setFile({ id, name })} onRemoved={() => setFile({})} />
        </FormField>
      </div>
    </Shell>
  );
}

/** A dated note: filing an objection, its result, or applying a staff penalty. */
export function StepDialog({ open, onOpenChange, violation, step }: { open: boolean; onOpenChange: (o: boolean) => void; violation: Violation; step: "objection" | "accepted" | "rejected" | "apply" }) {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const refresh = useRefresh();
  const [date, setDate] = useState(todayIso());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setDate(todayIso());
      setReference("");
      setNote("");
    }
  }, [open]);
  const look = {
    objection: { t: isAr ? "تقديم اعتراض" : "File an objection", s: isAr ? "سجّل إنك اعترضت، والنظام هيفكّرك تتابع النتيجة." : "Record the objection; you'll follow up its result here.", b: isAr ? "سجّل الاعتراض" : "Record objection", ok: isAr ? "اتسجل الاعتراض" : "Objection recorded" },
    accepted: { t: isAr ? "الاعتراض اتقبل" : "Objection accepted", s: isAr ? "المخالفة هتتلغي." : "The violation is cancelled.", b: isAr ? "اتقبل — ألغِ المخالفة" : "Accepted — cancel it", ok: isAr ? "اتلغت المخالفة" : "Cancelled" },
    rejected: { t: isAr ? "الاعتراض اترفض" : "Objection rejected", s: isAr ? `المخالفة لسه مطلوب سدادها${violation.payDeadline ? ` قبل ${violation.payDeadline.split("-").reverse().join("/")}` : ""}.` : "The fine still has to be paid.", b: isAr ? "اترفض" : "Rejected", ok: isAr ? "اتسجل رفض الاعتراض" : "Recorded" },
    apply: { t: isAr ? "تطبيق الجزاء" : "Apply the penalty", s: isAr ? "سجّل إن الجزاء اتطبّق (اتبلّغ الموظف أو اتخصم من الراتب)." : "Record that the penalty was carried out.", b: isAr ? "اتطبّق" : "Applied", ok: isAr ? "اتسجل في ملف الموظف" : "Recorded" },
  }[step];
  async function go() {
    setBusy(true);
    try {
      if (step === "objection") await violationsApi.objection(violation.id, { date, reference: reference || undefined, note: note || undefined });
      else if (step === "apply") await violationsApi.apply(violation.id, { date, note: note || undefined });
      else await violationsApi.objectionResult(violation.id, { accepted: step === "accepted", date, note: note || undefined });
      refresh();
      toast.success(look.ok);
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={look.t}
      sub={look.s}
      footer={
        <>
          <Button onClick={go} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {look.b}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
        </>
      }
    >
      <div className="vio-form">
        <FormField label={isAr ? "التاريخ" : "Date"} required>
          <DateInput value={date} onChange={setDate} />
        </FormField>
        {step === "objection" ? (
          <FormField label={isAr ? "رقم طلب الاعتراض" : "Objection reference"}>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} dir="ltr" />
          </FormField>
        ) : (
          <div />
        )}
        <FormField label={step === "objection" ? (isAr ? "سبب الاعتراض" : "Grounds") : isAr ? "ملاحظات" : "Notes"} className="full">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </FormField>
      </div>
    </Shell>
  );
}
