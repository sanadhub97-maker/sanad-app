import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Area,
} from "recharts";
import {
  Users,
  FileText,
  Wallet,
  TrendingUp,
  Plus,
  FileBarChart,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertOctagon,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Activity,
  CreditCard,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardApi } from "@/api/dashboard";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { AppleIcon, type AppleTone } from "@/components/common/apple-icon";
import { EmployeeDialog } from "@/pages/employees/employee-dialog";
import { BranchDialog } from "@/pages/branches/branch-dialog";
import { PaymentDialog } from "@/pages/payments/payment-dialog";
import { EmptyState } from "@/components/common/empty-state";

const STATUS_COLORS: Record<string, string> = {
  VALID: "#10B981",
  EXPIRING_SOON: "#F59E0B",
  EXPIRED: "#F43F5E",
};

interface KpiCardProps {
  icon: typeof Users;
  label: string;
  value: string | number;
  subtext?: string;
  tone: AppleTone;
  onClick?: () => void;
}

const TONE_STYLES: Record<
  string,
  {
    cardBg: string;
    border: string;
    glow: string;
    orb: string;
    dot: string;
    badge: string;
  }
> = {
  blue: {
    cardBg: "bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-card dark:from-[#0B1736]/90 dark:via-[#091228]/85 dark:to-[#060B1A]/95",
    border: "border-blue-200/90 dark:border-blue-500/30 hover:border-blue-400 dark:hover:border-blue-400/80",
    glow: "shadow-[0_4px_20px_-4px_rgba(59,130,246,0.14)] hover:shadow-[0_14px_35px_-6px_rgba(59,130,246,0.35)] dark:shadow-[0_4px_24px_-4px_rgba(59,130,246,0.2)] dark:hover:shadow-[0_16px_40px_-6px_rgba(59,130,246,0.45)]",
    orb: "bg-blue-500/25 to-sky-500/15",
    dot: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.9)]",
    badge: "text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/20",
  },
  emerald: {
    cardBg: "bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-card dark:from-[#08221D]/90 dark:via-[#071916]/85 dark:to-[#050E0C]/95",
    border: "border-emerald-200/90 dark:border-emerald-500/30 hover:border-emerald-400 dark:hover:border-emerald-400/80",
    glow: "shadow-[0_4px_20px_-4px_rgba(16,185,129,0.14)] hover:shadow-[0_14px_35px_-6px_rgba(16,185,129,0.35)] dark:shadow-[0_4px_24px_-4px_rgba(16,185,129,0.2)] dark:hover:shadow-[0_16px_40px_-6px_rgba(16,185,129,0.45)]",
    orb: "bg-emerald-500/25 to-teal-500/15",
    dot: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)]",
    badge: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  },
  purple: {
    cardBg: "bg-gradient-to-br from-purple-50/90 via-fuchsia-50/40 to-card dark:from-[#1E0D36]/90 dark:via-[#160A28]/85 dark:to-[#0A0515]/95",
    border: "border-purple-200/90 dark:border-purple-500/30 hover:border-purple-400 dark:hover:border-purple-400/80",
    glow: "shadow-[0_4px_20px_-4px_rgba(168,85,247,0.14)] hover:shadow-[0_14px_35px_-6px_rgba(168,85,247,0.35)] dark:shadow-[0_4px_24px_-4px_rgba(168,85,247,0.2)] dark:hover:shadow-[0_16px_40px_-6px_rgba(168,85,247,0.45)]",
    orb: "bg-purple-500/25 to-fuchsia-500/15",
    dot: "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.9)]",
    badge: "text-purple-700 dark:text-purple-300 bg-purple-500/10 border-purple-500/20",
  },
  teal: {
    cardBg: "bg-gradient-to-br from-teal-50/90 via-emerald-50/40 to-card dark:from-[#062224]/90 dark:via-[#05191B]/85 dark:to-[#030E0F]/95",
    border: "border-teal-200/90 dark:border-teal-500/30 hover:border-teal-400 dark:hover:border-teal-400/80",
    glow: "shadow-[0_4px_20px_-4px_rgba(20,184,166,0.14)] hover:shadow-[0_14px_35px_-6px_rgba(20,184,166,0.35)] dark:shadow-[0_4px_24px_-4px_rgba(20,184,166,0.2)] dark:hover:shadow-[0_16px_40px_-6px_rgba(20,184,166,0.45)]",
    orb: "bg-teal-500/25 to-cyan-500/15",
    dot: "bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.9)]",
    badge: "text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/20",
  },
  amber: {
    cardBg: "bg-gradient-to-br from-amber-50/90 via-yellow-50/40 to-card dark:from-[#2B1805]/90 dark:via-[#201204]/85 dark:to-[#120902]/95",
    border: "border-amber-200/90 dark:border-amber-500/30 hover:border-amber-400 dark:hover:border-amber-400/80",
    glow: "shadow-[0_4px_20px_-4px_rgba(245,158,11,0.14)] hover:shadow-[0_14px_35px_-6px_rgba(245,158,11,0.35)] dark:shadow-[0_4px_24px_-4px_rgba(245,158,11,0.2)] dark:hover:shadow-[0_16px_40px_-6px_rgba(245,158,11,0.45)]",
    orb: "bg-amber-500/25 to-orange-500/15",
    dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.9)]",
    badge: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20",
  },
  rose: {
    cardBg: "bg-gradient-to-br from-rose-50/90 via-red-50/40 to-card dark:from-[#2E0B15]/90 dark:via-[#22080F]/85 dark:to-[#140408]/95",
    border: "border-rose-200/90 dark:border-rose-500/30 hover:border-rose-400 dark:hover:border-rose-400/80",
    glow: "shadow-[0_4px_20px_-4px_rgba(244,63,94,0.14)] hover:shadow-[0_14px_35px_-6px_rgba(244,63,94,0.35)] dark:shadow-[0_4px_24px_-4px_rgba(244,63,94,0.2)] dark:hover:shadow-[0_16px_40px_-6px_rgba(244,63,94,0.45)]",
    orb: "bg-rose-500/25 to-red-500/15",
    dot: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]",
    badge: "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20",
  },
  indigo: {
    cardBg: "bg-gradient-to-br from-indigo-50/90 via-blue-50/40 to-card dark:from-[#131138]/90 dark:via-[#0F0D2B]/85 dark:to-[#080718]/95",
    border: "border-indigo-200/90 dark:border-indigo-500/30 hover:border-indigo-400 dark:hover:border-indigo-400/80",
    glow: "shadow-[0_4px_20px_-4px_rgba(99,102,241,0.14)] hover:shadow-[0_14px_35px_-6px_rgba(99,102,241,0.35)] dark:shadow-[0_4px_24px_-4px_rgba(99,102,241,0.2)] dark:hover:shadow-[0_16px_40px_-6px_rgba(99,102,241,0.45)]",
    orb: "bg-indigo-500/25 to-purple-500/15",
    dot: "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.9)]",
    badge: "text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/20",
  },
  cyan: {
    cardBg: "bg-gradient-to-br from-cyan-50/90 via-sky-50/40 to-card dark:from-[#06202E]/90 dark:via-[#051722]/85 dark:to-[#030D14]/95",
    border: "border-cyan-200/90 dark:border-cyan-500/30 hover:border-cyan-400 dark:hover:border-cyan-400/80",
    glow: "shadow-[0_4px_20px_-4px_rgba(6,182,212,0.14)] hover:shadow-[0_14px_35px_-6px_rgba(6,182,212,0.35)] dark:shadow-[0_4px_24px_-4px_rgba(6,182,212,0.2)] dark:hover:shadow-[0_16px_40px_-6px_rgba(6,182,212,0.45)]",
    orb: "bg-cyan-500/25 to-blue-500/15",
    dot: "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.9)]",
    badge: "text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
  },
};

