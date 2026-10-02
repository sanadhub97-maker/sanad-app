import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BarChart3, Building2, Check, FileText, HeartPulse, IdCard, ListChecks, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Squircle } from "@/components/layout/desk-sidebar";
import { dashboardApi, type DashboardAttentionItem, type DashboardCharts, type DashboardSummary } from "@/api/dashboard";
import { tasksApi, type DailyTask } from "@/api/tasks";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

/* The dashboard on computers, in the Luxe design: glass cards over moving
   light, a live clock, a glowing compliance ring, stat cards that tilt and
   roll their digits, today's priorities inside a running light border, and
   tasks that burst when done. Phones and tablets use DashboardOverview. */

function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysAr(n: number) {
  return n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يومًا`;
}
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const glass = "lux-glass lux-spot relative overflow-hidden rounded-[26px] bg-card shadow-[var(--glass-shadow)]";
const soft = "bg-secondary";

/** Digits that roll into place like an odometer. */
function Odometer({ value, className }: { value: string; className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, [value]);
  let digit = 0;
  return (
    <span className={cn("inline-flex h-[1em] overflow-hidden leading-[1em]", className)} dir="ltr" aria-label={value}>
      {value.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span
            key={i}
            aria-hidden="true"
            className="inline-flex flex-col transition-transform duration-[1600ms] [transition-timing-function:cubic-bezier(.2,.9,.2,1)]"
            style={{ transform: `translateY(-${on ? +ch : 0}em)`, transitionDelay: `${digit++ * 60}ms` }}
          >
            {Array.from({ length: 10 }, (_, d) => (
              <span key={d} className="block h-[1em] text-center">
                {d}
              </span>
            ))}
          </span>
        ) : (
          <span key={i} aria-hidden="true">
            {ch}
          </span>
        )
      )}
    </span>
  );
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const id = useId();
  if (values.length < 2 || values.every((v) => v === 0)) return null;
  const w = 120;
  const h = 40;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const st = w / (values.length - 1);
  const pts = values.map((v, i) => [i * st, h - 5 - ((v - min) / Math.max(1, max - min)) * (h - 10)] as const);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ direction: "ltr" }} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={220} strokeDashoffset={220} style={{ animation: "lux-draw 1.6s .4s cubic-bezier(.2,.9,.2,1) forwards" }} />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill={color} />
    </svg>
  );
}

function burst(el: Element) {
  if (reduceMotion()) return;
  const r = el.getBoundingClientRect();
  const colors = ["#7DD3FC", "#5EEAD4", "#FCD34D", "#C4B5FD", "#FDA4AF", "#86EFAC"];
  for (let i = 0; i < 16; i++) {
    const s = document.createElement("span");
    s.className = "lux-burst";
    const a = Math.random() * Math.PI * 2;
    const dist = 26 + Math.random() * 30;
    s.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${colors[i % 6]};--dx:${Math.cos(a) * dist}px;--dy:${Math.sin(a) * dist - 10}px`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 750);
  }
}

function Head({ title, note, children }: { title: string; note?: ReactNode; children?: ReactNode }) {
  return (
    <div className="relative z-[1] mb-4 flex items-center justify-between gap-2.5">
      <h2 className="font-head text-lg font-semibold">{title}</h2>
      {children ?? (note && <small className="text-[13px] text-muted-foreground">{note}</small>)}
    </div>
  );
}

