// Full permission catalogue (spec §10). Keys use "<module>.<action>" so the
// RBAC middleware and the seed script can stay generic.

export const PERMISSIONS = {
  employees: ["view", "create", "edit", "delete", "export"],
  employeeDocuments: ["view", "create", "edit", "delete", "download"],
  companyDocuments: ["view", "create", "edit", "delete", "download"],
  branches: ["view", "create", "edit", "delete"],
  payments: ["view", "create", "edit", "delete", "export"],
  notifications: ["view", "manage"],
  reports: ["view", "export"],
  files: ["view", "upload", "delete"],
  importExport: ["import", "export"],
  users: ["view", "create", "edit", "delete"],
  roles: ["view", "create", "edit", "delete"],
  settings: ["view", "edit"],
  auditLogs: ["view"],
} as const;

export type PermissionModule = keyof typeof PERMISSIONS;

/** Flat list, e.g. ["employees.view", "employees.create", ...] */
export const ALL_PERMISSION_KEYS: string[] = Object.entries(PERMISSIONS).flatMap(
  ([module, actions]) => actions.map((action) => `${module}.${action}`)
);

export function permissionKey(module: PermissionModule, action: string): string {
  return `${module}.${action}`;
}

// Default role -> permission-key-glob mapping used by the seed script.
// "*" means every permission in that module; a bare "*" means every
// permission system-wide (Super Admin).
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  // Super Admin's bypass is enforced by role name in the RBAC middleware
  // (see requirePermission), not by this list — but seeding every key here
  // too keeps the Roles & Permissions screen showing it as fully checked.
  "Super Admin": ALL_PERMISSION_KEYS,
  Admin: ALL_PERMISSION_KEYS.filter((k) => !k.startsWith("settings.")).concat([
    "settings.view",
  ]),
  Manager: [
    "employees.view",
    "employees.export",
    "employeeDocuments.view",
    "employeeDocuments.download",
    "companyDocuments.view",
    "companyDocuments.download",
    "branches.view",
    "payments.view",
    "payments.export",
    "notifications.view",
    "reports.view",
    "reports.export",
    "files.view",
  ],
  HR: [
    "employees.view",
    "employees.create",
    "employees.edit",
    "employees.export",
    "employeeDocuments.view",
    "employeeDocuments.create",
    "employeeDocuments.edit",
    "employeeDocuments.download",
    "branches.view",
    "notifications.view",
    "reports.view",
    "reports.export",
    "files.view",
    "files.upload",
    "importExport.import",
    "importExport.export",
  ],
  Accountant: [
    "payments.view",
    "payments.create",
    "payments.edit",
    "payments.export",
    "companyDocuments.view",
    "branches.view",
    "reports.view",
    "reports.export",
    "files.view",
    "files.upload",
  ],
  Employee: ["notifications.view"],
  Viewer: [
    "employees.view",
    "employeeDocuments.view",
    "companyDocuments.view",
    "branches.view",
    "payments.view",
    "reports.view",
  ],
};
