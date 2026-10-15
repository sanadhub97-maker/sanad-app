import { useEffect, useMemo, useState } from "react";
import { Banknote, Landmark, PenLine, Plus, Printer, Send, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/i18n";
import { PageHeader } from "@/components/common/page-header";
import { EmployeePicker } from "@/components/common/employee-picker";
import { DateInput } from "@/components/common/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { openPdfInNewTab } from "@/lib/download";
import { amountInWords } from "@/lib/money-words";
import { useAuthStore } from "@/stores/authStore";
import { dmy, todayRiyadh, usePickerData } from "@/pages/custody/custody-shared";
import { LetterheadSection, Sec, SheetHead, SheetSigs, useLetterhead } from "@/pages/certificates/certificate-shared";

/* The salary certificate (تعريف بالراتب), as approved in the preview: the
   employee, the letterhead, the salary in its parts with the total written in
   words, who it is addressed to and, if asked, the bank the salary goes to,
   with the sheet beside the form writing the letter as you fill it in. The
   amounts are typed for each print (the system keeps no salaries); nothing is
   stored. */

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
  const canPrint = useAuthStore((s) => s.hasPermission("employees.export"));
  const { employees, branches } = usePickerData(true);
  const [employeeId, setEmployeeId] = useState<string>();
  const emp = employees.find((e) => e.id === employeeId);
  const branch = branches.find((b) => b.id === emp?.branchId) ?? null;
  const lh = useLetterhead(branch);

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
  const [hrName, setHrName] = useState("");
  const [gmName, setGmName] = useState("");
  const [issue, setIssue] = useState(todayRiyadh());
  const [busy, setBusy] = useState(false);

  // A new employee fills in their own job and joining date.
  useEffect(() => {
    if (!emp) return;
    setJob(tr(emp.jobTitle || "", emp.jobTitleEn || emp.jobTitle || ""));
    setStart(emp.joiningDate ? emp.joiningDate.slice(0, 10) : "");
  }, [emp?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const print = async () => {
    if (problem) return toast.error(problem);
    setBusy(true);
    try {
      await openPdfInNewTab(
        "/certificates/salary/pdf",
        {
          employeeId, ...lh.params,
          jobTitle: job, startDate: start, recipient,
          basic: String(num(basic) || ""), housing: String(num(housing) || ""), transport: String(num(transport) || ""),
          others: JSON.stringify(others.filter((o) => o.label.trim() && num(o.amount) > 0).map((o) => ({ label: o.label.trim(), amount: num(o.amount) }))),
          bankName: toBank ? bankName : "", iban: toBank ? cleanIban : "",
          note, hrName, gmName, issueDate: issue,
        },
        `${tr("تعريف بالراتب", "Salary certificate")} - ${name}.pdf`
      );
    } catch {
      /* the preview shows the error */
    } finally {
      setBusy(false);
    }
  };

  const money = (value: string, set: (v: string) => void, label: string) => (
    <div>
      <Label>{label}</Label>
      <div className="xp-money">
        <Input inputMode="decimal" dir="ltr" value={value} onChange={(e) => set(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="0.00" />
        <span>{tr("ر.س", "SAR")}</span>
      </div>
    </div>
  );

  return (
    <div className="xp">
      <PageHeader
        title={tr("تعريف بالراتب", "Salary certificate")}
        description={tr("اطبع تعريف راتب فخم للموظف، بالمبالغ مكتوبة بالحروف، لأي جهة: بنك أو سفارة أو غيرها.", "Print a salary certificate for the employee, with the total in words, for a bank, an embassy or anyone else.")}
        actions={
          canPrint && (
            <Button onClick={print} disabled={busy}>
              <Printer className="h-4 w-4" /> {tr("معاينة وطباعة", "Preview & print")}
            </Button>
          )
        }
      />

      <div className="xp-grid">
        <div className="xp-form">
          <Sec i={0} icon={UserRound} title={tr("الموظف", "Employee")}>
            <EmployeePicker employees={employees} value={employeeId} onChange={setEmployeeId} />
          </Sec>

          <LetterheadSection i={1} lh={lh} hasEmployee={!!emp} />

          <Sec i={2} icon={Banknote} title={tr("الراتب الشهري", "Monthly salary")}>
            <div className="xp-fields">
              {money(basic, setBasic, tr("الراتب الأساسي", "Basic salary"))}
              {money(housing, setHousing, tr("بدل السكن", "Housing allowance"))}
              {money(transport, setTransport, tr("بدل المواصلات", "Transport allowance"))}
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
              <div>
                <Label>{tr("اسم مدير الموارد البشرية", "HR manager's name")}</Label>
                <Input value={hrName} onChange={(e) => setHrName(e.target.value)} />
              </div>
              <div>
                <Label>{tr("اسم المدير العام", "General manager's name")}</Label>
                <Input value={gmName} onChange={(e) => setGmName(e.target.value)} placeholder={lh.name} />
              </div>
              <div>
                <Label>{tr("تاريخ الإصدار", "Issue date")}</Label>
                <DateInput value={issue} onChange={(v) => setIssue(v || todayRiyadh())} />
              </div>
            </div>
          </Sec>
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
            <SheetSigs hrName={hrName} gmName={gmName} estName={lh.name} />
          </div>
          {problem && emp && <p className="xp-warn">{problem}</p>}
        </aside>
      </div>
    </div>
  );
}
