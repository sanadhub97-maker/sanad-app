import { useState } from "react";
import { localized } from "@/lib/names";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertOctagon,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dashboardApi } from "@/api/dashboard";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { AppleIcon } from "@/components/common/apple-icon";
import { EmployeeDialog } from "@/pages/employees/employee-dialog";
import { BranchDialog } from "@/pages/branches/branch-dialog";
import { PaymentDialog } from "@/pages/payments/payment-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { DashboardOverview } from "@/pages/dashboard/dashboard-overview";

const STATUS_COLORS: Record<string, string> = {
  VALID: "#10B981",
  EXPIRING_SOON: "#F59E0B",
  EXPIRED: "#F43F5E",
};

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const { data: summary } = useQuery({
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
    <div className="space-y-6 pb-10">
      <DashboardOverview
        summary={summary}
        charts={charts}
        onAddEmployee={() => setEmployeeDialogOpen(true)}
        onAddBranch={() => setBranchDialogOpen(true)}
        onAddPayment={() => setPaymentDialogOpen(true)}
      />

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
                  <YAxis
                    dataKey="category"
                    type="category"
                    tick={{ fontSize: 11, fill: "currentColor", opacity: 0.7 }}
                    width={130}
                    tickFormatter={(val) => t(`paymentCategories.${val}`, { defaultValue: val })}
                  />
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
                {isAr ? "تحليل المدفوعات والمصروفات على مدار الـ 12 شهراً الماضية" : "Spending trend over the last 12 months"}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/payments")}
              className="h-8 rounded-lg text-xs font-semibold hover:bg-muted"
            >
              {isAr ? "سجل المدفوعات" : "View Payments"} <ArrowUpRight className="h-3.5 w-3.5 ms-1" />
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
            {(recent?.recentEmployees ?? []).slice(0, 5).map((e: { id: string; fullNameEn?: string; fullNameAr: string; createdAt: string; jobTitle?: string; jobTitleEn?: string | null }) => {
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
                      {localized(e.jobTitle, e.jobTitleEn) ?? (isAr ? "موظف" : "Staff")}
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
