import {
  BookUser,
  Building2,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  HeartPulse,
  LayoutDashboard,
  BarChart3,
  Plane,
  ScrollText,
  Settings,
  ShieldPlus,
  Stamp,
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
  children?: { label: string; href: string; permission?: string }[];
}

export const NAV_ITEMS: NavItem[] = [
  // Overview
  { label: "nav.dashboard", href: "/", icon: LayoutDashboard, tone: "blue", section: "nav.overviewSection" },

  // Workforce
  {
    label: "nav.employees",
    href: "/employees",
    icon: Users,
    tone: "indigo",
    permission: "employees.view",
    section: "nav.workforceSection",
  },
  {
    label: "nav.iqamas",
    href: "/workforce/iqamas",
    icon: CreditCard,
    tone: "blue",
    permission: "employees.view",
    section: "nav.workforceSection",
  },
  {
    label: "nav.passports",
    href: "/workforce/passports",
    icon: BookUser,
    tone: "purple",
    permission: "employees.view",
    section: "nav.workforceSection",
  },
  {
    label: "nav.healthCertificates",
    href: "/workforce/health-certificates",
    icon: HeartPulse,
    tone: "emerald",
    permission: "employees.view",
    section: "nav.workforceSection",
  },
  {
    label: "nav.medicalInsurance",
    href: "/workforce/medical-insurance",
    icon: ShieldPlus,
    tone: "cyan",
    permission: "employees.view",
    section: "nav.workforceSection",
  },
  {
    label: "nav.visas",
    href: "/workforce/visas",
    icon: Stamp,
    tone: "amber",
    permission: "employees.view",
    section: "nav.workforceSection",
  },
  {
    label: "nav.flightTickets",
    href: "/workforce/flight-tickets",
    icon: Plane,
    tone: "rose",
    permission: "employees.view",
    section: "nav.workforceSection",
  },

  // Compliance & Assets
  { label: "nav.companyDocuments", href: "/company-documents", icon: FileText, tone: "amber", permission: "companyDocuments.view", section: "nav.complianceSection" },
  { label: "nav.branches", href: "/branches", icon: Building2, tone: "cyan", permission: "branches.view", section: "nav.complianceSection" },

  // Finance & Data
  { label: "nav.payments", href: "/payments", icon: Wallet, tone: "rose", permission: "payments.view", section: "nav.financeSection" },
  { label: "nav.reports", href: "/reports", icon: BarChart3, tone: "purple", permission: "reports.view", section: "nav.financeSection" },
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
  { label: "nav.settings", href: "/settings", icon: Settings, tone: "zinc", permission: "settings.view", section: "nav.systemSection" },
];
