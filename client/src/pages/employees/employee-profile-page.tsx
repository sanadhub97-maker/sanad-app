import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Edit,
  Plus,
  Printer,
  Trash2,
  FileText,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Globe,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge, EmploymentStatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { EmployeeDialog } from "@/pages/employees/employee-dialog";
import { employeesApi, employeePdfUrl, employeeDocumentsApi } from "@/api/employees";
import { paymentsApi } from "@/api/payments";
import { openPdfInNewTab } from "@/lib/download";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { EmployeeDocumentDialog } from "@/pages/employees/employee-document-dialog";
import { AppleIcon, type AppleTone } from "@/components/common/apple-icon";
import { CategoryChips } from "@/components/common/category-chips";
import { PrintDocumentHeader, PrintDocumentFooter } from "@/components/common/print-document-header";
import { EMPLOYEE_DOCUMENT_TYPE_ICONS } from "@/lib/document-type-icons";
import type { EmployeeDocument } from "@/types/models";

export default function EmployeeProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const { data: employee, isLoading } = useQuery({ queryKey: ["employees", id], queryFn: () => employeesApi.getById(id!) });
  const { data: payments } = useQuery({
    queryKey: ["payments", "byEmployee", id],
    queryFn: () => paymentsApi.list({ employeeId: id, pageSize: 10 }),
  });

  const [docDialog, setDocDialog] = useState<{ open: boolean; document?: EmployeeDocument }>({ open: false });
  const [deleteDoc, setDeleteDoc] = useState<EmployeeDocument | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [docTypeFilter, setDocTypeFilter] = useState("");

  const deleteDocMutation = useMutation({
    mutationFn: () => employeeDocumentsApi.remove(id!, deleteDoc!.id),
    onSuccess: () => {
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["employees", id] });
      setDeleteDoc(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading || !employee) return <div className="text-sm text-muted-foreground p-6">{t("common.loading")}</div>;

  const initials = (employee.fullNameEn || employee.fullNameAr).slice(0, 2).toUpperCase();

  const allDocuments = employee.documents ?? [];
  const docTypeCounts = allDocuments.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] ?? 0) + 1;
    return acc;
  }, {});
  const docTypesPresent = Object.keys(docTypeCounts);
  const docTypeChips = docTypesPresent.map((type) => ({
    value: type,
    label: t(`documentTypes.${type}`),
    icon: EMPLOYEE_DOCUMENT_TYPE_ICONS[type] ?? EMPLOYEE_DOCUMENT_TYPE_ICONS.OTHER,
  }));
  const filteredDocuments = docTypeFilter ? allDocuments.filter((d) => d.type === docTypeFilter) : allDocuments;

  return (
    <div className="space-y-6">
      <PrintDocumentHeader
        title={t("employees.profile.title")}
        subtitle={employee.fullNameAr || employee.fullNameEn || undefined}
        referenceNumber={employee.employeeNumber}
      />
      <PageHeader
        title={t("employees.profile.title")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => openPdfInNewTab(employeePdfUrl(employee.id))} className="gap-1.5 shadow-sm">
              <Printer className="h-4 w-4" /> {t("common.print")}
            </Button>
            {hasPermission("employees.edit") && (
              <Button onClick={() => setEditOpen(true)} className="gap-1.5 shadow-sm">
                <Edit className="h-4 w-4" /> {t("common.edit")}
              </Button>
            )}
          </div>
        }
      />

      {/* Executive VIP Cover Dossier Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 p-6 shadow-luxury"
      >
        {/* Subtle decorative mesh orbs */}
        <div className="pointer-events-none absolute -top-24 -end-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/15" />
        <div className="pointer-events-none absolute -bottom-24 -start-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-600/10" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Avatar with status beacon */}
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20 rounded-2xl border-2 border-primary/30 shadow-lg ring-4 ring-background">
              <AvatarFallback className="bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-xl font-extrabold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-2 ring-background">
              <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 animate-pulse" />
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                {employee.fullNameEn || employee.fullNameAr}
              </h2>
              {employee.fullNameEn && employee.fullNameAr && employee.fullNameEn !== employee.fullNameAr && (
                <span className="text-sm text-muted-foreground font-medium">({employee.fullNameAr})</span>
              )}
              <EmploymentStatusBadge status={employee.employmentStatus} />
            </div>

            <p className="text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-2">
              <span className="text-foreground font-semibold">{employee.jobTitle ?? "موظف"}</span>
              <span>•</span>
              <span>{employee.department ?? "عام"}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-primary font-medium">
                <Building2 className="h-3.5 w-3.5" />
                {employee.branch?.name ?? t("employees.profile.noBranch")}
              </span>
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-foreground bg-muted/80 px-2.5 py-1 rounded-lg border border-border/60">
                #{employee.employeeNumber}
              </span>
              {employee.mobile && (
                <span className="inline-flex items-center gap-1 hover:text-foreground">
                  <Phone className="h-3.5 w-3.5 text-blue-500" />
                  <span dir="ltr">{employee.mobile}</span>
                </span>
              )}
              {employee.email && (
                <span className="inline-flex items-center gap-1 hover:text-foreground">
                  <Mail className="h-3.5 w-3.5 text-indigo-500" />
                  <span>{employee.email}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-card/70 border border-border/60 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold px-4">{t("employees.profile.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg text-xs font-semibold px-4">{t("employees.profile.tabs.documents")}</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg text-xs font-semibold px-4">{t("employees.profile.tabs.payments")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="card-luxury-hover">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <AppleIcon icon={FileText} tone="blue" size="xs" />
                  {t("employees.profile.personalInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 p-4 text-sm">
                <InfoRow icon={Building2} tone="indigo" label={t("employees.fields.employeeNumber")} value={employee.employeeNumber} />
                <InfoRow icon={Globe} tone="cyan" label={t("employees.fields.nationality")} value={employee.nationality} />
                <InfoRow icon={Phone} tone="emerald" label={t("employees.fields.mobile")} value={employee.mobile} />
                <InfoRow icon={Mail} tone="blue" label={t("employees.fields.email")} value={employee.email} />
                <InfoRow icon={Calendar} tone="amber" label={t("employees.fields.joiningDate")} value={formatDate(employee.joiningDate)} />
                <InfoRow icon={MapPin} tone="rose" label={t("employees.fields.city")} value={employee.city} />
              </CardContent>
            </Card>

            <Card className="card-luxury-hover">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <AppleIcon icon={Clock} tone="amber" size="xs" />
                  {t("employees.profile.iqamaPassport")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 text-sm">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">{t("employees.profile.iqama")}</p>
                    <StatusBadge status={employee.iqamaStatus} />
                  </div>
                  <p className="font-mono text-base font-bold text-foreground">{employee.iqamaNumber ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    تاريخ الانتهاء: <span className="font-mono font-medium text-foreground">{formatDate(employee.iqamaExpiryDate)}</span>
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">{t("employees.profile.passport")}</p>
                    <StatusBadge status={employee.passportStatus} />
                  </div>
                  <p className="font-mono text-base font-bold text-foreground">{employee.passportNumber ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    تاريخ الانتهاء: <span className="font-mono font-medium text-foreground">{formatDate(employee.passportExpiryDate)}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            {allDocuments.length > 0 ? (
              <CategoryChips
                items={docTypeChips}
                active={docTypeFilter}
                onChange={setDocTypeFilter}
                counts={docTypeCounts}
                allLabel={t("common.all")}
                totalCount={allDocuments.length}
              />
            ) : (
              <div />
            )}
            {hasPermission("employeeDocuments.create") && (
              <Button size="sm" onClick={() => setDocDialog({ open: true })} className="shrink-0 gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" /> {t("employees.profile.addDocument")}
              </Button>
            )}
          </div>
          {filteredDocuments.length > 0 ? (
            <div className="rounded-2xl border border-border/70 bg-card shadow-luxury overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 border-b border-border/70">
                    <TableHead>{t("employees.profile.docTable.type")}</TableHead>
                    <TableHead>{t("employees.profile.docTable.name")}</TableHead>
                    <TableHead>{t("employees.profile.docTable.number")}</TableHead>
                    <TableHead>{t("employees.profile.docTable.expiryDate")}</TableHead>
                    <TableHead>{t("employees.profile.docTable.status")}</TableHead>
                    <TableHead>{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-foreground">{t(`documentTypes.${doc.type}`)}</TableCell>
                      <TableCell>{doc.name ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{doc.documentNumber ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{formatDate(doc.expiryDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={doc.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setDocDialog({ open: true, document: doc })} className="h-8 w-8 rounded-lg">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteDoc(doc)} className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState icon={FileText} title={t("employees.profile.noDocuments")} description={t("employees.profile.noDocumentsDescription")} />
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-3">
          {payments && payments.data.length > 0 ? (
            <div className="rounded-2xl border border-border/70 bg-card shadow-luxury overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 border-b border-border/70">
                    <TableHead>{t("employees.profile.paymentTable.paymentNumber")}</TableHead>
                    <TableHead>{t("employees.profile.paymentTable.date")}</TableHead>
                    <TableHead>{t("employees.profile.paymentTable.category")}</TableHead>
                    <TableHead>{t("employees.profile.paymentTable.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.data.map((p) => (
                    <TableRow key={p.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-foreground">{p.paymentNumber}</TableCell>
                      <TableCell className="text-xs font-mono">{formatDate(p.paymentDate)}</TableCell>
                      <TableCell className="text-xs font-medium">{p.category}</TableCell>
                      <TableCell className="font-mono font-bold text-sm text-foreground">{formatCurrency(p.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState icon={CreditCard} title={t("employees.profile.noPayments", { defaultValue: "لا توجد دفعات مسجلة" })} />
          )}
        </TabsContent>
      </Tabs>

      <EmployeeDocumentDialog
        employeeId={employee.id}
        open={docDialog.open}
        document={docDialog.document}
        onOpenChange={(open) => setDocDialog({ open })}
      />
      <ConfirmDialog
        open={Boolean(deleteDoc)}
        onOpenChange={(open) => !open && setDeleteDoc(null)}
        title={t("employees.documentDialog.editTitle") === "" ? "" : t("common.confirmDeleteTitle")}
        onConfirm={() => deleteDocMutation.mutate()}
        loading={deleteDocMutation.isPending}
      />
      <EmployeeDialog
        open={editOpen}
        employee={employee}
        onOpenChange={setEditOpen}
      />

      {/* 🖨️ Official Print Signatures & Stamp Block */}
      <PrintDocumentFooter
        prepTitle="إعداد قسم شؤون الموظفين (HR Specialist)"
        authTitle="اعتماد الإدارة العامة (General Manager)"
      />
    </div>
  );
}

function InfoRow({ icon: Icon, tone = "blue", label, value }: { icon?: React.ComponentType<{ className?: string }>; tone?: AppleTone; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl p-2 transition-colors hover:bg-muted/40">
      {Icon && (
        <AppleIcon icon={Icon} tone={tone} size="xs" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="font-semibold text-xs text-foreground truncate mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );
}
