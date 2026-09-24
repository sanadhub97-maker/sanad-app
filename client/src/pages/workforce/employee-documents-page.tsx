import { useState, useMemo } from "react";
import { namePair, nameInitials } from "@/lib/names";
import { documentAuthority } from "./authority";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { createColumnHelper } from "@tanstack/react-table";
import { motion } from "framer-motion";
import {
  FileText,
  CreditCard,
  BookUser,
  HeartPulse,
  ShieldPlus,
  Stamp,
  Plane,
  Plus,
  Eye,
  Edit,
  Trash2,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Copy,
  ExternalLink,
  Building,
  Download,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { AppleIcon, type AppleTone } from "@/components/common/apple-icon";
import { CategoryChips } from "@/components/common/category-chips";
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
import { filesApi } from "@/api/files";
import { getErrorMessage } from "@/lib/api";
import { formatDate, daysUntil } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  workforceDocumentsApi,
  type WorkforceDocumentItem,
  type WorkforceQueryParams,
} from "@/api/workforceDocuments";
import { WorkforceDocumentDialog } from "./workforce-document-dialog";
import { WorkforceDocumentDetailsDialog } from "./workforce-document-details-dialog";

const columnHelper = createColumnHelper<WorkforceDocumentItem>();

const CATEGORIES = [
  { value: "IQAMA", labelAr: "الإقامات", labelEn: "Iqamas", icon: CreditCard, tone: "blue" as AppleTone },
  { value: "PASSPORT", labelAr: "جوازات السفر", labelEn: "Passports", icon: BookUser, tone: "purple" as AppleTone },
  { value: "HEALTH_CERTIFICATE", labelAr: "الشهادات الصحية", labelEn: "Health Certificates", icon: HeartPulse, tone: "emerald" as AppleTone },
  { value: "MEDICAL_INSURANCE", labelAr: "التأمين الطبي", labelEn: "Medical Insurance", icon: ShieldPlus, tone: "cyan" as AppleTone },
  { value: "VISA", labelAr: "التأشيرات", labelEn: "Visas", icon: Stamp, tone: "amber" as AppleTone },
  { value: "FLIGHT_TICKET", labelAr: "تذاكر الطيران", labelEn: "Flight Tickets", icon: Plane, tone: "rose" as AppleTone },
] as const;