function KpiCard({ icon: Icon, label, value, subtext, tone, onClick }: KpiCardProps) {
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.blue;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 backdrop-blur-md specular-border",
        styles.cardBg,
        styles.border,
        styles.glow,
        onClick ? "cursor-pointer" : ""
      )}
    >
      {/* Top Glass Specular Rim Line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />

      {/* Decorative Ambient Glowing Orb */}
      <div
        className={cn(
          "pointer-events-none absolute -bottom-10 -start-10 h-32 w-32 rounded-full blur-2xl transition-all duration-500 opacity-40 group-hover:opacity-80 group-hover:scale-125",
          styles.orb
        )}
      />

      {/* Top Row: Label & Apple Icon */}
      <div className="relative z-10 flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white/80 dark:ring-black/40", styles.dot)} />
          <p className="text-xs font-bold text-muted-foreground/90 truncate tracking-tight">{label}</p>
        </div>
        <AppleIcon
          icon={Icon}
          tone={tone}
          size="md"
          className="shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm"
        />
      </div>

      {/* Middle: Prominent Metric Value */}
      <div className="relative z-10 space-y-2">
        <p className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-sans group-hover:translate-x-0.5 transition-transform duration-200">
          {value}
        </p>

        {/* Footer Row: Subtext & Action affordance */}
        {subtext && (
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground/80 pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
            <span className="truncate">{subtext}</span>
            {onClick && (
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-foreground" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Custom Glassmorphic Chart Tooltip
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomChartTooltip({ active, payload, label, formatter }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-luxury backdrop-blur-md specular-border">
        {label && <p className="text-xs font-bold text-foreground mb-1.5">{label}</p>}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 text-xs py-0.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? entry.fill }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-bold text-foreground font-mono">
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: dashboardApi.summary,
  });
  const { data: widget } = useQuery({
    queryKey: ["dashboard", "widget"],
    queryFn: dashboardApi.expirationWidget,
  });
  const { data: charts } = useQuery({
    queryKey: ["dashboard", "charts"],
    queryFn: dashboardApi.charts,
  });
  const { data: recent } = useQuery({
    queryKey: ["dashboard", "recent"],
    queryFn: dashboardApi.recentActivity,
  });

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (isAr) {
      if (hour < 12) return "صباح الخير والبركة ☀️";
      if (hour < 17) return "طاب نهارك 🌤️";
      return "مساء الخير والازدهار 🌙";
    }
    if (hour < 12) return "Good morning ☀️";
    if (hour < 17) return "Good afternoon 🌤️";
    return "Good evening 🌙";
  }, [isAr]);

  // Formatted date string
  const todayDateString = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString();
    }
  }, [isAr]);

  const widgetEntries = widget
    ? [
        {
          key: "expired",
          label: t("dashboard.widget.expired"),
          value: widget.expired,
          icon: AlertOctagon,
          tone: "rose" as const,
          cardBg: "bg-gradient-to-br from-rose-50/90 via-red-50/30 to-card dark:from-rose-950/40 dark:via-rose-900/15 dark:to-card/90",
          border: "border-rose-200/90 dark:border-rose-800/60 hover:border-rose-400 dark:hover:border-rose-400",
          glow: "shadow-[0_4px_16px_-3px_rgba(244,63,94,0.14)] hover:shadow-[0_12px_28px_-4px_rgba(244,63,94,0.3)]",
          valColor: "text-rose-600 dark:text-rose-400",
        },
        {
          key: "today",
          label: t("dashboard.widget.today"),
          value: widget.today,
          icon: AlertTriangle,
          tone: "amber" as const,
          cardBg: "bg-gradient-to-br from-orange-50/90 via-amber-50/30 to-card dark:from-orange-950/40 dark:via-orange-900/15 dark:to-card/90",
          border: "border-orange-200/90 dark:border-orange-800/60 hover:border-orange-400 dark:hover:border-orange-400",
          glow: "shadow-[0_4px_16px_-3px_rgba(249,115,22,0.14)] hover:shadow-[0_12px_28px_-4px_rgba(249,115,22,0.3)]",
          valColor: "text-orange-600 dark:text-orange-400",
        },
        {
          key: "within7",
          label: t("dashboard.widget.within7"),
          value: widget.within7,
          icon: Clock,
          tone: "amber" as const,
          cardBg: "bg-gradient-to-br from-amber-50/90 via-yellow-50/30 to-card dark:from-amber-950/40 dark:via-amber-900/15 dark:to-card/90",
          border: "border-amber-200/90 dark:border-amber-800/60 hover:border-amber-400 dark:hover:border-amber-400",
          glow: "shadow-[0_4px_16px_-3px_rgba(245,158,11,0.14)] hover:shadow-[0_12px_28px_-4px_rgba(245,158,11,0.3)]",
          valColor: "text-amber-600 dark:text-amber-400",
        },
        {
          key: "within30",
          label: t("dashboard.widget.within30"),
          value: widget.within30,
          icon: Clock,
          tone: "purple" as const,
          cardBg: "bg-gradient-to-br from-purple-50/90 via-fuchsia-50/30 to-card dark:from-purple-950/40 dark:via-purple-900/15 dark:to-card/90",
          border: "border-purple-200/90 dark:border-purple-800/60 hover:border-purple-400 dark:hover:border-purple-400",
          glow: "shadow-[0_4px_16px_-3px_rgba(168,85,247,0.14)] hover:shadow-[0_12px_28px_-4px_rgba(168,85,247,0.3)]",
          valColor: "text-purple-600 dark:text-purple-400",
        },
        {
          key: "within60",
          label: t("dashboard.widget.within60"),
          value: widget.within60,
          icon: ShieldCheck,
          tone: "blue" as const,
          cardBg: "bg-gradient-to-br from-blue-50/90 via-sky-50/30 to-card dark:from-blue-950/40 dark:via-blue-900/15 dark:to-card/90",
          border: "border-blue-200/90 dark:border-blue-800/60 hover:border-blue-400 dark:hover:border-blue-400",
          glow: "shadow-[0_4px_16px_-3px_rgba(59,130,246,0.14)] hover:shadow-[0_12px_28px_-4px_rgba(59,130,246,0.3)]",
          valColor: "text-blue-600 dark:text-blue-400",
        },
        {
          key: "within90",
          label: t("dashboard.widget.within90"),
          value: widget.within90,
          icon: CheckCircle2,
          tone: "teal" as const,
          cardBg: "bg-gradient-to-br from-teal-50/90 via-emerald-50/30 to-card dark:from-teal-950/40 dark:via-teal-900/15 dark:to-card/90",
          border: "border-teal-200/90 dark:border-teal-800/60 hover:border-teal-400 dark:hover:border-teal-400",
          glow: "shadow-[0_4px_16px_-3px_rgba(20,184,166,0.14)] hover:shadow-[0_12px_28px_-4px_rgba(20,184,166,0.3)]",
          valColor: "text-teal-600 dark:text-teal-400",
        },
      ]
    : [];

  return (
    <div className="space-y-8 pb-10">
      {/* 🌟 Hero Executive Command Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-gradient-to-r from-[#070D1F] via-[#0E1B3D] to-[#070D1F] p-6 sm:p-8 text-white shadow-2xl shadow-blue-950/40 specular-border backdrop-blur-2xl"
      >
        {/* Top Glass Specular Rim Line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        {/* Subtle background ambient mesh glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />

        <div className="relative z-10 space-y-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-300 backdrop-blur-md border border-white/10">
                <Calendar className="h-3.5 w-3.5" /> {todayDateString}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isAr ? "نظام SanaD متصل ومحدث" : "SanaD Enterprise Connected"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white font-sans leading-tight">
              {greeting}، {user?.fullName?.split(" ")[0] ?? (isAr ? "مدير النظام" : "Administrator")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed font-normal">
              {isAr
                ? "مرحباً بك في مركز القيادة والعمليات التنفيذي لنظام SanaD. يمكنك متابعة وثائق الموظفين، التراخيص الحكومية، والمصروفات بدقة استباقية ولحظياً."
                : "Welcome to your executive operations command center. Monitor workforce compliance, official company licenses, and payments in real time."}
            </p>
          </div>

          {/* Quick Action Dock */}
          <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-white/[0.08]">
            {/* 1. إضافة موظف */}
            <Button
              onClick={() => setEmployeeDialogOpen(true)}
              className="h-11 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-xs sm:text-sm px-4 sm:px-5 specular-border"
            >
              <Plus className="h-4 w-4 me-1.5 stroke-[2.5]" /> {t("dashboard.addEmployee")}
            </Button>

            {/* 2. إضافة شركة أو مؤسسة */}
            <Button
              onClick={() => setBranchDialogOpen(true)}
              className="h-11 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-600/30 via-emerald-500/20 to-teal-600/30 hover:bg-emerald-500/40 text-emerald-300 hover:text-white shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-xs sm:text-sm px-4 backdrop-blur-md"
            >
              <Building2 className="h-4 w-4 me-1.5 text-emerald-400 stroke-[2.5]" />
              {isAr ? "+ إضافة شركة أو مؤسسة" : "+ Add Company / Branch"}
            </Button>

            {/* 3. إضافة دفعة */}
            <Button
              onClick={() => setPaymentDialogOpen(true)}
              className="h-11 rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-600/30 via-pink-500/20 to-rose-600/30 hover:bg-rose-500/40 text-rose-300 hover:text-white shadow-lg shadow-rose-500/15 hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-xs sm:text-sm px-4 backdrop-blur-md"
            >
              <CreditCard className="h-4 w-4 me-1.5 text-rose-400 stroke-[2.5]" />
              {isAr ? "+ إضافة دفعة" : "+ Add Payment"}
            </Button>

            {/* 4. مستندات الموظفون */}
            <Button
              variant="outline"
              onClick={() => navigate("/employee-documents")}
              className="h-11 rounded-xl border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-white backdrop-blur-md font-bold text-xs sm:text-sm px-4 transition-all"
            >
              <Users className="h-4 w-4 me-1.5 text-cyan-400" />
              {isAr ? "مستندات الموظفون" : "Employee Documents"}
            </Button>

            {/* 5. مستندات الشركة */}
            <Button
              variant="outline"
              onClick={() => navigate("/company-documents")}
              className="h-11 rounded-xl border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-white backdrop-blur-md font-bold text-xs sm:text-sm px-4 transition-all"
            >
              <FileText className="h-4 w-4 me-1.5 text-amber-400" /> {t("nav.companyDocuments")}
            </Button>

            {/* 6. التقارير */}
            <Button
              variant="outline"
              onClick={() => navigate("/reports")}
              className="h-11 rounded-xl border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:text-white backdrop-blur-md font-bold text-xs sm:text-sm px-4 transition-all"
            >
              <FileBarChart className="h-4 w-4 me-1.5 text-purple-400" /> {t("dashboard.reports")}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 📊 8 Executive KPI Metric Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              {isAr ? "المؤشرات الإحصائية الحيوية" : "Key Performance Metrics"}
            </h2>
          </div>
        </div>

        {loadingSummary ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <KpiCard
              icon={Users}
              label={t("dashboard.kpi.totalEmployees")}
              value={summary?.totalEmployees ?? 0}
              subtext={isAr ? "إجمالي القوى العاملة" : "Total workforce"}
              tone="blue"
              onClick={() => navigate("/employees")}
            />
            <KpiCard
              icon={Users}
              label={t("dashboard.kpi.activeEmployees")}
              value={summary?.activeEmployees ?? 0}
              subtext={isAr ? "على رأس العمل" : "Active on duty"}
              tone="emerald"
              onClick={() => navigate("/employees")}
            />
            <KpiCard
              icon={FileText}
              label={t("dashboard.kpi.companyDocuments")}
              value={summary?.totalCompanyDocuments ?? 0}
              subtext={isAr ? "وثائق رسمية مسجلة" : "Official registered docs"}
              tone="purple"
              onClick={() => navigate("/company-documents")}
            />
            <KpiCard
              icon={ShieldCheck}
              label={t("dashboard.kpi.validDocuments")}
              value={summary?.validDocuments ?? 0}
              subtext={isAr ? "سارية ومكتملة" : "Valid & compliant"}
              tone="teal"
              onClick={() => navigate("/reports?tab=documents&status=VALID")}
            />
            <KpiCard
              icon={AlertTriangle}
              label={t("dashboard.kpi.expiringSoon")}
              value={summary?.expiringDocuments ?? 0}
              subtext={isAr ? "تتطلب التجديد قريباً" : "Needs renewal soon"}
              tone="amber"
              onClick={() => navigate("/reports?tab=documents&status=EXPIRING_SOON")}
            />
            <KpiCard
              icon={AlertOctagon}
              label={t("dashboard.kpi.expired")}
              value={summary?.expiredDocuments ?? 0}
              subtext={isAr ? "منتهية - إجراء فوري" : "Expired - action required"}
              tone="rose"
              onClick={() => navigate("/reports?tab=documents&status=EXPIRED")}
            />
            <KpiCard
              icon={Wallet}
              label={t("dashboard.kpi.totalPayments")}
              value={formatCurrency(summary?.totalPaymentsAmount)}
              subtext={isAr ? "إجمالي المصروفات المسجلة" : "All-time expenses"}
              tone="indigo"
              onClick={() => navigate("/payments")}
            />
            <KpiCard
              icon={TrendingUp}
              label={t("dashboard.kpi.thisMonth")}
              value={formatCurrency(summary?.monthlyPaymentsAmount)}
              subtext={isAr ? "دفعات الشهر الحالي" : "Current month expenses"}
              tone="cyan"
              onClick={() => navigate("/payments")}
            />
          </div>
        )}
      </div>

      {/* ⚠️ Expiration Radar Widget */}
      <Card className="rounded-3xl border-border/70 overflow-hidden shadow-luxury bg-card/85 backdrop-blur-md specular-border">
        <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">
                  {t("dashboard.widget.title")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAr
                    ? "رادار زمني استباقي لمتابعة الإقامات والجوازات والتراخيص قبل استحقاق التجديد"
                    : "Proactive countdown radar for Iqamas, passports, and official licenses"}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/reports?tab=documents")}
              className="h-8 rounded-lg text-xs font-semibold hover:bg-muted"
            >
              {isAr ? "عرض تقرير الصلاحيات" : "View Expiration Report"} <ArrowUpRight className="h-3.5 w-3.5 ms-1" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {widgetEntries.map((w) => {
              const Icon = w.icon;
              return (
                <button
                  key={w.key}
                  onClick={() => navigate(`/reports?tab=documents&window=${w.key}`)}
                  className={cn(
                    "group relative flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all duration-300 hover:-translate-y-1.5 overflow-hidden specular-border backdrop-blur-md",
                    w.cardBg,
                    w.border,
                    w.glow
                  )}
                >
                  {/* Top glass specular rim line */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />
                  
                  <AppleIcon
                    icon={Icon}
                    tone={w.tone}
                    size="xs"
                    className="mb-2.5 group-hover:scale-110 transition-transform duration-300 shadow-sm"
                  />
                  <p className={`text-2xl sm:text-3xl font-black tracking-tight font-sans ${w.valColor} group-hover:scale-105 transition-transform`}>
                    {w.value}
                  </p>
                  <p className="text-xs font-bold text-muted-foreground/90 mt-1 truncate w-full tracking-tight">
                    {w.label}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 📈 Analytics Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Documents by Status (Donut) */}
        <Card className="rounded-3xl shadow-luxury border-border/70 bg-card/85 backdrop-blur-md specular-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>{t("dashboard.charts.documentsByStatus")}</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription className="text-xs">
              {isAr ? "نسبة الوثائق حسب حالتها النظامية" : "Breakdown by compliance status"}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            {(charts?.documentsByStatus ?? []).some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts?.documentsByStatus ?? []}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {(charts?.documentsByStatus ?? []).map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] ?? "#3B82F6"}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomChartTooltip />} />
                  <Legend
                    formatter={(val) => t(`status.${val}`, { defaultValue: val })}
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={FileText}
                title={isAr ? "لا توجد وثائق بعد" : "No documents yet"}
                className="h-full border-none bg-transparent py-0"
              />
            )}
          </CardContent>
        </Card>

        {/* Employees by Status (Bar) */}
        <Card className="rounded-3xl shadow-luxury border-border/70 bg-card/85 backdrop-blur-md specular-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>{t("dashboard.charts.employeesByStatus")}</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription className="text-xs">
              {isAr ? "توزيع الموظفين حسب الحالة الوظيفية" : "Employees by employment state"}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            {(charts?.employeesByStatus ?? []).some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.employeesByStatus ?? []}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop stopColor="#3B82F6" stopOpacity={0.9} />
                      <stop offset="1" stopColor="#1D4ED8" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                    tickFormatter={(val) => t(`status.${val}`, { defaultValue: val })}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} />
                  <RechartsTooltip
                    content={<CustomChartTooltip />}
                    labelFormatter={(val) => t(`status.${val}`, { defaultValue: val })}
                  />
                  <Bar dataKey="count" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={Users}
                title={isAr ? "لا يوجد موظفون بعد" : "No employees yet"}
                className="h-full border-none bg-transparent py-0"
              />
            )}
          </CardContent>
        </Card>

        {/* Payments by Category (Horizontal Bar) */}
        <Card className="rounded-3xl shadow-luxury border-border/70 bg-card/85 backdrop-blur-md specular-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>{t("dashboard.charts.paymentsByCategory")}</span>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription className="text-xs">
              {isAr ? "توزيع المصروفات حسب التصنيف المالي" : "Expenses by assigned category"}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            {(charts?.paymentsByCategory ?? []).some((d) => d.total > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.paymentsByCategory ?? []} layout="vertical" margin={{ left: 15, right: 15 }}>
                  <defs>
                    <linearGradient id="catGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop stopColor="#4F46E5" stopOpacity={0.9} />
                      <stop offset="1" stopColor="#06B6D4" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.7 }} width={100} />
                  <RechartsTooltip content={<CustomChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                  <Bar dataKey="total" fill="url(#catGrad)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={Wallet}
                title={isAr ? "لا توجد مدفوعات بعد" : "No payments yet"}
                className="h-full border-none bg-transparent py-0"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 📅 Monthly Payments Trend Line Chart */}
      <Card className="rounded-3xl shadow-luxury border-border/70 bg-card/85 backdrop-blur-md specular-border">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold">
                {t("dashboard.charts.monthlyPayments")}
              </CardTitle>
              <CardDescription className="text-xs">
                {isAr ? "تحليل الدفعات والمصروفات على مدار الـ 12 شهراً الماضية" : "Spending trend over the last 12 months"}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/payments")}
              className="h-8 rounded-lg text-xs font-semibold hover:bg-muted"
            >
              {isAr ? "سجل الدفعات" : "View Payments"} <ArrowUpRight className="h-3.5 w-3.5 ms-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="h-72 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts?.monthlyPayments ?? []} margin={{ left: 10, right: 10 }}>
              <defs>
                <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="1" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString(isAr ? "ar-SA" : undefined, { month: "short" })}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <RechartsTooltip
                content={<CustomChartTooltip formatter={(v: number) => formatCurrency(v)} />}
                labelFormatter={(v) => new Date(v as string).toLocaleDateString(isAr ? "ar-SA" : undefined, { year: "numeric", month: "long" })}
              />
              <Area type="monotone" dataKey="total" fill="url(#lineGlow)" stroke="none" />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, fill: "#2563EB", stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 👥 Activity & Recent Streams */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Employees */}
        <Card className="rounded-3xl shadow-luxury border-border/70 bg-card/85 backdrop-blur-md specular-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {t("dashboard.recent.employees")}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/employees")}
                className="h-7 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                {isAr ? "عرض الكل" : "View all"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {(recent?.recentEmployees ?? []).slice(0, 5).map((e: { id: string; fullNameEn?: string; fullNameAr: string; createdAt: string; jobTitle?: string }) => {
              const name = isAr ? (e.fullNameAr || e.fullNameEn) : (e.fullNameEn || e.fullNameAr);
              const initials = name?.split(" ").slice(0, 2).map((p: string) => p[0]).join("") ?? "U";
              return (
                <button
                  key={e.id}
                  onClick={() => navigate(`/employees/${e.id}`)}
                  className="group flex w-full items-center gap-3 rounded-xl p-2.5 transition-all hover:bg-muted/60 text-start"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {e.jobTitle ?? (isAr ? "موظف" : "Staff")}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/80 shrink-0">
                    {formatDateTime(e.createdAt)}
                  </span>
                </button>
              );
            })}
            {(!recent || recent.recentEmployees.length === 0) && (
              <p className="p-4 text-center text-xs text-muted-foreground">
                {t("dashboard.recent.noEmployees")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="rounded-3xl shadow-luxury border-border/70 bg-card/85 backdrop-blur-md specular-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-500" />
                {t("dashboard.recent.payments")}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/payments")}
                className="h-7 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                {isAr ? "عرض الكل" : "View all"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {(recent?.recentPayments ?? []).slice(0, 5).map((p: { id: string; paymentNumber: string; total: number; createdAt: string; category?: string }) => (
              <button
                key={p.id}
                onClick={() => navigate("/payments")}
                className="group flex w-full items-center justify-between gap-2 rounded-xl p-2.5 transition-all hover:bg-muted/60 text-start"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {p.paymentNumber}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateTime(p.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
                  {formatCurrency(p.total)}
                </span>
              </button>
            ))}
            {(!recent || recent.recentPayments.length === 0) && (
              <p className="p-4 text-center text-xs text-muted-foreground">
                {t("dashboard.recent.noPayments")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Live Activity Stream */}
        <Card className="rounded-3xl shadow-luxury border-border/70 bg-card/85 backdrop-blur-md specular-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-500" />
                {t("dashboard.recent.activity")}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/audit-logs")}
                className="h-7 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                {isAr ? "سجل التدقيق" : "Audit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {(recent?.recentActivities ?? []).slice(0, 5).map((a: { id: string; description?: string; action: string; module: string; user?: { fullName: string }; createdAt?: string }) => (
              <div
                key={a.id}
                className="flex items-start gap-2.5 rounded-xl p-2 transition-colors hover:bg-muted/40"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <span className="font-bold text-foreground">
                    {a.user?.fullName ?? (isAr ? "النظام" : "System")}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {a.description ?? `${a.action.toLowerCase()} ${a.module}`}
                  </span>
                </div>
              </div>
            ))}
            {(!recent || recent.recentActivities.length === 0) && (
              <p className="p-4 text-center text-xs text-muted-foreground">
                {t("dashboard.recent.noActivity")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 🚀 Seamless Quick-Add Employee Dialog right from Dashboard */}
      <EmployeeDialog
        open={employeeDialogOpen}
        onOpenChange={setEmployeeDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />

      {/* 🏢 Quick-Add Branch / Company Dialog */}
      <BranchDialog
        open={branchDialogOpen}
        onOpenChange={setBranchDialogOpen}
      />

      {/* 💳 Quick-Add Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
      />
    </div>
  );
}
