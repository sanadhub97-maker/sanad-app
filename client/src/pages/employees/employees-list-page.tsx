import { useState } from "react";
import { JobTitlesDialog } from "@/pages/employees/job-titles-dialog";
import { localized, namePair } from "@/lib/names";
import { tr } from "@/i18n";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Eye, FileDown, FileUp, Filter, MoreHorizontal, Pencil, Plus, Printer, Search, Trash2, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmployeeDialog } from "@/pages/employees/employee-dialog";
import { EmployeePeek } from "@/pages/employees/employee-peek";
import { employeesApi, employeePdfUrl } from "@/api/employees";
import { listActiveBranches } from "@/api/branches";
import { reportsApi } from "@/api/reports";
import { dashboardApi } from "@/api/dashboard";
import { openPdfInNewTab } from "@/lib/download";
import { getErrorMessage } from "@/lib/api";
import type { Employee } from "@/types/models";
import { useAuthStore } from "@/stores/authStore";
import { SaudiAvatar } from "@/components/avatars/saudi-avatar";
import { dmy } from "@/components/royal/rp";
import { PxBadge, PxStat, PxTabs, type BadgeTone } from "@/components/royal/px";

/* The employees page as in the approved luxury preview: four figure cards,
   then one card with the tabs, search and establishment filter over the
   table and its pages; a row opens the employee's side panel. */

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
  const [branchId, setBranchId] = useState<string>(() => searchParams.get("branchId") || "");
  const [employmentStatus, setEmploymentStatus] = useState<string>("");
  const [expiryStatus, setExpiryStatus] = useState<"" | "EXPIRING_SOON" | "EXPIRED">("");
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [peek, setPeek] = useState<Employee | null>(null);
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
  // Employees with no profession: a domestic worker's insurance can only follow the iqama once it is filled in.
  const { data: noJob } = useQuery({ queryKey: ["employees", "no-job-title"], queryFn: () => employeesApi.list({ noJobTitle: true, pageSize: 1 }), enabled: hasPermission("employees.edit") });
  const noJobCount = noJob?.meta.total ?? 0;
  const [jobTitlesOpen, setJobTitlesOpen] = useState(false);

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

  const total = summary?.totalEmployees ?? data?.meta.total ?? 0;
  const branchCount = branches?.length ?? 0;
  const attention = (soonCount?.meta.total ?? 0) + (expiredCount?.meta.total ?? 0);
  const tabs: { key: Chip; label: string; count?: number }[] = [
    { key: "all", label: tr("الكل", "All"), count: summary?.totalEmployees },
    { key: "active", label: tr("على رأس العمل", "On duty"), count: summary?.activeEmployees },
    { key: "soon", label: tr("تنتهي قريبًا", "Ending soon"), count: soonCount?.meta.total },
    { key: "expired", label: tr("منتهية", "Expired"), count: expiredCount?.meta.total },
  ];
  const rows = data?.data ?? [];
  const matched = data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(matched / pageSize));
  const pageList = Array.from({ length: pages }, (_, k) => k + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  const fromRow = matched ? (page - 1) * pageSize + 1 : 0;
  const toRow = Math.min(matched, page * pageSize);
  const iqTone = (s?: string | null): BadgeTone => (s === "EXPIRED" ? "bad" : s === "EXPIRING_SOON" ? "warn" : s === "VALID" ? "ok" : "mut");

  const description = isAr
    ? `${total} ${total === 1 ? "موظف" : "موظفين"} في ${branchCount} مؤسسات${attention ? ` · ${attention} ${attention === 1 ? "إقامة تحتاج" : "إقامات تحتاج"} انتباهك` : ""}`
    : `${total} employees in ${branchCount} branches${attention ? ` · ${attention} iqamas need your attention` : ""}`;

  return (
    <div className="px">
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

      {noJobCount > 0 && (
        <button
          type="button"
          onClick={() => setJobTitlesOpen(true)}
          className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-start text-sm"
        >
          <span>
            <b className="text-sky-700 dark:text-sky-300">{isAr ? `${noJobCount} موظف من غير مهنة` : `${noJobCount} employees have no profession`}</b>
            <span className="text-muted-foreground">{isAr ? " — حدّد مهنهم عشان تأمين العمالة المنزلية يترَبط بإقاماتهم تلقائيًا." : " — fill them in so domestic workers' insurance follows their iqamas."}</span>
          </span>
          <span className="font-semibold text-sky-700 dark:text-sky-300">{isAr ? "حدّد المهن" : "Fill them in"}</span>
        </button>
      )}

      <JobTitlesDialog open={jobTitlesOpen} onOpenChange={setJobTitlesOpen} isAr={isAr} />

      <div className="px-stats">
        <PxStat i={1} label={tr("الكل", "All employees")} value={summary?.totalEmployees ?? 0} icon={Users} color="#2563eb" sub={tr(`في ${branchCount} مؤسسات`, `in ${branchCount} branches`)} onClick={() => pickChip("all")} active={chip === "all"} />
        <PxStat i={2} label={tr("على رأس العمل", "On duty")} value={summary?.activeEmployees ?? 0} icon={UserCheck} color="#7c3aed" sub={total ? tr(`${Math.round(((summary?.activeEmployees ?? 0) / total) * 100)}% من الموظفين`, `${Math.round(((summary?.activeEmployees ?? 0) / total) * 100)}% of employees`) : undefined} onClick={() => pickChip("active")} active={chip === "active"} />
        <PxStat i={3} label={tr("إقامات منتهية", "Expired iqamas")} value={expiredCount?.meta.total ?? 0} icon={AlertTriangle} color="#dc2626" sub={tr("تحتاج تجديد", "Renew now")} onClick={() => pickChip("expired")} active={chip === "expired"} />
        <PxStat i={4} label={tr("قريبة الانتهاء", "Ending soon")} value={soonCount?.meta.total ?? 0} icon={Clock} color="#d97706" sub={tr("خلال 30 يوم", "within 30 days")} onClick={() => pickChip("soon")} active={chip === "soon"} />
      </div>

      <section className="px-card" style={{ ["--i" as string]: 5 }}>
        <div className="px-toolbar no-print">
          <PxTabs items={tabs} value={chip} onChange={pickChip} label={tr("التصفية", "Filter")} />
          <span className="sp" />
          <label className="px-search">
            <Search />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label={tr("بحث", "Search")}
              placeholder={tr("ابحث بالاسم أو الرقم أو الإقامة", "Name, number or iqama")}
            />
          </label>
          <Select
            value={branchId || "all"}
            onValueChange={(v) => {
              setBranchId(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-[38px] w-48 shrink-0 rounded-[10px] border-[var(--l-line)] bg-[var(--l-surface)] text-[13px] font-semibold">
              <Filter className="h-4 w-4 opacity-60" />
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
        </div>

        <div className="px-tw">
          <table className="px-t">
            <thead>
              <tr>
                <th>{tr("الموظف", "Employee")}</th>
                <th className="hm">{t("employees.table.jobTitle")}</th>
                <th className="hm">{t("employees.table.branch")}</th>
                <th className="hm">{tr("رقم الإقامة", "Iqama number")}</th>
                <th>{t("employees.table.iqamaExpiry")}</th>
                <th>{t("employees.table.status")}</th>
                <th style={{ width: 50 }} />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7}>
                        <div className="h-9 animate-pulse rounded-xl bg-[var(--l-ground)]" />
                      </td>
                    </tr>
                  ))
                : rows.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="px-empty">
                          <b>{t("employees.emptyTitle")}</b>
                          {t("employees.emptyDescription")}
                        </div>
                      </td>
                    </tr>
                  )}
              {!isLoading &&
                rows.map((e, j) => {
                  const { primary: name } = namePair(e.fullNameAr, e.fullNameEn, isAr);
                  return (
                    <tr key={e.id} className="click" style={{ ["--j" as string]: j }} onClick={() => setPeek(e)}>
                      <td>
                        <div className="px-who">
                          <span className="px-av">
                            <SaudiAvatar gender={e.gender} size="md" className="h-full w-full" />
                          </span>
                          <div>
                            <b>{name}</b>
                            <small className="mono">{e.employeeNumber}</small>
                          </div>
                        </div>
                      </td>
                      <td className="hm">{localized(e.jobTitle, e.jobTitleEn) ?? "—"}</td>
                      <td className="hm">{localized(e.branch?.name, e.branch?.nameEn) ?? "—"}</td>
                      <td className="hm mono">{e.iqamaNumber ?? "—"}</td>
                      <td className="mono">{e.iqamaExpiryDate ? dmy(e.iqamaExpiryDate) : "—"}</td>
                      <td>
                        <PxBadge tone={iqTone(e.iqamaStatus)}>{e.iqamaStatus ? t(`status.${e.iqamaStatus}`, { defaultValue: e.iqamaStatus }) : tr("غير مسجّلة", "Not recorded")}</PxBadge>
                      </td>
                      <td onClick={(ev) => ev.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="px-iconbtn" aria-label={t("common.actions")}>
                              <MoreHorizontal />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-3xl p-2">
                            <DropdownMenuItem onSelect={() => navigate(`/employees/${e.id}`)} className="rounded-2xl text-xs font-medium">
                              <Eye className="me-2 h-4 w-4 text-primary" /> {t("employees.menu.viewProfile")}
                            </DropdownMenuItem>
                            {hasPermission("employees.edit") && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  setEditTarget(e);
                                  setDialogOpen(true);
                                }}
                                className="rounded-2xl text-xs font-medium"
                              >
                                <Pencil className="me-2 h-4 w-4 text-muted-foreground" /> {t("employees.menu.edit")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={() => openPdfInNewTab(employeePdfUrl(e.id))} className="rounded-2xl text-xs font-medium">
                              <Printer className="me-2 h-4 w-4 text-muted-foreground" /> {t("employees.menu.printProfile")}
                            </DropdownMenuItem>
                            {hasPermission("employees.delete") && (
                              <DropdownMenuItem onSelect={() => setDeleteTarget(e)} className="rounded-2xl text-xs font-medium text-destructive">
                                <Trash2 className="me-2 h-4 w-4" /> {t("employees.menu.delete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="px-pager no-print">
          {isAr ? `عرض ${fromRow} إلى ${toRow} من ${matched}` : `Showing ${fromRow} to ${toRow} of ${matched}`}
          <span className="sp" />
          <div className="pg">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={tr("السابق", "Previous")}>
              <ChevronRight className="h-4 w-4 ltr:rotate-180" />
            </button>
            {pageList.map((p, k) => (
              <span key={p} className="contents">
                {k > 0 && p - pageList[k - 1] > 1 && <button type="button" disabled>…</button>}
                <button type="button" aria-current={p === page ? "page" : undefined} onClick={() => setPage(p)}>
                  {p}
                </button>
              </span>
            ))}
            <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label={tr("التالي", "Next")}>
              <ChevronLeft className="h-4 w-4 ltr:rotate-180" />
            </button>
          </div>
        </div>
      </section>

      <EmployeePeek
        employee={peek}
        isAr={isAr}
        onClose={() => setPeek(null)}
        onEdit={
          hasPermission("employees.edit")
            ? (e) => {
                setPeek(null);
                setEditTarget(e);
                setDialogOpen(true);
              }
            : undefined
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
