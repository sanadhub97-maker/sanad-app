import { api } from "@/lib/api";
import type { AuditLogItem, Paginated } from "@/types/models";

export const auditLogsApi = {
  list: async (params: Record<string, unknown> = {}) => {
    const res = await api.get<Paginated<AuditLogItem>>("/audit-logs", { params });
    return res.data;
  },
};
