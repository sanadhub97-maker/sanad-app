import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { Building2, Edit, Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmploymentStatusBadge } from "@/components/common/status-badge";
import { AppleIcon } from "@/components/common/apple-icon";
import { branchesApi } from "@/api/branches";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { BranchDialog } from "@/pages/branches/branch-dialog";
import { BranchDetailsDialog } from "@/pages/branches/branch-details-dialog";
import type { Branch } from "@/types/models";

const columnHelper = createColumnHelper<Branch>();

export default function BranchesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; branch?: Branch }>({ open: false });
  const [detailsTarget, setDetailsTarget] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["branches", { page, search }],
    queryFn: () => branchesApi.list({ page, pageSize, q: search || undefined }),
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await branchesApi.remove(deleteTarget.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const columns = [
    columnHelper.accessor("name", {
      header: t("branches.table.name"),
      cell: (c) => (
        <div className="flex items-center gap-3">
          <AppleIcon icon={Building2} tone="indigo" size="xs" />
          <span className="font-bold text-sm text-foreground">{c.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor("code", {
      header: t("branches.table.code"),
      cell: (c) => (
        <span className="inline-block font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-muted text-foreground border border-border/60">
          {c.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("city", {
      header: t("branches.table.city"),
      cell: (c) => <span className="text-xs font-medium text-muted-foreground">{c.getValue() ?? "—"}</span>,
    }),
    columnHelper.accessor((row) => row._count?.employees ?? 0, {
      id: "employees",
      header: t("branches.table.employees"),
      cell: (c) => (
        <span className="font-mono text-xs font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md">
          {c.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("status", {
      header: t("branches.table.status"),
      cell: (c) => <EmploymentStatusBadge status={c.getValue()} />,
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
            onClick={() => setDetailsTarget(c.row.original)}
            title={t("common.viewDetails")}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {hasPermission("branches.edit") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted"
              onClick={() => setDialog({ open: true, branch: c.row.original })}
              title={t("common.edit")}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {hasPermission("branches.delete") && (
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

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("branches.title")}
        description={t("branches.subtitle")}
        actions={
          hasPermission("branches.create") && (
            <Button onClick={() => setDialog({ open: true })} className="gap-2 shadow-sm font-semibold">
              <Plus className="h-4 w-4" /> {t("branches.addBranch")}
            </Button>
          )
        }
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
        onRowClick={(row) => setDetailsTarget(row)}
        emptyTitle={t("branches.emptyTitle")}
        emptyAction={
          hasPermission("branches.create") ? (
            <Button size="sm" onClick={() => setDialog({ open: true })}>
              <Building2 className="h-4 w-4" /> {t("branches.addBranch")}
            </Button>
          ) : undefined
        }
      />
      <BranchDetailsDialog
        open={Boolean(detailsTarget)}
        branch={detailsTarget}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
        onEdit={(b) => setDialog({ open: true, branch: b })}
      />
      <BranchDialog open={dialog.open} branch={dialog.branch} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("branches.deleteConfirmTitle")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
