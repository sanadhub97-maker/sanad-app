import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { auditLogsApi } from "@/api/auditLogs";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogItem } from "@/types/models";

const columnHelper = createColumnHelper<AuditLogItem>();

const ACTION_VARIANT: Record<string, "success" | "warning" | "destructive" | "info" | "secondary"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "destructive",
  IMPORT: "warning",
  EXPORT: "secondary",
  DOWNLOAD: "secondary",
  LOGIN: "secondary",
  LOGOUT: "secondary",
};

const AUDIT_MODULES = [
  "employees",
  "employeeDocuments",
  "companyDocuments",
  "licenses",
  "branches",
  "payments",
  "notifications",
  "reports",
  "files",
  "importExport",
  "users",
  "roles",
  "settings",
  "auditLogs",
  "auth",
] as const;

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [module, setModule] = useState("");
  const pageSize = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", { page, module }],
    queryFn: () => auditLogsApi.list({ page, pageSize, module: module || undefined }),
  });

  const columns = [
    columnHelper.accessor("createdAt", { header: t("auditLogs.table.date"), cell: (c) => formatDateTime(c.getValue()) }),
    columnHelper.accessor((row) => row.user?.fullName ?? t("auditLogs.systemUser"), { id: "user", header: t("auditLogs.table.user") }),
    columnHelper.accessor("action", {
      header: t("auditLogs.table.action"),
      cell: (c) => <Badge variant={ACTION_VARIANT[c.getValue()] ?? "secondary"}>{t(`auditLogs.actions.${c.getValue()}`, { defaultValue: c.getValue() })}</Badge>,
    }),
    columnHelper.accessor("module", {
      header: t("auditLogs.table.module"),
      cell: (c) => t(`moduleNames.${c.getValue()}`, { defaultValue: c.getValue() }),
    }),
    columnHelper.accessor("description", { header: t("auditLogs.table.description"), cell: (c) => c.getValue() ?? "—" }),
    columnHelper.accessor("ipAddress", { header: t("auditLogs.table.ipAddress"), cell: (c) => c.getValue() ?? "—" }),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("auditLogs.title")}
        description={t("auditLogs.subtitle")}
        actions={
          <Select
            value={module || "all"}
            onValueChange={(v) => {
              setModule(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder={t("auditLogs.filterByModule")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("auditLogs.allModules")}</SelectItem>
              {AUDIT_MODULES.map((m) => (
                <SelectItem key={m} value={m}>
                  {t(`moduleNames.${m}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        emptyTitle={t("common.noResults")}
      />
    </div>
  );
}
