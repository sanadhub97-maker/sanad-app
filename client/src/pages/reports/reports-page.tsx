import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, FileText, CreditCard, Activity, ArrowDownToLine, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { AppleIcon } from "@/components/common/apple-icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { reportsApi, type ReportFormat } from "@/api/reports";
import { openPdfInNewTab } from "@/lib/download";
import { formatCurrency, formatDate } from "@/lib/utils";
import { tr } from "@/i18n";
import { localized } from "@/lib/names";

type EmployeeRow = { employeeNumber: string; fullName: string; fullNameEn: string; department: string | null; departmentEn: string | null; branch: string | null; branchEn: string | null; employmentStatus: string; iqamaExpiryDate: string | null; iqamaStatus: string | null };
type DocumentRow = { label: string; labelEn: string; sourceType: string; employeeName: string | null; employeeNameEn: string | null; expiryDate: string; status: string };
type PaymentRow = { paymentNumber: string; paymentDate: string; category: string; branch: string | null; branchEn: string | null; total: number };
type ActivityRow = { date: string; user: string; action: string; module: string; description: string | null };

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") ?? "employees");
  const [statusFilter, setStatusFilter] = useState(params.get("status") ?? "");

  const { data: employees } = useQuery<EmployeeRow[]>({
    queryKey: ["reports", "employees"],
    queryFn: () => reportsApi.employees.fetch({}) as Promise<EmployeeRow[]>,
    enabled: tab === "employees",
  });
  const { data: documents } = useQuery<DocumentRow[]>({
    queryKey: ["reports", "documents", statusFilter],
    queryFn: () => reportsApi.documents.fetch({ status: statusFilter || undefined }) as Promise<DocumentRow[]>,
    enabled: tab === "documents",
  });
  const { data: payments } = useQuery<PaymentRow[]>({
    queryKey: ["reports", "payments"],
    queryFn: () => reportsApi.payments.fetch({}) as Promise<PaymentRow[]>,
    enabled: tab === "payments",
  });
  const { data: activity } = useQuery<ActivityRow[]>({
    queryKey: ["reports", "activity"],
    queryFn: () => reportsApi.activity.fetch({}) as Promise<ActivityRow[]>,
    enabled: tab === "activity",
  });

  function ReportActions({ report, params: p }: { report: keyof typeof reportsApi; params: Record<string, unknown> }) {
    return (
      <div className="flex items-center gap-2">
        {/* Dedicated Print Button with Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl border-border/70 bg-card shadow-2xs hover:bg-muted font-semibold text-xs h-9 px-3 text-foreground"
            >
              <Printer className="h-4 w-4 text-primary" />
              <span>{t("common.print", { defaultValue: "طباعة التقرير" })}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-xl p-1 shadow-luxury">
            <DropdownMenuItem
              onSelect={() => openPdfInNewTab(`/reports/${report}`, { ...p, format: "pdf" }, `${report}-report.pdf`)}
              className="rounded-lg text-xs font-semibold gap-2 py-2 cursor-pointer"
            >
              <FileText className="h-4 w-4 text-rose-500 shrink-0" />
              <div className="flex flex-col">
                <span>{tr("طباعة تقرير PDF الرسمي", "Print official PDF report")}</span>
                <span className="text-[10px] text-muted-foreground font-normal">{tr("تقرير منسق بشعار المؤسسة للطباعة المباشرة", "Formatted with your logo, ready to print")}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => window.print()}
              className="rounded-lg text-xs font-semibold gap-2 py-2 cursor-pointer"
            >
              <Printer className="h-4 w-4 text-primary shrink-0" />
              <div className="flex flex-col">
                <span>{tr("طباعة الصفحة الحالية", "Print this page")}</span>
                <span className="text-[10px] text-muted-foreground font-normal">{tr("أمر طباعة المتصفح المباشر", "Uses the browser's print dialog")}</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl border-border/70 bg-card shadow-2xs hover:bg-muted font-semibold text-xs h-9 px-3 text-foreground"
            >
              <ArrowDownToLine className="h-4 w-4 text-primary" />
              <span>{t("common.export", { defaultValue: "تصدير التقرير" })}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl p-1 shadow-luxury">
            {(["xlsx", "csv", "pdf"] as ReportFormat[]).map((fmt) => (
              <DropdownMenuItem
                key={fmt}
                onSelect={() => reportsApi[report].export(p, fmt)}
                className="rounded-lg text-xs font-semibold py-1.5 cursor-pointer"
              >
                {tr("تصدير بصيغة", "Export as")} {fmt.toUpperCase()}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr("التقارير التحليلية والبيانات", "Reports & Analytics")}
        description={tr("معاينة وطباعة وتصدير التقارير المفصلة للموظفين والوثائق والمدفوعات وسجل النشاط.", "Preview, print and export detailed reports on employees, documents, payments and activity.")}
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-card/70 border border-border/60 p-1.5 rounded-2xl flex-wrap h-auto gap-1.5">
          <TabsTrigger value="employees" className="rounded-xl text-xs font-semibold px-3 py-1.5 gap-2 data-[state=active]:shadow-sm">
            <AppleIcon icon={Users} tone="indigo" size="xs" />
            <span>{tr("تقرير الموظفين", "Employees")}</span>
            {Array.isArray(employees) && <span className="ms-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] text-primary">{employees.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl text-xs font-semibold px-3 py-1.5 gap-2 data-[state=active]:shadow-sm">
            <AppleIcon icon={FileText} tone="amber" size="xs" />
            <span>{tr("تقرير الوثائق والتراخيص", "Documents & Licenses")}</span>
            {Array.isArray(documents) && <span className="ms-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] text-primary">{documents.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-xl text-xs font-semibold px-3 py-1.5 gap-2 data-[state=active]:shadow-sm">
            <AppleIcon icon={CreditCard} tone="rose" size="xs" />
            <span>{tr("تقرير المدفوعات المالية", "Payments")}</span>
            {Array.isArray(payments) && <span className="ms-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] text-primary">{payments.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-xl text-xs font-semibold px-3 py-1.5 gap-2 data-[state=active]:shadow-sm">
            <AppleIcon icon={Activity} tone="emerald" size="xs" />
            <span>{tr("سجل نشاط النظام", "Activity Log")}</span>
            {Array.isArray(activity) && <span className="ms-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] text-primary">{activity.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card className="rounded-2xl border border-border/70 bg-card shadow-luxury">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  {tr("عرض قائمة الموظفين وحالات الإقامات المسجلة", "Employees and the status of their iqamas")}
                </span>
                <ReportActions report="employees" params={{}} />
              </div>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 border-b border-border/60 hover:bg-muted/40">
                      <TableHead className="font-bold text-xs">{tr("الرقم الوظيفي", "Employee No.")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("اسم الموظف", "Employee Name")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("القسم", "Department")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("المؤسسة", "Establishment")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("الحالة", "Status")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("انتهاء الإقامة", "Iqama Expiry")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((employees as EmployeeRow[]) ?? []).map((row, i) => (
                      <TableRow key={i} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs font-bold text-foreground">{row.employeeNumber}</TableCell>
                        <TableCell className="font-bold text-sm text-foreground">{isAr ? row.fullName : row.fullNameEn}</TableCell>
                        <TableCell className="text-xs">{localized(row.department, row.departmentEn) ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{localized(row.branch, row.branchEn) ?? "—"}</TableCell>
                        <TableCell className="text-xs font-medium">{t(`status.${row.employmentStatus}`, { defaultValue: row.employmentStatus })}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <span className="font-mono text-xs">{formatDate(row.iqamaExpiryDate)}</span>
                          <StatusBadge status={row.iqamaStatus as never} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="rounded-2xl border border-border/70 bg-card shadow-luxury">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-48 rounded-xl border-border/70 bg-card text-xs font-medium">
                    <SelectValue placeholder={tr("تصفية حسب الحالة", "Filter by status")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-luxury">
                    <SelectItem value="all">{tr("جميع الحالات", "All statuses")}</SelectItem>
                    <SelectItem value="VALID">{tr("سارية", "Valid")}</SelectItem>
                    <SelectItem value="EXPIRING_SOON">{tr("توشك على الانتهاء", "Expiring soon")}</SelectItem>
                    <SelectItem value="EXPIRED">{tr("منتهية", "Expired")}</SelectItem>
                  </SelectContent>
                </Select>
                <ReportActions report="documents" params={{ status: statusFilter || undefined }} />
              </div>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 border-b border-border/60 hover:bg-muted/40">
                      <TableHead className="font-bold text-xs">{tr("اسم الوثيقة", "Document")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("نوع المصدر", "Source")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("الموظف المرتبط", "Employee")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("تاريخ الانتهاء", "Expiry Date")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("حالة الوثيقة", "Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((documents as DocumentRow[]) ?? []).map((row, i) => (
                      <TableRow key={i} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold text-sm text-foreground">{isAr ? row.label : row.labelEn}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t(`reportSourceTypes.${row.sourceType}`, { defaultValue: row.sourceType })}</TableCell>
                        <TableCell className="text-xs font-medium">{(isAr ? row.employeeName : row.employeeNameEn) ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{formatDate(row.expiryDate)}</TableCell>
                        <TableCell>
                          <StatusBadge status={row.status as never} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="rounded-2xl border border-border/70 bg-card shadow-luxury">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  {tr("سجل المدفوعات والمصروفات المالية", "Payments and expenses")}
                </span>
                <ReportActions report="payments" params={{}} />
              </div>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 border-b border-border/60 hover:bg-muted/40">
                      <TableHead className="font-bold text-xs">{tr("رقم الدفعة", "Payment No.")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("تاريخ العملية", "Date")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("التصنيف", "Category")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("المؤسسة", "Establishment")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("المبلغ الإجمالي", "Total")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((payments as PaymentRow[]) ?? []).map((row, i) => (
                      <TableRow key={i} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs font-bold text-foreground">{row.paymentNumber}</TableCell>
                        <TableCell className="font-mono text-xs">{formatDate(row.paymentDate)}</TableCell>
                        <TableCell className="text-xs font-medium">{t(`paymentCategories.${row.category}`, { defaultValue: row.category })}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{localized(row.branch, row.branchEn) ?? "—"}</TableCell>
                        <TableCell className="font-mono font-bold text-sm text-foreground">{formatCurrency(row.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="rounded-2xl border border-border/70 bg-card shadow-luxury">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  {tr("سجل التدقيق والحركات الإدارية اللحظية", "Audit trail of administrative actions")}
                </span>
                <ReportActions report="activity" params={{}} />
              </div>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 border-b border-border/60 hover:bg-muted/40">
                      <TableHead className="font-bold text-xs">{tr("التاريخ والوقت", "Date & Time")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("المستخدم", "User")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("نوع الإجراء", "Action")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("القسم / الوحدة", "Module")}</TableHead>
                      <TableHead className="font-bold text-xs">{tr("التفاصيل والوصف", "Details")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((activity as ActivityRow[]) ?? []).map((row, i) => (
                      <TableRow key={i} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs text-muted-foreground">{formatDate(row.date)}</TableCell>
                        <TableCell className="font-bold text-xs text-foreground">{row.user}</TableCell>
                        <TableCell>
                          <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {t(`auditLogs.actions.${row.action}`, { defaultValue: row.action })}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">{t(`moduleNames.${row.module}`, { defaultValue: row.module })}</TableCell>
                        <TableCell className="text-xs text-foreground">{row.description ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
