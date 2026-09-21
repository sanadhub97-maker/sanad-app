import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { motion } from "framer-motion";
import {
  Edit,
  FileDown,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Copy,
  ExternalLink,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { AppleIcon, type AppleTone } from "@/components/common/apple-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listActiveBranches } from "@/api/branches";
import { reportsApi } from "@/api/reports";
import { getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  workforceDocumentsApi,
  type WorkforceDocumentItem,
  type WorkforceListResponse,
  type WorkforceQueryParams,
} from "@/api/workforceDocuments";
import { WorkforceDocumentDialog } from "./workforce-document-dialog";

const columnHelper = createColumnHelper<WorkforceDocumentItem>();

interface Props {
  title: string;
  subtitle: string;
  docType: "IQAMA" | "PASSPORT" | "HEALTH_CERTIFICATE" | "MEDICAL_INSURANCE" | "VISA" | "FLIGHT_TICKET";
  queryFn: (params: WorkforceQueryParams) => Promise<WorkforceListResponse>;
  queryKey: string;
  icon: any;
  tone: AppleTone;
  numberLabel: string;
  authorityLabel?: string;
  addButtonLabel: string;
}

export function WorkforceDocumentsView({
  title,
  subtitle,
  docType,
  queryFn,
  queryKey,
  icon: DocIcon,
  tone,
  numberLabel,
  authorityLabel,
  addButtonLabel,
}: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    document?: WorkforceDocumentItem | null;
  }>({ open: false, document: null });

  const [deleteTarget, setDeleteTarget] = useState<WorkforceDocumentItem | null>(null);
  const pageSize = 20;

  const queryParams: WorkforceQueryParams = {
    page,
    pageSize,
    q: search || undefined,
    branchId: branchFilter !== "ALL" ? branchFilter : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, queryParams],
    queryFn: () => queryFn(queryParams),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["active-branches"],
    queryFn: listActiveBranches,
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await workforceDocumentsApi.remove(deleteTarget.id);
      toast.success(isAr ? "تم حذف السجل بنجاح" : "Record deleted successfully");
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function copyToClipboard(text?: string | null) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(isAr ? "تم النسخ للحافظة" : "Copied to clipboard");
  }

  const columns = [
    columnHelper.accessor(
      (row) => row.fullNameAr || row.employee?.fullNameAr || "—",
      {
        id: "employee",
        header: isAr ? "الموظف" : "Employee",
        cell: (c) => {
          const emp = c.row.original;
          const nameAr = emp.fullNameAr || emp.employee?.fullNameAr || "—";
          const nameEn = emp.fullNameEn || emp.employee?.fullNameEn;
          const empNum = emp.employeeNumber || emp.employee?.employeeNumber;
          const empId = emp.employeeId || emp.employee?.id || emp.id;

          return (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 text-xs font-bold text-primary shadow-2xs">
                {nameAr.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <Link
                  to={`/employees/${empId}`}
                  className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1 group"
                >
                  <span className="truncate">{nameAr}</span>
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[11px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded border border-border/50">
                    {empNum}
                  </span>
                  {nameEn && (
                    <span className="text-[11px] text-muted-foreground/80 truncate max-w-[130px]">
                      {nameEn}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        },
      }
    ),
    columnHelper.accessor(
      (row) =>
        row.branch?.name ||
        row.employee?.branch?.name ||
        row.jobTitle ||
        "—",
      {
        id: "department",
        header: isAr ? "الفرع / المسمى" : "Branch / Job",
        cell: (c) => {
          const emp = c.row.original;
          const branchName = emp.branch?.name || emp.employee?.branch?.name;
          const job = emp.jobTitle;

          return (
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Building className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{branchName || "—"}</span>
              </div>
              {job && <div className="text-[11px] text-muted-foreground truncate">{job}</div>}
            </div>
          );
        },
      }
    ),
    columnHelper.accessor(
      (row) =>
        row.documentNumber ||
        row.iqamaNumber ||
        row.passportNumber ||
        "—",
      {
        id: "docNumber",
        header: numberLabel,
        cell: (c) => {
          const num = c.getValue();
          if (!num || num === "—") return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-1.5 group">
              <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg bg-card border border-border/70 text-foreground group-hover:border-primary/50 transition-colors">
                {num}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(num)}
                title={isAr ? "نسخ الرقم" : "Copy number"}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          );
        },
      }
    ),
    ...(authorityLabel
      ? [
          columnHelper.accessor(
            (row) => row.issuingAuthority || row.passportCountry || "—",
            {
              id: "authority",
              header: authorityLabel,
              cell: (c) => (
                <span className="text-xs font-medium text-muted-foreground">
                  {c.getValue() ?? "—"}
                </span>
              ),
            }
          ),
        ]
      : []),
    columnHelper.accessor("expiryDate", {
      header: isAr ? "تاريخ وصلاحية الانتهاء" : "Expiry & Validity",
      cell: (c) => {
        const date = c.getValue();
        const days = c.row.original.daysRemaining;

        return (
          <div className="space-y-1">
            <span className="font-mono text-xs font-semibold text-foreground block">
              {formatDate(date)}
            </span>
            {days !== null && days !== undefined && (
              <div>
                {days < 0 ? (
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {isAr ? `منتهية منذ ${Math.abs(days)} يوم` : `Expired ${Math.abs(days)}d ago`}
                  </span>
                ) : days === 0 ? (
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {isAr ? "تنتهي اليوم!" : "Expires today!"}
                  </span>
                ) : days <= 30 ? (
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {isAr ? `باقي ${days} يوم` : `${days} days left`}
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {isAr ? `باقي ${days} يوم` : `${days} days left`}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: isAr ? "الحالة" : "Status",
      cell: (c) => <StatusBadge status={c.getValue()} />,
    }),
    columnHelper.display({
      id: "actions",
      header: isAr ? "إجراءات" : "Actions",
      cell: (c) => (
        <div className="flex items-center gap-1">
          {hasPermission("employees.edit") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg"
              onClick={() => setDialogState({ open: true, document: c.row.original })}
              title={isAr ? "تعديل" : "Edit"}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
          {hasPermission("employees.delete") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg"
              onClick={() => setDeleteTarget(c.row.original)}
              title={isAr ? "حذف" : "Delete"}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    }),
  ];

  const stats = data?.stats ?? {
    total: 0,
    valid: 0,
    expiringSoon: 0,
    expired: 0,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={subtitle}
        actions={
          hasPermission("employees.create") && (
            <Button
              onClick={() => setDialogState({ open: true, document: null })}
              className="gap-2 shadow-sm font-semibold rounded-xl"
            >
              <Plus className="h-4 w-4" /> {addButtonLabel}
            </Button>
          )
        }
      />

      {/* 4 Executive Obsidian Glass KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4"
      >
        <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-4 transition-all duration-300 card-luxury-hover hover:border-blue-500/40 hover:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("workforce.stats.total")}
            </span>
            <AppleIcon
              icon={DocIcon}
              tone={tone}
              size="md"
              className="transition-transform duration-200 group-hover:scale-110"
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-foreground font-mono">
              {stats.total}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              {isAr ? "سجل مسجل" : "records"}
            </span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-4 transition-all duration-300 card-luxury-hover hover:border-emerald-500/40 hover:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("workforce.stats.valid")}
            </span>
            <AppleIcon
              icon={CheckCircle2}
              tone="emerald"
              size="md"
              className="transition-transform duration-200 group-hover:scale-110"
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.valid}
            </span>
            <span className="inline-block rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {isAr ? "سارية" : "valid"}
            </span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-4 transition-all duration-300 card-luxury-hover hover:border-amber-500/40 hover:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("workforce.stats.expiringSoon")}
            </span>
            <AppleIcon
              icon={AlertTriangle}
              tone="amber"
              size="md"
              className="transition-transform duration-200 group-hover:scale-110"
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400 font-mono">
              {stats.expiringSoon}
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              {isAr ? "بحاجة لتجديد" : "renew soon"}
            </span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-4 transition-all duration-300 card-luxury-hover hover:border-rose-500/40 hover:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("workforce.stats.expired")}
            </span>
            <AppleIcon
              icon={AlertOctagon}
              tone="rose"
              size="md"
              className="transition-transform duration-200 group-hover:scale-110"
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400 font-mono">
              {stats.expired}
            </span>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
              {isAr ? "عاجل" : "expired"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Advanced Filter Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/40 p-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex rounded-xl bg-muted/60 p-1 border border-border/50 text-xs font-medium">
            {[
              { id: "ALL", label: isAr ? "الكل" : "All" },
              { id: "VALID", label: isAr ? "سارية" : "Valid" },
              { id: "EXPIRING_SOON", label: isAr ? "توشك على الانتهاء" : "Expiring" },
              { id: "EXPIRED", label: isAr ? "منتهية" : "Expired" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1 text-xs transition-all ${
                  statusFilter === tab.id
                    ? "bg-background text-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Branch filter */}
          {branches.length > 0 && (
            <Select
              value={branchFilter}
              onValueChange={(val) => {
                setBranchFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 rounded-xl border-border/70 bg-background/50 text-xs w-[170px]">
                <SelectValue placeholder={isAr ? "جميع الفروع" : "All branches"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{isAr ? "جميع المؤسسات والشركات" : "All Establishments"}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8 text-xs">
                <FileDown className="h-3.5 w-3.5" /> {t("common.export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem
                onSelect={() =>
                  reportsApi.documents.export({ sourceType: "EMPLOYEE_DOCUMENT" }, "xlsx")
                }
              >
                {t("employees.export.excel")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  reportsApi.documents.export({ sourceType: "EMPLOYEE_DOCUMENT" }, "pdf")
                }
              >
                {t("employees.export.pdf")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        emptyTitle={isAr ? "لا توجد سجلات حالياً" : "No records found"}
        emptyDescription={
          isAr
            ? "لم يتم العثور على أي وثائق تطابق معايير البحث الحالية."
            : "No documents match the current search criteria."
        }
        emptyAction={
          hasPermission("employees.create") ? (
            <Button
              size="sm"
              onClick={() => setDialogState({ open: true, document: null })}
              className="gap-2 rounded-xl"
            >
              <Plus className="h-4 w-4" /> {addButtonLabel}
            </Button>
          ) : undefined
        }
      />

      {/* Dialog for Add/Edit */}
      <WorkforceDocumentDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState({ open, document: null })}
        docType={docType}
        document={dialogState.document}
        queryKey={queryKey}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={isAr ? "حذف الوثيقة؟" : "Delete document?"}
        description={
          isAr
            ? "هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً من النظام؟ لا يمكن التراجع عن هذا الإجراء."
            : "Are you sure you want to permanently delete this record? This action cannot be undone."
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}
