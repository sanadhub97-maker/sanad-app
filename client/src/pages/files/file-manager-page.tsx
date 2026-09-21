import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { Download, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { filesApi, type FileMetaWithUploader } from "@/api/files";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

const columnHelper = createColumnHelper<FileMetaWithUploader>();

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileManagerPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FileMetaWithUploader | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["files", { page, search }],
    queryFn: () => filesApi.list({ page, pageSize, q: search || undefined }),
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await filesApi.remove(deleteTarget.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const columns = [
    columnHelper.accessor("originalName", { header: t("files.table.fileName") }),
    columnHelper.accessor("mimeType", { header: t("files.table.type") }),
    columnHelper.accessor("size", { header: t("files.table.size"), cell: (c) => formatSize(c.getValue()) }),
    columnHelper.accessor((row) => row.uploadedBy?.fullName, { id: "uploadedBy", header: t("files.table.uploadedBy"), cell: (c) => c.getValue() ?? "—" }),
    columnHelper.accessor("createdAt", { header: t("files.table.uploadDate"), cell: (c) => formatDateTime(c.getValue()) }),
    columnHelper.display({
      id: "actions",
      header: t("common.actions"),
      cell: (c) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" asChild>
            <a href={filesApi.downloadUrl(c.row.original.id)} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
            </a>
          </Button>
          {hasPermission("files.delete") && (
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c.row.original)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={t("files.title")} description={t("files.subtitle")} />
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
        emptyTitle={t("files.emptyTitle")}
        emptyAction={<FolderOpen className="h-4 w-4" />}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("files.deleteConfirmTitle")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
