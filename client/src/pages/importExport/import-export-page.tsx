import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, Check, CheckCircle2, Clock, Download, FileSpreadsheet, IdCard, Loader2, Upload, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { importExportApi, type ImportSummary } from "@/api/importExport";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { reportsApi, type ReportFormat } from "@/api/reports";
import { useAuthStore } from "@/stores/authStore";
import { DayHeader, Pill, groupByDay, type Tone } from "@/components/royal/rp";
import { tr } from "@/i18n";

/* Import & export in the Royal design, as in the approved preview: the
   import as steps (upload, review, import), an export card per section, and
   every past import by day. */

// Import columns and job states, in the interface language.
const FIELDS: Record<string, [string, string]> = {
  employeeNumber: ["رقم الموظف", "Employee number"], fullNameAr: ["الاسم بالعربي", "Arabic name"], fullNameEn: ["الاسم بالإنجليزي", "English name"],
  nationality: ["الجنسية", "Nationality"], gender: ["الجنس", "Gender"], dateOfBirth: ["تاريخ الميلاد", "Date of birth"], mobile: ["الجوال", "Mobile"],
  email: ["البريد الإلكتروني", "Email"], jobTitle: ["المسمى الوظيفي", "Job title"], department: ["القسم", "Department"], branchCode: ["رمز الفرع", "Branch code"],
  joiningDate: ["تاريخ الالتحاق", "Joining date"], employmentStatus: ["الحالة الوظيفية", "Employment status"], iqamaNumber: ["رقم الإقامة", "Iqama number"],
  iqamaIssueDate: ["إصدار الإقامة", "Iqama issue date"], iqamaExpiryDate: ["انتهاء الإقامة", "Iqama expiry"], passportNumber: ["رقم الجواز", "Passport number"],
  passportCountry: ["دولة الجواز", "Passport country"], passportIssueDate: ["إصدار الجواز", "Passport issue date"], passportExpiryDate: ["انتهاء الجواز", "Passport expiry"],
  notes: ["ملاحظات", "Notes"],
};
const fieldLabel = (f?: string) => (f ? (FIELDS[f] ? tr(FIELDS[f][0], FIELDS[f][1]) : f) : "—");
const JOB_STATUS: Record<string, [string, string]> = {
  PENDING: ["في الانتظار", "Pending"], PROCESSING: ["جارٍ المعالجة", "Processing"], COMPLETED: ["مكتمل", "Completed"],
  COMPLETED_WITH_ERRORS: ["مكتمل مع أخطاء", "Completed with errors"], FAILED: ["فشل", "Failed"],
};
const jobStatus = (s: string) => (JOB_STATUS[s] ? tr(JOB_STATUS[s][0], JOB_STATUS[s][1]) : s);

const JOB_TONE: Record<string, Tone> = { PENDING: "mut", PROCESSING: "sky", COMPLETED: "ok", COMPLETED_WITH_ERRORS: "warn", FAILED: "bad" };
const EXPORTS: { key: string; ar: string; en: string; icon: LucideIcon; tone: Tone; run: (f: ReportFormat) => unknown; perm: string }[] = [
  { key: "employees", ar: "الموظفون", en: "Employees", icon: Users, tone: "pri", run: (f) => reportsApi.employees.export({}, f), perm: "employees.view" },
  { key: "employeeDocs", ar: "مستندات الموظفين", en: "Employee documents", icon: IdCard, tone: "vio", run: (f) => reportsApi.documents.export({ sourceType: "EMPLOYEE_DOCUMENT" }, f), perm: "employees.view" },
  { key: "companyDocs", ar: "مستندات الشركة", en: "Company documents", icon: Building2, tone: "teal", run: (f) => reportsApi.documents.export({ sourceType: "COMPANY_DOCUMENT" }, f), perm: "companyDocuments.view" },
  { key: "payments", ar: "المدفوعات", en: "Payments", icon: Wallet, tone: "gold", run: (f) => reportsApi.payments.export({}, f), perm: "payments.view" },
];

