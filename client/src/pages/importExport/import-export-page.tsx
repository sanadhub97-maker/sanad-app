import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { importExportApi, type ImportSummary } from "@/api/importExport";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { tr } from "@/i18n";

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

export default function ImportExportPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const { data: jobs } = useQuery({ queryKey: ["import-jobs"], queryFn: () => importExportApi.listJobs({ page: 1, pageSize: 10 }) });

  async function handlePreview(selected: File) {
    setFile(selected);
    setPreview(null);
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
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["import-jobs"] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("importExport.title")} description={t("importExport.subtitle")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("importExport.importEmployees")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => importExportApi.downloadEmployeesTemplate()}>
              <Download className="h-4 w-4" /> {t("importExport.downloadTemplate")}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handlePreview(e.target.files[0])}
            />
            <Button onClick={() => inputRef.current?.click()} disabled={isBusy}>
              <Upload className="h-4 w-4" /> {t("importExport.uploadExcel")}
            </Button>
            {file && <span className="text-sm text-muted-foreground">{file.name}</span>}
          </div>

          {preview && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <Stat label={t("importExport.totalRows")} value={preview.totalRows} />
                <Stat label={t("importExport.toImport")} value={preview.importedCount} tone="text-success" />
                <Stat label={t("importExport.toUpdate")} value={preview.updatedCount} tone="text-info" />
                <Stat label={t("importExport.skipped")} value={preview.skippedCount} tone="text-warning" />
                <Stat label={t("importExport.errors")} value={preview.failedCount} tone="text-destructive" />
              </div>

              {preview.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" /> {t("importExport.rowsNeedAttention", { count: preview.errors.length })}
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tr("الصف", "Row")}</TableHead>
                          <TableHead>{tr("الحقل", "Field")}</TableHead>
                          <TableHead>{tr("المشكلة", "Problem")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.errors.slice(0, 50).map((e, i) => (
                          <TableRow key={i}>
                            <TableCell>{e.rowNumber}</TableCell>
                            <TableCell>{fieldLabel(e.field)}</TableCell>
                            <TableCell>{tr(e.message, e.messageEn ?? e.message)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => importExportApi.downloadJobErrors(preview.importJobId)}>
                    <Download className="h-4 w-4" /> {t("importExport.downloadErrors")}
                  </Button>
                </div>
              )}

              {preview.importedCount + preview.updatedCount > 0 && (
                <Button onClick={handleConfirmImport} disabled={isBusy}>
                  <CheckCircle2 className="h-4 w-4" /> {t("importExport.confirmImport", { count: preview.importedCount + preview.updatedCount })}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("importExport.recentJobs")}</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs && jobs.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("importExport.jobTable.file")}</TableHead>
                  <TableHead>{t("importExport.jobTable.status")}</TableHead>
                  <TableHead>{t("importExport.jobTable.imported")}</TableHead>
                  <TableHead>{t("importExport.jobTable.updated")}</TableHead>
                  <TableHead>{t("importExport.jobTable.failed")}</TableHead>
                  <TableHead>{t("importExport.jobTable.date")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.data.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{job.fileName}</TableCell>
                    <TableCell>{jobStatus(job.status)}</TableCell>
                    <TableCell>{job.importedCount}</TableCell>
                    <TableCell>{job.updatedCount}</TableCell>
                    <TableCell>{job.failedCount}</TableCell>
                    <TableCell>{formatDateTime(job.createdAt)}</TableCell>
                    <TableCell>
                      {job.failedCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => importExportApi.downloadJobErrors(job.id)}>
                          <Download className="h-3.5 w-3.5" /> {t("importExport.errors")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> {t("importExport.noJobs")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
