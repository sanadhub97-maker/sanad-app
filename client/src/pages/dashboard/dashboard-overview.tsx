import { useId, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  IdCard,
  ListChecks,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppleIcon, type AppleTone } from "@/components/common/apple-icon";
import { dashboardApi, type DashboardAttentionItem, type DashboardCharts, type DashboardSummary } from "@/api/dashboard";
import { tasksApi } from "@/api/tasks";
import { settingsApi } from "@/api/settings";
import { useAuthStore } from "@/stores/authStore";
import { cn, formatCurrency } from "@/lib/utils";

/* The top of the dashboard in the "Royal" design: greeting banner and
   compliance ring, four KPI cards, what needs attention next to today's
   tasks, then expiries over the coming months and documents by type. */

const RING = ["#e9c46a", "#00b1ef"] as const; // gold → logo blue
const AVATARS = [
  ["#5b8def", "#3b5bdb"],
  ["#f59f00", "#e8590c"],
  ["#20c997", "#0ca678"],
  ["#cc5de8", "#9c36b5"],
  ["#ff6b6b", "#e03131"],
] as const;

function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAr(n: number) {
  return n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يومًا`;
}

function Panel({ className, children, rule }: { className?: string; children: ReactNode; rule?: string }) {
  return (
    <section
      style={rule ? { borderTopColor: rule } : undefined}
      className={cn(
        "relative min-w-0 rounded-[20px] border border-[var(--glass-edge)] bg-card bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[var(--glass-shadow)] backdrop-blur-2xl",
        rule && "border-t-2",
        className
      )}
    >
      {children}
    </section>
  );
}

function PanelHead({ icon, tone, title, action }: { icon: typeof Users; tone: AppleTone; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-2.5 font-head text-[15px] font-bold text-foreground">
        <AppleIcon icon={icon} tone={tone} size="xs" />
        {title}
      </h3>
      {action}
    </div>
  );
}

function LinkAction({ label, onClick }: { label: string; onClick: () => void }) {
  const { i18n } = useTranslation();
  const Arrow = i18n.language === "ar" ? ChevronLeft : ChevronRight;
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-[#0a7fb5] dark:text-[#5ccdf5] hover:underline">
      {label}
      <Arrow className="h-3.5 w-3.5" />
    </button>
  );
}

type PillTone = "ok" | "warn" | "bad" | "info";
const PILL: Record<PillTone, string> = {
  ok: "text-success bg-success/15",
  warn: "text-warning bg-warning/15",
  bad: "text-destructive bg-destructive/15",
  info: "text-[#0a7fb5] dark:text-[#5ccdf5] bg-[#00b1ef]/15",
};
function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", PILL[tone])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function Ring({ pct, size, label, sub }: { pct: number; size: number; label: string; sub?: string }) {
  const id = useId();
  const stroke = 12;
  const r = (100 - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className="shrink-0 text-foreground">
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={RING[0]} />
          <stop offset="1" stopColor={RING[1]} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={stroke} />
      {pct > 0 && (
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.min(1, pct)).toFixed(1)} ${c.toFixed(1)}`}
          transform="rotate(-90 50 50)"
          className="task-ring"
        />
      )}
      <text x="50" y={sub ? 52 : 57} textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor">
        {label}
      </text>
      {sub && (
        <text x="50" y="68" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".6">
          {sub}
        </text>
      )}
    </svg>
  );
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;
  const w = 90;
  const h = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - ((v - min) / Math.max(1, max - min)) * (h - 6)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" style={{ direction: "ltr" }}>
      <polyline points={pts} fill="none" stroke="#00b1ef" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Six-month area chart, drawn right-to-left in Arabic like the preview. */