export default function EmployeeDocumentsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [searchParams, setSearchParams] = useSearchParams();

  // Category from URL query param if present
  const initialCategory = searchParams.get("category") || "";
  const [category, setCategory] = useState<string>(initialCategory);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");

  const [dialog, setDialog] = useState<{
    open: boolean;
    docType?: any;
    document?: WorkforceDocumentItem | null;
  }>({ open: false, document: null });

  const [detailsDoc, setDetailsDoc] = useState<WorkforceDocumentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkforceDocumentItem | null>(null);
  const pageSize = 20;

  const queryParams: WorkforceQueryParams = {
    page,
    pageSize,
    q: search || undefined,
    branchId: branchFilter !== "ALL" ? branchFilter : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    category: category || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["workforce-documents-unified", queryParams],
    queryFn: () => workforceDocumentsApi.listUnified(queryParams),
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["workforce-category-counts"],
    queryFn: workforceDocumentsApi.categoryCounts,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["active-branches"],
    queryFn: listActiveBranches,
  });

  function handleCategoryChange(newCategory: string) {
    setCategory(newCategory);
    setPage(1);
    if (newCategory) {
      setSearchParams({ category: newCategory });
    } else {
      setSearchParams({});
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await workforceDocumentsApi.remove(deleteTarget.id, deleteTarget.type);
      toast.success(isAr ? "تم حذف الوثيقة بنجاح" : "Document deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["workforce-documents-unified"] });
      queryClient.invalidateQueries({ queryKey: ["workforce-category-counts"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function copyText(text?: string | null) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(isAr ? "تم النسخ للحافظة" : "Copied to clipboard");
  }

  const chipItems = CATEGORIES.map((c) => ({
    value: c.value,
    label: isAr ? c.labelAr : c.labelEn,
    icon: c.icon,
  }));

  const totalDocsCount = Object.values(counts).reduce((acc, curr) => acc + curr, 0);

  const stats = data?.stats || {
    total: totalDocsCount,
    valid: 0,
    expiringSoon: 0,
    expired: 0,
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => row.fullNameAr || row.employee?.fullNameAr || "—",
        {
          id: "employee",
          header: isAr ? "الموظف" : "Employee",
          cell: (c) => {
            const emp = c.row.original;
            const { primary: name, secondary: otherName } = namePair(
              emp.fullNameAr || emp.employee?.fullNameAr,
              emp.fullNameEn || emp.employee?.fullNameEn,
              isAr
            );
            const empNum = emp.employeeNumber || emp.employee?.employeeNumber;
            const empId = emp.employeeId || emp.employee?.id || emp.id;
            const branchName = emp.branch?.name || emp.employee?.branch?.name;

            return (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 text-xs font-bold text-primary shadow-2xs">
                  {nameInitials(name)}
                </div>
                <div className="min-w-0">
                  <Link
                    to={`/employees/${empId}`}
                    className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1 group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="truncate">{name || "—"}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {empNum && (
                      <span className="font-mono text-[11px] font-medium">#{empNum}</span>
                    )}
                    {otherName && (
                      <span className="text-[11px] opacity-80 truncate max-w-[120px]">{otherName}</span>
                    )}
                    {branchName && (
                      <span className="flex items-center gap-1 text-[11px] opacity-80">
                        <Building className="h-2.5 w-2.5" />
                        {branchName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          },
        }
      ),

      columnHelper.accessor("type", {
        header: isAr ? "نوع الوثيقة" : "Document Type",
        cell: (c) => {
          const row = c.row.original;
          const rawType = (row.type || (row.iqamaNumber ? "IQAMA" : "PASSPORT")).toUpperCase();
          const found = CATEGORIES.find(
            (cat) => cat.value === rawType || (rawType.includes("VISA") && cat.value === "VISA")
          );

          const label = found
            ? isAr
              ? found.labelAr
              : found.labelEn
            : row.name || (isAr ? "وثيقة موظف" : "Document");
          const Icon = found?.icon || FileText;
          const tone = found?.tone || "blue";

          return (
            <div className="flex items-center gap-2">
              <AppleIcon icon={Icon} tone={tone} size="xs" />
              <span className="font-medium text-xs text-foreground">{label}</span>
            </div>
          );
        },
      }),

      columnHelper.accessor(
        (row) => row.documentNumber || row.iqamaNumber || row.passportNumber || "—",
        {
          id: "documentNumber",
          header: isAr ? "رقم الوثيقة" : "Document Number",
          cell: (c) => {
            const val = c.getValue();
            if (val === "—") return <span className="text-muted-foreground">—</span>;
            return (
              <div
                className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground group"
                onClick={(e) => e.stopPropagation()}
              >
                <span>{val}</span>
                <button
                  type="button"
                  onClick={() => copyText(val)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                  title={isAr ? "نسخ الرقم" : "Copy number"}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            );
          },
        }
      ),

      columnHelper.accessor(
        (row) => documentAuthority({ ...row, type: row.type || (row.iqamaNumber ? "IQAMA" : "PASSPORT") }, isAr) || "—",
        {
          id: "authority",
          header: isAr ? "الجهة / الدولة" : "Authority / Country",
          cell: (c) => (
            <span className="text-xs text-muted-foreground font-medium">
              {c.getValue()}
            </span>
          ),
        }
      ),

      columnHelper.accessor("expiryDate", {
        header: isAr ? "تاريخ الانتهاء" : "Expiry Date",
        cell: (c) => {
          const val = c.getValue();
          if (!val) return <span className="text-muted-foreground text-xs">—</span>;
          const days = daysUntil(val);

          return (
            <div className="space-y-1">
              <span className="font-mono text-xs font-semibold text-foreground block">
                {formatDate(val)}
              </span>
              {days !== null && (
                <span
                  className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    days < 0
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      : days <= 30
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {days < 0
                    ? isAr
                      ? `منتهية منذ ${Math.abs(days)} يوم`
                      : `Expired ${Math.abs(days)}d ago`
                    : days === 0
                    ? isAr
                      ? "تنتهي اليوم!"
                      : "Expires today"
                    : isAr
                    ? `متبقي ${days} يوم`
                    : `${days}d left`}
                </span>
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
        header: t("common.actions"),
        cell: (c) => {
          const doc = c.row.original;
          return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => setDetailsDoc(doc)}
                title={t("common.viewDetails")}
              >
                <Eye className="h-4 w-4" />
              </Button>

              {doc.fileId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => filesApi.download(doc.fileId!, `${doc.documentNumber || "document"}.pdf`)}
                  title={isAr ? "تحميل المرفق" : "Download attachment"}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}

              {hasPermission("employees.edit") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setDialog({
                      open: true,
                      docType: doc.type || (doc.iqamaNumber ? "IQAMA" : "PASSPORT"),
                      document: doc,
                    })
                  }
                  title={t("common.edit")}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}

              {hasPermission("employees.edit") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(doc)}
                  title={t("common.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
      }),
    ],
    [isAr, t, hasPermission]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("employeeDocuments.title", { defaultValue: "مستندات الموظفون" })}
        description={t("employeeDocuments.subtitle", {
          defaultValue:
            "إدارة ومتابعة كافة وثائق القوى العاملة (الإقامات، جوازات السفر، الشهادات الصحية، التأمين الطبي، التأشيرات، وتذاكر الطيران).",
        })}
        actions={
          hasPermission("employees.create") && (
            <Button
              onClick={() =>
                setDialog({
                  open: true,
                  docType: category || "IQAMA",
                  document: null,
                })
              }
              className="gap-2 shadow-sm rounded-xl font-bold"
            >
              <Plus className="h-4 w-4" />
              {t("employeeDocuments.addDocument", { defaultValue: "إضافة وثيقة موظف" })}
            </Button>
          )
        }
      />

      {/* Health Metrics Ribbon */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4"
      >
        <div className="group relative overflow-hidden rounded-3xl border border-blue-200/80 dark:border-blue-900/40 bg-card/90 backdrop-blur-xl p-5 transition-all duration-300 shadow-luxury hover:-translate-y-1 hover:border-blue-400 dark:hover:border-blue-500/60 specular-border">
          <div className="pointer-events-none absolute -bottom-8 -start-8 h-24 w-24 rounded-full bg-blue-500/15 blur-xl group-hover:scale-125 transition-transform" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground/90">
              {t("common.total", { defaultValue: "إجمالي الوثائق" })}
            </span>
            <AppleIcon icon={FileText} tone="blue" size="md" className="transition-transform duration-200 group-hover:scale-110 shadow-sm" />
          </div>
          <div className="relative z-10 mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-sans">
              {stats.total}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">{isAr ? "وثيقة مسجلة" : "documents"}</span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-emerald-200/80 dark:border-emerald-900/40 bg-card/90 backdrop-blur-xl p-5 transition-all duration-300 shadow-luxury hover:-translate-y-1 hover:border-emerald-400 dark:hover:border-emerald-500/60 specular-border">
          <div className="pointer-events-none absolute -bottom-8 -start-8 h-24 w-24 rounded-full bg-emerald-500/15 blur-xl group-hover:scale-125 transition-transform" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground/90">
              {t("status.VALID", { defaultValue: "سارية وممتثلة" })}
            </span>
            <AppleIcon icon={CheckCircle2} tone="emerald" size="md" className="transition-transform duration-200 group-hover:scale-110 shadow-sm" />
          </div>
          <div className="relative z-10 mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-sans">
              {stats.valid}
            </span>
            <span className="inline-block rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {isAr ? "سارية" : "Valid"}
            </span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-amber-200/80 dark:border-amber-900/40 bg-card/90 backdrop-blur-xl p-5 transition-all duration-300 shadow-luxury hover:-translate-y-1 hover:border-amber-400 dark:hover:border-amber-500/60 specular-border">
          <div className="pointer-events-none absolute -bottom-8 -start-8 h-24 w-24 rounded-full bg-amber-500/15 blur-xl group-hover:scale-125 transition-transform" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground/90">
              {t("status.EXPIRING_SOON", { defaultValue: "توشك على الانتهاء" })}
            </span>
            <AppleIcon icon={AlertTriangle} tone="amber" size="md" className="transition-transform duration-200 group-hover:scale-110 shadow-sm" />
          </div>
          <div className="relative z-10 mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400 font-sans">
              {stats.expiringSoon}
            </span>
            <span className="inline-block rounded-md bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              {isAr ? "تستوجب التجديد" : "Needs renewal"}
            </span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-rose-200/80 dark:border-rose-900/40 bg-card/90 backdrop-blur-xl p-5 transition-all duration-300 shadow-luxury hover:-translate-y-1 hover:border-rose-400 dark:hover:border-rose-500/60 specular-border">
          <div className="pointer-events-none absolute -bottom-8 -start-8 h-24 w-24 rounded-full bg-rose-500/15 blur-xl group-hover:scale-125 transition-transform" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground/90">
              {t("status.EXPIRED", { defaultValue: "منتهية الصلاحية" })}
            </span>
            <AppleIcon icon={AlertOctagon} tone="rose" size="md" className="transition-transform duration-200 group-hover:scale-110 shadow-sm" />
          </div>
          <div className="relative z-10 mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400 font-sans">
              {stats.expired}
            </span>
            <span className="inline-block rounded-md bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
              {isAr ? "إجراء عاجل" : "Action needed"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Category Chips Dock */}
      <CategoryChips
        items={chipItems}
        active={category}
        onChange={handleCategoryChange}
        counts={counts}
        allLabel={t("employeeDocuments.filters.allCategories", { defaultValue: "جميع مستندات الموظفين" })}
        totalCount={totalDocsCount}
      />

      {/* Main Unified Table */}
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
        onRowClick={(row) => setDetailsDoc(row)}
        emptyTitle={t("employeeDocuments.emptyTitle", { defaultValue: "لم يتم العثور على أي وثائق مسجلة" })}
        emptyAction={
          hasPermission("employees.create") ? (
            <Button
              size="sm"
              onClick={() =>
                setDialog({
                  open: true,
                  docType: category || "IQAMA",
                  document: null,
                })
              }
            >
              <Plus className="h-4 w-4" />
              {t("employeeDocuments.addDocument", { defaultValue: "إضافة وثيقة موظف" })}
            </Button>
          ) : undefined
        }
        toolbar={
          <div className="flex items-center gap-2">
            {/* Branch Filter */}
            {branches.length > 0 && (
              <Select
                value={branchFilter}
                onValueChange={(v) => {
                  setBranchFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-44 rounded-xl text-xs bg-card/60 border-border/80">
                  <Building className="h-3.5 w-3.5 text-muted-foreground me-1.5" />
                  <SelectValue placeholder={isAr ? "جميع الفروع" : "All Branches"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{isAr ? "جميع الفروع" : "All Branches"}</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <bdi>{b.name}</bdi>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-36 rounded-xl text-xs bg-card/60 border-border/80">
                <Filter className="h-3.5 w-3.5 text-muted-foreground me-1.5" />
                <SelectValue placeholder={isAr ? "جميع الحالات" : "All Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{isAr ? "جميع الحالات" : "All Status"}</SelectItem>
                <SelectItem value="VALID">{isAr ? "سارية" : "Valid"}</SelectItem>
                <SelectItem value="EXPIRING_SOON">{isAr ? "توشك على الانتهاء" : "Expiring Soon"}</SelectItem>
                <SelectItem value="EXPIRED">{isAr ? "منتهية" : "Expired"}</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5 text-xs">
                  <FileDown className="h-4 w-4" /> {t("common.export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() =>
                    reportsApi.documents.export(
                      {
                        sourceType: "EMPLOYEE_DOCUMENT",
                        category: category || undefined,
                        status: statusFilter !== "ALL" ? statusFilter : undefined,
                      },
                      "xlsx"
                    )
                  }
                >
                  {t("employees.export.excel")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    reportsApi.documents.export(
                      {
                        sourceType: "EMPLOYEE_DOCUMENT",
                        category: category || undefined,
                        status: statusFilter !== "ALL" ? statusFilter : undefined,
                      },
                      "pdf"
                    )
                  }
                >
                  {t("employees.export.pdf")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Details Dialog */}
      <WorkforceDocumentDetailsDialog
        open={Boolean(detailsDoc)}
        document={detailsDoc}
        onOpenChange={(open) => !open && setDetailsDoc(null)}
        onEdit={(doc) =>
          setDialog({
            open: true,
            docType: doc.type || (doc.iqamaNumber ? "IQAMA" : "PASSPORT"),
            document: doc,
          })
        }
      />

      {/* Create / Edit Dialog */}
      <WorkforceDocumentDialog
        open={dialog.open}
        docType={dialog.docType || category || "IQAMA"}
        document={dialog.document}
        queryKey="workforce-documents-unified"
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["workforce-category-counts"] });
        }}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("employeeDocuments.deleteConfirmTitle", { defaultValue: "تأكيد حذف الوثيقة؟" })}
        description={t("employeeDocuments.deleteConfirmBody", {
          defaultValue: "هل أنت متأكد من رغبتك في حذف هذا المستند من سجلات الموظف؟",
        })}
        onConfirm={handleDelete}
      />
    </div>
  );
}
