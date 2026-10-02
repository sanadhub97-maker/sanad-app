import { api } from "@/lib/api";
export type SessionItem = { familyId: string; userAgent: string | null; ipAddress: string | null; createdAt: string; lastUsedAt: string; expiresAt: string; current: boolean };
export type TrashKind = "employee" | "companyDocument" | "employeeDocument" | "payment" | "branch" | "user";
export type DeletedItem = { id: string; name: string; reference: string; deletedAt: string };
export type Revision = { id: string; subjectType: string; subjectId: string; subjectName: string; documentKind: string; actorName: string; before: Record<string, unknown>; after: Record<string, unknown>; createdAt: string };
export type BackupItem = { id: string; status: "READY" | "RUNNING" | "FAILED"; recordCount: number; fileCount: number; totalBytes: number; error: string | null; createdAt: string; completedAt: string | null };
export type BackupStatus = { rows: BackupItem[]; enabled: boolean; running: boolean; schedule: string; retention: number };
const data = async <T,>(url: string, params?: object) => (await api.get<{ data: T }>(url, { params })).data.data;
export const maintenanceApi = {
  sessions: () => data<SessionItem[]>("/maintenance/sessions"),
  revokeSession: async (familyId?: string) => (await api.post<{ data: { signedOut: boolean } }>("/maintenance/sessions/revoke", { familyId })).data.data,
  trash: (kind: TrashKind, page: number) => data<{ rows: DeletedItem[]; total: number }>("/maintenance/trash", { kind, page }),
  restoreTrash: (kind: TrashKind, id: string) => api.post("/maintenance/trash/restore", { kind, id }),
  revisions: (subjectType: string | undefined, page: number) => data<{ rows: Revision[]; total: number }>("/maintenance/revisions", { subjectType, page }),
  restoreRevision: (id: string, version: "before" | "after") => api.post("/maintenance/revisions/restore", { id, version }),
  backups: () => data<BackupStatus>("/maintenance/backups"),
  createBackup: (password: string) => api.post("/maintenance/backups/create", { password }),
  scheduleBackup: (password: string, enabled: boolean) => api.post("/maintenance/backups/schedule", { password, enabled }),
  restoreBackup: (password: string, id: string) => api.post("/maintenance/backups/restore", { password, id, confirmation: "RESTORE" }),
  importBackup: (password: string, file: File) => { const form = new FormData(); form.append("password", password); form.append("file", file); return api.post("/maintenance/backups/import", form); },
  downloadBackup: async (password: string, id: string) => {
    const response = await api.post("/maintenance/backups/download", { password, id }, { responseType: "blob" });
    const url = URL.createObjectURL(response.data); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `sanad-backup-${id}.zip`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
};
