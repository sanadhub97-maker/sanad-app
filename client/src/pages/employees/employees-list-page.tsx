import { useState } from "react";
import { localized } from "@/lib/names";
import { namePair } from "@/lib/names";
import { tr } from "@/i18n";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { Building2, ChevronLeft, ChevronRight, Eye, FileDown, FileUp, MoreHorizontal, Plus, Printer, Search, Trash2 } from "lucide-react";
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
import { DESK_QUERY } from "@/lib/use-desk";
import { SaudiAvatar } from "@/components/avatars/saudi-avatar";

const columnHelper = createColumnHelper<Employee>();

// Avatar tints for the person cards: text colour, background (light / dark).
const TINTS = [
  "text-[#4F5BD5] bg-[#ECEEFC] dark:bg-[#4F5BD5]/20 dark:text-[#A5ACF2]",
  "text-warning bg-warning/10",
  "text-success bg-success/10",
  "text-[#8A4BC2] bg-[#F2EAFA] dark:bg-[#8A4BC2]/20 dark:text-[#CDA8EE]",
  "text-destructive bg-destructive/10",
  "text-primary bg-accent",
];

function daysAr(n: number) {
  return n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يومًا`;
}

/** One employee as an Oasis card: avatar, name, job and nationality, branch,
 * and the iqama box tinted by its status. */
function PersonCard({ employee, isAr, onOpen }: { employee: Employee; tint?: string; isAr: boolean; onOpen: () => void }) {
  const { primary: name } = namePair(employee.fullNameAr, employee.fullNameEn, isAr);
  const job = localized(employee.jobTitle, employee.jobTitleEn);
  const nat = isAr ? employee.nationality || employee.nationalityEn : employee.nationalityEn || employee.nationality;
  const branch = localized(employee.branch?.name, employee.branch?.nameEn);

  let status = isAr ? "غير مسجّلة" : "Not recorded";
  let box = "text-muted-foreground bg-secondary";
  if (employee.iqamaExpiryDate) {
    const exp = new Date(employee.iqamaExpiryDate);
    const now = new Date();
    const days = Math.round(
      (Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000
    );
    status = days < 0 ? (isAr ? `منتهية منذ ${daysAr(-days)}` : `Expired ${-days}d ago`) : isAr ? `باقي ${daysAr(days)}` : `${days}d left`;
    box =
      employee.iqamaStatus === "EXPIRED" || days < 0
        ? "text-destructive bg-destructive/10"
        : employee.iqamaStatus === "EXPIRING_SOON"
          ? "text-warning bg-warning/10"
          : "text-success bg-success/10";
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-3.5 rounded-[26px] bg-card p-5 text-start shadow-[var(--glass-shadow)] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex items-center gap-3">
        <SaudiAvatar
          gender={employee.gender}
          size="md"
          className="h-12 w-12 rounded-2xl shadow-sm border border-border/40 shrink-0"
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <b className="truncate text-[15px] font-semibold">{name}</b>
          <span className="truncate text-[12.5px] text-muted-foreground">{[job, nat].filter(Boolean).join(" · ") || employee.employeeNumber}</span>
        </span>
      </span>
      <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Building2 className="h-4 w-4 shrink-0" />
        <span className="truncate">{branch ?? "—"}</span>
      </span>
      <span className={cn("flex items-center justify-between gap-2.5 rounded-2xl px-3.5 py-2.5", box)}>
        <span className="flex flex-col gap-px">
          <span className="text-[11.5px] opacity-80">{isAr ? "الإقامة" : "Iqama"}</span>
          <span dir="ltr" className="text-[13px] font-semibold">
            {employee.iqamaNumber || "—"}
          </span>
        </span>
        <span className="whitespace-nowrap text-[12.5px] font-semibold">{status}</span>
      </span>
    </button>
  );
}

type Chip = "all" | "active" | "soon" | "expired";

export default function EmployeesListPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
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
  const [expiryStatus, setExpiryStatus] = useState<"" | "EXPIRING_SOON" | "EXPIRED">("");
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [view, setView] = useState<"cards" | "table">(() => {
    try {
      const saved = localStorage.getItem("employees.view");
      if (saved === "table" || saved === "cards") return saved;
      // Computers open on the table, phones and tablets on the cards.
      return window.matchMedia?.(DESK_QUERY).matches ? "table" : "cards";
    } catch {
      return "cards";
    }
  });
  const pageSize = 20;

  const params = {
    page,
    pageSize,
    q: search || undefined,
    branchId: branchId || undefined,
    employmentStatus: employmentStatus || undefined,
    expiryStatus: expiryStatus || undefined,
  };

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

  // Iqamas ending soon / expired, for the quick-filter counts.
  const { data: soonCount } = useQuery({
    queryKey: ["employees", { pageSize: 1, expiryStatus: "EXPIRING_SOON" }],
    queryFn: () => employeesApi.list({ page: 1, pageSize: 1, expiryStatus: "EXPIRING_SOON" }),
    staleTime: 60_000,
  });
  const { data: expiredCount } = useQuery({
    queryKey: ["employees", { pageSize: 1, expiryStatus: "EXPIRED" }],
    queryFn: () => employeesApi.list({ page: 1, pageSize: 1, expiryStatus: "EXPIRED" }),
    staleTime: 60_000,
  });

  const chip: Chip = expiryStatus === "EXPIRING_SOON" ? "soon" : expiryStatus === "EXPIRED" ? "expired" : employmentStatus === "ACTIVE" ? "active" : "all";
  function pickChip(c: Chip) {
    setEmploymentStatus(c === "active" ? "ACTIVE" : "");
    setExpiryStatus(c === "soon" ? "EXPIRING_SOON" : c === "expired" ? "EXPIRED" : "");
    setPage(1);
  }
  function changeView(v: "cards" | "table") {
    setView(v);
    try {
      localStorage.setItem("employees.view", v);
    } catch {
      /* private mode: the choice lasts for this visit */
    }
  }

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
      cell: (c) => <span className="inline-block rounded-full bg-secondary px-3 py-1 font-mono text-xs font-semibold text-foreground">{c.getValue()}</span>,
    }),
    columnHelper.accessor((row) => row.fullNameEn || row.fullNameAr, {
      id: "name",
      header: t("employees.table.fullName"),
      cell: (c) => {
        const row = c.row.original;
        const { primary: name, secondary } = namePair(row.fullNameAr, row.fullNameEn, isAr);
        return (
          <div className="flex items-center gap-3">
            <SaudiAvatar
              gender={row.gender}
              size="md"
              className="h-10 w-10 rounded-2xl shadow-sm border border-border/40 shrink-0"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{name}</p>
              {secondary && <p className="truncate text-[11px] text-muted-foreground">{secondary}</p>}
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor((row) => localized(row.jobTitle, row.jobTitleEn), {
      id: "jobTitle",
      header: t("employees.table.jobTitle"),
      cell: (c) => <span className="text-[13px] text-foreground">{c.getValue() ?? "—"}</span>,
    }),
    columnHelper.accessor((row) => localized(row.branch?.name, row.branch?.nameEn), {
      id: "branch",
      header: t("employees.table.branch"),
      cell: (c) => <span className="text-[13px] text-muted-foreground">{c.getValue() ?? "—"}</span>,
    }),
    columnHelper.accessor("employmentStatus", {
      header: t("employees.table.status"),
      cell: (c) => <EmploymentStatusBadge status={c.getValue()} />,
    }),
    columnHelper.accessor("iqamaExpiryDate", {
      header: t("employees.table.iqamaExpiry"),
      cell: (c) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-foreground">{formatDate(c.getValue())}</span>
          <StatusBadge status={c.row.original.iqamaStatus} />
        </div>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: t("common.actions"),
      cell: (c) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-primary" onClick={() => navigate(`/employees/${c.row.original.id}`)} title={t("common.viewDetails")}>
            <Eye className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t("common.actions")}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-3xl p-2">
              <DropdownMenuItem onSelect={() => navigate(`/employees/${c.row.original.id}`)} className="rounded-2xl text-xs font-medium">
                <Eye className="me-2 h-4 w-4 text-primary" /> {t("employees.menu.viewProfile")}
              </DropdownMenuItem>
              {hasPermission("employees.edit") && (
                <DropdownMenuItem
                  onSelect={() => {
                    setEditTarget(c.row.original);
                    setDialogOpen(true);
                  }}
                  className="rounded-2xl text-xs font-medium"
                >
                  {t("employees.menu.edit")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => openPdfInNewTab(employeePdfUrl(c.row.original.id))} className="rounded-2xl text-xs font-medium">
                <Printer className="me-2 h-4 w-4 text-muted-foreground" /> {t("employees.menu.printProfile")}
              </DropdownMenuItem>
              {hasPermission("employees.delete") && (
                <DropdownMenuItem onSelect={() => setDeleteTarget(c.row.original)} className="rounded-2xl text-xs font-medium text-destructive">
                  <Trash2 className="me-2 h-4 w-4" /> {t("employees.menu.delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    }),
  ];

  const total = summary?.totalEmployees ?? data?.meta.total ?? 0;
  const branchCount = branches?.length ?? 0;
  const attention = (soonCount?.meta.total ?? 0) + (expiredCount?.meta.total ?? 0);
  const chips: { key: Chip; label: string; n?: number }[] = [
    { key: "all", label: tr("الكل", "All"), n: summary?.totalEmployees },
    { key: "active", label: tr("على رأس العمل", "On duty"), n: summary?.activeEmployees },
    { key: "soon", label: tr("تنتهي قريبًا", "Ending soon"), n: soonCount?.meta.total },
    { key: "expired", label: tr("منتهية", "Expired"), n: expiredCount?.meta.total },
  ];
  const pages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / pageSize));

  const description = isAr
    ? `${total} ${total === 1 ? "موظف" : "موظفين"} في ${branchCount} مؤسسات${attention ? ` · ${attention} ${attention === 1 ? "إقامة تحتاج" : "إقامات تحتاج"} انتباهك` : ""}`
    : `${total} employees in ${branchCount} branches${attention ? ` · ${attention} iqamas need your attention` : ""}`;

  return (
    <div className="space-y-[22px]">
      <PageHeader
        title={t("employees.title")}
        description={description}
        actions={
          <>
            {hasPermission("importExport.import") && (
              <Button variant="outline" onClick={() => navigate("/import-export")}>
                <FileUp className="h-4 w-4" /> {tr("استيراد من Excel", "Import from Excel")}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileDown className="h-4 w-4" /> {t("common.export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-3xl p-2">
                <DropdownMenuItem className="rounded-2xl" onSelect={() => reportsApi.employees.export({ branchId, employmentStatus }, "xlsx")}>
                  {t("employees.export.excel")}
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-2xl" onSelect={() => reportsApi.employees.export({ branchId, employmentStatus }, "csv")}>
                  {t("employees.export.csv")}
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-2xl" onSelect={() => reportsApi.employees.export({ branchId, employmentStatus }, "pdf")}>
                  {t("employees.export.pdf")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {hasPermission("employees.create") && (
              <Button
                onClick={() => {
                  setEditTarget(undefined);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> {t("employees.addEmployee")}
              </Button>
            )}
          </>
        }
      />

      {/* Search, quick filters and the cards/table switch */}
      <div className="no-print flex flex-wrap items-center gap-2.5">
        <label className="flex h-[46px] w-full items-center gap-2.5 rounded-full bg-card px-[18px] text-muted-foreground shadow-[var(--glass-shadow)] sm:w-[360px]">
          <Search className="h-[18px] w-[18px] shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label={tr("بحث", "Search")}
            placeholder={tr("الاسم أو الرقم أو الإقامة", "Name, number or iqama")}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => pickChip(c.key)}
            aria-pressed={chip === c.key}
            className={cn(
              "h-[46px] rounded-full px-[18px] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              chip === c.key ? "bg-primary text-primary-foreground" : "bg-card text-foreground shadow-[var(--glass-shadow)] hover:bg-accent"
            )}
          >
            {c.label} {c.n !== undefined && <span className="opacity-70">{c.n}</span>}
          </button>
        ))}
        <Select
          value={branchId || "all"}
          onValueChange={(v) => {
            setBranchId(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-[46px] w-44 rounded-full border-transparent shadow-[var(--glass-shadow)]">
            <SelectValue placeholder={t("common.branch")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("employees.filters.allBranches")}</SelectItem>
            {(branches ?? []).map((b) => (
              <SelectItem key={b.id} value={b.id}>
                <bdi>{localized(b.name, b.nameEn)}</bdi>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div role="group" aria-label={tr("طريقة العرض", "View")} className="ms-auto flex rounded-full bg-card p-1 shadow-[var(--glass-shadow)]">
          {(["cards", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => changeView(v)}
              className={cn(
                "h-[38px] rounded-full px-4 text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === v ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === "cards" ? tr("بطاقات", "Cards") : tr("جدول", "Table")}
            </button>
          ))}
        </div>
      </div>

      {view === "cards" ? (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[196px] animate-pulse rounded-[26px] bg-card" />
              ))}
            </div>
          ) : (data?.data ?? []).length === 0 ? (
            <div className="rounded-[26px] bg-card px-6 py-14 text-center shadow-[var(--glass-shadow)]">
              <p className="font-head text-lg font-semibold">{t("employees.emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("employees.emptyDescription")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
              {(data?.data ?? []).map((emp, i) => (
                <PersonCard key={emp.id} employee={emp} tint={TINTS[i % TINTS.length]} isAr={isAr} onOpen={() => navigate(`/employees/${emp.id}`)} />
              ))}
            </div>
          )}
          {pages > 1 && (
            <div className="no-print flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={tr("السابق", "Previous")}>
                <ChevronRight className="h-4 w-4 ltr:rotate-180" />
              </Button>
              <span className="rounded-full bg-card px-4 py-2 text-xs font-semibold shadow-[var(--glass-shadow)]">
                {page} / {pages}
              </span>
              <Button variant="outline" size="icon" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label={tr("التالي", "Next")}>
                <ChevronLeft className="h-4 w-4 ltr:rotate-180" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          page={page}
          pageSize={pageSize}
          total={data?.meta.total ?? 0}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/employees/${row.id}`)}
          emptyTitle={t("employees.emptyTitle")}
          emptyDescription={t("employees.emptyDescription")}
        />
      )}

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
