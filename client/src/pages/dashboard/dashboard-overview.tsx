import { useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Building2, Check, FileText, HeartPulse, IdCard, Users, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { dashboardApi, type DashboardAttentionItem, type DashboardSummary } from "@/api/dashboard";
import { tasksApi, type DailyTask } from "@/api/tasks";
import { settingsApi } from "@/api/settings";
import { useAuthStore } from "@/stores/authStore";
import { cn, formatCurrency } from "@/lib/utils";

/* The top of the dashboard in the "Oasis" design: the week strip, today's
   priorities on sand, the compliance gauge and today's tasks, then four
   stat cards. */

function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAr(n: number) {
  return n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يومًا`;
}

const TONE = {
  bad: "text-destructive bg-destructive/10",
  warn: "text-warning bg-warning/10",
} as const;

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-[28px] bg-card shadow-[var(--glass-shadow)]", className)}>{children}</section>;
}

/** Half-circle gauge in three segments: valid, ending soon, expired. */
function Gauge({ valid, soon, expired, size }: { valid: number; soon: number; expired: number; size: "lg" | "sm" }) {
  const total = valid + soon + expired;
  const arc = Math.PI * 90; // the path below is a 90-radius half circle
  const gap = total > 1 ? 2.5 : 0;
  const seg = (n: number) => (total ? Math.max(0, (n / total) * arc - gap) : 0);
  const a = seg(valid);
  const b = seg(soon);
  const c = seg(expired);
  const path = "M20 112 A90 90 0 0 1 200 112";
  const stroke = size === "lg" ? 18 : 20;
  return (
    <svg width={size === "lg" ? 220 : 120} height={size === "lg" ? 124 : 68} viewBox="0 0 220 124" aria-hidden="true">
      <path d={path} fill="none" className="stroke-muted" strokeWidth={stroke} />
      {a > 0 && <path d={path} fill="none" className="stroke-success" strokeWidth={stroke} strokeDasharray={`${a} 400`} />}
      {b > 0 && <path d={path} fill="none" stroke="#D99A2B" strokeWidth={stroke} strokeDasharray={`${b} 400`} strokeDashoffset={-(a + gap)} />}
      {c > 0 && <path d={path} fill="none" className="stroke-destructive" strokeWidth={stroke} strokeDasharray={`${c} 400`} strokeDashoffset={-(a + b + gap * 2)} />}
    </svg>
  );
}

export function DashboardOverview({ summary }: { summary?: DashboardSummary }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canTasks = hasPermission("tasks.view");
  const canAddTask = hasPermission("tasks.create");
  const canEditTask = hasPermission("tasks.edit");
  const today = localIso();

  const { data: overview, isLoading } = useQuery({ queryKey: ["dashboard", "overview"], queryFn: dashboardApi.overview });
  const { data: tasks } = useQuery({ queryKey: ["tasks", "day", today], queryFn: () => tasksApi.day(today), enabled: canTasks });
  const { data: week } = useQuery({ queryKey: ["tasks", "week", today], queryFn: () => tasksApi.week(today), enabled: canTasks });
  const { data: branding } = useQuery({ queryKey: ["settings", "branding"], queryFn: settingsApi.getBranding, staleTime: 5 * 60_000 });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const addTask = useMutation({
    mutationFn: (item: DashboardAttentionItem) =>
      tasksApi.create({
        date: today,
        title: `تجديد ${item.documentAr} — ${item.nameAr.trim()}`,
        category: "documents",
        priority: item.days <= 0 ? "URGENT" : "HIGH",
        notes: item.documentNumber ? `رقم ${item.documentNumber}` : null,
        sourceKey: item.key,
      }),
    onSuccess: () => {
      toast.success(isAr ? "أُضيفت إلى مهام اليوم" : "Added to today's tasks");
      refresh();
    },
    onError: () => toast.error(isAr ? "تعذّرت إضافة المهمة" : "Couldn't add the task"),
  });

  const toggleTask = useMutation({
    mutationFn: (t: DailyTask) => tasksApi.update(t.id, { done: !t.done }),
    onSuccess: refresh,
    onError: () => toast.error(isAr ? "تعذّر تحديث المهمة" : "Couldn't update the task"),
  });

  const locale = isAr ? "ar-EG-u-nu-latn" : "en-GB";
  const companyName = isAr ? branding?.nameAr || branding?.nameEn : branding?.nameEn || branding?.nameAr;
  const dateLine = useMemo(() => {
    const now = new Date();
    const g = now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
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

  // Week strip: Saturday to Friday around today.
  const days = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 1) % 7));
    return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, []);
  const tasksByDate = new Map((week ?? []).map((d) => [d.date, d.total]));

  const tracked = summary?.totalTrackedDocuments ?? 0;
  const valid = summary?.validDocuments ?? 0;
  const soon = summary?.expiringDocuments ?? 0;
  const expired = summary?.expiredDocuments ?? 0;
  const score = tracked ? valid / tracked : 1;
  const scoreLabel = isAr
    ? score >= 0.9 ? "امتثال ممتاز" : score >= 0.6 ? "امتثال جيد" : "يحتاج متابعة"
    : score >= 0.9 ? "Excellent compliance" : score >= 0.6 ? "Good compliance" : "Needs follow-up";

  const taskList = tasks ?? [];
  const doneCount = taskList.filter((t) => t.done).length;

  const docIcon = (item: DashboardAttentionItem) =>
    item.sourceType === "COMPANY_DOCUMENT" ? FileText : /تأمين|صحي/.test(item.documentAr) ? HeartPulse : IdCard;
  const titleOf = (item: DashboardAttentionItem) => {
    const name = (isAr ? item.nameAr : item.nameEn).trim();
    if (!isAr) return `${item.documentEn} — ${name}`;
    const doc = item.documentAr.replace(/^ال/, "");
    return item.sourceType === "EMPLOYEE_IQAMA" || item.sourceType === "EMPLOYEE_PASSPORT" ? `تجديد ${doc} ${name}` : `${item.documentAr} — ${name}`;
  };
  const stateOf = (days: number): ["bad" | "warn", string] =>
    days < 0
      ? ["bad", isAr ? `منتهية منذ ${daysAr(-days)}` : `Expired ${-days}d ago`]
      : days === 0
        ? ["bad", isAr ? "تنتهي اليوم" : "Expires today"]
        : ["warn", isAr ? `باقي ${daysAr(days)}` : `${days}d left`];
  const openItem = (item: DashboardAttentionItem) => navigate(item.employeeId ? `/employees/${item.employeeId}` : "/company-documents");

  const stats: { label: string; value: ReactNode; unit: string; icon: typeof Users; tint: string; href: string }[] = [
    { label: isAr ? "الموظفون" : "Employees", value: summary?.totalEmployees ?? 0, unit: isAr ? "موظف" : "employees", icon: Users, tint: "text-[#4F5BD5] bg-[#ECEEFC] dark:bg-[#4F5BD5]/20 dark:text-[#A5ACF2]", href: "/employees" },
    { label: isAr ? "الوثائق المتابَعة" : "Tracked documents", value: tracked, unit: isAr ? "وثيقة" : "documents", icon: FileText, tint: "text-primary bg-accent", href: "/reports?tab=documents" },
    { label: isAr ? "المؤسسات" : "Branches", value: overview?.branches.total ?? 0, unit: isAr ? "مؤسسة" : "branches", icon: Building2, tint: "text-success bg-success/10", href: "/branches" },
    { label: isAr ? "مدفوعات الشهر" : "This month's payments", value: formatCurrency(summary?.monthlyPaymentsAmount).replace(/\.00$/, ""), unit: isAr ? "ر.س" : "SAR", icon: Wallet, tint: "text-warning bg-warning/10", href: "/payments" },
  ];

  const inkButton = "h-10 shrink-0 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-ink-foreground transition-colors hover:bg-ink/90 disabled:opacity-60";

  return (
    <>
      <PageHeader
        title={
          <>
            {greeting}
            <span className="hidden sm:inline">
              {isAr ? "، " : ", "}
              {user?.fullName}
            </span>
          </>
        }
        description={
          <>
            {companyName && <span className="hidden sm:inline">{companyName} · </span>}
            {dateLine}
          </>
        }
      />

      {/* Week strip */}
      <Card className="grid grid-cols-5 gap-2 p-2.5 sm:grid-cols-7 sm:gap-2.5 sm:rounded-[26px] sm:p-3.5">
        {days.map((d, i) => {
          const key = localIso(d);
          const isToday = key === today;
          const taskDots = Math.min(2, tasksByDate.get(key) ?? 0);
          const hasExpiry = (overview?.expiriesByDate[key] ?? 0) > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => navigate(`/daily-tasks?date=${key}`)}
              className={cn(
                "flex h-[68px] flex-col items-center justify-center gap-0.5 rounded-[18px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-[92px] sm:gap-1 sm:rounded-[20px]",
                isToday ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-accent",
                i > 4 && "hidden sm:flex"
              )}
            >
              <span className="text-[11.5px] opacity-80 sm:text-[13px]">{d.toLocaleDateString(locale, { weekday: "long" })}</span>
              <span className="font-head text-[19px] font-semibold sm:text-2xl">{d.getDate()}</span>
              <span className="hidden h-1.5 gap-1 sm:flex">
                {Array.from({ length: taskDots }).map((_, j) => (
                  <span key={j} className={cn("h-1.5 w-1.5 rounded-full", isToday ? "bg-primary-foreground" : "bg-primary")} />
                ))}
                {hasExpiry && <span className={cn("h-1.5 w-1.5 rounded-full", isToday ? "bg-primary-foreground" : "bg-[#D99A2B]")} />}
              </span>
            </button>
          );
        })}
      </Card>

      <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-12">
        {/* Today's priorities */}
        <section className="flex flex-col gap-3.5 rounded-[24px] bg-sand p-3.5 sm:rounded-[28px] sm:p-6 lg:col-span-7">
          <div className="flex items-center justify-between gap-3 px-1 sm:px-0">
            <h2 className="font-head text-[17px] font-semibold sm:text-[22px]">{isAr ? "أولويات اليوم" : "Today's priorities"}</h2>
            {!!overview?.attentionTotal && (
              <span className="text-[13.5px] text-sand-foreground">
                {isAr ? `${overview.attentionTotal} تحتاج قرارك` : `${overview.attentionTotal} need your decision`}
              </span>
            )}
          </div>
          {isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-[20px] bg-card/70" />)
          ) : overview && overview.attention.length > 0 ? (
            overview.attention.slice(0, 3).map((item) => {
              const [tone, text] = stateOf(item.days);
              const Icon = docIcon(item);
              return (
                <div key={item.key} className="flex items-center gap-3 rounded-[18px] bg-card p-3 sm:gap-4 sm:rounded-[20px] sm:px-[18px] sm:py-4">
                  <span className={cn("grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px] sm:h-12 sm:w-12 sm:rounded-2xl", TONE[tone])}>
                    <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
                  </span>
                  <button type="button" onClick={() => openItem(item)} className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
                    <b className="truncate text-sm font-semibold sm:text-[15.5px]">{titleOf(item)}</b>
                    <span className={cn("truncate text-[12.5px] font-semibold sm:hidden", tone === "bad" ? "text-destructive" : "text-warning")}>{text}</span>
                    <span className="hidden truncate text-[13px] text-muted-foreground sm:block">
                      {isAr ? item.documentAr : item.documentEn}
                      {item.documentNumber && (
                        <>
                          {" "}
                          <span dir="ltr">{item.documentNumber}</span>
                        </>
                      )}
                      {item.branchName && ` · ${item.branchName}`}
                    </span>
                  </button>
                  <span className={cn("hidden shrink-0 whitespace-nowrap rounded-full px-3 py-[5px] text-[12.5px] font-semibold sm:inline", TONE[tone])}>{text}</span>
                  {item.days < 0 || !canAddTask ? (
                    <button type="button" onClick={() => openItem(item)} className={cn(inkButton, "hidden sm:inline-block")}>
                      {isAr ? "ابدأ التجديد" : "Start renewal"}
                    </button>
                  ) : item.taskAdded ? (
                    <span className="hidden h-10 shrink-0 items-center gap-1.5 px-2 text-[13.5px] font-semibold text-success sm:inline-flex">
                      <Check className="h-4 w-4" /> {isAr ? "في المهام" : "In tasks"}
                    </span>
                  ) : (
                    <button type="button" disabled={addTask.isPending} onClick={() => addTask.mutate(item)} className={cn(inkButton, "hidden sm:inline-block")}>
                      {isAr ? "أضف للمهام" : "Add to tasks"}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex items-center gap-4 rounded-[20px] bg-card px-[18px] py-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-success/10 text-success">
                <Check className="h-[22px] w-[22px]" />
              </span>
              <b className="text-[15.5px] font-semibold">{isAr ? "لا أولويات عاجلة — كل الوثائق سارية" : "Nothing urgent — every document is valid"}</b>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-[22px] lg:col-span-5">
          {/* Compliance gauge */}
          <Card className="flex items-center gap-4 p-4 sm:gap-[22px] sm:px-6 sm:py-[22px]">
            <div className="relative shrink-0">
              <div className="hidden sm:block">
                <Gauge valid={valid} soon={soon} expired={expired} size="lg" />
              </div>
              <div className="sm:hidden">
                <Gauge valid={valid} soon={soon} expired={expired} size="sm" />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                <span className="font-head text-xl font-semibold leading-none sm:text-[34px]">{Math.round(score * 100)}%</span>
                <span className="hidden text-xs text-muted-foreground sm:block">{isAr ? "صحة الامتثال" : "Compliance"}</span>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <h2 className="font-head text-base font-semibold sm:text-[19px]">
                <span className="sm:hidden">{isAr ? "صحة الامتثال" : "Compliance"}</span>
                <span className="hidden sm:inline">{scoreLabel}</span>
              </h2>
              <span className="text-[12.5px] text-muted-foreground sm:hidden">
                {isAr ? `${expired} منتهية · ${soon} تنتهي قريبًا` : `${expired} expired · ${soon} ending soon`}
              </span>
              {(
                [
                  [isAr ? "سارية" : "Valid", valid, "bg-success"],
                  [isAr ? "تنتهي خلال 30 يومًا" : "Ending within 30 days", soon, "bg-[#D99A2B]"],
                  [isAr ? "منتهية" : "Expired", expired, "bg-destructive"],
                ] as const
              ).map(([label, n, dot]) => (
                <div key={label} className="hidden items-center gap-2.5 text-sm sm:flex">
                  <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />
                  <span className="flex-1">{label}</span>
                  <b className="font-semibold">{n}</b>
                </div>
              ))}
            </div>
          </Card>

          {/* Today's tasks */}
          {canTasks && (
            <Card className="hidden flex-col gap-3 px-6 py-[22px] sm:flex">
              <div className="flex items-center justify-between">
                <h2 className="font-head text-[19px] font-semibold">{isAr ? "مهام اليوم" : "Today's tasks"}</h2>
                <span className="text-[13px] text-muted-foreground">
                  {isAr ? `${doneCount} من ${taskList.length}` : `${doneCount} of ${taskList.length}`}
                </span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                <span className="rounded-full bg-primary transition-all" style={{ width: `${taskList.length ? (doneCount / taskList.length) * 100 : 0}%` }} />
              </div>
              {taskList.length ? (
                taskList.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex h-[38px] items-center gap-3 text-sm">
                    <button
                      type="button"
                      disabled={!canEditTask || toggleTask.isPending}
                      onClick={() => toggleTask.mutate(t)}
                      aria-pressed={t.done}
                      aria-label={t.title}
                      className={cn(
                        "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        t.done ? "bg-success text-white" : "bg-card shadow-[inset_0_0_0_2px_hsl(var(--input))]"
                      )}
                    >
                      {t.done && <Check className="h-3 w-3" strokeWidth={3} />}
                    </button>
                    <span className={cn("truncate", t.done ? "text-muted-foreground line-through" : "text-foreground")}>{t.title}</span>
                  </div>
                ))
              ) : (
                <button type="button" onClick={() => navigate("/daily-tasks")} className="py-2 text-start text-sm text-muted-foreground hover:text-foreground">
                  {isAr ? "لا توجد مهام اليوم — أضف مهمة" : "No tasks today — add one"}
                </button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="hidden grid-cols-2 gap-[22px] sm:grid lg:grid-cols-4">
        {!summary
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px] rounded-3xl" />)
          : stats.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => navigate(s.href)}
                  className="flex items-center gap-4 rounded-3xl bg-card px-5 py-[18px] text-start shadow-[var(--glass-shadow)] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className={cn("grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[18px]", s.tint)}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[13px] text-muted-foreground">{s.label}</span>
                    <span className="font-head text-[28px] font-semibold leading-tight">
                      {s.value} <small className="font-sans text-[13px] font-medium text-muted-foreground">{s.unit}</small>
                    </span>
                  </span>
                </button>
              );
            })}
      </div>
    </>
  );
}
