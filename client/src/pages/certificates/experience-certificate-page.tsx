import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
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
import { PxStat } from "@/components/royal/px";
import { getErrorMessage } from "@/lib/api";
import { openPdfInNewTab } from "@/lib/download";
import { certificatesApi, type SavedCertificate } from "@/api/certificates";
import { EmployeeCell, dmy, todayRiyadh, usePickerData } from "@/pages/custody/custody-shared";
import { LetterheadSection, Sec, SheetHead, SheetSigs, SignerFields, useLetterhead, useSigners } from "@/pages/certificates/certificate-shared";

/** Whole years and months (and days under a year) from a to b, b counted. */
function lengthOf(a: string, b: string) {
  const s = new Date(`${a}T00:00:00Z`),
    e0 = new Date(`${b}T00:00:00Z`);
  const e = new Date(Date.UTC(e0.getUTCFullYear(), e0.getUTCMonth(), e0.getUTCDate() + 1));
  let y = e.getUTCFullYear() - s.getUTCFullYear(),
    m = e.getUTCMonth() - s.getUTCMonth(),
    d = e.getUTCDate() - s.getUTCDate();
  if (d < 0) {
    m -= 1;
    d += new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 0)).getUTCDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  if (y < 0) return "—";
  const ar = (n: number, one: string, two: string, few: string, many: string) =>
    n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`;
  const en = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const parts = tr(
    [
      y ? ar(y, "سنة واحدة", "سنتان", "سنوات", "سنة") : "",
      m ? ar(m, "شهر واحد", "شهران", "أشهر", "شهرًا") : "",
      !y && d ? ar(d, "يوم واحد", "يومان", "أيام", "يومًا") : "",
    ]
      .filter(Boolean)
      .join(" و"),
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

  const [viewMode, setViewMode] = useState<"cards" | "form">("cards");
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

  function openNewCertificate() {
    resetForm();
    setViewMode("form");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    setViewMode("form");
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
            : tr(`تم حفظ شهادة الخبرة ${saved.number} في البطاقات`, `Saved experience certificate ${saved.number}`)
        );
        setViewMode("cards");
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
      setViewMode("cards");
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
  const uniqueEmployeesCount = useMemo(() => new Set(savedRows.map((r) => r.employeeId)).size, [savedRows]);
  const latestIssueDate = savedRows[0]?.issueDate ? dmy(savedRows[0].issueDate) : "—";

  return (
    <div className="xp px" ref={topRef}>
      {viewMode === "cards" ? (
        <>
          <PageHeader
            title={tr("شهادة خبرة", "Experience certificate")}
            description={tr(
              "جميع شهادات الخبرة المحفوظة معروضة كبطاقات ملكية؛ اضغط على «إضافة شهادة خبرة» لفتح صفحة التسجيل.",
              "All saved experience certificates displayed as royal cards; click “Add experience certificate” to open the registration form."
            )}
            actions={
              <Button onClick={openNewCertificate}>
                <Plus className="h-4 w-4" /> {tr("إضافة شهادة خبرة", "Add experience certificate")}
              </Button>
            }
          />

          <div className="px-stats">
            <PxStat
              i={1}
              label={tr("بطاقات شهادات الخبرة", "Experience certificates")}
              value={savedRows.length}
              icon={FileCheck2}
              color="#d97706"
              sub={tr("محفوظة وجاهزة للطباعة أو التعديل", "Saved & ready to print or edit")}
            />
            <PxStat
              i={2}
              label={tr("الموظفون المسجّلة لهم شهادات", "Employees covered")}
              value={uniqueEmployeesCount}
              icon={UserRound}
              color="#2563eb"
              sub={tr("موظف", "employees")}
            />
            <PxStat
              i={3}
              label={tr("آخر إصدار محفوظ", "Latest issue date")}
              value={latestIssueDate}
              icon={Calendar}
              color="#059669"
              sub={savedRows[0]?.number ?? tr("لا يوجد بعد", "None yet")}
            />
          </div>

          <section className="px-card xp-saved">
            <div className="xp-saved-head">
              <h3 className="xp-saved-title">
                <FileCheck2 className="h-5 w-5" />
                {tr("بطاقات شهادات الخبرة المحفوظة", "Saved Experience Certificate Cards")}
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
                <Button size="sm" onClick={openNewCertificate}>
                  <Plus className="h-4 w-4" /> {tr("إضافة شهادة خبرة", "Add experience certificate")}
                </Button>
              </div>
            </div>

            {isLoading && (
              <div className="xp-cards-grid">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-64 animate-pulse rounded-2xl bg-[var(--l-ground)]" />
                ))}
              </div>
            )}

            {!isLoading && savedRows.length === 0 && (
              <div className="px-empty">
                <b>{q ? tr("مفيش بطاقات مطابقة للبحث", "No matching experience certificates") : tr("لسه مفيش بطاقات شهادات خبرة محفوظة", "No saved experience certificate cards yet")}</b>
                <div className="mt-2">
                  {!q && tr("اضغط على زر «إضافة شهادة خبرة» لفتح صفحة التسجيل وإنشاء أول بطاقة شهادة خبرة.", "Click “Add experience certificate” to open the registration page and create the first card.")}
                </div>
                {!q && (
                  <div className="mt-4">
                    <Button onClick={openNewCertificate}>
                      <Plus className="h-4 w-4" /> {tr("إضافة شهادة خبرة", "Add experience certificate")}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!isLoading && savedRows.length > 0 && (
              <div className="xp-cards-grid">
                {savedRows.map((c, j) => {
                  const estTitle =
                    c.establishment === "manual"
                      ? c.estName || "—"
                      : c.employee.branch
                        ? tr(c.employee.branch.name, c.employee.branch.nameEn || c.employee.branch.name)
                        : tr("الشركة", "Company");
                  const jobLabel = c.jobTitle || tr(c.employee.jobTitle || "—", c.employee.jobTitleEn || c.employee.jobTitle || "—");
                  const cardDuration = c.startDate
                    ? lengthOf(c.startDate, c.stillWorking ? c.issueDate : c.endDate || c.issueDate)
                    : "—";
                  const empFullName = tr(c.employee.fullNameAr, c.employee.fullNameEn || c.employee.fullNameAr).trim();
                  const idNum = c.employee.iqamaNumber || c.employee.employeeNumber || "—";
                  const expPct = c.stillWorking ? 85 : 100;

                  return (
                    <article key={c.id} className="rx-cert-card is-exp" style={{ ["--j" as string]: j }}>
                      {(["tr", "tl", "br", "bl"] as const).map((pos) => (
                        <svg key={pos} className={`rx-cert-fc ${pos}`} viewBox="0 0 32 32" fill="none" aria-hidden="true">
                          <path d="M2 2 H21 C25.97 2 30 6.03 30 11 V30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <circle cx="24" cy="8" r="1.8" fill="currentColor" />
                        </svg>
                      ))}

                      <div className="rx-cert-crown">
                        <div className="rx-crown-top">
                          <div className="rx-crown-est">
                            <span className="rx-crown-kicker">🏅 EXPERIENCE CERTIFICATE · {tr("خبرة معتمدة", "OFFICIAL")}</span>
                            <b className="rx-crown-title">{tr("شهادة خبرة رسمية", "Experience Certificate")}</b>
                            <span className="rx-crown-sub">🏛️ {estTitle}</span>
                          </div>
                          <div className="rx-crown-badges">
                            <span className="rx-cert-num">{c.number}</span>
                            <span className={`rx-cert-st${c.stillWorking ? "" : " warn"}`}>
                              <i /> {c.stillWorking ? tr("على رأس العمل", "In service") : tr("انتهت الخدمة", "Ended")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rx-cert-medal-wrap">
                        <div className="rx-cert-medal" title={tr("ختم المنشأة الملكي", "Royal Establishment Seal")}>
                          <div className="rx-cert-medal-inner">{estTitle.trim()[0] || "س"}</div>
                        </div>
                        <span className="rx-cert-date-pill">
                          📅 {tr("إصدار:", "Issued:")} {dmy(c.issueDate)}
                        </span>
                      </div>

                      <div className="rx-cert-body">
                        <div className="rx-emp-box">
                          <div className="rx-emp-main">
                            <EmployeeCell e={c.employee} />
                          </div>
                          <span className="rx-id-tag">
                            <small>ID</small> {idNum}
                          </span>
                        </div>

                        <div className="rx-voucher-stage">
                          <div className="rx-v-head">
                            <div className="rx-v-lbl">
                              <span>{tr("إجمالي مدة الخبرة والخدمة المعتمدة", "Total Approved Service Duration")}</span>
                              <small>{tr("مسار الخدمة المهنية الموثّق", "Verified Career Timeline")}</small>
                            </div>
                            <span className="rx-v-amount ar">{cardDuration}</span>
                          </div>

                          <div className="rx-prop-bar-wrap">
                            <div className="rx-prop-bar" title={tr("مؤشر مسار الخدمة", "Service progress")}>
                              <div className="rx-prop-seg g2" style={{ width: `${expPct}%` }} />
                              <div className="rx-prop-seg g1" style={{ width: `${100 - expPct}%` }} />
                            </div>
                          </div>

                          <div className="rx-v-pillars">
                            <div>
                              <small>
                                <i style={{ background: "#7ccfa2" }} /> {tr("تاريخ المباشرة", "Start Date")}
                              </small>
                              <b>{c.startDate ? dmy(c.startDate) : "—"}</b>
                            </div>
                            <div>
                              <small>
                                <i style={{ background: "#f3dfae" }} /> {tr("نهاية الخدمة", "End Date")}
                              </small>
                              <b>{c.stillWorking ? tr("على رأس العمل", "In service") : c.endDate ? dmy(c.endDate) : "—"}</b>
                            </div>
                            <div>
                              <small>
                                <i style={{ background: "#84b6e8" }} /> {tr("السجل المهني", "Record")}
                              </small>
                              <b>{c.conduct !== false ? tr("ممتاز ✓", "Excellent ✓") : tr("معتمد ✓", "Verified ✓")}</b>
                            </div>
                          </div>

                          <div className="rx-v-ribbon">
                            <span className="tag">{tr("السلوك", "Conduct")}</span>
                            <span className="txt">
                              {c.conduct !== false
                                ? tr("مثالًا للجدية والالتزام والأمانة وحسن الخلق", "Diligent, committed, honest and of good conduct")
                                : tr("شهادة خدمة وخبرة رسمية معتمدة", "Official verified service certificate")}
                            </span>
                          </div>
                        </div>

                        <div className="rx-parchment-excerpt">
                          <div className="rx-parchment-txt">
                            <small>{tr("إلى من يهمه الأمر · شهادة خبرة", "To whom it may concern · Experience")}</small>
                            <p>
                              {tr(
                                `«تشهد ${estTitle} بأن ${empFullName} قد عمل لدينا بوظيفة ${jobLabel} لمدة (${cardDuration})…»`,
                                `“${estTitle} certifies that ${empFullName} worked as ${jobLabel} for (${cardDuration})…”`
                              )}
                            </p>
                          </div>
                          <div className="rx-wax-stamp" aria-hidden="true">
                            <span>{tr("ختم", "OFFICIAL")}</span>
                            <span>{tr("معتمد", "SEAL")}</span>
                          </div>
                        </div>

                        <div className="rx-info-grid">
                          <div className="rx-info-cell">
                            <small>{tr("المسمى الوظيفي", "Job title")}</small>
                            <b>{jobLabel}</b>
                          </div>
                          <div className="rx-info-cell">
                            <small>{tr("حالة الموظف الحالية", "Current status")}</small>
                            <b>{c.stillWorking ? tr("مستمر على رأس العمل", "Active in service") : tr("انتهت الخدمة نظاميًا", "Service completed")}</b>
                          </div>
                        </div>
                      </div>

                      <div className="rx-cert-foot">
                        <button type="button" className="px-btn pri-act" onClick={() => printSaved(c)} title={tr("طباعة PDF", "Print PDF")}>
                          <Printer /> {tr("طباعة الشهادة PDF", "Print PDF")}
                        </button>
                        <button type="button" className="px-btn" onClick={() => loadCertificate(c)} title={tr("تعديل الشهادة ومعاينة الورقة", "Edit & preview certificate")}>
                          <Edit /> {tr("تعديل ومعاينة", "Edit & Preview")}
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
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <PageHeader
            title={editing ? tr(`تعديل شهادة خبرة (${editing.number})`, `Edit Experience Certificate (${editing.number})`) : tr("إضافة شهادة خبرة", "Add experience certificate")}
            description={tr(
              "املا بيانات الشهادة على اليمين وشاهد المعاينة الحية للورقة الرسمية على اليسار، ثم اضغط حفظ للرجوع إلى البطاقات.",
              "Fill in the certificate details and preview the official sheet live, then click Save to return to the cards."
            )}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewMode("cards");
                    setEditing(null);
                  }}
                  disabled={Boolean(busy)}
                >
                  <ArrowRight className="h-4 w-4" /> {tr("الرجوع إلى البطاقات", "Back to cards")}
                </Button>
                <Button variant="outline" onClick={handleSave} disabled={Boolean(busy)}>
                  {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editing ? tr("حفظ التعديلات", "Save changes") : tr("حفظ في البطاقات", "Save card")}
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
                      {tr("وضع التعديل على البطاقة المحفوظة رقم", "Editing saved card")} <code>{editing.number}</code>
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    <RotateCcw className="h-4 w-4" /> {tr("تفريغ النموذج لإضافة جديد", "Reset for new")}
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
                  {editing ? tr("حفظ التعديلات والعودة للبطاقات", "Save changes & back to cards") : tr("حفظ الشهادة في البطاقات", "Save certificate card")}
                </Button>
                <Button variant="outline" onClick={handleSaveAndPrint} disabled={Boolean(busy)}>
                  {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                  {editing ? tr("حفظ التعديلات وطباعة PDF", "Update & print PDF") : tr("حفظ وطباعة PDF", "Save & print PDF")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setViewMode("cards");
                    setEditing(null);
                  }}
                  disabled={Boolean(busy)}
                >
                  <ArrowRight className="h-4 w-4" /> {tr("الرجوع إلى البطاقات", "Back to cards")}
                </Button>
              </div>
            </div>

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
                  <div>
                    <small>{tr("المسمى الوظيفي", "Job title")}</small>
                    <b>{job || "—"}</b>
                  </div>
                  <div>
                    <small>{tr("الالتحاق", "Joined")}</small>
                    <b dir="ltr">{start ? dmy(start) : "—"}</b>
                  </div>
                  <div>
                    <small>{tr("الانتهاء", "Ended")}</small>
                    <b dir={still ? undefined : "ltr"}>{still ? tr("على رأس العمل", "In service") : end ? dmy(end) : "—"}</b>
                  </div>
                  <div>
                    <small>{tr("مدة الخدمة", "Length")}</small>
                    <b>{length}</b>
                  </div>
                </div>
                <SheetSigs sg={sg} lh={lh} estName={estName} />
              </div>
              {problem && emp && <p className="xp-warn">{problem}</p>}
            </aside>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={tr(`حذف الشهادة ${deleting?.number ?? ""}؟`, `Delete certificate ${deleting?.number ?? ""}?`)}
        description={tr("سيتم حذف بطاقة شهادة الخبرة هذه نهائيًا من السجل المحفوظ.", "This experience certificate card will be permanently removed from the saved list.")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
