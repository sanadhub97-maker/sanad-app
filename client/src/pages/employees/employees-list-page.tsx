import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { localized } from "@/lib/names";
import { namePair } from "@/lib/names";
import { tr } from "@/i18n";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { Building2, ChevronLeft, ChevronRight, Eye, FileDown, FileUp, LayoutGrid, List, MoreHorizontal, Plus, Printer, Search, Trash2, X } from "lucide-react";
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
import { Kpis, LeftPill, dmy, daysFromToday } from "@/components/royal/rp";

const columnHelper = createColumnHelper<Employee>();

function daysAr(n: number) {
  return n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يومًا`;
}

const TONES = ["indigo", "rose", "amber", "teal", "violet", "sky", "green"] as const;

/** Days from today until a date (negative once it has passed). */
function daysUntil(iso?: string | null) {
  if (!iso) return null;
  const exp = new Date(iso);
  const now = new Date();
  return Math.round((Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000);
}

/** A document's tone and wording: rose once expired, amber within 30 days, green after. */
function docState(days: number | null, isAr: boolean): { tone: string; text: string } {
  if (days === null) return { tone: "sky", text: isAr ? "غير مسجّلة" : "Not recorded" };
  if (days < 0) return { tone: "rose", text: isAr ? `منتهية منذ ${daysAr(-days)}` : `Expired ${-days}d ago` };
  return { tone: days <= 30 ? "amber" : "green", text: isAr ? `باقي ${daysAr(days)}` : `${days}d left` };
}

/** One employee as a Royal card: avatar, name, job and nationality, the
 * iqama and passport with their dates and time left, and the establishment. */
function PersonCard({ employee, index, isAr, onOpen }: { employee: Employee; index: number; isAr: boolean; onOpen: () => void }) {
  const { primary: name } = namePair(employee.fullNameAr, employee.fullNameEn, isAr);
  const job = localized(employee.jobTitle, employee.jobTitleEn);
  const nat = isAr ? employee.nationality || employee.nationalityEn : employee.nationalityEn || employee.nationality;
  const branch = localized(employee.branch?.name, employee.branch?.nameEn);
  const docs = [
    { label: isAr ? "الإقامة" : "Iqama", date: employee.iqamaExpiryDate },
    { label: isAr ? "الجواز" : "Passport", date: employee.passportExpiryDate },
  ];
  return (
    <button type="button" onClick={onOpen} className="rp-card rp-emp rp-lift rp-rise" style={{ ["--i" as string]: Math.min(index, 10) }}>
      <span className="hd">
        <span className="rp-av">
          <SaudiAvatar gender={employee.gender} size="md" className="h-full w-full" />
        </span>
        <span className="min-w-0 flex-1">
          <h3>{name}</h3>
          <small>{[job, nat].filter(Boolean).join(" · ") || employee.employeeNumber}</small>
        </span>
        <EmploymentStatusBadge status={employee.employmentStatus} />
      </span>
      <span className="docs">
        {docs.map((d) => (
          <span key={d.label} className="doc">
            {d.label}
            <b className="rp-num">{d.date ? dmy(d.date) : "—"}</b>
            <LeftPill days={daysFromToday(d.date)} />
          </span>
        ))}
      </span>
      <span className="ft">
        <span>
          <Building2 />
          {branch ?? "—"}
        </span>
        <span className="rp-mono">{employee.employeeNumber}</span>
      </span>
    </button>
  );
}

/** The employee at a glance: a side panel on wide screens, a bottom sheet on phones. */
function PersonDrawer({ employee, tone, isAr, onClose, onOpenProfile, onEdit }: { employee: Employee | null; tone: string; isAr: boolean; onClose: () => void; onOpenProfile: () => void; onEdit?: () => void }) {
  const open = Boolean(employee);
  const [shown, setShown] = useState<Employee | null>(employee);
  useEffect(() => {
    if (employee) setShown(employee);
  }, [employee]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  const e = shown;
  const docs = e
    ? [
        { label: isAr ? "الإقامة" : "Iqama", number: e.iqamaNumber, days: daysUntil(e.iqamaExpiryDate), date: e.iqamaExpiryDate },
        { label: isAr ? "جواز السفر" : "Passport", number: e.passportNumber, days: daysUntil(e.passportExpiryDate), date: e.passportExpiryDate },
      ]
    : [];
  const name = e ? namePair(e.fullNameAr, e.fullNameEn, isAr).primary : "";
  const job = e ? localized(e.jobTitle, e.jobTitleEn) : null;
  const nat = e ? (isAr ? e.nationality || e.nationalityEn : e.nationalityEn || e.nationality) : null;

  return createPortal(
    <>
      <div className={cn("lu-scrim", open && "open")} onClick={onClose} />
      <aside className={cn("lu-drawer", `lt-${tone}`, open && "open")} aria-hidden={!open} aria-label={name}>
        <span className="grab" />
        {e && (
          <>
            <div className="lu-dh">
              <span className="lu-sq av">
                <SaudiAvatar gender={e.gender} size="md" className="h-full w-full" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate">{name}</h3>
                <small className="text-muted-foreground">{[job, nat].filter(Boolean).join(" · ") || e.employeeNumber}</small>
              </div>
              <button type="button" className="lu-btn" onClick={onClose} aria-label={isAr ? "إغلاق" : "Close"}>
                <X />
              </button>
            </div>
            <div className="lu-facts">
              <div>
                <small>{isAr ? "الرقم الوظيفي" : "Employee no."}</small>
                <b dir="ltr" className="text-start">
                  {e.employeeNumber}
                </b>
              </div>
              <div>
                <small>{isAr ? "الجنسية" : "Nationality"}</small>
                <b>{nat || "—"}</b>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <small>{isAr ? "المؤسسة" : "Establishment"}</small>
                <b>{localized(e.branch?.name, e.branch?.nameEn) ?? "—"}</b>
              </div>
              {(e.sponsorName || e.onSponsorship != null) && (
                <div style={{ gridColumn: "span 2" }}>
                  <small>{isAr ? "الكفيل" : "Sponsor"}</small>
                  <b>
                    {e.sponsorName || "—"}
                    {e.onSponsorship != null && ` ·${e.onSponsorship ? (isAr ? "على الكفالة" : "on sponsorship") : isAr ? "ليس على الكفالة" : "not on sponsorship"}`}
                  </b>
                </div>
              )}
            </div>
            {docs.map((d) => {
              const st = docState(d.days, isAr);
              const pct = d.days === null ? 0 : d.days < 0 ? 100 : Math.max(6, Math.min(100, (d.days / 365) * 100));
              return (
                <div key={d.label} className={cn("lu-doc", `lt-${st.tone}`)} style={d.days === null ? { background: "var(--l-ground)" } : undefined}>
                  <div className="r">
                    <span className="min-w-0">
                      <b>{d.label}</b>{" "}
                      {d.number && (
                        <small dir="ltr" className="text-muted-foreground">
                          {d.number}
                        </small>
                      )}
                    </span>
                    <span className="lu-chip" style={{ background: "var(--l-surface)" }}>
                      {st.text}
                    </span>
                  </div>
                  {d.days !== null && (
                    <>
                      <em className="lu-left">
                        <i style={{ width: open ? `${pct}%` : 0 }} />
                      </em>
                      <small className="text-muted-foreground">{formatDate(d.date)}</small>
                    </>
                  )}
                </div>
              );
            })}
            <div className="mt-auto flex gap-2 pt-1.5">
              <Button className="h-11 flex-1 rounded-[14px]" onClick={onOpenProfile}>
                <Eye className="h-4 w-4" /> {isAr ? "فتح الملف" : "Open profile"}
              </Button>
              {onEdit && (
                <button type="button" className="lu-btn" onClick={onEdit}>
                  {isAr ? "تعديل" : "Edit"}
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </>,
    document.body
  );
}

type Chip = "all" | "active" | "soon" | "expired";
const CHIP_TONE: Record<Chip, string> = { all: "rp-pri", active: "rp-ok", soon: "rp-warn", expired: "rp-bad" };

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
  const [quick, setQuick] = useState<{ employee: Employee; tone: string } | null>(null);
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
  const chips: { key: Chip; label: string; n?: number; tone: string }[] = [
    { key: "all", label: tr("الكل", "All"), n: summary?.totalEmployees, tone: "sky" },
    { key: "active", label: tr("على رأس العمل", "On duty"), n: summary?.activeEmployees, tone: "green" },
    { key: "soon", label: tr("تنتهي قريبًا", "Ending soon"), n: soonCount?.meta.total, tone: "amber" },
    { key: "expired", label: tr("منتهية", "Expired"), n: expiredCount?.meta.total, tone: "rose" },
  ];
  const pages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / pageSize));

  const description = isAr
    ? `${total} ${total === 1 ? "موظف" : "موظفين"} في ${branchCount} مؤسسات${attention ? ` · ${attention} ${attention === 1 ? "إقامة تحتاج" : "إقامات تحتاج"} انتباهك` : ""}`
    : `${total} employees in ${branchCount} branches${attention ? ` · ${attention} iqamas need your attention` : ""}`;

  return (
    <div className="rp">
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

      <Kpis
        items={[
          { label: tr("إجمالي الموظفين", "All employees"), value: summary?.totalEmployees ?? "—", sub: tr(`على رأس العمل ${summary?.activeEmployees ?? 0}`, `${summary?.activeEmployees ?? 0} on duty`), hero: true, onClick: () => pickChip("all"), active: chip === "all" },
          { label: tr("على رأس العمل", "On duty"), value: summary?.activeEmployees ?? "—", sub: tr("موظفون نشطون", "Active employees"), tone: "ok", onClick: () => pickChip("active"), active: chip === "active" },
          { label: tr("إقامات تنتهي خلال 30 يوم", "Iqamas ending in 30 days"), value: soonCount?.meta.total ?? "—", sub: tr("تحتاج تجديد قريب", "Renew soon"), tone: "warn", onClick: () => pickChip("soon"), active: chip === "soon" },
          { label: tr("إقامات منتهية", "Expired iqamas"), value: expiredCount?.meta.total ?? "—", sub: tr("راجعها اليوم", "Review today"), tone: "bad", onClick: () => pickChip("expired"), active: chip === "expired" },
        ]}
      />

      {/* Search, quick filters and the cards/table switch */}
      <div className="rp-tools rp-rise no-print" style={{ ["--i" as string]: 2 }}>
        <label className="rp-search">
          <Search />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label={tr("بحث", "Search")}
            placeholder={tr("الاسم أو الرقم أو الإقامة", "Name, number or iqama")}
          />
        </label>
        {chips.map((c) => (
          <button key={c.key} type="button" onClick={() => pickChip(c.key)} aria-pressed={chip === c.key} className={cn("rp-chip", CHIP_TONE[c.key])}>
            <i />
            {c.label} {c.n !== undefined && <span>{c.n}</span>}
          </button>
        ))}
        <Select
          value={branchId || "all"}
          onValueChange={(v) => {
            setBranchId(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-[38px] w-48 shrink-0 rounded-[11px] border-[var(--l-line)] bg-[var(--l-surface)] text-[13px] font-semibold">
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
        <span className="sp" />
        <div role="group" aria-label={tr("طريقة العرض", "View")} className="rp-views">
          {(["cards", "table"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => changeView(v)}>
              {v === "cards" ? <LayoutGrid /> : <List />}
              {v === "cards" ? tr("بطاقات", "Cards") : tr("جدول", "Table")}
            </button>
          ))}
        </div>
      </div>

      {view === "cards" ? (
        <>
          {isLoading ? (
            <div className="rp-cards">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[200px] animate-pulse rounded-[20px] bg-[var(--l-surface)]" />
              ))}
            </div>
          ) : (data?.data ?? []).length === 0 ? (
            <div className="rp-card rp-empty rp-rise">
              <b>{t("employees.emptyTitle")}</b>
              {t("employees.emptyDescription")}
            </div>
          ) : (
            <div className="rp-cards">
              {(data?.data ?? []).map((emp, i) => {
                const tone = TONES[i % TONES.length];
                return <PersonCard key={emp.id} employee={emp} index={i} isAr={isAr} onOpen={() => setQuick({ employee: emp, tone })} />;
              })}
            </div>
          )}
          {pages > 1 && (
            <div className="rp-pager no-print">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={tr("السابق", "Previous")}>
                <ChevronRight className="h-4 w-4 ltr:rotate-180" />
              </Button>
              <span>
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

      <PersonDrawer
        employee={quick?.employee ?? null}
        tone={quick?.tone ?? "sky"}
        isAr={isAr}
        onClose={() => setQuick(null)}
        onOpenProfile={() => quick && navigate(`/employees/${quick.employee.id}`)}
        onEdit={
          hasPermission("employees.edit")
            ? () => {
                if (!quick) return;
                setEditTarget(quick.employee);
                setQuick(null);
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
