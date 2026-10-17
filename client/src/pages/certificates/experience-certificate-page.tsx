import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  Edit,
  FileCheck2,
  Loader2,
  PenLine,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
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
import { certificatesApi, type SavedCertificate } from "@/api/certificates";
import { EmployeeCell, dmy, todayRiyadh, usePickerData } from "@/pages/custody/custody-shared";
import { LetterheadSection, Sec, SheetHead, SheetSigs, SignerFields, useLetterhead, useSigners } from "@/pages/certificates/certificate-shared";

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
  const qc = useQueryClient();
  const topRef = useRef<HTMLDivElement>(null);
  const skipEmpDefaultsRef = useRef(false);

  const { employees, branches } = usePickerData(true);
  const [employeeId, setEmployeeId] = useState<string>();
  const [job, setJob] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [still, setStill] = useState(true);
  const [conduct, setConduct] = useState(true);
  const [note, setNote] = useState("");
  const sg = useSigners();
  const [issue, setIssue] = useState(todayRiyadh());
  const [busy, setBusy] = useState<"" | "save" | "print">("");

  const [editing, setEditing] = useState<SavedCertificate | null>(null);
  const [deleting, setDeleting] = useState<SavedCertificate | null>(null);
  const [q, setQ] = useState("");

  const emp = employees.find((e) => e.id === employeeId);
  const branch = branches.find((b) => b.id === emp?.branchId) ?? null;
  const lh = useLetterhead(branch);

  const { data: savedRows = [], isLoading } = useQuery({
    queryKey: ["certificates", "saved", "EXPERIENCE", q],
    queryFn: () => certificatesApi.list({ kind: "EXPERIENCE", q: q || undefined }),
  });

  // A newly selected employee fills in their own job, joining date and whether they are still on the job.
  useEffect(() => {
    if (!emp) return;
    if (skipEmpDefaultsRef.current) {
      skipEmpDefaultsRef.current = false;
      return;
    }
    setJob(tr(emp.jobTitle || "", emp.jobTitleEn || emp.jobTitle || ""));
    setStart(emp.joiningDate ? emp.joiningDate.slice(0, 10) : "");
    const active = emp.employmentStatus === "ACTIVE";
    setStill(active);
    if (active) setEnd("");
  }, [emp?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setEditing(null);
    setEmployeeId(undefined);
    lh.setMode("employee");
    lh.setEst({ name: "", nameEn: "", cr: "", city: "" });
    setJob("");
    setStart("");
    setEnd("");
    setStill(true);
    setConduct(true);
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
    setEnd(c.endDate ?? "");
    setStill(c.stillWorking ?? true);
    setConduct(c.conduct ?? true);
    setNote(c.note ?? "");
    sg.setNames(c.names ?? []);
    setIssue(c.issueDate || todayRiyadh());
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
      endDate: still ? undefined : end || undefined,
      stillWorking: still,
      conduct,
      note: note.trim() || undefined,
      names: sg.boxes.map((_, i) => (sg.names[i] ?? "").trim()),
      issueDate: issue || todayRiyadh(),
    };
    const saved = editing
      ? await certificatesApi.updateExperience(editing.id, payload)
      : await certificatesApi.createExperience(payload);
    setEditing(saved);
    qc.invalidateQueries({ queryKey: ["certificates", "saved", "EXPERIENCE"] });
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
            ? tr(`تم حفظ التعديلات على الشهادة ${saved.number}`, `Updated certificate ${saved.number}`)
            : tr(`تم حفظ شهادة الخبرة ${saved.number} في السجل`, `Saved experience certificate ${saved.number}`)
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
          ? tr(`تم تحديث الشهادة ${saved.number} وجاري الطباعة`, `Updated ${saved.number}`)
          : tr(`تم حفظ الشهادة ${saved.number} وجاري الطباعة`, `Saved ${saved.number}`)
      );
      await openPdfInNewTab(
        "/certificates/experience/pdf",
        {
          number: saved.number,
          employeeId,
          ...lh.params,
          jobTitle: job,
          startDate: start,
          endDate: still ? "" : end,
          stillWorking: String(still),
          conduct: String(conduct),
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
      "/certificates/experience/pdf",
      {
        number: c.number,
        employeeId: c.employeeId,
        ...estParams,
        jobTitle: c.jobTitle ?? "",
        startDate: c.startDate ?? "",
        endDate: c.stillWorking ? "" : c.endDate ?? "",
        stillWorking: String(c.stillWorking ?? true),
        conduct: String(c.conduct ?? true),
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
      toast.success(tr(`تم حذف الشهادة ${deleting.number}`, `Deleted ${deleting.number}`));
      if (editing?.id === deleting.id) resetForm();
      qc.invalidateQueries({ queryKey: ["certificates", "saved", "EXPERIENCE"] });
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const length = start ? lengthOf(start, still ? issue : end || issue) : "—";

  return (
    <div className="xp px" ref={topRef}>
      <PageHeader
        title={tr("شهادة خبرة", "Experience certificate")}
        description={tr("أنشئ واحفظ وعدّل واطبع شهادة خبرة فخمة للموظف، بترويسة منشأته أو باسم منشأة تكتبه بنفسك، مع حفظها في السجل للرجوع إليها في أي وقت.", "Create, save, edit and print an experience certificate on the employee's establishment or under a name you type.")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={resetForm} disabled={Boolean(busy)}>
              <Plus className="h-4 w-4" /> {tr("إضافة شهادة جديدة", "New certificate")}
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
                  {tr("وضع التعديل على الشهادة المحفوظة رقم", "Editing saved certificate")} <code>{editing.number}</code>
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
              {editing ? tr("حفظ التعديلات", "Save changes") : tr("حفظ الشهادة في السجل", "Save certificate")}
            </Button>
            <Button variant="outline" onClick={handleSaveAndPrint} disabled={Boolean(busy)}>
              {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {editing ? tr("حفظ التعديلات وطباعة PDF", "Update & print PDF") : tr("حفظ وطباعة PDF", "Save & print PDF")}
            </Button>
            {editing && (
              <Button variant="ghost" onClick={resetForm} disabled={Boolean(busy)}>
                <Plus className="h-4 w-4" /> {tr("إضافة شهادة جديدة", "New certificate")}
              </Button>
            )}
          </div>
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
            <SheetSigs sg={sg} lh={lh} estName={estName} />
          </div>
          {problem && emp && <p className="xp-warn">{problem}</p>}
        </aside>
      </div>

      {/* Saved Experience Certificates Table */}
      <section className="px-card xp-saved">
        <div className="xp-saved-head">
          <h3 className="xp-saved-title">
            <FileCheck2 className="h-5 w-5" />
            {tr("سجل شهادات الخبرة المحفوظة", "Saved Experience Certificates")}
            <span className="xp-saved-count">{savedRows.length}</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <label className="px-search">
              <Search />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={tr("بحث بالاسم أو الرقم أو المسمى…", "Search employee, number or job…")}
                aria-label={tr("بحث", "Search")}
              />
            </label>
            <Button size="sm" variant="outline" onClick={resetForm}>
              <Plus className="h-4 w-4" /> {tr("إضافة شهادة جديدة", "Add new")}
            </Button>
          </div>
        </div>

        <div className="px-tw">
          <table className="px-t">
            <thead>
              <tr>
                <th>{tr("رقم الشهادة", "Number")}</th>
                <th>{tr("الموظف", "Employee")}</th>
                <th className="hm">{tr("الترويسة / المنشأة", "Establishment")}</th>
                <th className="hm">{tr("المسمى الوظيفي", "Job title")}</th>
                <th>{tr("فترة الخدمة", "Service period")}</th>
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
                      <b>{q ? tr("مفيش شهادات مطابقة للبحث", "No matching experience certificates") : tr("لسه مفيش شهادات خبرة محفوظة", "No saved experience certificates yet")}</b>
                      {!q && tr("املا بيانات الشهادة فوق واضغط «حفظ في السجل» أو «حفظ وطباعة PDF» عشان تتحفظ هنا للرجوع إليها وتعديلها في أي وقت.", "Fill out the form above and click Save to keep the certificate here for future access and editing.")}
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading &&
                savedRows.map((c, j) => {
                  const isCurrent = editing?.id === c.id;
                  const estTitle =
                    c.establishment === "manual"
                      ? c.estName || "—"
                      : c.employee.branch
                        ? tr(c.employee.branch.name, c.employee.branch.nameEn || c.employee.branch.name)
                        : tr("الشركة", "Company");
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
                      <td className="hm">{estTitle}</td>
                      <td className="hm">{c.jobTitle || tr(c.employee.jobTitle || "—", c.employee.jobTitleEn || c.employee.jobTitle || "—")}</td>
                      <td>
                        {c.stillWorking ? (
                          <PxBadge tone="ok">{c.startDate ? `${dmy(c.startDate)} ← ${tr("على رأس العمل", "In service")}` : tr("على رأس العمل", "In service")}</PxBadge>
                        ) : (
                          <span className="mono">{c.startDate ? dmy(c.startDate) : "—"} ← {c.endDate ? dmy(c.endDate) : "—"}</span>
                        )}
                      </td>
                      <td className="mono">{dmy(c.issueDate)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button type="button" className="px-btn" onClick={() => loadCertificate(c)} title={tr("تعديل الشهادة", "Edit certificate")}>
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
                            title={tr("حذف الشهادة", "Delete certificate")}
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
        title={tr(`حذف الشهادة ${deleting?.number ?? ""}؟`, `Delete certificate ${deleting?.number ?? ""}?`)}
        description={tr("سيتم حذف شهادة الخبرة هذه نهائيًا من السجل المحفوظ.", "This experience certificate will be permanently removed from the saved list.")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
