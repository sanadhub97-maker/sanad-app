import { useState } from "react";
import { localized } from "@/lib/names";
import { tr } from "@/i18n";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { Edit, Eye, FileDown, FileText, Plus, Trash2, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { reportsApi } from "@/api/reports";
import { getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { AppleIcon } from "@/components/common/apple-icon";
import { CategoryChips } from "@/components/common/category-chips";
import { CompanyDocumentDialog } from "@/pages/companyDocuments/company-document-dialog";
import { CompanyDocumentDetailsDialog } from "@/pages/companyDocuments/company-document-details-dialog";
import { COMPANY_DOCUMENT_CATEGORY_ICONS } from "@/lib/document-type-icons";
import type { CompanyDocument } from "@/types/models";
import type { companyDocumentsApi } from "@/api/companyDocuments";

const columnHelper = createColumnHelper<CompanyDocument>();

interface Props {
  title: string;
  description: string;
  api: typeof companyDocumentsApi;
  categories: readonly string[];
  queryKey: string;
  permissionModule: string;
}

export function CompanyDocumentsView({ title, description, api, categories, queryKey, permissionModule }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const p = (action: string) => `${permissionModule}.${action}`;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; document?: CompanyDocument }>({ open: false });
  const [detailsDoc, setDetailsDoc] = useState<CompanyDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyDocument | null>(null);
  const pageSize = 20;

  const params = { page, pageSize, q: search || undefined, category: category || undefined };
  const { data, isLoading } = useQuery({ queryKey: [queryKey, params], queryFn: () => api.list(params) });
  const { data: counts } = useQuery({ queryKey: [queryKey, "category-counts"], queryFn: () => api.categoryCounts() });

  const chipItems = categories.map((cat) => ({
    value: cat,
    label: t(`documentCategories.${cat}`),
    icon: COMPANY_DOCUMENT_CATEGORY_ICONS[cat] ?? COMPANY_DOCUMENT_CATEGORY_ICONS.OTHER,
  }));
  const totalCount = Object.values(counts ?? {}).reduce((sum, n) => sum + n, 0);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.remove(deleteTarget.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const columns = [
    columnHelper.accessor("name", {
      header: t("companyDocuments.table.name"),
      cell: (c) => (
        <div className="flex items-center gap-3">
          <AppleIcon icon={FileText} tone="blue" size="xs" />
          <span className="font-bold text-sm text-foreground">{c.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor("category", {
      header: t("companyDocuments.table.category"),
      cell: (c) => (
        <span className="inline-block rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border/60">
          {t(`documentCategories.${c.getValue()}`)}
        </span>
      ),
    }),
    columnHelper.accessor((row) => localized(row.branch?.name, row.branch?.nameEn), {
      id: "branch",
      header: t("companyDocuments.table.branch"),
      cell: (c) => (
        <span className="text-xs font-medium text-muted-foreground">
          {c.getValue() ?? "—"}
        </span>
      ),
    }),
    columnHelper.accessor("expiryDate", {
      header: t("companyDocuments.table.expiryDate"),
      cell: (c) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-foreground">{formatDate(c.getValue())}</span>
          <StatusBadge status={c.row.original.status} />
        </div>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: t("common.actions"),
      cell: (c) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => setDetailsDoc(c.row.original)}
            title={t("common.viewDetails")}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {hasPermission(p("edit")) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted"
              onClick={() => setDialog({ open: true, document: c.row.original })}
              title={t("common.edit")}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {hasPermission(p("delete")) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteTarget(c.row.original)}
              title={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    }),
  ];

  const docs = data?.data ?? [];
  const validCount = docs.filter((d) => d.status === "VALID").length;
  const expiringCount = docs.filter((d) => d.status === "EXPIRING_SOON").length;
  const expiredCount = docs.filter((d) => d.status === "EXPIRED").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={description}
        actions={
          hasPermission(p("create")) && (
            <Button onClick={() => setDialog({ open: true })} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" /> {t("companyDocuments.addDocument")}
            </Button>
          )
        }
      />

      {/* Document Health Metrics Ribbon */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4"
      >
        <div className="group relative overflow-hidden rounded-3xl border border-blue-200/80 dark:border-blue-900/40 bg-card/90 backdrop-blur-xl p-5 transition-all duration-300 shadow-luxury hover:-translate-y-1 hover:border-blue-400 dark:hover:border-blue-500/60 specular-border">
          <div className="pointer-events-none absolute -bottom-8 -start-8 h-24 w-24 rounded-full bg-blue-500/15 blur-xl group-hover:scale-125 transition-transform" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground/90">{t("common.total", { defaultValue: "إجمالي الوثائق" })}</span>
            <AppleIcon icon={FileText} tone="blue" size="md" className="transition-transform duration-200 group-hover:scale-110 shadow-sm" />
          </div>
          <div className="relative z-10 mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-sans">
              {data?.meta.total ?? docs.length}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">{tr("وثيقة مسجلة", "documents")}</span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-emerald-200/80 dark:border-emerald-900/40 bg-card/90 backdrop-blur-xl p-5 transition-all duration-300 shadow-luxury hover:-translate-y-1 hover:border-emerald-400 dark:hover:border-emerald-500/60 specular-border">
          <div className="pointer-events-none absolute -bottom-8 -start-8 h-24 w-24 rounded-full bg-emerald-500/15 blur-xl group-hover:scale-125 transition-transform" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground/90">{t("status.VALID", { defaultValue: "سارية وممتثلة" })}</span>
            <AppleIcon icon={CheckCircle2} tone="emerald" size="md" className="transition-transform duration-200 group-hover:scale-110 shadow-sm" />
          </div>
          <div className="relative z-10 mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-sans">
              {validCount}
            </span>
            <span className="inline-block rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {tr("سارية", "Valid")}
            </span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-amber-200/80 dark:border-amber-900/40 bg-card/90 backdrop-blur-xl p-5 transition-all duration-300 shadow-luxury hover:-translate-y-1 hover:border-amber-400 dark:hover:border-amber-500/60 specular-border">
          <div className="pointer-events-none absolute -bottom-8 -start-8 h-24 w-24 rounded-full bg-amber-500/15 blur-xl group-hover:scale-125 transition-transform" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground/90">{t("status.EXPIRING_SOON", { defaultValue: "توشك على الانتهاء" })}</span>
            <AppleIcon icon={AlertTriangle} tone="amber" size="md" className="transition-transform duration-200 group-hover:scale-110 shadow-sm" />
          </div>
          <div className="relative z-10 mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400 font-sans">
              {expiringCount}
            </span>
            <span className="inline-block rounded-md bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">{tr("بحاجة لتجديد", "Needs renewal")}</span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-rose-200/80 dark:border-rose-900/40 bg-card/90 backdrop-blur-xl p-5 transition-all duration-300 shadow-luxury hover:-translate-y-1 hover:border-rose-400 dark:hover:border-rose-500/60 specular-border">
          <div className="pointer-events-none absolute -bottom-8 -start-8 h-24 w-24 rounded-full bg-rose-500/15 blur-xl group-hover:scale-125 transition-transform" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground/90">{t("status.EXPIRED", { defaultValue: "منتهية الصلاحية" })}</span>
            <AppleIcon icon={AlertOctagon} tone="rose" size="md" className="transition-transform duration-200 group-hover:scale-110 shadow-sm" />
          </div>
          <div className="relative z-10 mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400 font-sans">
              {expiredCount}
            </span>
            <span className="inline-block rounded-md bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">{tr("عاجل", "Urgent")}</span>
          </div>
        </div>
      </motion.div>

      <CategoryChips
        items={chipItems}
        active={category}
        onChange={(v) => {
          setCategory(v);
          setPage(1);
        }}
        counts={counts}
        allLabel={t("companyDocuments.filters.allCategories")}
        totalCount={totalCount}
      />

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
        emptyTitle={t("companyDocuments.emptyTitle")}
        emptyAction={
          hasPermission(p("create")) ? (
            <Button size="sm" onClick={() => setDialog({ open: true })}>
              <FileText className="h-4 w-4" /> {t("companyDocuments.addDocument")}
            </Button>
          ) : undefined
        }
        toolbar={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileDown className="h-4 w-4" /> {t("common.export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => reportsApi.documents.export({ sourceType: "COMPANY_DOCUMENT" }, "xlsx")}>{t("employees.export.excel")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => reportsApi.documents.export({ sourceType: "COMPANY_DOCUMENT" }, "pdf")}>{t("employees.export.pdf")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <CompanyDocumentDetailsDialog
        open={Boolean(detailsDoc)}
        document={detailsDoc}
        onOpenChange={(open) => !open && setDetailsDoc(null)}
        onEdit={(doc) => setDialog({ open: true, document: doc })}
      />
      <CompanyDocumentDialog
        api={api}
        categories={categories}
        queryKey={queryKey}
        open={dialog.open}
        document={dialog.document}
        onOpenChange={(open) => setDialog({ open })}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("companyDocuments.deleteConfirmTitle")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
