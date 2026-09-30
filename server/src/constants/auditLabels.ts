import { L } from "@/services/lang";

/* Names of audit actions and system sections for printed reports, in both
   languages (the same as the client's i18n auditLogs.actions / moduleNames). */

const ACTIONS: Record<string, [string, string]> = {
  CREATE: ["إنشاء", "Create"],
  UPDATE: ["تعديل", "Update"],
  DELETE: ["حذف", "Delete"],
  IMPORT: ["استيراد", "Import"],
  EXPORT: ["تصدير", "Export"],
  DOWNLOAD: ["تنزيل", "Download"],
  LOGIN: ["تسجيل دخول", "Login"],
  LOGOUT: ["تسجيل خروج", "Logout"],
};

const MODULES: Record<string, [string, string]> = {
  tasks: ["المهام اليومية", "Daily Tasks"],
  employees: ["الموظفون", "Employees"],
  employeeDocuments: ["مستندات الموظفين", "Employee Documents"],
  companyDocuments: ["مستندات الشركة", "Company Documents"],
  licenses: ["التراخيص", "Licenses"],
  branches: ["المؤسسات والشركات", "Establishments & Companies"],
  payments: ["المدفوعات", "Payments"],
  notifications: ["الإشعارات", "Notifications"],
  reports: ["التقارير", "Reports"],
  files: ["مدير الملفات", "File Manager"],
  importExport: ["الاستيراد والتصدير", "Import/Export"],
  users: ["المستخدمون", "Users"],
  roles: ["الأدوار والصلاحيات", "Roles & Permissions"],
  settings: ["الإعدادات", "Settings"],
  auditLogs: ["سجل التدقيق", "Audit Logs"],
  auth: ["المصادقة", "Authentication"],
};

export const actionLabel = (a: string | null | undefined) => (a && ACTIONS[a] ? L(ACTIONS[a][0], ACTIONS[a][1]) : (a ?? "—"));
export const moduleLabel = (m: string | null | undefined) => (m && MODULES[m] ? L(MODULES[m][0], MODULES[m][1]) : (m ?? "—"));
