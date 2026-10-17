import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Edit,
  FileCheck2,
  Landmark,
  Loader2,
  PenLine,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/i18n";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { EmployeePicker } from "@/components/common/employee-picker";
import { DateInput } from "@/components/common/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PxBadge } from "@/components/royal/px";
import { getErrorMessage } from "@/lib/api";
import { openPdfInNewTab } from "@/lib/download";
import { amountInWords } from "@/lib/money-words";
import { certificatesApi, type SavedCertificate } from "@/api/certificates";
import { EmployeeCell, dmy, todayRiyadh, usePickerData } from "@/pages/custody/custody-shared";
import { LetterheadSection, Sec, SheetHead, SheetSigs, SignerFields, useLetterhead, useSigners } from "@/pages/certificates/certificate-shared";

const num = (v: string) => {
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};
const sar = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const QUICK_TO: [string, string][] = [
  ["البنك", "The bank"],
  ["السفارة", "The embassy"],
  ["المديرية العامة للجوازات", "The General Directorate of Passports"],
];

export default function SalaryCertificatePage() {
  const qc = useQueryClient();
  const topRef = useRef<HTMLDivElement>(null);
  const skipEmpDefaultsRef = useRef(false);

  const { employees, branches } = usePickerData(true);
  const [employeeId, setEmployeeId] = useState<string>();
  const emp = employees.find((e) => e.id === employeeId);
  const branch = branches.find((b) => b.id === emp?.branchId) ?? null;
  const lh = useLetterhead(branch);

  const [editing, setEditing] = useState<SavedCertificate | null>(null);
  const [deleting, setDeleting] = useState<SavedCertificate | null>(null);
  const [q, setQ] = useState("");

  const [job, setJob] = useState("");
  const [start, setStart] = useState("");
  const [basic, setBasic] = useState("");
  const [housing, setHousing] = useState("");
  const [transport, setTransport] = useState("");
  const [others, setOthers] = useState<{ label: string; amount: string }[]>([]);
  const [recipient, setRecipient] = useState("");
  const [toBank, setToBank] = useState(false);
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [note, setNote] = useState("");
  const sg = useSigners();
  const [issue, setIssue] = useState(todayRiyadh());
  const [busy, setBusy] = useState<"" | "save" | "print">("");

  const { data: savedRows = [], isLoading } = useQuery({
    queryKey: ["certificates", "saved", "SALARY", q],
    queryFn: () => certificatesApi.list({ kind: "SALARY", q: q || undefined }),
  });

  // A newly selected employee fills in their own job and joining date unless loading a saved certificate.
  useEffect(() => {
    if (!emp) return;
    if (skipEmpDefaultsRef.current) {
      skipEmpDefaultsRef.current = false;
      return;
    }
    setJob(tr(emp.jobTitle || "", emp.jobTitleEn || emp.jobTitle || ""));
    setStart(emp.joiningDate ? emp.joiningDate.slice(0, 10) : "");
  }, [emp?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setEditing(null);
    setEmployeeId(undefined);
    lh.setMode("employee");
    lh.setEst({ name: "", nameEn: "", cr: "", city: "" });
    setJob("");
    setStart("");
    setBasic("");
    setHousing("");
    setTransport("");
    setOthers([]);
    setRecipient("");
    setToBank(false);
    setBankName("");
    setIban("");
    setNote("");
    sg.setNames([]);
    setIssue(todayRiyadh());
  }

  function loadCertificate(c: SavedCertificate) {
    skipEmpDefaultsRef.current = c.employeeId !== employeeId;
    setEditing(c);
    setEmployeeId(c.employeeId);
    lh.setMode(c.establishment);
    lh.setEst({
      name: c.estName ?? "",
      nameEn: c.estNameEn ?? "",
      cr: c.estCr ?? "",
      city: c.estCity ?? "",
    });
    setJob(c.jobTitle ?? "");
    setStart(c.startDate ?? "");
    setBasic(c.basic ? String(c.basic) : "");
    setHousing(c.housing ? String(c.housing) : "");
    setTransport(c.transport ? String(c.transport) : "");
    setOthers((c.others ?? []).map((o) => ({ label: o.label, amount: String(o.amount) })));
    setRecipient(c.recipient ?? "");
    setToBank(Boolean(c.toBank));
    setBankName(c.bankName ?? "");
    setIban(c.iban ?? "");
    setNote(c.note ?? "");
    sg.setNames(c.names ?? []);
    setIssue(c.issueDate || todayRiyadh());
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const parts = useMemo(
    () =>
      [
        { label: tr("الراتب الأساسي", "Basic salary"), amount: num(basic) },
        { label: tr("بدل السكن", "Housing allowance"), amount: num(housing) },
        { label: tr("بدل المواصلات", "Transport allowance"), amount: num(transport) },
        ...others.filter((o) => o.label.trim()).map((o) => ({ label: o.label.trim(), amount: num(o.amount) })),
      ].filter((p) => p.amount > 0),
    [basic, housing, transport, others]
  );
  const total = Math.round(parts.reduce((a, p) => a + p.amount, 0) * 100) / 100;
  const isEn = tr("ar", "en") === "en";
  const words = total ? amountInWords(total, isEn) : "";
  const cleanIban = iban.replace(/\s+/g, "").toUpperCase();

  const female = emp?.gender === "FEMALE";
  const g = (m: string, f: string) => (female ? f : m);
  const name = emp ? tr(emp.fullNameAr, emp.fullNameEn || emp.fullNameAr).trim() : "";
  const nat = emp ? tr(emp.nationality || "", (emp as { nationalityEn?: string | null }).nationalityEn || emp.nationality || "").trim() : "";
  const to = recipient.trim();

  const text = emp
    ? {
        main: tr(
          `تشهد ${lh.name || "…"} بأن ${g("السيد", "السيدة")}/ ${name}${nat ? `، ${nat} الجنسية` : ""}${emp.iqamaNumber ? `، ${g("ويحمل", "وتحمل")} إقامة رقم ${emp.iqamaNumber}` : ""}، ${g("يعمل", "تعمل")} لدينا${job ? ` بوظيفة ${job}` : ""}${start ? ` منذ تاريخ ${dmy(start)}` : ""}، ${g("ويتقاضى", "وتتقاضى")} راتبًا شهريًا إجماليًا قدره ${sar(total)} ريال سعودي${words ? ` (${words})` : ""}، موزّعًا على النحو التالي:`,
          `This is to certify that ${g("Mr.", "Ms.")} ${name}${nat ? `, of ${nat} nationality` : ""}${emp.iqamaNumber ? `, holder of iqama no. ${emp.iqamaNumber}` : ""}, works with ${lh.name || "…"}${job ? ` as ${job}` : ""}${start ? ` since ${dmy(start)}` : ""}, and receives a total monthly salary of ${sar(total)} Saudi riyals${words ? ` (${words})` : ""}, made up as follows:`
        ),
        bank:
          toBank && bankName.trim()
            ? tr(
                `${g("ويُحوَّل راتبه", "ويُحوَّل راتبها")} شهريًا على ${g("حسابه", "حسابها")} لدى ${bankName.trim()}${cleanIban ? `، رقم الآيبان ${cleanIban}` : ""}.`,
                `${g("His", "Her")} salary is transferred monthly to ${g("his", "her")} account with ${bankName.trim()}${cleanIban ? `, IBAN ${cleanIban}` : ""}.`
              )
            : "",
        close: tr(
          `وقد أُعطي ${g("له", "لها")} هذا التعريف بناءً على ${g("طلبه", "طلبها")}${to ? ` لتقديمه إلى ${to}` : ""}، دون أدنى مسؤولية على المنشأة تجاه الغير.`,
          `This letter has been issued at ${g("his", "her")} request${to ? ` to be presented to ${to}` : ""}, without any liability on the establishment towards others.`
        ),
      }
    : null;

  const problem = !emp
    ? tr("اختار الموظف الأول.", "Choose the employee first.")
    : lh.problem
      ? lh.problem
      : !total
        ? tr("اكتب الراتب الأساسي أو أي بند من الراتب.", "Enter the basic salary or another part of the salary.")
        : toBank && !bankName.trim()
          ? tr("اكتب اسم البنك، أو اقفل «الراتب بيتحول على بنك».", "Type the bank's name, or turn off the bank transfer.")
          : toBank && cleanIban && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,32}$/.test(cleanIban)
            ? tr("رقم الآيبان مش مظبوط، المفروض يبدأ بـ SA وبعده أرقام.", "The IBAN doesn't look right; it starts with SA followed by digits.")
            : null;

  async function persistRecord(): Promise<SavedCertificate | null> {
    if (problem || !employeeId) {
      toast.error(problem || tr("اختار الموظف الأول.", "Choose the employee first."));
      return null;
    }
    const payload = {
      employeeId,
      establishment: lh.mode,
      estName: lh.mode === "manual" ? lh.est.name.trim() : undefined,
      estNameEn: lh.mode === "manual" ? lh.est.nameEn.trim() : undefined,
      estCr: lh.mode === "manual" ? lh.est.cr.trim() : undefined,
      estCity: lh.mode === "manual" ? lh.est.city.trim() : undefined,
      jobTitle: job.trim() || undefined,
      startDate: start || undefined,
      recipient: recipient.trim() || undefined,
      basic: num(basic),
      housing: num(housing),
      transport: num(transport),
      others: others.filter((o) => o.label.trim() && num(o.amount) > 0).map((o) => ({ label: o.label.trim(), amount: num(o.amount) })),
      toBank,
      bankName: toBank ? bankName.trim() || undefined : undefined,
      iban: toBank ? cleanIban || undefined : undefined,
      note: note.trim() || undefined,
      names: sg.boxes.map((_, i) => (sg.names[i] ?? "").trim()),
      issueDate: issue || todayRiyadh(),
    };
    const saved = editing
      ? await certificatesApi.updateSalary(editing.id, payload)
      : await certificatesApi.createSalary(payload);
    setEditing(saved);
    qc.invalidateQueries({ queryKey: ["certificates", "saved", "SALARY"] });
    return saved;
  }

  const handleSave = async () => {
    if (problem) return toast.error(problem);
    setBusy("save");
    try {
      const saved = await persistRecord();
      if (saved) {
        toast.success(
          editing
            ? tr(`تم حفظ التعديلات على التعريف ${saved.number}`, `Updated certificate ${saved.number}`)
            : tr(`تم حفظ التعريف بالراتب ${saved.number} في السجل`, `Saved salary certificate ${saved.number}`)
        );
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const handleSaveAndPrint = async () => {
    if (problem) return toast.error(problem);
    setBusy("print");
    try {
      const saved = await persistRecord();
      if (!saved) return;
      toast.success(
        editing
          ? tr(`تم تحديث التعريف ${saved.number} وجاري الطباعة`, `Updated ${saved.number}`)
          : tr(`تم حفظ التعريف ${saved.number} وجاري الطباعة`, `Saved ${saved.number}`)
      );
      await openPdfInNewTab(
        "/certificates/salary/pdf",
        {
          number: saved.number,
          employeeId,
          ...lh.params,
          jobTitle: job,
          startDate: start,
          recipient,
          basic: String(num(basic) || ""),
          housing: String(num(housing) || ""),
          transport: String(num(transport) || ""),
          others: JSON.stringify(others.filter((o) => o.label.trim() && num(o.amount) > 0).map((o) => ({ label: o.label.trim(), amount: num(o.amount) }))),
          bankName: toBank ? bankName : "",
          iban: toBank ? cleanIban : "",
          note,
          names: sg.param,
          issueDate: issue,
        },
        `${saved.number} - ${name}.pdf`
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const printSaved = async (c: SavedCertificate) => {
    const empName = tr(c.employee.fullNameAr, c.employee.fullNameEn || c.employee.fullNameAr).trim();
    const estParams =
      c.establishment === "manual"
        ? { establishment: "manual", estName: c.estName ?? "", estNameEn: c.estNameEn ?? "", estCr: c.estCr ?? "", estCity: c.estCity ?? "" }
        : { establishment: "employee" };
    await openPdfInNewTab(
      "/certificates/salary/pdf",
      {
        number: c.number,
        employeeId: c.employeeId,
        ...estParams,
        jobTitle: c.jobTitle ?? "",
        startDate: c.startDate ?? "",
        recipient: c.recipient ?? "",
        basic: String(c.basic || ""),
        housing: String(c.housing || ""),
        transport: String(c.transport || ""),
        others: JSON.stringify(c.others ?? []),
        bankName: c.toBank ? c.bankName ?? "" : "",
        iban: c.toBank ? c.iban ?? "" : "",
        note: c.note ?? "",
        names: JSON.stringify(c.names ?? []),
        issueDate: c.issueDate,
      },
      `${c.number} - ${empName}.pdf`
    ).catch(() => undefined);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await certificatesApi.remove(deleting.id);
      toast.success(tr(`تم حذف التعريف ${deleting.number}`, `Deleted ${deleting.number}`));
      if (editing?.id === deleting.id) resetForm();
      qc.invalidateQueries({ queryKey: ["certificates", "saved", "SALARY"] });
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const moneyField = (value: string, set: (v: string) => void, label: string) => (
    <div>
      <Label>{label}</Label>
      <div className="xp-money">
        <Input inputMode="decimal" dir="ltr" value={value} onChange={(e) => set(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="0.00" />
        <span>{tr("ر.س", "SAR")}</span>
      </div>
    </div>
  );

  return (
    <div className="xp px" ref={topRef}>
      <PageHeader
        title={tr("تعريف بالراتب", "Salary certificate")}
        description={tr("أنشئ واحفظ وعدّل واطبع تعريف راتب فخم للموظف، بالمبالغ مكتوبة بالحروف، مع حفظه في السجل للرجوع إليه في أي وقت.", "Create, save, edit and print a salary certificate for the employee, stored on the page so you can return to it anytime.")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={resetForm} disabled={Boolean(busy)}>
              <Plus className="h-4 w-4" /> {tr("إضافة تعريف جديد", "New certificate")}
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={Boolean(busy)}>
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editing ? tr("حفظ التعديلات", "Save changes") : tr("حفظ في السجل", "Save certificate")}
            </Button>
            <Button onClick={handleSaveAndPrint} disabled={Boolean(busy)}>
              {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {editing ? tr("حفظ التعديلات وطباعة", "Update & print") : tr("حفظ وطباعة PDF", "Save & print PDF")}
            </Button>
          </div>
        }
      />

      <div className="xp-grid">
        <div className="xp-form">
          {editing && (
            <div className="xp-edit-banner">
              <div className="info">
                <FileCheck2 className="h-5 w-5" />
                <span>
                  {tr("وضع التعديل على التعريف المحفوظ رقم", "Editing saved certificate")} <code>{editing.number}</code>
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={resetForm}>
                <RotateCcw className="h-4 w-4" /> {tr("إلغاء التعديل / إضافة جديد", "Cancel edit / Add new")}
              </Button>
            </div>
          )}

          <Sec i={0} icon={UserRound} title={tr("الموظف", "Employee")}>
            <EmployeePicker employees={employees} value={employeeId} onChange={setEmployeeId} />
          </Sec>

          <LetterheadSection i={1} lh={lh} hasEmployee={!!emp} />

          <Sec i={2} icon={Banknote} title={tr("الراتب الشهري", "Monthly salary")}>
            <div className="xp-fields">
              {moneyField(basic, setBasic, tr("الراتب الأساسي", "Basic salary"))}
              {moneyField(housing, setHousing, tr("بدل السكن", "Housing allowance"))}
              {moneyField(transport, setTransport, tr("بدل المواصلات", "Transport allowance"))}
              <div />
              {others.map((o, i) => (
                <div key={i} className="wide xp-other">
                  <Input value={o.label} maxLength={80} placeholder={tr("اسم البدل، مثلًا: بدل طبيعة عمل", "Allowance, e.g. work nature")} onChange={(e) => setOthers(others.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
                  <div className="xp-money">
                    <Input inputMode="decimal" dir="ltr" value={o.amount} placeholder="0.00" onChange={(e) => setOthers(others.map((x, k) => (k === i ? { ...x, amount: e.target.value.replace(/[^\d.,]/g, "") } : x)))} />
                    <span>{tr("ر.س", "SAR")}</span>
                  </div>
                  <button type="button" className="xp-x" aria-label={tr("شيل البدل", "Remove")} onClick={() => setOthers(others.filter((_, k) => k !== i))}>
                    <Trash2 />
                  </button>
                </div>
              ))}
              {others.length < 8 && (
                <button type="button" className="xp-add wide" onClick={() => setOthers([...others, { label: "", amount: "" }])}>
                  <Plus /> {tr("إضافة بدل تاني", "Add an allowance")}
                </button>
              )}
              <div className="xp-total wide">
                <span>{tr("إجمالي الراتب الشهري", "Total monthly salary")}</span>
                <b dir="ltr">{sar(total)} <small>{tr("ر.س", "SAR")}</small></b>
                {words && <small className="w">{words}</small>}
              </div>
            </div>
          </Sec>

          <Sec i={3} icon={Send} title={tr("التعريف موجّه لمين", "Addressed to")}>
            <div className="xp-fields">
              <div className="wide">
                <Label>{tr("الجهة", "Recipient")}</Label>
                <Input value={recipient} maxLength={160} onChange={(e) => setRecipient(e.target.value)} placeholder={tr("سيبها فاضية عشان تتكتب «إلى من يهمه الأمر»", "Leave empty for “To whom it may concern”")} />
                <div className="xp-chips">
                  <button type="button" className={!to ? "on" : ""} onClick={() => setRecipient("")}>{tr("إلى من يهمه الأمر", "To whom it may concern")}</button>
                  {QUICK_TO.map(([a, e]) => (
                    <button type="button" key={a} className={to === tr(a, e) ? "on" : ""} onClick={() => setRecipient(tr(a, e))}>{tr(a, e)}</button>
                  ))}
                </div>
              </div>
              <div className="wide">
                <Label>{tr("المسمى الوظيفي", "Job title")}</Label>
                <Input value={job} onChange={(e) => setJob(e.target.value)} />
              </div>
              <div>
                <Label>{tr("تاريخ الالتحاق", "Joining date")}</Label>
                <DateInput value={start} onChange={setStart} />
              </div>
            </div>
          </Sec>

          <Sec i={4} icon={Landmark} title={tr("تحويل الراتب", "Salary transfer")}>
            <div className="xp-fields">
              <label className="xp-switch wide">
                <Switch checked={toBank} onCheckedChange={setToBank} />
                <span>
                  <b>{tr("الراتب بيتحول على بنك", "The salary goes to a bank")}</b>
                  <small>{tr("التعريف هيقول إن الراتب بيتحول شهريًا على حسابه في البنك ده.", "The letter says the salary is paid monthly into this account.")}</small>
                </span>
              </label>
              {toBank && (
                <>
                  <div>
                    <Label>{tr("اسم البنك", "Bank")}</Label>
                    <Input value={bankName} maxLength={120} onChange={(e) => setBankName(e.target.value)} placeholder={tr("مثلًا: بنك الراجحي", "e.g. Al Rajhi Bank")} />
                  </div>
                  <div>
                    <Label>{tr("رقم الآيبان", "IBAN")}</Label>
                    <Input dir="ltr" value={iban} maxLength={40} onChange={(e) => setIban(e.target.value.toUpperCase())} placeholder="SA00 0000 0000 0000 0000 0000" />
                  </div>
                </>
              )}
            </div>
          </Sec>

          <Sec i={5} icon={PenLine} title={tr("التوقيعات والإصدار", "Signatures & issue")}>
            <div className="xp-fields">
              <div className="wide">
                <Label>{tr("سطر إضافي (اختياري)", "An extra line (optional)")}</Label>
                <Textarea rows={2} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <SignerFields sg={sg} lh={lh} />
              <div>
                <Label>{tr("تاريخ الإصدار", "Issue date")}</Label>
                <DateInput value={issue} onChange={(v) => setIssue(v || todayRiyadh())} />
              </div>
            </div>
          </Sec>

          <div className="xp-foot">
            <Button onClick={handleSave} disabled={Boolean(busy)}>
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editing ? tr("حفظ التعديلات", "Save changes") : tr("حفظ التعريف في السجل", "Save certificate")}
            </Button>
            <Button variant="outline" onClick={handleSaveAndPrint} disabled={Boolean(busy)}>
              {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {editing ? tr("حفظ التعديلات وطباعة PDF", "Update & print PDF") : tr("حفظ وطباعة PDF", "Save & print PDF")}
            </Button>
            {editing && (
              <Button variant="ghost" onClick={resetForm} disabled={Boolean(busy)}>
                <Plus className="h-4 w-4" /> {tr("إضافة تعريف جديد", "New certificate")}
              </Button>
            )}
          </div>
        </div>

        {/* The letter as it will read */}
        <aside className="xp-paper" aria-live="polite">
          <div className="xp-sheet">
            <SheetHead lh={lh} title={tr("تعريف بالراتب", "Salary Certificate")} sub="SALARY CERTIFICATE" />
            <div className="to">{to ? `${tr("إلى", "To")}: ${to}` : tr("إلى من يهمه الأمر", "To Whom It May Concern")}</div>
            <div className="card">
              {text ? (
                <>
                  <p className="lead">{tr("تحية طيبة وبعد،", "Greetings,")}</p>
                  <p>{text.main}</p>
                  <table className="xp-st">
                    <colgroup><col className="c-no" /><col /><col className="c-am" /></colgroup>
                    <thead>
                      <tr><th>{tr("م", "#")}</th><th>{tr("البند", "Item")}</th><th>{tr("المبلغ", "Amount")} <small>({tr("ريال سعودي", "SAR")})</small></th></tr>
                    </thead>
                    <tbody>
                      {parts.map((p, i) => (
                        <tr key={p.label}><td className="no">{i + 1}</td><td className="lb">{p.label}</td><td className="am"><b dir="ltr">{sar(p.amount)}</b></td></tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="tot"><td /><td>{tr("إجمالي الراتب الشهري", "Total monthly salary")}</td><td className="am"><b dir="ltr">{sar(total)}</b></td></tr>
                      {words && <tr className="words"><td colSpan={3}><small>{tr("المبلغ كتابةً", "In words")}</small>{words}</td></tr>}
                    </tfoot>
                  </table>
                  {text.bank && <p>{text.bank}</p>}
                  {note.trim() && <p>{note.trim()}</p>}
                  <p className="close">{text.close}</p>
                </>
              ) : (
                <p className="empty">{tr("اختار الموظف واكتب الراتب، وهتشوف التعريف هنا وهو بيتكتب.", "Choose the employee and enter the salary; the letter writes itself here.")}</p>
              )}
            </div>
            <SheetSigs sg={sg} lh={lh} estName={lh.name} />
          </div>
          {problem && emp && <p className="xp-warn">{problem}</p>}
        </aside>
      </div>

      {/* Saved Salary Certificates Table */}
      <section className="px-card xp-saved">
        <div className="xp-saved-head">
          <h3 className="xp-saved-title">
            <FileCheck2 className="h-5 w-5" />
            {tr("سجل التعاريف بالراتب المحفوظة", "Saved Salary Certificates")}
            <span className="xp-saved-count">{savedRows.length}</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <label className="px-search">
              <Search />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={tr("بحث بالاسم أو الرقم أو الجهة…", "Search employee, number or recipient…")}
                aria-label={tr("بحث", "Search")}
              />
            </label>
            <Button size="sm" variant="outline" onClick={resetForm}>
              <Plus className="h-4 w-4" /> {tr("إضافة تعريف جديد", "Add new")}
            </Button>
          </div>
        </div>

        <div className="px-tw">
          <table className="px-t">
            <thead>
              <tr>
                <th>{tr("رقم التعريف", "Number")}</th>
                <th>{tr("الموظف", "Employee")}</th>
                <th className="hm">{tr("موجّه إلى", "Recipient")}</th>
                <th className="hm">{tr("المسمى الوظيفي", "Job title")}</th>
                <th>{tr("إجمالي الراتب", "Total salary")}</th>
                <th>{tr("تاريخ الإصدار", "Issue date")}</th>
                <th>{tr("الإجراءات", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="h-9 animate-pulse rounded-xl bg-[var(--l-ground)]" />
                    </td>
                  </tr>
                ))}
              {!isLoading && savedRows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="px-empty">
                      <b>{q ? tr("مفيش تعاريف مطابقة للبحث", "No matching salary certificates") : tr("لسه مفيش تعاريف بالراتب محفوظة", "No saved salary certificates yet")}</b>
                      {!q && tr("املا بيانات التعريف فوق واضغط «حفظ في السجل» أو «حفظ وطباعة PDF» عشان يتحفظ هنا للرجوع إليه وتعديله في أي وقت.", "Fill out the form above and click Save to keep the certificate here for future access and editing.")}
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading &&
                savedRows.map((c, j) => {
                  const isCurrent = editing?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      className={`click ${isCurrent ? "xp-row-active" : ""}`}
                      style={{ ["--j" as string]: j }}
                      onClick={() => loadCertificate(c)}
                    >
                      <td className="mono">
                        <b>{c.number}</b>
                      </td>
                      <td>
                        <EmployeeCell e={c.employee} />
                      </td>
                      <td className="hm">
                        {c.recipient ? <PxBadge tone="ok">{c.recipient}</PxBadge> : <PxBadge tone="mut">{tr("إلى من يهمه الأمر", "To whom it may concern")}</PxBadge>}
                      </td>
                      <td className="hm">{c.jobTitle || tr(c.employee.jobTitle || "—", c.employee.jobTitleEn || c.employee.jobTitle || "—")}</td>
                      <td className="mono">
                        <b>{sar(c.totalSalary ?? 0)}</b> {tr("ر.س", "SAR")}
                      </td>
                      <td className="mono">{dmy(c.issueDate)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button type="button" className="px-btn" onClick={() => loadCertificate(c)} title={tr("تعديل التعريف", "Edit certificate")}>
                            <Edit /> {tr("تعديل", "Edit")}
                          </button>
                          <button type="button" className="px-btn" onClick={() => printSaved(c)} title={tr("طباعة PDF", "Print PDF")}>
                            <Printer /> {tr("طباعة", "Print")}
                          </button>
                          <button
                            type="button"
                            className="px-iconbtn text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleting(c)}
                            aria-label={tr("حذف", "Delete")}
                            title={tr("حذف التعريف", "Delete certificate")}
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={tr(`حذف التعريف ${deleting?.number ?? ""}؟`, `Delete certificate ${deleting?.number ?? ""}?`)}
        description={tr("سيتم حذف هذا التعريف بالراتب نهائيًا من السجل المحفوظ.", "This salary certificate will be permanently removed from the saved list.")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
