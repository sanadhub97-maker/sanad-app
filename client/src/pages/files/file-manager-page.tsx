import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { Download, Eye, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { filesApi, type FileMetaWithUploader } from "@/api/files";
import { FileDetailsDialog, fixFileName } from "@/pages/files/file-details-dialog";
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
  const [selectedFile, setSelectedFile] = useState<FileMetaWithUploader | null>(null);
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
    columnHelper.accessor("originalName", {
      header: t("files.table.fileName"),
      cell: (c) => (
        <span className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer" dir="auto">
          {fixFileName(c.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("mimeType", { header: t("files.table.type") }),
    columnHelper.accessor("size", { header: t("files.table.size"), cell: (c) => formatSize(c.getValue()) }),
    columnHelper.accessor((row) => row.uploadedBy?.fullName, { id: "uploadedBy", header: t("files.table.uploadedBy"), cell: (c) => c.getValue() ?? "—" }),
    columnHelper.accessor("createdAt", { header: t("files.table.uploadDate"), cell: (c) => formatDateTime(c.getValue()) }),
    columnHelper.display({
      id: "actions",
      header: t("common.actions"),
      cell: (c) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => setSelectedFile(c.row.original)}
            title={t("common.viewDetails")}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-muted"
            onClick={() =>
              filesApi
                .download(c.row.original.id, fixFileName(c.row.original.originalName))
                .catch((err) => toast.error(getErrorMessage(err)))
            }
            title={t("common.download")}
          >
            <Download className="h-4 w-4" />
          </Button>
          {hasPermission("files.delete") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteTarget(c.row.original)}
              title={t("common.delete")}
            >
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
        onRowClick={(row) => setSelectedFile(row)}
        emptyTitle={t("files.emptyTitle")}
        emptyAction={<FolderOpen className="h-4 w-4" />}
      />
      <FileDetailsDialog
        open={Boolean(selectedFile)}
        file={selectedFile}
        onOpenChange={(open) => !open && setSelectedFile(null)}
        onDelete={(f) => setDeleteTarget(f)}
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
