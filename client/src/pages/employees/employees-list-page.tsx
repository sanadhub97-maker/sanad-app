import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { FileDown, MoreHorizontal, Plus, Printer, Trash2, Users, UserCheck, AlertTriangle, Building2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatusBadge, EmploymentStatusBadge } from "@/components/common/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmployeeDialog } from "@/pages/employees/employee-dialog";
import { employeesApi, employeePdfUrl } from "@/api/employees";
import { listActiveBranches } from "@/api/branches";
import { reportsApi } from "@/api/reports";
import { dashboardApi } from "@/api/dashboard";
import { openPdfInNewTab } from "@/lib/download";
import { getErrorMessage } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import type { Employee } from "@/types/models";
import { useAuthStore } from "@/stores/authStore";
import { AppleIcon } from "@/components/common/apple-icon";

const columnHelper = createColumnHelper<Employee>();

export default function EmployeesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(() => searchParams.get("new") === "true");
  const [editTarget, setEditTarget] = useState<Employee | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<string>("");
  const [employmentStatus, setEmploymentStatus] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const pageSize = 20;

  const params = { page, pageSize, q: search || undefined, branchId: branchId || undefined, employmentStatus: employmentStatus || undefined };

  const { data, isLoading } = useQuery({
    queryKey: ["employees", params],
    queryFn: () => employeesApi.list(params),
  });

  const { data: branches } = useQuery({ queryKey: ["branches", "active"], queryFn: listActiveBranches });

  const { data: summary } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: dashboardApi.summary,
    staleTime: 60_000,
  });

  const { data: expiration } = useQuery({
    queryKey: ["dashboard", "expiration-widget"],
    queryFn: dashboardApi.expirationWidget,
    staleTime: 60_000,
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await employeesApi.remove(deleteTarget.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const columns = [
    columnHelper.accessor("employeeNumber", {
      header: t("employees.table.employeeNumber"),
      cell: (c) => (
        <span className="inline-block font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-muted text-foreground border border-border/60">
          {c.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.fullNameEn || row.fullNameAr, {
      id: "name",
      header: t("employees.table.fullName"),
      cell: (c) => {
        const row = c.row.original;
        const name = row.fullNameAr || row.fullNameEn || "";
        const secondary = row.fullNameEn && row.fullNameAr && row.fullNameEn !== row.fullNameAr ? row.fullNameEn : "";
        const initials = name.split(" ").slice(0, 2).map((p: string) => p[0]).join("") || "E";
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-foreground truncate">{name}</p>
              {secondary && (
                <p className="text-[11px] text-muted-foreground truncate">{secondary}</p>
              )}
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("jobTitle", {
      header: t("employees.table.jobTitle"),
      cell: (c) => (
        <span className="text-xs font-medium text-foreground">
          {c.getValue() ?? "—"}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.branch?.name, {
      id: "branch",
      header: t("employees.table.branch"),
      cell: (c) => (
        <span className="text-xs font-medium text-muted-foreground">
          {c.getValue() ?? "—"}
        </span>
      ),
    }),
    columnHelper.accessor("employmentStatus", {
      header: t("employees.table.status"),
      cell: (c) => <EmploymentStatusBadge status={c.getValue()} />,
    }),
    columnHelper.accessor("iqamaExpiryDate", {
      header: t("employees.table.iqamaExpiry"),
      cell: (c) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-foreground">{formatDate(c.getValue())}</span>
          <StatusBadge status={c.row.original.iqamaStatus} />
        </div>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: t("common.actions"),
      cell: (c) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => navigate(`/employees/${c.row.original.id}`)}
            title={t("common.viewDetails")}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-luxury">
              <DropdownMenuItem onSelect={() => navigate(`/employees/${c.row.original.id}`)} className="rounded-lg text-xs font-medium">
                <Eye className="h-4 w-4 me-2 text-primary" /> {t("employees.menu.viewProfile")}
              </DropdownMenuItem>
              {hasPermission("employees.edit") && (
                <DropdownMenuItem
                  onSelect={() => {
                    setEditTarget(c.row.original);
                    setDialogOpen(true);
                  }}
                  className="rounded-lg text-xs font-medium"
                >
                  {t("employees.menu.edit")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => openPdfInNewTab(employeePdfUrl(c.row.original.id))} className="rounded-lg text-xs font-medium">
                <Printer className="h-4 w-4 me-2 text-muted-foreground" /> {t("employees.menu.printProfile")}
              </DropdownMenuItem>
              {hasPermission("employees.delete") && (
                <DropdownMenuItem onSelect={() => setDeleteTarget(c.row.original)} className="rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 me-2" /> {t("employees.menu.delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("employees.title")}
        description={t("employees.subtitle")}
        actions={
          hasPermission("employees.create") && (
            <Button
              onClick={() => {
                setEditTarget(undefined);
                setDialogOpen(true);
              }}
              className="gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" /> {t("employees.addEmployee")}
            </Button>
          )
        }
      />

      {/* Executive KPI Stats Ribbon */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4"
      >
        <div
          onClick={() => {
            setEmploymentStatus("");
            setBranchId("");
          }}
          className={cn(
            "group relative cursor-pointer overflow-hidden rounded-3xl border p-5 transition-all duration-300 backdrop-blur-xl specular-border shadow-luxury hover:-translate-y-1",
            !employmentStatus
              ? "border-blue-500/50 bg-card/90 shadow-md ring-2 ring-blue-500/25"
              : "border-blue-200/80 dark:border-blue-900/40 bg-card/85 hover:border-blue-400"
          )}
        >
          <div className="pointer-events-none absolute -bottom-8 -start-8 h-24 w-24 rounded-full bg-blue-500/15 blur-xl group-hover:scale-125 transition-transform" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground/90">{t("employees.stats.total", { defaultValue: "إجمالي الموظفين" })}</span>
            <AppleIcon icon={Users} tone="blue" size="md" className="transition-transform duration-200 group-hover:scale-110 shadow-sm" />
          </div>
          <div className="relative z-10 mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-sans">
              {summary?.totalEmployees ?? data?.meta.total ?? "—"}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">موظف</span>
          </div>
        </div>

        <div
          onClick={() => setEmploymentStatus(employmentStatus === "ACTIVE" ? "" : "ACTIVE")}
          className={cn(
            "group relative cursor-pointer overflow-hidden rounded-3xl border p-5 transition-all duration-300 backdrop-blur-xl specular-border shadow-luxury hover:-translate-y-1",
            employmentStatus === "ACTIVE"
              ? "border-emerald-500/50 bg-card/90 shadow-md ring-2 ring-emerald-500/25"
              : "border-emerald-200/80 dark:border-emerald-900/40 bg-card/85 hover:border-emerald-400"
          )}
        >
          <div className="pointer-events-none absolute -bottom-8 -start-8 h-24 w-24 rounded-full bg-emerald-500/15 blur-xl group-hover:scale-125 transition-transform" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground/90">{t("employees.stats.active", { defaultValue: "على رأس العمل" })}</span>
            <AppleIcon icon={UserCheck} tone="emerald" size="md" className="transition-transform duration-200 group-hover:scale-110 shadow-sm" />
          </div>
          <div className="relative z-10 mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-sans">
              {summary?.activeEmployees ?? "—"}
            </span>
            <span className="inline-block rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {summary && summary.totalEmployees > 0
                ? `${Math.round((summary.activeEmployees / summary.totalEmployees) * 100)}%`
                : "نشط"}
            </span>
          </div>
        </div>

        <div
          onClick={() => navigate("/reports?tab=documents&status=EXPIRING_SOON")}
          className="group relative cursor-pointer overflow-hidden rounded-3xl border border-amber-200/80 dark:border-amber-900/40 bg-card/85 p-5 transition-all duration-300 backdrop-blur-xl specular-border shadow-luxury hover:-translate-y-1 hover:border-amber-400"
        >
          <div className="pointer-events-none absolute -bottom-8 -start-8 h-24 w-24 rounded-full bg-amber-500/15 blur-xl group-hover:scale-125 transition-transform" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground/90">{t("employees.stats.expiring", { defaultValue: "وثائق تنتهي قريباً" })}</span>
            <AppleIcon icon={AlertTriangle} tone="amber" size="md" className="transition-transform duration-200 group-hover:scale-110 shadow-sm" />
          </div>
          <div className="relative z-10 mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400 font-sans">
              {expiration?.within30 ?? summary?.expiringDocuments ?? 0}
            </span>
            <span className="inline-block rounded-md bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">خلال 30 يوم</span>
          </div>
        </div>

        <div
          onClick={() => navigate("/branches")}
          className="group relative cursor-pointer overflow-hidden rounded-3xl border border-indigo-200/80 dark:border-indigo-900/40 bg-card/85 p-5 transition-all duration-300 backdrop-blur-xl specular-border shadow-luxury hover:-translate-y-1 hover:border-indigo-400"
        >
          <div className="pointer-events-none absolute -bottom-8 -start-8 h-24 w-24 rounded-full bg-indigo-500/15 blur-xl group-hover:scale-125 transition-transform" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground/90">{t("employees.stats.branches", { defaultValue: "المؤسسات التابعة" })}</span>
            <AppleIcon icon={Building2} tone="indigo" size="md" className="transition-transform duration-200 group-hover:scale-110 shadow-sm" />
          </div>
          <div className="relative z-10 mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-indigo-600 dark:text-indigo-400 font-sans">
              {branches?.length ?? 1}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">مؤسسة نشطة</span>
          </div>
        </div>
      </motion.div>

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
        onRowClick={(row) => navigate(`/employees/${row.id}`)}
        emptyTitle={t("employees.emptyTitle")}
        emptyDescription={t("employees.emptyDescription")}
        emptyAction={
          hasPermission("employees.create") ? (
            <Button
              size="sm"
              onClick={() => {
                setEditTarget(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> {t("employees.addEmployee")}
            </Button>
          ) : undefined
        }
        toolbar={
          <>
            <Select value={branchId || "all"} onValueChange={(v) => setBranchId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("common.branch")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("employees.filters.allBranches")}</SelectItem>
                {(branches ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={employmentStatus || "all"} onValueChange={(v) => setEmploymentStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("employees.filters.allStatuses")}</SelectItem>
                <SelectItem value="ACTIVE">{t("status.ACTIVE")}</SelectItem>
                <SelectItem value="INACTIVE">{t("status.INACTIVE")}</SelectItem>
                <SelectItem value="ON_LEAVE">{t("status.ON_LEAVE")}</SelectItem>
                <SelectItem value="TERMINATED">{t("status.TERMINATED")}</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileDown className="h-4 w-4" /> {t("common.export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => reportsApi.employees.export({ branchId, employmentStatus }, "xlsx")}>{t("employees.export.excel")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => reportsApi.employees.export({ branchId, employmentStatus }, "csv")}>{t("employees.export.csv")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => reportsApi.employees.export({ branchId, employmentStatus }, "pdf")}>{t("employees.export.pdf")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("employees.deleteConfirmTitle")}
        description={t("employees.deleteConfirmBody", { name: deleteTarget?.fullNameEn || deleteTarget?.fullNameAr })}
        onConfirm={handleDelete}
      />

      <EmployeeDialog
        open={dialogOpen}
        employee={editTarget}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditTarget(undefined);
            if (searchParams.get("new")) {
              setSearchParams({}, { replace: true });
            }
          }
        }}
      />
    </div>
  );
}
