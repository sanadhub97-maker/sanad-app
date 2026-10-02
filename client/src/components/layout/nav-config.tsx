import {
  Building2,
  FileSpreadsheet,
  FileText,
  Files,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  BarChart3,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import type { AppleTone } from "@/components/common/apple-icon";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  tone?: AppleTone;
  permission?: string;
  section?: string;
  badge?: string;
  /** Short label for the bottom dock; items with one sit in the dock, the rest under "More". */
  dockLabel?: string;
  children?: { label: string; href: string; permission?: string }[];
}

export const NAV_ITEMS: NavItem[] = [
  // Overview
  { label: "nav.dashboard", href: "/", icon: LayoutDashboard, dockLabel: "nav.dock.home", tone: "blue", section: "nav.overviewSection" },
  { label: "nav.dailyTasks", href: "/daily-tasks", dockLabel: "nav.dock.tasks", icon: ListChecks, tone: "emerald", permission: "tasks.view", section: "nav.overviewSection" },

  // Workforce
  {
    label: "nav.employees",
    href: "/employees", dockLabel: "nav.dock.employees",
    icon: Users,
    tone: "indigo",
    permission: "employees.view",
    section: "nav.workforceSection",
  },
  {
    label: "nav.employeeDocuments",
    href: "/employee-documents", dockLabel: "nav.dock.documents",
    icon: Files,
    tone: "blue",
    permission: "employees.view",
    section: "nav.workforceSection",
  },

  // Compliance & Assets
  { label: "nav.companyDocuments", href: "/company-documents", icon: FileText, tone: "amber", permission: "companyDocuments.view", section: "nav.complianceSection" },
  { label: "nav.branches", href: "/branches", dockLabel: "nav.dock.branches", icon: Building2, tone: "cyan", permission: "branches.view", section: "nav.complianceSection" },

  // Finance & Data
  { label: "nav.payments", href: "/payments", dockLabel: "nav.dock.payments", icon: Wallet, tone: "rose", permission: "payments.view", section: "nav.financeSection" },
  { label: "nav.reports", href: "/reports", dockLabel: "nav.dock.reports", icon: BarChart3, tone: "purple", permission: "reports.view", section: "nav.financeSection" },
  { label: "nav.importExport", href: "/import-export", icon: FileSpreadsheet, tone: "teal", permission: "importExport.import", section: "nav.financeSection" },
  { label: "nav.fileManager", href: "/files", icon: FolderOpen, tone: "sky", permission: "files.view", section: "nav.financeSection" },

  // System Administration
  {
    label: "nav.users",
    href: "/users",
    icon: UserCog,
    tone: "emerald",
    permission: "users.view",
    section: "nav.systemSection",
    children: [
      { label: "nav.users", href: "/users", permission: "users.view" },
      { label: "nav.rolesPermissions", href: "/roles", permission: "roles.view" },
    ],
  },
  { label: "nav.auditLogs", href: "/audit-logs", icon: ScrollText, tone: "slate", permission: "auditLogs.view", section: "nav.systemSection" },
  { label: "nav.maintenance", href: "/maintenance", icon: ShieldCheck, tone: "teal", section: "nav.systemSection" },
  { label: "nav.settings", href: "/settings", icon: Settings, tone: "zinc", permission: "settings.view", section: "nav.systemSection" },
];
