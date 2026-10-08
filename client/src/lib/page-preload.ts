// Only load page code on navigation intent; private data still loads on entry.
const loaders: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/dashboard/dashboard-lulu"),
  "/employees": () => import("@/pages/employees/employees-list-page"),
  "/employee-documents": () => import("@/pages/workforce/employee-documents-page"),
  "/company-documents": () => import("@/pages/companyDocuments/company-documents-page"),
  "/branches": () => import("@/pages/branches/branches-page"),
  "/payments": () => import("@/pages/payments/payments-page"),
  "/tax-declarations": () => import("@/pages/tax/tax-declarations-page"),
  "/reports": () => import("@/pages/reports/reports-page"),
  "/daily-tasks": () => import("@/pages/tasks/daily-tasks-page"),
  "/violations": () => import("@/pages/violations/violations-page"),
  "/custody": () => import("@/pages/custody/handovers-page"),
  "/vehicles": () => import("@/pages/vehicles/vehicles-page"),
  "/clearances": () => import("@/pages/custody/clearances-page"),
  "/settings": () => import("@/pages/settings/settings-page"),
  "/maintenance": () => import("@/pages/maintenance/maintenance-page"),
  "/users": () => import("@/pages/users/users-page"),
  "/roles": () => import("@/pages/roles/roles-page"),
  "/audit-logs": () => import("@/pages/auditLogs/audit-logs-page"),
  "/files": () => import("@/pages/files/file-manager-page"),
  "/import-export": () => import("@/pages/importExport/import-export-page"),
};
const pending = new Set<string>();
export function preloadPage(path: string) {
  const load = loaders[path];
  if (!load || pending.has(path)) return;
  pending.add(path);
  void load().catch(() => pending.delete(path));
}