export default function ImportExportPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [imported, setImported] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const { data: jobs } = useQuery({ queryKey: ["import-jobs"], queryFn: () => importExportApi.listJobs({ page: 1, pageSize: 50 }) });
  const byDay = groupByDay(jobs?.data ?? [], (j) => j.createdAt);

  async function handlePreview(selected: File) {
    setFile(selected);
    setPreview(null);
    setImported(false);
    setIsBusy(true);
    try {
      const res = await importExportApi.importEmployees(selected, true);
      setPreview(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleConfirmImport() {
    if (!file) return;
    setIsBusy(true);
    try {
      const res = await importExportApi.importEmployees(file, false);
      setPreview(res.data);
      setImported(true);
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["import-jobs"] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  }

  const step = imported ? 3 : preview ? 2 : file ? 1 : 0;
  const steps = [
    [tr("رفع الملف", "Upload the file"), tr("Excel من القالب", "Excel from the template")],
    [tr("المراجعة", "Review"), tr("قبل أي حفظ", "Before anything is saved")],
    [tr("الاستيراد", "Import"), tr("وتقرير النتيجة", "With the result")],
  ];
  const toSave = preview ? preview.importedCount + preview.updatedCount : 0;

  return (
    <div className="rp">
      <PageHeader
        title={t("importExport.title")}
        description={tr("أدخل بيانات كثيرة مرة واحدة، أو صدّرها بتصميم الطباعة", "Bring in many records at once, or export them in your print design")}
        actions={
          <Button variant="outline" onClick={() => importExportApi.downloadEmployeesTemplate()}>
            <Download className="h-4 w-4" /> {t("importExport.downloadTemplate")}
          </Button>
        }
      />

      <section className="rp-card rp-rise overflow-hidden" style={{ ["--i" as string]: 1 }}>
        <div className="rp-sec border-b border-[var(--l-line)] px-[18px] py-4">
          <h2>
            <FileSpreadsheet />
            {t("importExport.importEmployees")}
          </h2>
          {file && <p className="rp-mono">{file.name}</p>}
        </div>
        <div className="rp-steps">
          {steps.map(([title, sub], i) => (
            <div key={i} className={cn("rp-step", i < step && "done", i === step && "cur")}>
              <span className="n">{i < step ? <Check /> : i + 1}</span>
              <b>{title}</b>
              <small>{sub}</small>
            </div>
          ))}
        </div>
        <div className="grid gap-3 border-t border-[var(--l-line)] p-[18px]">
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => (e.target.files?.[0] && handlePreview(e.target.files[0]), (e.target.value = ""))} />
          {!preview && (
            <div className="rp-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => (e.preventDefault(), e.dataTransfer.files[0] && handlePreview(e.dataTransfer.files[0]))}>
              <span className="rp-ico" style={{ width: 52, height: 52, borderRadius: 16 }}>
                {isBusy ? <Loader2 className="animate-spin" /> : <Upload />}
              </span>
              <div className="min-w-0 flex-1">
                <b>{isBusy ? tr("جاري قراءة الملف…", "Reading the file…") : tr("اسحب ملف Excel هنا أو اختاره", "Drop an Excel file here or choose one")}</b>
                <small>{tr("النظام يتعرف على الأعمدة ويعرض لك النتيجة قبل ما يحفظ أي حاجة", "The columns are matched and you see the result before anything is saved")}</small>
              </div>
              <Button onClick={() => inputRef.current?.click()} disabled={isBusy}>
                <Upload className="h-4 w-4" /> {t("importExport.uploadExcel")}
              </Button>
            </div>
          )}

          {preview && (
            <>
              <div className="rp-kpis rp-card" style={{ boxShadow: "none" }}>
                <div>
                  <span className="l">{t("importExport.totalRows")}</span>
                  <span className="v">{preview.totalRows}</span>
                </div>
                <div className="rp-ok">
                  <span className="l">
                    <i />
                    {imported ? tr("اتضافوا", "Added") : t("importExport.toImport")}
                  </span>
                  <span className="v" style={{ ["--vc" as string]: "var(--c)" }}>
                    {preview.importedCount}
                  </span>
                </div>
                <div className="rp-sky">
                  <span className="l">
                    <i />
                    {imported ? tr("اتحدّثوا", "Updated") : t("importExport.toUpdate")}
                  </span>
                  <span className="v" style={{ ["--vc" as string]: "var(--c)" }}>
                    {preview.updatedCount}
                  </span>
                </div>
                <div className={preview.failedCount ? "rp-bad" : "rp-mut"}>
                  <span className="l">
                    <i />
                    {t("importExport.errors")}
                  </span>
                  <span className="v" style={{ ["--vc" as string]: "var(--c)" }}>
                    {preview.failedCount}
                  </span>
                  {preview.skippedCount > 0 && <span className="s">{tr(`${preview.skippedCount} صف اتخطّى`, `${preview.skippedCount} skipped`)}</span>}
                </div>
              </div>

              {preview.errors.length > 0 && (
                <div className="rp-card overflow-hidden" style={{ boxShadow: "none" }}>
                  <div className="rp-bucket rp-warn">
                    <AlertTriangle className="h-4 w-4 text-[var(--l-amber)]" />
                    {t("importExport.rowsNeedAttention", { count: preview.errors.length })}
                    <span>
                      <button type="button" className="font-semibold text-[hsl(var(--primary))] hover:underline" onClick={() => importExportApi.downloadJobErrors(preview.importJobId)}>
                        {t("importExport.downloadErrors")}
                      </button>
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {preview.errors.slice(0, 50).map((e, i) => (
                      <div key={i} className="rp-item">
                        <span className="rp-ico sm rp-warn">
                          <AlertTriangle />
                        </span>
                        <span className="t">
                          <b>{tr(e.message, e.messageEn ?? e.message)}</b>
                          <small>
                            {tr("الصف", "Row")} <span className="rp-num">{e.rowNumber}</span> · {fieldLabel(e.field)}
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={isBusy}>
                  <Upload className="h-4 w-4" /> {imported ? tr("استيراد ملف آخر", "Import another file") : tr("ملف آخر", "Another file")}
                </Button>
                {!imported && toSave > 0 && (
                  <Button onClick={handleConfirmImport} disabled={isBusy}>
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {t("importExport.confirmImport", { count: toSave })}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <div className="rp-sec rp-rise" style={{ ["--i" as string]: 2 }}>
        <h2>
          <Download />
          {tr("تصدير", "Export")}
        </h2>
        <p>{tr("بتصميم الطباعة PDF، أو Excel، أو CSV", "PDF in your print design, Excel or CSV")}</p>
      </div>
      <div className="rp-xcards rp-rise" style={{ ["--i" as string]: 3 }}>
        {EXPORTS.filter((x) => hasPermission(x.perm)).map((x) => (
          <div key={x.key} className="rp-card rp-xc rp-lift">
            <div className="flex items-center gap-3">
              <span className={cn("rp-ico", `rp-${x.tone}`)}>
                <x.icon />
              </span>
              <b>{tr(x.ar, x.en)}</b>
            </div>
            <div className="fmt">
              {(["xlsx", "pdf", "csv"] as const).map((fmt) => (
                <button key={fmt} type="button" onClick={() => x.run(fmt)}>
                  {fmt === "xlsx" ? "Excel" : fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rp-sec rp-rise" style={{ ["--i" as string]: 4 }}>
        <h2>
          <Clock />
          {t("importExport.recentJobs")}
        </h2>
        <p>{tr("كل عملية استيراد باليوم", "Every import by day")}</p>
      </div>
      {byDay.length === 0 ? (
        <div className="rp-card rp-empty">
          <FileSpreadsheet className="mx-auto mb-2 h-5 w-5" />
          {t("importExport.noJobs")}
        </div>
      ) : (
        <div className="rp-card rp-rise overflow-hidden" style={{ ["--i" as string]: 5 }}>
          {byDay.map((g) => (
            <div key={g.day.toISOString()}>
              <DayHeader
                day={g.day}
                right={
                  <>
                    <b>{g.items.length}</b>
                    {tr("عملية", g.items.length === 1 ? "import" : "imports")}
                  </>
                }
              />
              {g.items.map((job) => (
                <div key={job.id} className="rp-item">
                  <span className="rp-ico sm rp-ok">
                    <Upload />
                  </span>
                  <span className="t">
                    <b dir="auto">{job.fileName}</b>
                    <small>
                      {tr(`${job.importedCount} جديد · ${job.updatedCount} تحديث`, `${job.importedCount} new · ${job.updatedCount} updated`)}
                      {job.failedCount > 0 && tr(` · ${job.failedCount} خطأ`, ` · ${job.failedCount} failed`)}
                      {job.createdBy?.fullName ? ` · ${job.createdBy.fullName}` : ""}
                      {" · "}
                      {new Date(job.createdAt).toLocaleTimeString(tr("ar-EG-u-nu-latn", "en-GB"), { hour: "2-digit", minute: "2-digit" })}
                    </small>
                  </span>
                  {job.failedCount > 0 && (
                    <button type="button" className="rp-chip" onClick={() => importExportApi.downloadJobErrors(job.id)}>
                      <Download className="h-3.5 w-3.5" /> {t("importExport.errors")}
                    </button>
                  )}
                  <Pill tone={JOB_TONE[job.status] ?? "mut"}>{jobStatus(job.status)}</Pill>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
