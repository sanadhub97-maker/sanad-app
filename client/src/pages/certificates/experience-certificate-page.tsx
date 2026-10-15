import { useEffect, useMemo, useState } from "react";
import { CalendarRange, PenLine, Printer, UserRound } from "lucide-react";
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
import { useAuthStore } from "@/stores/authStore";
import { dmy, todayRiyadh, usePickerData } from "@/pages/custody/custody-shared";
import { LetterheadSection, Sec, SheetHead, SheetSigs, useLetterhead } from "@/pages/certificates/certificate-shared";

/* The experience certificate, as approved in the preview: the employee, whose
   letterhead it prints on (their establishment or a name typed by hand), the
   service dates, the wording and the signatories, with a sheet beside the
   form that writes the certificate as you fill it in. Nothing is stored; the
   print is the real one from the server. */

/** Whole years and months (and days under a year) from a to b, b counted. */
function lengthOf(a: string, b: string) {
  const s = new Date(`${a}T00:00:00Z`), e0 = new Date(`${b}T00:00:00Z`);
  const e = new Date(Date.UTC(e0.getUTCFullYear(), e0.getUTCMonth(), e0.getUTCDate() + 1));
  let y = e.getUTCFullYear() - s.getUTCFullYear(), m = e.getUTCMonth() - s.getUTCMonth(), d = e.getUTCDate() - s.getUTCDate();
  if (d < 0) { m -= 1; d += new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 0)).getUTCDate(); }
  if (m < 0) { y -= 1; m += 12; }
  if (y < 0) return "—";
  const ar = (n: number, one: string, two: string, few: string, many: string) => (n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`);
  const en = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const parts = tr(
    [y ? ar(y, "سنة واحدة", "سنتان", "سنوات", "سنة") : "", m ? ar(m, "شهر واحد", "شهران", "أشهر", "شهرًا") : "", !y && d ? ar(d, "يوم واحد", "يومان", "أيام", "يومًا") : ""].filter(Boolean).join(" و"),
    [y ? en(y, "year") : "", m ? en(m, "month") : "", !y && d ? en(d, "day") : ""].filter(Boolean).join(", ")
  );
  return parts || tr("يوم واحد", "1 day");
}

export default function ExperienceCertificatePage() {
  const canPrint = useAuthStore((s) => s.hasPermission("employees.export"));
  const { employees, branches } = usePickerData(true);
  const [employeeId, setEmployeeId] = useState<string>();
  const [job, setJob] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [still, setStill] = useState(true);
  const [conduct, setConduct] = useState(true);
  const [note, setNote] = useState("");
  const [hrName, setHrName] = useState("");
  const [gmName, setGmName] = useState("");
  const [issue, setIssue] = useState(todayRiyadh());
  const [busy, setBusy] = useState(false);

  const emp = employees.find((e) => e.id === employeeId);
  const branch = branches.find((b) => b.id === emp?.branchId) ?? null;
  const lh = useLetterhead(branch);

  // A new employee fills in their own job, joining date and whether they are still on the job.
  useEffect(() => {
    if (!emp) return;
    setJob(tr(emp.jobTitle || "", emp.jobTitleEn || emp.jobTitle || ""));
    setStart(emp.joiningDate ? emp.joiningDate.slice(0, 10) : "");
    const active = emp.employmentStatus === "ACTIVE";
    setStill(active);
    if (active) setEnd("");
  }, [emp?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const estName = lh.name;
  const female = emp?.gender === "FEMALE";
  const g = (m: string, f: string) => (female ? f : m);
  const name = emp ? tr(emp.fullNameAr, emp.fullNameEn || emp.fullNameAr).trim() : "";
  const nat = emp ? tr(emp.nationality || "", (emp as { nationalityEn?: string | null }).nationalityEn || emp.nationality || "").trim() : "";

  const text = useMemo(() => {
    if (!emp) return null;
    const main = tr(
      `تشهد ${estName || "…"} بأن ${g("السيد", "السيدة")}/ ${name}${nat ? `، ${nat} الجنسية` : ""}${emp.iqamaNumber ? `، ${g("ويحمل", "وتحمل")} إقامة رقم ${emp.iqamaNumber}` : ""}، قد ${g("عمل", "عملت")} لدينا${job ? ` بوظيفة ${job}` : ""}${start ? ` خلال الفترة من ${dmy(start)}` : ""}${still ? `، ولا ${g("يزال", "تزال")} على رأس العمل حتى تاريخه` : end ? ` إلى ${dmy(end)}` : ""}.`,
      `This is to certify that ${g("Mr.", "Ms.")} ${name}${nat ? `, of ${nat} nationality` : ""}${emp.iqamaNumber ? `, holder of iqama no. ${emp.iqamaNumber}` : ""}, ${still ? "has been working" : "worked"} with ${estName || "…"}${job ? ` as ${job}` : ""}${start ? ` from ${dmy(start)}` : ""}${still ? " and is still in service to date" : end ? ` to ${dmy(end)}` : ""}.`
    );
    const good = tr(
      `وقد ${g("كان", "كانت")} خلال فترة ${g("عمله", "عملها")} مثالًا للجدية والالتزام والأمانة وحسن الخلق، ونتمنى ${g("له", "لها")} دوام التوفيق والنجاح.`,
      `Throughout this period ${g("he", "she")} proved to be diligent, committed, honest and of good conduct. We wish ${g("him", "her")} continued success.`
    );
    const close = tr(
      `وقد أُعطيت ${g("له", "لها")} هذه الشهادة بناءً على ${g("طلبه", "طلبها")}، دون أدنى مسؤولية على المنشأة تجاه الغير.`,
      `This certificate has been issued at ${g("his", "her")} request, without any liability on the establishment towards others.`
    );
    return { main, good, close };
  }, [emp, estName, name, nat, job, start, end, still, female]); // eslint-disable-line react-hooks/exhaustive-deps

  const problem = !emp
    ? tr("اختار الموظف الأول.", "Choose the employee first.")
    : lh.problem
      ? lh.problem
      : !still && !end
        ? tr("حدد تاريخ انتهاء الخدمة، أو فعّل «لسه على رأس العمل».", "Set the end of service, or turn on “still in service”.")
        : !still && start && end < start
          ? tr("تاريخ انتهاء الخدمة قبل تاريخ الالتحاق.", "The end of service is before the joining date.")
          : null;

  const print = async () => {
    if (problem) return toast.error(problem);
    setBusy(true);
    try {
      await openPdfInNewTab(
        "/certificates/experience/pdf",
        {
          employeeId, ...lh.params,
          jobTitle: job, startDate: start, endDate: still ? "" : end, stillWorking: String(still), conduct: String(conduct),
          note, hrName, gmName, issueDate: issue,
        },
        `${tr("شهادة خبرة", "Experience certificate")} - ${name}.pdf`
      );
    } catch {
      /* the preview shows the error */
    } finally {
      setBusy(false);
    }
  };

  const length = start ? lengthOf(start, still ? issue : end || issue) : "—";

  return (
    <div className="xp">
      <PageHeader
        title={tr("شهادة خبرة", "Experience certificate")}
        description={tr("اطبع شهادة خبرة فخمة للموظف، بترويسة منشأته أو باسم منشأة تكتبه بنفسك.", "Print an experience certificate on the employee's establishment, or under a name you type.")}
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

          <Sec i={2} icon={CalendarRange} title={tr("بيانات الخدمة", "Service")}>
            <div className="xp-fields">
              <div className="wide">
                <Label>{tr("المسمى الوظيفي", "Job title")}</Label>
                <Input value={job} onChange={(e) => setJob(e.target.value)} />
              </div>
              <div>
                <Label>{tr("تاريخ الالتحاق", "Joining date")}</Label>
                <DateInput value={start} onChange={setStart} />
              </div>
              <div>
                <Label>{tr("تاريخ انتهاء الخدمة", "End of service")}</Label>
                <DateInput value={still ? "" : end} onChange={setEnd} disabled={still} />
              </div>
              <label className="xp-switch wide">
                <Switch checked={still} onCheckedChange={setStill} />
                <span>
                  <b>{tr("لسه على رأس العمل", "Still in service")}</b>
                  <small>{tr("الشهادة هتقول إنه لا يزال على رأس العمل حتى تاريخه.", "The certificate says they are still in service to date.")}</small>
                </span>
              </label>
            </div>
          </Sec>

          <Sec i={3} icon={PenLine} title={tr("النص والتوقيعات", "Wording & signatures")}>
            <div className="xp-fields">
              <label className="xp-switch wide">
                <Switch checked={conduct} onCheckedChange={setConduct} />
                <span>
                  <b>{tr("عبارة حسن السيرة والسلوك", "The good-conduct line")}</b>
                  <small>{tr("«مثالًا للجدية والالتزام والأمانة وحسن الخلق…»", "“diligent, committed, honest and of good conduct…”")}</small>
                </span>
              </label>
              <div className="wide">
                <Label>{tr("سطر إضافي (اختياري)", "An extra line (optional)")}</Label>
                <Textarea rows={2} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("مثلًا: وكان آخر راتب أساسي له …", "e.g. their last basic salary was …")} />
              </div>
              <div>
                <Label>{tr("اسم مدير الموارد البشرية", "HR manager's name")}</Label>
                <Input value={hrName} onChange={(e) => setHrName(e.target.value)} />
              </div>
              <div>
                <Label>{tr("اسم المدير العام", "General manager's name")}</Label>
                <Input value={gmName} onChange={(e) => setGmName(e.target.value)} placeholder={estName} />
              </div>
              <div>
                <Label>{tr("تاريخ الإصدار", "Issue date")}</Label>
                <DateInput value={issue} onChange={(v) => setIssue(v || todayRiyadh())} />
              </div>
            </div>
          </Sec>
        </div>

        {/* The certificate as it will read */}
        <aside className="xp-paper" aria-live="polite">
          <div className="xp-sheet">
            <SheetHead lh={lh} title={tr("شهادة خبرة", "Experience Certificate")} sub="EXPERIENCE CERTIFICATE" />
            <div className="to">{tr("إلى من يهمه الأمر", "To Whom It May Concern")}</div>
            <div className="card">
              {text ? (
                <>
                  <p className="lead">{tr("تحية طيبة وبعد،", "Greetings,")}</p>
                  <p>{text.main}</p>
                  {conduct && <p>{text.good}</p>}
                  {note.trim() && <p>{note.trim()}</p>}
                  <p className="close">{text.close}</p>
                </>
              ) : (
                <p className="empty">{tr("اختار الموظف وهتشوف نص الشهادة هنا وهو بيتكتب.", "Choose the employee and the certificate writes itself here.")}</p>
              )}
            </div>
            <div className="strip">
              <div><small>{tr("المسمى الوظيفي", "Job title")}</small><b>{job || "—"}</b></div>
              <div><small>{tr("الالتحاق", "Joined")}</small><b dir="ltr">{start ? dmy(start) : "—"}</b></div>
              <div><small>{tr("الانتهاء", "Ended")}</small><b dir={still ? undefined : "ltr"}>{still ? tr("على رأس العمل", "In service") : end ? dmy(end) : "—"}</b></div>
              <div><small>{tr("مدة الخدمة", "Length")}</small><b>{length}</b></div>
            </div>
            <SheetSigs hrName={hrName} gmName={gmName} estName={estName} />
          </div>
          {problem && emp && <p className="xp-warn">{problem}</p>}
        </aside>
      </div>
    </div>
  );
}