export function DashboardLuxe({ summary, charts }: { summary?: DashboardSummary; charts?: DashboardCharts }) {
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
  const gid = useId().replace(/:/g, "");

  const { data: overview } = useQuery({ queryKey: ["dashboard", "overview"], queryFn: dashboardApi.overview });
  const { data: tasks } = useQuery({ queryKey: ["tasks", "day", today], queryFn: () => tasksApi.day(today), enabled: canTasks });
  const { data: week } = useQuery({ queryKey: ["tasks", "week", today], queryFn: () => tasksApi.week(today), enabled: canTasks });

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

  // Live clock
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  const locale = isAr ? "ar-EG-u-nu-latn" : "en-GB";
  const hh = now.getHours() % 12 || 12;
  const clock = `${String(hh).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const ampm = now.getHours() >= 12 ? (isAr ? "م" : "PM") : isAr ? "ص" : "AM";
  const dateLine = useMemo(() => {
    const g = now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    let h = "";
    try {
      h = now.toLocaleDateString(isAr ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      /* no Hijri calendar here */
    }
    return h ? `${g} · ${h.replace(/\s*(هـ|AH)$/, "")} ${isAr ? "هـ" : "AH"}` : g;
  }, [now.toDateString(), locale, isAr]); // eslint-disable-line react-hooks/exhaustive-deps

  const hour = now.getHours();
  const greeting = isAr ? (hour < 12 ? "صباح الخير" : "مساء الخير") : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const days = useMemo(() => {
    const n = new Date();
    const start = new Date(n.getFullYear(), n.getMonth(), n.getDate() - ((n.getDay() + 1) % 7));
    return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, []);
  const tasksByDate = new Map((week ?? []).map((d) => [d.date, d.total]));

  const tracked = summary?.totalTrackedDocuments ?? 0;
  const valid = summary?.validDocuments ?? 0;
  const soon = summary?.expiringDocuments ?? 0;
  const expired = summary?.expiredDocuments ?? 0;
  const score = tracked ? valid / tracked : 1;
  const taskList = tasks ?? [];
  const doneCount = taskList.filter((t) => t.done).length;

  // Compliance ring: a 270° arc in three segments.
  const R = 84;
  const C = 2 * Math.PI * R;
  const arcLen = C * 0.75;
  const seg = (n: number) => (tracked ? (n / tracked) * arcLen : 0);
  const [ringOn, setRingOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setRingOn(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  const ringSeg = (len: number, off: number, stroke: string) =>
    len > 1 ? (
      <circle
        cx="105"
        cy="105"
        r={R}
        fill="none"
        stroke={stroke}
        strokeWidth={16}
        strokeLinecap="round"
        filter={`url(#${gid}g)`}
        strokeDasharray={`${ringOn ? Math.max(0, len - 6) : 0} ${C}`}
        strokeDashoffset={-off}
        style={{ transition: "stroke-dasharray 1.6s cubic-bezier(.2,.9,.2,1)" }}
      />
    ) : null;

  // Payments: six months for the spark line.
  const monthly = useMemo(() => {
    const byKey = new Map((charts?.monthlyPayments ?? []).map((m) => [String(m.month).slice(0, 7), m.total]));
    const n = new Date();
    return Array.from({ length: 6 }, (_, i) => byKey.get(localIso(new Date(n.getFullYear(), n.getMonth() - 5 + i, 1)).slice(0, 7)) ?? 0);
  }, [charts]);
  const thisMonth = summary?.monthlyPaymentsAmount ?? 0;
  const change = monthly[4] > 0 ? Math.round(((thisMonth - monthly[4]) / monthly[4]) * 100) : null;

  const branches = overview?.branches;
  const kpis: { label: string; value: string; unit: string; icon: typeof Users; tone: string; color: string; href: string; foot: ReactNode; spark?: number[] }[] = [
    {
      label: isAr ? "الموظفون" : "Employees",
      value: String(summary?.totalEmployees ?? 0),
      unit: isAr ? "موظف" : "employees",
      icon: Users,
      tone: "indigo",
      color: "#4F5BD5",
      href: "/employees",
      foot: <Chip tone="ok">{summary?.activeEmployees ?? 0} {isAr ? "على رأس العمل" : "active"}</Chip>,
    },
    {
      label: isAr ? "الوثائق المتابَعة" : "Tracked documents",
      value: String(tracked),
      unit: isAr ? "وثيقة" : "documents",
      icon: FileText,
      tone: "sky",
      color: "#0A7FB5",
      href: "/reports?tab=documents",
      foot: <Chip tone={soon + expired ? "warn" : "ok"}>{soon + expired} {isAr ? "تحتاج إجراء" : "need action"}</Chip>,
    },
    {
      label: isAr ? "المؤسسات" : "Branches",
      value: String(branches?.total ?? 0),
      unit: isAr ? "مؤسسة" : "branches",
      icon: Building2,
      tone: "teal",
      color: "#0F9D86",
      href: "/branches",
      foot: <Chip tone="ok">{branches?.active ?? 0} {isAr ? "نشطة" : "active"}</Chip>,
    },
    {
      label: isAr ? "مدفوعات الشهر" : "This month's payments",
      value: Math.round(thisMonth).toLocaleString("en-US"),
      unit: isAr ? "ر.س" : "SAR",
      icon: Wallet,
      tone: "amber",
      color: "#D97706",
      href: "/payments",
      foot:
        change !== null ? (
          <Chip tone={change >= 0 ? "ok" : "warn"}>
            <span dir="ltr">{change >= 0 ? `+${change}` : change}%</span> {isAr ? "عن الشهر الماضي" : "vs last month"}
          </Chip>
        ) : (
          <Chip tone="muted">{isAr ? "هذا الشهر" : "This month"}</Chip>
        ),
      spark: monthly,
    },
  ];

  const stateOf = (d: number): ["bad" | "warn", string] =>
    d < 0 ? ["bad", isAr ? `منتهية منذ ${daysAr(-d)}` : `Expired ${-d}d ago`] : d === 0 ? ["bad", isAr ? "تنتهي اليوم" : "Expires today"] : ["warn", isAr ? `باقي ${daysAr(d)}` : `${d}d left`];
  const titleOf = (item: DashboardAttentionItem) => {
    const name = (isAr ? item.nameAr : item.nameEn).trim();
    if (!isAr) return `${item.documentEn} — ${name}`;
    const doc = item.documentAr.replace(/^ال/, "");
    return item.sourceType === "EMPLOYEE_IQAMA" || item.sourceType === "EMPLOYEE_PASSPORT" ? `تجديد ${doc} ${name}` : `${item.documentAr} — ${name}`;
  };
  const openItem = (item: DashboardAttentionItem) => navigate(item.employeeId ? `/employees/${item.employeeId}` : "/company-documents");

  // Expiries over the coming months: a smooth glowing curve, right to left.
  const upcoming = overview?.upcoming ?? [];
  const chart = (() => {
    const vals = upcoming.map((m) => m.count);
    if (vals.length < 2) return null;
    const w = 660, h = 230, pl = 26, pr = 26, top = 30, bot = 36;
    const max = Math.max(1, ...vals);
    const step = (w - pl - pr) / (vals.length - 1);
    const pts = vals.map((v, i) => [isAr ? w - pr - i * step : pl + i * step, top + (1 - v / max) * (h - top - bot)] as const);
    const c = pts
      .map((p, i) => {
        if (!i) return `M${p[0]} ${p[1]}`;
        const q = pts[i - 1];
        const mx = (q[0] + p[0]) / 2;
        return `C${mx} ${q[1]} ${mx} ${p[1]} ${p[0]} ${p[1]}`;
      })
      .join(" ");
    const labels = upcoming.map((m) => {
      const [y, mo] = m.month.split("-").map(Number);
      return new Date(y, mo - 1, 1).toLocaleDateString(locale, { month: "short" });
    });
    return { w, h, pl, pr, top, bot, pts, c, vals, labels, area: `${c} L${pts[pts.length - 1][0]} ${h - bot} L${pts[0][0]} ${h - bot} Z` };
  })();

  const types: [string, string, string, typeof IdCard, string][] = [
    ["IQAMA", "الإقامات", "Iqamas", IdCard, "sky"],
    ["PASSPORT", "الجوازات", "Passports", IdCard, "indigo"],
    ["HEALTH_CERTIFICATE", "الشهادات الصحية", "Health certificates", HeartPulse, "teal"],
    ["MEDICAL_INSURANCE", "التأمين الطبي", "Medical insurance", HeartPulse, "amber"],
    ["COMPANY", "وثائق الشركة", "Company documents", FileText, "purple"],
  ];
  const byType = overview?.byType ?? {};
  const [barsOn, setBarsOn] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setBarsOn(true), 120);
    return () => clearTimeout(id);
  }, []);

  const actions: [string, typeof Users, string, string][] = [
    [isAr ? "إضافة موظف" : "Add employee", Users, "indigo", "/employees?new=true"],
    [isAr ? "وثيقة" : "Document", FileText, "sky", "/employee-documents"],
    [isAr ? "دفعة" : "Payment", Wallet, "amber", "/payments"],
    [isAr ? "مهمة" : "Task", ListChecks, "teal", "/daily-tasks"],
    [isAr ? "تقرير" : "Report", BarChart3, "purple", "/reports"],
  ];

  return (
    <>
      <PageHeader title={`${greeting}${isAr ? "، " : ", "}${user?.fullName ?? ""}`} description={isAr ? "متصل · آخر تحديث الآن" : "Online · updated just now"} />

      <div className="grid grid-cols-12 gap-5">
        {/* Hero: clock, day summary, week, quick actions */}
        <section className={cn(glass, "lux-rise col-span-12 xl:col-span-8 grid grid-cols-1 md:grid-cols-[1.1fr_1fr] items-center gap-6 px-5 sm:px-[26px] py-6")} style={{ ["--i" as string]: 0 }}>
          <div className="relative z-[1]">
            <div className="font-head text-4xl sm:text-5xl lg:text-[54px] font-light leading-none tracking-tight tabular-nums" dir="ltr" style={{ textAlign: isAr ? "right" : "left" }}>
              {clock}
              <small className="ms-1.5 text-base sm:text-lg font-normal text-muted-foreground">{ampm}</small>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">{dateLine}</p>
            <div className="mt-[18px] flex flex-wrap gap-2 text-[12.5px] sm:text-[13px]">
              <span className={cn("inline-flex items-center gap-2 rounded-[13px] px-3 py-2", soft)}>
                <i className="h-2 w-2 rounded-full bg-destructive shadow-[0_0_10px_hsl(var(--destructive))]" />
                <b className="tabular-nums">{overview?.expired ?? 0}</b> {isAr ? "وثائق منتهية" : "expired"}
              </span>
              <span className={cn("inline-flex items-center gap-2 rounded-[13px] px-3 py-2", soft)}>
                <i className="h-2 w-2 rounded-full bg-warning shadow-[0_0_10px_hsl(var(--warning))]" />
                <b className="tabular-nums">{overview?.endingIn30 ?? 0}</b> {isAr ? "تنتهي خلال 30 يومًا" : "within 30 days"}
              </span>
              {canTasks && (
                <span className={cn("inline-flex items-center gap-2 rounded-[13px] px-3 py-2", soft)}>
                  <i className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8]" />
                  {isAr ? "مهام اليوم" : "Today's tasks"} <b className="tabular-nums">{doneCount}/{taskList.length}</b>
                </span>
              )}
            </div>
          </div>
          <div className="relative z-[1] grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((d) => {
              const key = localIso(d);
              const isToday = key === today;
              const dots = Math.min(2, tasksByDate.get(key) ?? 0);
              const exp = (overview?.expiriesByDate[key] ?? 0) > 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => navigate(`/daily-tasks?date=${key}`)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-[16px] sm:rounded-[18px] px-1 pb-2 pt-2.5 sm:pb-2.5 sm:pt-3 transition-transform duration-300 [transition-timing-function:cubic-bezier(.3,1.6,.5,1)] hover:-translate-y-1",
                    isToday ? "bg-gradient-to-b from-sky-400 to-[hsl(var(--primary))] text-white shadow-[0_14px_30px_-12px_hsl(var(--primary))]" : soft
                  )}
                >
                  <small className={cn("text-[10px] sm:text-[11.5px] truncate max-w-full", isToday ? "text-white/85" : "text-muted-foreground")}>{d.toLocaleDateString(locale, { weekday: "short" })}</small>
                  <b className="font-head text-base sm:text-xl font-medium tabular-nums">{d.getDate()}</b>
                  <span className="flex h-1.5 gap-[3px]">
                    {Array.from({ length: dots }).map((_, j) => (
                      <i key={j} className={cn("h-1.5 w-1.5 rounded-full", isToday ? "bg-white" : "bg-sky-400")} />
                    ))}
                    {exp && <i className={cn("h-1.5 w-1.5 rounded-full", isToday ? "bg-white" : "bg-warning")} />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative z-[1] col-span-1 md:col-span-2 flex flex-wrap gap-2.5">
            {actions.map(([label, Icon, tone, href]) => (
              <button
                key={href}
                type="button"
                onClick={() => navigate(href)}
                className={cn("inline-flex items-center gap-2.5 rounded-2xl py-[7px] pe-4 ps-2 text-[13px] sm:text-[13.5px] font-semibold transition-transform duration-300 [transition-timing-function:cubic-bezier(.3,1.6,.5,1)] hover:-translate-y-[3px]", soft)}
              >
                <Squircle tone={tone} size={30}>
                  <Icon className="h-[15px] w-[15px]" />
                </Squircle>
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Compliance ring */}
        <section className={cn(glass, "lux-rise col-span-12 xl:col-span-4 p-5 sm:p-[22px]")} style={{ ["--i" as string]: 1 }}>
          <Head title={isAr ? "صحة الامتثال" : "Compliance"}>
            <Chip tone={score >= 0.9 ? "ok" : score >= 0.6 ? "warn" : "bad"}>
              {isAr ? (score >= 0.9 ? "ممتاز" : score >= 0.6 ? "جيد" : "يحتاج متابعة") : score >= 0.9 ? "Excellent" : score >= 0.6 ? "Good" : "Needs follow-up"}
            </Chip>
          </Head>
          <div className="relative z-[1] flex flex-col items-center gap-3.5">
            <div className="relative h-[210px] w-[210px]">
              <svg width="210" height="210" viewBox="0 0 210 210" style={{ transform: "rotate(135deg)", overflow: "visible" }} aria-hidden="true">
                <defs>
                  <filter id={`${gid}g`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id={`${gid}ok`} x1="0" x2="1">
                    <stop offset="0" stopColor="#86EFAC" />
                    <stop offset="1" stopColor="#1F8A57" />
                  </linearGradient>
                </defs>
                <circle cx="105" cy="105" r={R} fill="none" className="stroke-secondary" strokeWidth={16} strokeLinecap="round" strokeDasharray={`${arcLen} ${C}`} />
                {ringSeg(seg(valid), 0, `url(#${gid}ok)`)}
                {ringSeg(seg(soon), seg(valid), "hsl(var(--warning))")}
                {ringSeg(seg(expired), seg(valid) + seg(soon), "hsl(var(--destructive))")}
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <b className="block font-head text-[46px] font-medium leading-none" dir="ltr">
                    <Odometer value={String(Math.round(score * 100))} />
                    <span className="text-2xl">%</span>
                  </b>
                  <small className="text-muted-foreground">{isAr ? "من الوثائق سارية" : "of documents valid"}</small>
                </div>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 gap-2">
              {(
                [
                  [valid, isAr ? "سارية" : "Valid", "text-success"],
                  [soon, isAr ? "قريبة" : "Soon", "text-warning"],
                  [expired, isAr ? "منتهية" : "Expired", "text-destructive"],
                ] as const
              ).map(([n, label, color]) => (
                <div key={label} className={cn("rounded-[14px] p-2.5 text-center", soft)}>
                  <b className={cn("block font-head text-xl font-semibold tabular-nums", color)}>{n}</b>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stat cards: tilt + rolling digits */}
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <button
              key={k.label}
              type="button"
              onClick={() => navigate(k.href)}
              className={cn(glass, "lux-tilt lux-rise col-span-12 sm:col-span-6 xl:col-span-3 flex min-h-[170px] flex-col gap-3.5 p-5 text-start")}
              style={{ ["--i" as string]: 2 + i }}
            >
              <span className="relative z-[1] flex w-full items-center justify-between gap-3">
                <span className="min-w-0 truncate text-[13.5px] text-muted-foreground">{k.label}</span>
                <Squircle tone={k.tone} size={52}>
                  <Icon className="h-6 w-6" />
                </Squircle>
              </span>
              <span className="relative z-[1] flex w-full items-baseline justify-end gap-2 font-head text-4xl font-medium leading-none" dir="ltr">
                <small className="font-sans text-[13px] font-medium text-muted-foreground">{k.unit}</small>
                <Odometer value={k.value} />
              </span>
              <span className="relative z-[1] mt-auto flex w-full items-center justify-between gap-2">
                {k.foot}
                {k.spark && <Spark values={k.spark} color={k.color} />}
              </span>
            </button>
          );
        })}

        {/* Today's priorities */}
        <section className={cn(glass, "lux-rise col-span-12 xl:col-span-7 isolate p-5 sm:p-[22px]")} style={{ ["--i" as string]: 6 }}>
          <span className="lux-flow" aria-hidden="true" />
          <Head title={isAr ? "أولويات اليوم" : "Today's priorities"} note={overview?.attentionTotal ? (isAr ? `${overview.attentionTotal} تحتاج قرارك` : `${overview.attentionTotal} need a decision`) : undefined} />
          {overview && overview.attention.length === 0 && (
            <div className={cn("relative z-[1] flex items-center gap-4 rounded-[18px] px-4 py-5", soft)}>
              <Squircle tone="emerald" size={48}>
                <Check className="h-6 w-6" />
              </Squircle>
              <b className="font-semibold">{isAr ? "لا أولويات عاجلة — كل الوثائق سارية" : "Nothing urgent — every document is valid"}</b>
            </div>
          )}
          {(overview?.attention ?? []).slice(0, 4).map((item) => {
            const [tone, text] = stateOf(item.days);
            const Icon = item.sourceType === "COMPANY_DOCUMENT" ? FileText : /تأمين|صحي/.test(item.documentAr) ? HeartPulse : IdCard;
            return (
              <div key={item.key} className={cn("relative z-[1] mt-2.5 flex items-center gap-3.5 rounded-[18px] px-3.5 py-3 transition-transform duration-300 hover:-translate-x-1.5", soft)}>
                <span className="relative">
                  <Squircle tone={tone === "bad" ? "rose" : "amber"} size={48}>
                    <Icon className="h-[22px] w-[22px]" />
                  </Squircle>
                  {tone === "bad" && <span aria-hidden="true" className="absolute -inset-[3px] rounded-[18px] border-2 border-destructive" style={{ animation: "lux-halo 2.4s ease-out infinite" }} />}
                </span>
                <button type="button" onClick={() => openItem(item)} className="min-w-0 flex-1 text-start">
                  <b className="block truncate text-[14.5px] font-semibold">{titleOf(item)}</b>
                  <small className="block truncate text-[12.5px] text-muted-foreground">
                    {isAr ? item.documentAr : item.documentEn}
                    {item.documentNumber && (
                      <>
                        {" "}
                        <span dir="ltr">{item.documentNumber}</span>
                      </>
                    )}
                    {item.branchName && ` · ${item.branchName}`}
                  </small>
                </button>
                <Chip tone={tone}>{text}</Chip>
                {item.days < 0 || !canAddTask ? (
                  <button type="button" onClick={() => openItem(item)} className="h-[38px] shrink-0 rounded-[13px] bg-foreground px-4 text-[13px] font-semibold text-background transition-transform hover:scale-105">
                    {isAr ? "ابدأ التجديد" : "Start renewal"}
                  </button>
                ) : item.taskAdded ? (
                  <span className="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-[13px] bg-success/10 px-4 text-[13px] font-semibold text-success">
                    <Check className="h-4 w-4" /> {isAr ? "في المهام" : "In tasks"}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={addTask.isPending}
                    onClick={(e) => {
                      burst(e.currentTarget);
                      addTask.mutate(item);
                    }}
                    className="h-[38px] shrink-0 rounded-[13px] bg-foreground px-4 text-[13px] font-semibold text-background transition-transform hover:scale-105 disabled:opacity-60"
                  >
                    {isAr ? "أضف للمهام" : "Add to tasks"}
                  </button>
                )}
              </div>
            );
          })}
        </section>

        {/* Today's tasks */}
        {canTasks && (
          <section className={cn(glass, "lux-rise col-span-12 xl:col-span-5 p-5 sm:p-[22px]")} style={{ ["--i" as string]: 7 }}>
            <Head title={isAr ? "مهام اليوم" : "Today's tasks"} note={isAr ? "اضغط لتعليم المهمة" : "Tap to tick"} />
            <div className="relative z-[1] mb-2.5 flex items-center gap-3.5">
              <b className="font-head text-[22px] font-medium tabular-nums">
                {doneCount}
                <small className="text-sm text-muted-foreground"> / {taskList.length}</small>
              </b>
              <div className={cn("h-2.5 flex-1 overflow-hidden rounded-full", soft)}>
                <i className="block h-full rounded-full bg-gradient-to-l from-sky-400 to-teal-400 shadow-[0_0_16px_#38bdf8] transition-[width] duration-700" style={{ width: `${taskList.length ? (doneCount / taskList.length) * 100 : 0}%` }} />
              </div>
            </div>
            {taskList.length === 0 && (
              <button type="button" onClick={() => navigate("/daily-tasks")} className="relative z-[1] py-3 text-sm text-muted-foreground hover:text-foreground">
                {isAr ? "لا توجد مهام اليوم — أضف مهمة" : "No tasks today — add one"}
              </button>
            )}
            {taskList.slice(0, 6).map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={!canEditTask || toggleTask.isPending}
                aria-pressed={t.done}
                onClick={(e) => {
                  if (!t.done) burst(e.currentTarget.querySelector("span") ?? e.currentTarget);
                  toggleTask.mutate(t);
                }}
                className="relative z-[1] flex min-h-11 w-full items-center gap-3 rounded-[14px] px-2 text-start transition-colors hover:bg-secondary"
              >
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-all duration-300 [transition-timing-function:cubic-bezier(.3,1.8,.5,1)]",
                    t.done ? "-rotate-[8deg] bg-gradient-to-br from-emerald-300 to-emerald-700 text-white shadow-[0_6px_14px_-6px_#1f8a57]" : "shadow-[inset_0_0_0_2px_hsl(var(--muted-foreground)/.5)]"
                  )}
                >
                  {t.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className={cn("truncate text-sm transition-colors", t.done ? "text-muted-foreground line-through" : "")}>{t.title}</span>
              </button>
            ))}
          </section>
        )}

        {/* Expiries over the coming months */}
        <section className={cn(glass, "lux-rise col-span-12 xl:col-span-8 p-5 sm:p-[22px]")} style={{ ["--i" as string]: 8 }}>
          <Head title={isAr ? "الوثائق التي تنتهي في الأشهر القادمة" : "Documents ending in the coming months"} note={isAr ? "6 أشهر" : "6 months"} />
          {chart && (
            <svg viewBox={`0 0 ${chart.w} ${chart.h}`} width="100%" className="relative z-[1] text-foreground" style={{ direction: "ltr" }} role="img" aria-label={isAr ? "الوثائق التي تنتهي في كل شهر" : "Documents ending each month"}>
              <defs>
                <linearGradient id={`${gid}a`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#38BDF8" stopOpacity=".45" />
                  <stop offset="1" stopColor="#38BDF8" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`${gid}l`} x1={isAr ? "1" : "0"} x2={isAr ? "0" : "1"}>
                  <stop offset="0" stopColor="#38BDF8" />
                  <stop offset="1" stopColor="#2DD4B0" />
                </linearGradient>
                <filter id={`${gid}lg`}>
                  <feGaussianBlur stdDeviation="3.5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {[0, 0.5, 1].map((f) => (
                <line key={f} x1={chart.pl} x2={chart.w - chart.pr} y1={chart.top + f * (chart.h - chart.top - chart.bot)} y2={chart.top + f * (chart.h - chart.top - chart.bot)} stroke="currentColor" opacity=".08" />
              ))}
              <path d={chart.area} fill={`url(#${gid}a)`} style={{ opacity: 0, animation: "lux-fade 1s 1s ease forwards" }} />
              <path d={chart.c} fill="none" stroke={`url(#${gid}l)`} strokeWidth={3.5} strokeLinecap="round" filter={`url(#${gid}lg)`} strokeDasharray={1000} strokeDashoffset={1000} style={{ animation: "lux-draw 1.8s .3s cubic-bezier(.2,.9,.2,1) forwards" }} />
              {chart.pts.map((p, i) => (
                <g key={i}>
                  <circle cx={p[0]} cy={p[1]} r={i ? 4 : 6} className="fill-background" stroke="#38BDF8" strokeWidth={2.5} />
                  <text x={p[0]} y={p[1] - 13} textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
                    {chart.vals[i]}
                  </text>
                  <text x={p[0]} y={chart.h - 10} textAnchor="middle" fontSize="11.5" fill="currentColor" opacity=".55">
                    {chart.labels[i]}
                  </text>
                </g>
              ))}
              {!reduceMotion() && (
                <circle r="5" fill="#fff" filter={`url(#${gid}lg)`}>
                  <animateMotion dur="5s" repeatCount="indefinite" begin="2s" path={chart.c} />
                </circle>
              )}
            </svg>
          )}
        </section>

        {/* By type */}
        <section className={cn(glass, "lux-rise col-span-12 xl:col-span-4 p-5 sm:p-[22px]")} style={{ ["--i" as string]: 9 }}>
          <Head title={isAr ? "حسب النوع" : "By type"} note={`${tracked} ${isAr ? "وثيقة" : "documents"}`} />
          <div className="relative z-[1] grid gap-4">
            {types
              .filter(([k], i) => i < 4 || (byType[k] ?? 0) > 0)
              .map(([k, ar, en, Icon, tone]) => {
                const n = byType[k] ?? 0;
                return (
                  <div key={k} className="grid grid-cols-[38px_1fr_auto] items-center gap-3">
                    <Squircle tone={tone} size={38}>
                      <Icon className="h-[17px] w-[17px]" />
                    </Squircle>
                    <span className="flex flex-col gap-[7px] text-[13.5px]">
                      {isAr ? ar : en}
                      <em className={cn("block h-[9px] overflow-hidden rounded-full", soft)}>
                        <i
                          className="block h-full rounded-full bg-gradient-to-l from-sky-400 to-teal-400 transition-[width] duration-[1300ms] [transition-timing-function:cubic-bezier(.2,.9,.2,1)]"
                          style={{ width: barsOn ? `${(n / Math.max(1, tracked)) * 100}%` : 0 }}
                        />
                      </em>
                    </span>
                    <b className="font-head text-[17px] font-semibold tabular-nums">{n}</b>
                  </div>
                );
              })}
          </div>
        </section>
      </div>
    </>
  );
}

function Chip({ tone, children }: { tone: "ok" | "warn" | "bad" | "muted"; children: ReactNode }) {
  const cls = {
    ok: "text-success bg-success/10",
    warn: "text-warning bg-warning/10",
    bad: "text-destructive bg-destructive/10",
    muted: "text-muted-foreground bg-secondary",
  }[tone];
  return <span className={cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", cls)}>{children}</span>;
}