function UpcomingChart({ values, labels, rtl }: { values: number[]; labels: string[]; rtl: boolean }) {
  const id = useId();
  const w = 640;
  const h = 190;
  const pad = 26;
  const max = Math.max(1, ...values);
  const step = (w - pad * 2) / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [rtl ? w - pad - i * step : pad + i * step, h - 32 - (v / max) * (h - 66)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full text-foreground" style={{ direction: "ltr" }} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}a`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={RING[1]} stopOpacity=".45" />
          <stop offset="1" stopColor={RING[1]} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}l`} x1={rtl ? "1" : "0"} x2={rtl ? "0" : "1"}>
          <stop offset="0" stopColor={RING[1]} />
          <stop offset="1" stopColor={RING[0]} />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={pad} x2={w - pad} y1={h - 32 - f * (h - 66)} y2={h - 32 - f * (h - 66)} stroke="currentColor" opacity=".08" />
      ))}
      <path d={`${line} L${last[0]} ${h - 32} L${pts[0][0]} ${h - 32} Z`} fill={`url(#${id}a)`} />
      <path d={line} fill="none" stroke={`url(#${id}l)`} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={labels[i]}>
          <circle cx={p[0]} cy={p[1]} r={3.5} fill={RING[1]} />
          <text x={p[0]} y={p[1] - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" opacity={values[i] ? 0.9 : 0.35}>
            {values[i]}
          </text>
          <text x={p[0]} y={h - 10} textAnchor="middle" fontSize="11" fill="currentColor" opacity=".55">
            {labels[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Kpi({
  rule,
  label,
  icon,
  tone,
  value,
  unit,
  footer,
  onClick,
}: {
  rule: string;
  label: string;
  icon: typeof Users;
  tone: AppleTone;
  value: ReactNode;
  unit?: string;
  footer: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Panel rule={rule} className="p-0">
      <button type="button" onClick={onClick} className="grid w-full gap-2 px-[18px] py-4 text-start">
        <div className="flex items-center justify-between text-[13px] text-muted-foreground">
          <span>{label}</span>
          <AppleIcon icon={icon} tone={tone} size="sm" />
        </div>
        <div className="flex items-baseline gap-1.5 text-[34px] font-bold leading-none tracking-tight text-foreground tabular-nums">
          {value}
          {unit && <small className="text-[13px] font-medium tracking-normal text-muted-foreground">{unit}</small>}
        </div>
        <div className="flex min-h-7 items-center justify-between gap-2 text-xs text-muted-foreground">{footer}</div>
      </button>
    </Panel>
  );
}

export function DashboardOverview({
  summary,
  charts,
  onAddEmployee,
  onAddBranch,
  onAddPayment,
}: {
  summary?: DashboardSummary;
  charts?: DashboardCharts;
  onAddEmployee: () => void;
  onAddBranch: () => void;
  onAddPayment: () => void;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canTasks = hasPermission("tasks.view");
  const canAddTask = hasPermission("tasks.create");
  const today = localIso();

  const { data: overview, isLoading } = useQuery({ queryKey: ["dashboard", "overview"], queryFn: dashboardApi.overview });
  const { data: tasks } = useQuery({ queryKey: ["tasks", "day", today], queryFn: () => tasksApi.day(today), enabled: canTasks });
  const { data: mark } = useQuery({ queryKey: ["settings", "branding", "mark"], queryFn: settingsApi.getBrandingMark, staleTime: 30 * 60_000 });

  const addTask = useMutation({
    mutationFn: (item: DashboardAttentionItem) =>
      tasksApi.create({
        date: today,
        title: `تجديد ${item.documentAr} — ${item.nameAr}`,
        category: "documents",
        priority: item.days <= 0 ? "URGENT" : "HIGH",
        notes: item.documentNumber ? `رقم ${item.documentNumber}` : null,
        sourceKey: item.key,
      }),
    onSuccess: () => {
      toast.success(isAr ? "أُضيفت إلى مهام اليوم" : "Added to today's tasks");
      queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error(isAr ? "تعذّرت إضافة المهمة" : "Couldn't add the task"),
  });

  const locale = isAr ? "ar-EG-u-nu-latn" : "en-GB";
  const dateLine = useMemo(() => {
    const now = new Date();
    const g = now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    let h = "";
    try {
      h = now.toLocaleDateString(isAr ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      /* no Hijri calendar in this browser */
    }
    return h ? `${g} · ${h.replace(/\s*(هـ|AH)$/, "")} ${isAr ? "هـ" : "AH"}` : g;
  }, [locale, isAr]);

  const hour = new Date().getHours();
  const greeting = isAr ? (hour < 12 ? "صباح الخير" : "مساء الخير") : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.fullName ?? "";

  const tracked = summary?.totalTrackedDocuments ?? 0;
  const valid = summary?.validDocuments ?? 0;
  const score = tracked ? valid / tracked : 1;
  const scoreLabel = isAr
    ? score >= 0.9 ? "امتثال ممتاز" : score >= 0.6 ? "امتثال جيد" : "يحتاج متابعة"
    : score >= 0.9 ? "Excellent compliance" : score >= 0.6 ? "Good compliance" : "Needs follow-up";

  const taskList = tasks ?? [];
  const doneCount = taskList.filter((t) => t.done).length;

  // Payments: this month against last month, and a six-month spark line.
  const monthly = useMemo(() => {
    const byKey = new Map((charts?.monthlyPayments ?? []).map((m) => [String(m.month).slice(0, 7), m.total]));
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return byKey.get(localIso(d).slice(0, 7)) ?? 0;
    });
  }, [charts]);
  const thisMonth = summary?.monthlyPaymentsAmount ?? 0;
  const lastMonth = monthly[4];
  const change = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
  const noPaymentsYet = (summary?.totalPaymentsAmount ?? 0) === 0;

  const monthLabels = (overview?.upcoming ?? []).map((m) => {
    const [y, mo] = m.month.split("-").map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString(locale, { month: "short" });
  });

  const typeRows: [string, string, string, AppleTone][] = [
    ["IQAMA", "الإقامات", "Iqamas", "sky"],
    ["PASSPORT", "الجوازات", "Passports", "indigo"],
    ["HEALTH_CERTIFICATE", "الشهادات الصحية", "Health certificates", "emerald"],
    ["MEDICAL_INSURANCE", "التأمين الطبي", "Medical insurance", "orange"],
    ["COMPANY", "وثائق الشركة", "Company documents", "amber"],
    ["OTHER", "مستندات أخرى", "Other documents", "zinc"],
  ];
  const byType = overview?.byType ?? {};
  const shownTypes = typeRows.filter(([k], i) => i < 4 || (byType[k] ?? 0) > 0);

  const docState = (days: number): [PillTone, string] =>
    days < 0
      ? ["bad", isAr ? `منتهية منذ ${daysAr(-days)}` : `Expired ${-days}d ago`]
      : days === 0
        ? ["bad", isAr ? "تنتهي اليوم" : "Expires today"]
        : ["warn", isAr ? `باقي ${daysAr(days)}` : `${days}d left`];

  const openItem = (item: DashboardAttentionItem) => {
    if (item.employeeId) navigate(`/employees/${item.employeeId}`);
    else navigate("/company-documents");
  };

  const actionBtn = "h-8 rounded-[11px] border border-[var(--glass-edge)] bg-white/[0.06] px-3 text-[12.5px] font-semibold text-white hover:bg-white/[0.12]";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Greeting banner */}
      <section className="relative overflow-hidden rounded-[20px] border border-[rgba(212,178,106,0.3)] [background:var(--hero-bg)] px-6 py-6 text-white shadow-[var(--glass-shadow)] lg:col-span-8">
        {mark && (
          <img
            src={mark}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[70px] -left-10 w-[290px] opacity-[0.09] [filter:brightness(0)_invert(1)]"
          />
        )}
        <div className="relative grid gap-3.5">
          <div>
            <h1 className="bg-gradient-to-b from-white from-30% to-[#e9d7a5] bg-clip-text font-head text-[26px] font-bold leading-tight text-transparent sm:text-[30px]">
              {greeting}{isAr ? "، " : ", "}{firstName}
            </h1>
            <p className="mt-0.5 text-[13px] text-[#a9b6cc]">{dateLine}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[12.5px]">
            <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--glass-edge)] bg-white/[0.05] px-3 py-1.5">
              <i className="h-2 w-2 rounded-full bg-destructive" />
              <b className="text-sm">{overview?.expired ?? 0}</b> {isAr ? "وثيقة منتهية تحتاج إجراء" : "expired documents need action"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--glass-edge)] bg-white/[0.05] px-3 py-1.5">
              <i className="h-2 w-2 rounded-full bg-warning" />
              <b className="text-sm">{overview?.endingIn30 ?? 0}</b> {isAr ? "تنتهي خلال 30 يومًا" : "end within 30 days"}
            </span>
            {canTasks && (
              <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--glass-edge)] bg-white/[0.05] px-3 py-1.5">
                <i className="h-2 w-2 rounded-full bg-[#00b1ef]" />
                {isAr ? "مهام اليوم" : "Today's tasks"} <b className="text-sm tabular-nums">{doneCount}/{taskList.length}</b>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="gradient" onClick={onAddEmployee} className="h-10 rounded-[13px] px-4 text-[13px]">
              <Plus /> {isAr ? "إضافة موظف" : "Add employee"}
            </Button>
            <Button onClick={onAddBranch} className={actionBtn}>
              <Building2 /> {isAr ? "مؤسسة" : "Branch"}
            </Button>
            <Button onClick={() => navigate("/employee-documents")} className={actionBtn}>
              <FileText /> {isAr ? "وثيقة" : "Document"}
            </Button>
            <Button onClick={onAddPayment} className={actionBtn}>
              <Wallet /> {isAr ? "دفعة" : "Payment"}
            </Button>
            {canTasks && (
              <Button onClick={() => navigate("/daily-tasks")} className={actionBtn}>
                <ListChecks /> {isAr ? "مهمة" : "Task"}
              </Button>
            )}
            <Button onClick={() => navigate("/reports")} className={actionBtn}>
              <BarChart3 /> {isAr ? "تقرير" : "Report"}
            </Button>
          </div>
        </div>
      </section>

      {/* Compliance ring */}
      <Panel className="grid content-center justify-items-center gap-1.5 p-5 text-center lg:col-span-4">
        <Ring pct={score} size={132} label={`${Math.round(score * 100)}%`} sub={isAr ? "مؤشر الامتثال" : "Compliance"} />
        <b className="font-head text-[15px]">{scoreLabel}</b>
        <small className="max-w-[26ch] text-xs text-muted-foreground">
          {isAr ? "نسبة الوثائق السارية من كل الوثائق المتابَعة" : "Valid documents out of all tracked documents"}
        </small>
      </Panel>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-12 lg:grid-cols-4">
        {!summary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-[20px]" />)
        ) : (
          <>
            <Kpi
              rule="#8b8cf7"
              label={isAr ? "الموظفون" : "Employees"}
              icon={Users}
              tone="indigo"
              value={summary.totalEmployees}
              unit={isAr ? "موظف" : "employees"}
              onClick={() => navigate("/employees")}
              footer={<Pill tone="ok">{summary.activeEmployees} {isAr ? "على رأس العمل" : "active"}</Pill>}
            />
            <Kpi
              rule="#5ecbff"
              label={isAr ? "الوثائق المتابَعة" : "Tracked documents"}
              icon={IdCard}
              tone="sky"
              value={tracked}
              unit={isAr ? "وثيقة" : "documents"}
              onClick={() => navigate("/reports?tab=documents")}
              footer={
                <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                  <i className="block h-full bg-success" style={{ width: `${(valid / Math.max(1, tracked)) * 100}%` }} />
                  <i className="block h-full bg-warning" style={{ width: `${((summary.expiringDocuments ?? 0) / Math.max(1, tracked)) * 100}%` }} />
                  <i className="block h-full bg-destructive" style={{ width: `${((summary.expiredDocuments ?? 0) / Math.max(1, tracked)) * 100}%` }} />
                </span>
              }
            />
            <Kpi
              rule="#43c4d9"
              label={isAr ? "المؤسسات" : "Branches"}
              icon={Building2}
              tone="teal"
              value={overview?.branches.total ?? 0}
              unit={isAr ? "مؤسسة" : "branches"}
              onClick={() => navigate("/branches")}
              footer={
                <>
                  <Pill tone="ok">{overview?.branches.active ?? 0} {isAr ? "نشطة" : "active"}</Pill>
                  {!!overview?.branches.cities && (
                    <span>
                      {overview.branches.cities} {isAr ? (overview.branches.cities === 1 ? "مدينة" : "مدن") : overview.branches.cities === 1 ? "city" : "cities"}
                    </span>
                  )}
                </>
              }
            />
            {noPaymentsYet ? (
              <Kpi
                rule="#ff6b61"
                label={isAr ? "مدفوعات الشهر" : "This month's payments"}
                icon={Wallet}
                tone="red"
                value={<span className="py-1.5 text-xl font-semibold text-muted-foreground">{isAr ? "لا مدفوعات بعد" : "No payments yet"}</span>}
                onClick={onAddPayment}
                footer={<span className="font-semibold text-[#0a7fb5] dark:text-[#5ccdf5]">{isAr ? "سجّل أول دفعة" : "Record the first payment"}</span>}
              />
            ) : (
              <Kpi
                rule="#ff6b61"
                label={isAr ? "مدفوعات الشهر" : "This month's payments"}
                icon={Wallet}
                tone="red"
                value={formatCurrency(thisMonth).replace(/\.00$/, "")}
                unit={isAr ? "ر.س" : "SAR"}
                onClick={() => navigate("/payments")}
                footer={
                  <>
                    {change !== null ? (
                      <Pill tone={change >= 0 ? "info" : "warn"}>
                        {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span dir="ltr">{change >= 0 ? `+${change}` : change}%</span>
                      </Pill>
                    ) : (
                      <span>{isAr ? "هذا الشهر" : "This month"}</span>
                    )}
                    <Spark values={monthly} />
                  </>
                }
              />
            )}
          </>
        )}
      </div>

      {/* Needs attention */}
      <Panel className={cn("px-5 py-[18px]", canTasks ? "lg:col-span-7" : "lg:col-span-12")}>
        <PanelHead
          icon={AlertTriangle}
          tone="red"
          title={isAr ? "يحتاج انتباهك" : "Needs your attention"}
          action={<LinkAction label={isAr ? "عرض الكل" : "View all"} onClick={() => navigate("/reports?tab=documents")} />}
        />
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : overview && overview.attention.length > 0 ? (
          <div>
            {overview.attention.slice(0, 3).map((item, i) => {
              const [tone, text] = docState(item.days);
              const name = isAr ? item.nameAr : item.nameEn;
              const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join(" ");
              return (
                <div key={item.key} className="flex items-center gap-3 border-t border-foreground/[0.07] py-[11px] first:border-t-0 first:pt-0">
                  <button type="button" onClick={() => openItem(item)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                    <span
                      className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${AVATARS[i % 5][0]}, ${AVATARS[i % 5][1]})` }}
                    >
                      {initials}
                    </span>
                    <span className="min-w-0">
                      <b className="block truncate font-semibold text-foreground">{name}</b>
                      <small className="block truncate text-xs text-muted-foreground">
                        {isAr ? item.documentAr : item.documentEn}
                        {item.documentNumber && (
                          <>
                            {" · "}
                            <span dir="ltr" className="font-mono text-[12px]">
                              {item.documentNumber}
                            </span>
                          </>
                        )}
                      </small>
                    </span>
                  </button>
                  <Pill tone={tone}>{text}</Pill>
                  {canAddTask &&
                    (item.taskAdded ? (
                      <span className="inline-flex h-8 shrink-0 items-center gap-1.5 px-2 text-[12.5px] font-semibold text-success">
                        <Check className="h-4 w-4" /> {isAr ? "في المهام" : "In tasks"}
                      </span>
                    ) : (
                      <Button
                        type="button"
                        disabled={addTask.isPending}
                        onClick={() => addTask.mutate(item)}
                        className="h-8 shrink-0 rounded-[11px] border border-[var(--glass-edge)] bg-white/[0.05] px-3 text-[12.5px] font-semibold text-foreground hover:bg-white/[0.1]"
                      >
                        <ListChecks /> {isAr ? "أضف كمهمة" : "Add as task"}
                      </Button>
                    ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid justify-items-center gap-1.5 px-2 py-5 text-center text-[13px] text-muted-foreground">
            <AppleIcon icon={Check} tone="emerald" size="lg" />
            <b className="text-foreground">{isAr ? "كل الوثائق سارية" : "All documents are valid"}</b>
          </div>
        )}
      </Panel>

      {/* Today's tasks */}
      {canTasks && (
        <Panel className="px-5 py-[18px] lg:col-span-5">
          <PanelHead
            icon={ListChecks}
            tone="emerald"
            title={isAr ? "مهام اليوم" : "Today's tasks"}
            action={<LinkAction label={isAr ? "فتح المهام" : "Open tasks"} onClick={() => navigate("/daily-tasks")} />}
          />
          <div className="grid grid-cols-[auto_1fr] items-center gap-4">
            <Ring pct={taskList.length ? doneCount / taskList.length : 0} size={96} label={`${taskList.length ? Math.round((doneCount / taskList.length) * 100) : 0}%`} />
            <div className="min-w-0">
              {taskList.length ? (
                taskList.slice(0, 3).map((t, i) => (
                  <div key={t.id} className={cn("flex items-center gap-3 py-2", i > 0 && "border-t border-foreground/[0.07]")}>
                    <Pill tone={t.done ? "ok" : t.priority === "URGENT" ? "bad" : "warn"}>
                      {t.done ? (isAr ? "منجزة" : "Done") : t.priority === "URGENT" ? (isAr ? "عاجلة" : "Urgent") : isAr ? "مهمة" : "Open"}
                    </Pill>
                    <small className={cn("truncate text-xs", t.done ? "text-muted-foreground line-through" : "text-foreground/85")}>{t.title}</small>
                  </div>
                ))
              ) : (
                <>
                  <b className="block text-foreground">{isAr ? "لا توجد مهام اليوم" : "No tasks today"}</b>
                  <small className="text-xs text-muted-foreground">{isAr ? "أضف مهامك أو رحّل غير المنجز من أمس." : "Add your tasks or carry over yesterday's."}</small>
                </>
              )}
              <div className="mt-2.5">
                <Button variant="gradient" onClick={() => navigate("/daily-tasks")} className="h-8 rounded-[11px] px-3 text-[12.5px]">
                  <Plus /> {isAr ? "مهمة جديدة" : "New task"}
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Expiries over the coming months */}
      <Panel className="px-5 py-[18px] lg:col-span-7">
        <PanelHead
          icon={CalendarClock}
          tone="orange"
          title={isAr ? "الوثائق التي تنتهي في الشهور القادمة" : "Documents ending in the coming months"}
          action={<small className="text-xs text-muted-foreground">{isAr ? "6 أشهر" : "6 months"}</small>}
        />
        {overview ? (
          <UpcomingChart values={overview.upcoming.map((m) => m.count)} labels={monthLabels} rtl={isAr} />
        ) : (
          <Skeleton className="h-40 rounded-xl" />
        )}
      </Panel>

      {/* By type */}
      <Panel className="px-5 py-[18px] lg:col-span-5">
        <PanelHead
          icon={BarChart3}
          tone="purple"
          title={isAr ? "حسب النوع" : "By type"}
          action={<small className="text-xs text-muted-foreground">{tracked} {isAr ? "وثيقة" : "documents"}</small>}
        />
        <div className="grid gap-3">
          {shownTypes.map(([key, ar, en, tone]) => {
            const n = byType[key] ?? 0;
            return (
              <div key={key} className="grid grid-cols-[auto_minmax(0,120px)_1fr_28px] items-center gap-2.5 text-[13px]">
                <AppleIcon icon={IdCard} tone={tone} size="xs" />
                <span className="truncate">{isAr ? ar : en}</span>
                <span className="flex h-[9px] overflow-hidden rounded-full bg-foreground/10">
                  <i
                    className="block h-full rounded-full"
                    style={{ width: `${(n / Math.max(1, tracked)) * 100}%`, background: `linear-gradient(90deg, ${RING[1]}, ${RING[0]})` }}
                  />
                </span>
                <b className="text-end tabular-nums">{n}</b>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
