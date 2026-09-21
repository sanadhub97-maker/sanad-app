import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { Edit, Plus, Trash2, UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmploymentStatusBadge } from "@/components/common/status-badge";
import { usersApi } from "@/api/users";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { UserDialog } from "@/pages/users/user-dialog";
import { translateRoleName } from "@/lib/role-display";
import type { AppUser } from "@/types/models";

const columnHelper = createColumnHelper<AppUser>();

export default function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; user?: AppUser }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["users", { page, search }],
    queryFn: () => usersApi.list({ page, pageSize, q: search || undefined }),
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await usersApi.remove(deleteTarget.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const columns = [
    columnHelper.accessor("fullName", {
      header: t("users.table.fullName"),
      cell: (c) => {
        const name = c.getValue();
        const initials = name?.split(" ").slice(0, 2).map((p: string) => p[0]).join("") || "U";
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
              {initials}
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">{name}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{c.row.original.email}</p>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor((row) => row.roles.map((r) => translateRoleName(r.name, t)).join(", "), {
      id: "roles",
      header: t("users.table.roles"),
      cell: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.row.original.roles.map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-semibold text-primary"
            >
              <Shield className="h-3 w-3" />
              {translateRoleName(r.name, t)}
            </span>
          ))}
        </div>
      ),
    }),
    columnHelper.accessor("isActive", {
      header: t("users.table.status"),
      cell: (c) => <EmploymentStatusBadge status={c.getValue() ? "ACTIVE" : "INACTIVE"} />,
    }),
    columnHelper.accessor("lastLoginAt", {
      header: t("users.table.lastLogin"),
      cell: (c) => (
        <span className="font-mono text-xs text-muted-foreground">
          {c.getValue() ? formatDateTime(c.getValue()) : t("users.table.never")}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: t("common.actions"),
      cell: (c) => (
        <div className="flex gap-1">
          {hasPermission("users.edit") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted"
              onClick={() => setDialog({ open: true, user: c.row.original })}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {hasPermission("users.delete") && c.row.original.id !== currentUser?.id && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteTarget(c.row.original)}
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
        title={t("users.title")}
        description={t("users.subtitle")}
        actions={
          hasPermission("users.create") && (
            <Button onClick={() => setDialog({ open: true })} className="gap-2 shadow-sm font-semibold">
              <Plus className="h-4 w-4" /> {t("users.addUser")}
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
        emptyTitle={t("users.emptyTitle")}
        emptyAction={
          hasPermission("users.create") ? (
            <Button size="sm" onClick={() => setDialog({ open: true })}>
              <UserPlus className="h-4 w-4" /> {t("users.addUser")}
            </Button>
          ) : undefined
        }
      />
      <UserDialog open={dialog.open} user={dialog.user} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("users.deleteConfirmTitle")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
