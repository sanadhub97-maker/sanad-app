import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BarChart3, Bell, Building2, Check, Clock, FileText, HeartPulse, IdCard, ListChecks, Plus, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { dashboardApi, type DashboardAttentionItem } from "@/api/dashboard";
import { employeesApi } from "@/api/employees";
import { tasksApi, type DailyTask } from "@/api/tasks";
import { useAuthStore } from "@/stores/authStore";
import { luluPop } from "@/components/lulu/lulu-effects";
import { cn } from "@/lib/utils";

/* The home page in the Pearl design, as approved in the preview: the day at a
   glance over a sunrise scene, compliance, six colour cards each with its own
   motion, today's priorities and tasks, the week, and what ends when. */

function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysAr(n: number) {
  return n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يومًا`;
}
const docsAr = (n: number) => (n === 1 ? "وثيقة واحدة" : n === 2 ? "وثيقتان" : n <= 10 ? `${n} وثائق` : `${n} وثيقة`);
const v = (o: Record<string, string | number>) => o as CSSProperties;

function useMedia(query: string) {
  const [on, setOn] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const m = window.matchMedia?.(query);
    if (!m) return;
    const f = () => setOn(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [query]);
  return on;
}

/** Waits two frames so rings and bars grow from zero. */
function useArmed() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return on;
}

/** Numbers count up once. */
function Count({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setN(to);
    const t0 = performance.now();
    let id = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 1100);
      setN(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [to]);
  return <>{Math.round(n).toLocaleString("en-US")}</>;
}

/** The sunrise over the dunes: beside the text on wide screens, a banner above it below 900px. */
function sceneSvg(wide: boolean) {
  const W = wide ? 600 : 300;
  const sx = wide ? 190 : 110;
  const sy = wide ? 84 : 96;
  const dx = wide ? 250 : 0;
  let rays = "";
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    rays += `<line x1="${(sx + Math.cos(a) * 33).toFixed(1)}" y1="${(sy + Math.sin(a) * 33).toFixed(1)}" x2="${(sx + Math.cos(a) * 45).toFixed(1)}" y2="${(sy + Math.sin(a) * 45).toFixed(1)}"/>`;
  }
  const dunes = wide
    ? ["M0 116 C120 94 240 102 360 114 S540 104 600 110 V160 H0Z", "M0 136 C140 120 280 130 420 140 S560 128 600 132 V160 H0Z"]
    : ["M0 118 C60 96 120 104 180 116 S270 106 300 112 V160 H0Z", "M0 136 C70 120 140 130 210 140 S280 130 300 134 V160 H0Z"];
  return (
    `<svg viewBox="0 0 ${W} 160" preserveAspectRatio="xMidYMax slice">` +
    `<defs><linearGradient id="lu-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--l-sky-d)"/><stop offset=".75" style="stop-color:var(--l-amber-t)"/></linearGradient>` +
    `<radialGradient id="lu-sun"><stop offset="0" style="stop-color:var(--l-amber)"/><stop offset="1" style="stop-color:var(--l-amber);stop-opacity:0"/></radialGradient></defs>` +
    `<rect width="${W}" height="160" fill="url(#lu-sky)"/>` +
    `<g class="sunb"><circle class="halo" cx="${sx}" cy="${sy}" r="62" fill="url(#lu-sun)" opacity=".4"/><g class="rays">${rays}</g><circle cx="${sx}" cy="${sy}" r="25" style="fill:var(--l-amber)"/><circle cx="${sx - 7}" cy="${sy - 7}" r="8" fill="#fff" opacity=".35"/></g>` +
    `<g class="cl1" style="fill:var(--l-surface)" opacity=".92"><ellipse cx="40" cy="40" rx="24" ry="9"/><ellipse cx="54" cy="33" rx="15" ry="11"/><ellipse cx="30" cy="36" rx="10" ry="8"/></g>` +
    `<g class="cl2" style="fill:var(--l-surface)" opacity=".75"><ellipse cx="10" cy="64" rx="18" ry="7"/><ellipse cx="20" cy="59" rx="11" ry="8"/></g>` +
    `<g class="birds" fill="none" style="stroke:var(--l-ink)" stroke-width="1.7" stroke-linecap="round" opacity=".55"><path class="bird" d="M0 20 q5 -6 10 0 q5 -6 10 0"/><path class="bird" d="M26 30 q4 -5 8 0 q4 -5 8 0" style="animation-delay:.25s"/><path class="bird" d="M14 42 q3 -4 6 0 q3 -4 6 0" style="animation-delay:.12s"/></g>` +
    `<path d="${dunes[0]}" style="fill:var(--l-amber-d)"/>` +
    `<g transform="translate(${dx} 0)"><g class="palm" fill="none" stroke-linecap="round"><path d="M232 134 C235 114 230 98 236 80" style="stroke:var(--l-amber)" stroke-width="5"/>` +
    `<g style="stroke:var(--l-green)" stroke-width="4.5"><path d="M236 80 C224 72 212 74 203 82"/><path d="M236 80 C228 66 218 62 207 64"/><path d="M236 80 C244 66 256 64 265 70"/><path d="M236 80 C248 74 258 78 265 88"/><path d="M236 80 C236 68 240 60 247 55"/></g></g></g>` +
    `<path d="${dunes[1]}" style="fill:var(--l-amber)" opacity=".5"/></svg>`
  );
}

export default function DashboardLulu() {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canTasks = hasPermission("tasks.view");
  const canAddTask = hasPermission("tasks.create");
  const canEditTask = hasPermission("tasks.edit");
  const today = localIso();
  const armed = useArmed();
  const wideScene = useMedia("(max-width: 899px)");
  const narrowChart = useMedia("(max-width: 599px)");

  const { data: summary } = useQuery({ queryKey: ["dashboard", "summary"], queryFn: dashboardApi.summary });
  const { data: charts } = useQuery({ queryKey: ["dashboard", "charts"], queryFn: dashboardApi.charts });
  const { data: overview } = useQuery({ queryKey: ["dashboard", "overview"], queryFn: dashboardApi.overview });
  const { data: people } = useQuery({ queryKey: ["employees", { page: 1, pageSize: 4 }], queryFn: () => employeesApi.list({ page: 1, pageSize: 4 }), enabled: hasPermission("employees.view") });
  const dayKey = ["tasks", "day", today];
  const { data: tasks } = useQuery({ queryKey: dayKey, queryFn: () => tasksApi.day(today), enabled: canTasks });
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
    onMutate: (t) => {
      queryClient.setQueryData<DailyTask[]>(dayKey, (old) => old?.map((x) => (x.id === t.id ? { ...x, done: !t.done } : x)));
    },
    onSettled: refresh,
    onError: () => toast.error(isAr ? "تعذّر تحديث المهمة" : "Couldn't update the task"),
  });

  const now = new Date();
  const locale = isAr ? "ar-EG-u-nu-latn" : "en-GB";
  const dateLine = useMemo(() => {
    const d = new Date();
    const g = d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
    let h = "";
    try {
      h = d.toLocaleDateString(isAr ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      /* no Hijri calendar in this browser */
    }
    return h ? `${g} · ${h.replace(/\s*(هـ|AH)$/, "")} ${isAr ? "هـ" : "AH"}` : g;
  }, [locale, isAr]);
  const hour = now.getHours();
  const greeting = isAr ? (hour < 12 ? "صباح الخير" : "مساء الخير") : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const tracked = summary?.totalTrackedDocuments ?? 0;
  const valid = summary?.validDocuments ?? 0;
  const soon = summary?.expiringDocuments ?? 0;
  const expired = summary?.expiredDocuments ?? 0;
  const score = tracked ? valid / tracked : 1;
  const taskList = tasks ?? [];
  const done = taskList.filter((t) => t.done).length;
  const dayPct = taskList.length ? done / taskList.length : 0;

  // Payments: this month against last month.
  const monthly = useMemo(() => {
    const byKey = new Map((charts?.monthlyPayments ?? []).map((m) => [String(m.month).slice(0, 7), m.total]));
    const n = new Date();
    return Array.from({ length: 6 }, (_, i) => byKey.get(localIso(new Date(n.getFullYear(), n.getMonth() - 5 + i, 1)).slice(0, 7)) ?? 0);
  }, [charts]);
  const thisMonth = summary?.monthlyPaymentsAmount ?? 0;
  const change = monthly[4] > 0 ? Math.round(((thisMonth - monthly[4]) / monthly[4]) * 100) : null;
  const nearest = (overview?.attention ?? []).filter((a) => a.days >= 0).reduce<number | null>((m, a) => (m === null || a.days < m ? a.days : m), null);
  const branches = overview?.branches;
  const faces = (people?.data ?? []).map((e) => (e.fullNameAr || e.fullNameEn || "?").trim().charAt(0));

  const kpis = [
    {
      tone: "indigo",
      label: isAr ? "الموظفون" : "Employees",
      value: summary?.totalEmployees ?? 0,
      unit: isAr ? "موظف" : "employees",
      icon: Users,
      note: isAr ? `${summary?.activeEmployees ?? 0} على رأس العمل` : `${summary?.activeEmployees ?? 0} on duty`,
      href: "/employees",
      fx: (
        <div className="lu-faces">
          {(faces.length ? faces : ["ع", "ص", "ر", "م"]).slice(0, 4).map((f, i) => (
            <i key={i}>{f}</i>
          ))}
        </div>
      ),
    },
    {
      tone: "sky",
      label: isAr ? "الوثائق المتابَعة" : "Tracked documents",
      value: tracked,
      unit: isAr ? "وثيقة" : "documents",
      icon: FileText,
      note: isAr ? `${valid} سارية` : `${valid} valid`,
      href: "/employee-documents",
      fx: (
        <div className="lu-sheets">
          <i />
          <i />
          <i />
        </div>
      ),
    },
    {
      tone: "rose",
      label: isAr ? "منتهية" : "Expired",
      value: expired,
      unit: isAr ? "وثائق" : "documents",
      icon: Bell,
      note: expired ? (isAr ? "تحتاج تجديدًا الآن" : "Renew now") : isAr ? "لا شيء منتهٍ" : "Nothing expired",
      href: "/employee-documents?status=EXPIRED",
      fx: (
        <div className="lu-bell">
          <Bell strokeWidth={2} />
        </div>
      ),
    },
    {
      tone: "amber",
      label: isAr ? "تنتهي قريبًا" : "Ending soon",
      value: soon,
      unit: isAr ? "وثائق" : "documents",
      icon: Clock,
      note: nearest !== null ? (isAr ? (nearest === 0 ? "أقربها اليوم" : `أقربها بعد ${daysAr(nearest)}`) : `Nearest in ${nearest}d`) : isAr ? "لا شيء قريب" : "Nothing soon",
      href: "/employee-documents?status=EXPIRING_SOON",
      fx: (
        <div className="lu-glass-h">
          <i />
        </div>
      ),
    },
    {
      tone: "teal",
      label: isAr ? "المؤسسات" : "Establishments",
      value: branches?.total ?? 0,
      unit: isAr ? "مؤسسة" : "branches",
      icon: Building2,
      note: isAr ? `${branches?.active ?? 0} نشطة · ${branches?.cities ?? 0} ${(branches?.cities ?? 0) === 1 ? "مدينة" : "مدن"}` : `${branches?.active ?? 0} active · ${branches?.cities ?? 0} cities`,
      href: "/branches",
      fx: (
        <div className="lu-city">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      ),
    },
    {
      tone: "violet",
      label: isAr ? "مدفوعات الشهر" : "This month's payments",
      value: Math.round(thisMonth),
      unit: isAr ? "ر.س" : "SAR",
      icon: Wallet,
      note: change !== null ? `${change >= 0 ? "+" : ""}${change}% ${isAr ? "عن الشهر الماضي" : "vs last month"}` : isAr ? "هذا الشهر" : "This month",
      href: "/payments",
      fx: (
        <div className="lu-pay">
          <svg width="96" height="46" viewBox="0 0 96 46" style={{ direction: "ltr" }} aria-hidden="true">
            <path d="M2 40 L18 30 L32 34 L48 20 L62 24 L80 8" fill="none" stroke="var(--c)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="coin" />
        </div>
      ),
    },
  ];

  const stateOf = (d: number): [string, string] =>
    d < 0
      ? ["rose", isAr ? `منتهية منذ ${daysAr(-d)}` : `Expired ${-d}d ago`]
      : d === 0
        ? ["rose", isAr ? "تنتهي اليوم" : "Expires today"]
        : d <= 30
          ? ["amber", isAr ? `باقي ${daysAr(d)}` : `${d}d left`]
          : ["green", isAr ? `باقي ${daysAr(d)}` : `${d}d left`];
  const titleOf = (item: DashboardAttentionItem) => {
    const name = (isAr ? item.nameAr : item.nameEn || item.nameAr).trim();
    if (!isAr) return `${item.documentEn} — ${name}`;
    const doc = item.documentAr.replace(/^ال/, "");
    return item.sourceType === "EMPLOYEE_IQAMA" || item.sourceType === "EMPLOYEE_PASSPORT" ? `تجديد ${doc} ${name}` : `${item.documentAr} — ${name}`;
  };
  const openItem = (item: DashboardAttentionItem) => navigate(item.employeeId ? `/employees/${item.employeeId}` : "/company-documents");

  // Compliance ring in three segments.
  const R = 58;
  const C = 2 * Math.PI * R;
  const seg = (n: number) => (tracked ? (n / tracked) * C : 0);
  const ringSeg = (len: number, off: number, color: string) =>
    len > 3 ? <circle className="v" cx="70" cy="70" r={R} fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" strokeDasharray={`${armed ? len - 3 : 0} 999`} strokeDashoffset={-off} /> : null;
  const DR = 48;
  const DC = 2 * Math.PI * DR;

  // The week, Saturday to Friday.
  const days = useMemo(() => {
    const n = new Date();
    const start = new Date(n.getFullYear(), n.getMonth(), n.getDate() - ((n.getDay() + 1) % 7));
    return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, []);
  const tasksByDate = new Map((week ?? []).map((d) => [d.date, d.total]));
  const weekNote = `${days[0].toLocaleDateString(locale, { day: "numeric", month: "long" })} – ${days[6].toLocaleDateString(locale, { day: "numeric", month: "long" })}`;

  // What ends in each of the coming six months.
  const upcoming = overview?.upcoming ?? [];
  const W = narrowChart ? 360 : 620;
  const H = 200;
  const pl = 16;
  const bot = 34;
  const top = 26;
  const cw = narrowChart ? 34 : 46;
  const maxUp = Math.max(1, ...upcoming.map((m) => m.count));
  const step = upcoming.length ? (W - pl * 2) / upcoming.length : 0;
  const upTotal = upcoming.reduce((a, m) => a + m.count, 0);

  const types: [string, string, string, string][] = [
    ["IQAMA", "الإقامات", "Iqamas", "sky"],
    ["PASSPORT", "الجوازات", "Passports", "indigo"],
    ["HEALTH_CERTIFICATE", "الشهادات الصحية", "Health certificates", "teal"],
    ["MEDICAL_INSURANCE", "التأمين الطبي", "Medical insurance", "amber"],
    ["COMPANY", "وثائق الشركة", "Company documents", "violet"],
  ];
  const byType = overview?.byType ?? {};
  const typeTotal = Object.values(byType).reduce((a, b) => a + b, 0) || tracked;

  const actions: [string, typeof Users, string, string][] = [
    [isAr ? "إضافة موظف" : "Add employee", Users, "indigo", "/employees?new=true"],
    [isAr ? "وثيقة" : "Document", FileText, "sky", "/employee-documents"],
    [isAr ? "دفعة" : "Payment", Wallet, "violet", "/payments"],
    [isAr ? "مهمة" : "Task", ListChecks, "green", "/daily-tasks"],
    [isAr ? "تقرير" : "Report", BarChart3, "rose", "/reports"],
  ];

  const attention = (overview?.attention ?? []).slice(0, 4);

  return (
    <>
      <PageHeader
        title={`${greeting}${isAr ? "، " : ", "}${user?.fullName ?? ""}`}
        description={dateLine}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> {isAr ? "جديد" : "New"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-3xl p-2">
              {actions.slice(0, 4).map(([label, Icon, tone, href]) => (
                <DropdownMenuItem key={href} onSelect={() => navigate(href)} className={cn("cursor-pointer gap-2.5 rounded-2xl px-3 py-2.5", `lt-${tone}`)}>
                  <span className="lu-ci" style={{ width: 30, height: 30, borderRadius: 10 }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="lu-grid">
        {/* The day at a glance */}
        <section className="lu-cc lu-rise lt-sky lu-hero lu-s8" style={v({ "--i": 0 })}>
          <div className="waves" aria-hidden="true">
            <svg className="w1" viewBox="0 0 1200 70" preserveAspectRatio="none">
              <path d="M0 40 C150 10 300 70 450 40 S750 10 900 40 S1150 70 1200 40 V70 H0 Z" fill="var(--d)" />
            </svg>
            <svg className="w2" viewBox="0 0 1200 70" preserveAspectRatio="none">
              <path d="M0 50 C200 25 350 70 600 48 S1000 25 1200 50 V70 H0 Z" fill="var(--t)" />
            </svg>
          </div>
          <div className="lu-dayring">
            <svg width="116" height="116" viewBox="0 0 116 116" aria-hidden="true">
              <circle cx="58" cy="58" r={DR} fill="none" stroke="var(--l-surface)" strokeWidth="12" />
              <circle className="v" cx="58" cy="58" r={DR} fill="none" stroke="var(--c)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${armed ? dayPct * DC : 0} ${DC}`} opacity={dayPct > 0 ? 1 : 0} />
            </svg>
            <div className="c">
              <div>
                <b className="lu-num">{Math.round(dayPct * 100)}%</b>
                <small>{isAr ? "من يومك" : "of your day"}</small>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <h2>{isAr ? "يومك باختصار" : "Your day at a glance"}</h2>
            <p>
              {isAr ? (
                <>
                  {canTasks && (
                    <>
                      أنجزت{" "}
                      <b>
                        {done} من {taskList.length}
                      </b>{" "}
                      مهام، و
                    </>
                  )}
                  لديك <b>{docsAr(overview?.expired ?? expired)} منتهية</b> و<b>{overview?.endingIn30 ?? soon} تنتهي</b> خلال الثلاثين يومًا القادمة.
                </>
              ) : (
                <>
                  {canTasks && (
                    <>
                      You finished{" "}
                      <b>
                        {done} of {taskList.length}
                      </b>{" "}
                      tasks;{" "}
                    </>
                  )}
                  <b>{overview?.expired ?? expired} documents</b> have expired and <b>{overview?.endingIn30 ?? soon}</b> end within 30 days.
                </>
              )}
            </p>
            <div className="lu-acts">
              {actions.map(([label, Icon, tone, href]) => (
                <button key={href} type="button" className={cn("lu-act", `lt-${tone}`)} onClick={() => navigate(href)}>
                  <span>
                    <Icon />
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="lu-scene" aria-hidden="true" style={v({ "--far": `${(wideScene ? 600 : 300) + 30}px` })} dangerouslySetInnerHTML={{ __html: sceneSvg(wideScene) }} />
        </section>

        {/* Compliance */}
        <section className="lu-cc lu-rise lt-teal lu-s4" style={v({ "--i": 1 })}>
          <div className="lu-hd">
            <h2>{isAr ? "صحة الامتثال" : "Compliance"}</h2>
            <span className="lu-note">
              {isAr ? (score >= 0.9 ? "ممتاز" : score >= 0.6 ? "جيد" : "يحتاج متابعة") : score >= 0.9 ? "Excellent" : score >= 0.6 ? "Good" : "Needs follow-up"}
            </span>
          </div>
          <div className="lu-ringcard">
            <div className="lu-ring">
              <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
                <circle cx="70" cy="70" r={R} fill="none" stroke="var(--l-surface)" strokeWidth="13" />
                {ringSeg(seg(valid), 0, "var(--l-green)")}
                {ringSeg(seg(soon), seg(valid), "var(--l-amber)")}
                {ringSeg(seg(expired), seg(valid) + seg(soon), "var(--l-rose)")}
              </svg>
              <div className="c">
                <div>
                  <b className="lu-num">
                    <Count to={Math.round(score * 100)} />%
                  </b>
                  <small>{isAr ? "سارية" : "valid"}</small>
                </div>
              </div>
            </div>
            <div className="lu-legend">
              {(
                [
                  [valid, isAr ? "سارية" : "Valid", "var(--l-green)"],
                  [soon, isAr ? "قريبة" : "Soon", "var(--l-amber)"],
                  [expired, isAr ? "منتهية" : "Expired", "var(--l-rose)"],
                ] as const
              ).map(([n, label, color]) => (
                <div key={label}>
                  <i style={{ background: color }} />
                  {label}
                  <b className="lu-num">{n}</b>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Six colour cards, each with its own motion */}
        <div className="lu-kpis">
          {kpis.map((k, i) => {
            const Icon = k.icon;
            return (
              <button key={k.label} type="button" onClick={() => navigate(k.href)} className={cn("lu-cc lu-rise lu-tilt lu-kpi", `lt-${k.tone}`)} style={v({ "--i": 2 + i })}>
                <span className="lu-hd">
                  <span className="lbl">{k.label}</span>
                  <span className="lu-sq ic">
                    <Icon />
                  </span>
                </span>
                <span className="val lu-num">
                  <span>
                    <Count to={k.value} />
                  </span>
                  <small>{k.unit}</small>
                </span>
                <span className="lu-note">{k.note}</span>
                <span className="fx" aria-hidden="true">
                  {k.fx}
                </span>
              </button>
            );
          })}
        </div>

        {/* Today's priorities */}
        <section className={cn("lu-cc lu-rise lt-rose", canTasks ? "lu-s7" : "lu-s12")} style={v({ "--i": 8 })}>
          <div className="lu-hd">
            <h2>{isAr ? "أولويات اليوم" : "Today's priorities"}</h2>
            {!!overview?.attentionTotal && <span className="lu-note">{isAr ? `${overview.attentionTotal} تحتاج قرارك` : `${overview.attentionTotal} need a decision`}</span>}
          </div>
          {overview && attention.length === 0 && (
            <div className="lu-prow lt-green">
              <span className="lu-pi">
                <Check />
              </span>
              <span className="lu-cell">
                <b>{isAr ? "لا أولويات عاجلة" : "Nothing urgent"}</b>
                <small>{isAr ? "كل الوثائق سارية" : "Every document is valid"}</small>
              </span>
            </div>
          )}
          {attention.map((item, j) => {
            const [tone, text] = stateOf(item.days);
            const Icon = item.sourceType === "COMPANY_DOCUMENT" ? FileText : /تأمين|صحي/.test(item.documentAr) ? HeartPulse : IdCard;
            return (
              <div key={item.key} className={cn("lu-prow", `lt-${tone}`)} style={v({ "--j": j })}>
                <span className={cn("lu-pi", item.days < 0 && "pulse")}>
                  <Icon />
                </span>
                <button type="button" className="lu-cell" onClick={() => openItem(item)}>
                  <b>{titleOf(item)}</b>
                  <small>
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
                <span className="lu-chip">{text}</span>
                {item.days < 0 || !canAddTask ? (
                  <button type="button" className="lu-do" onClick={() => openItem(item)}>
                    {isAr ? "ابدأ التجديد" : "Start renewal"}
                  </button>
                ) : item.taskAdded ? (
                  <span className="lu-do done">
                    <Check /> {isAr ? "في المهام" : "In tasks"}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="lu-do"
                    disabled={addTask.isPending}
                    onClick={(e) => {
                      luluPop(e.currentTarget);
                      addTask.mutate(item);
                    }}
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
          <section className="lu-cc lu-rise lt-green lu-s5" style={v({ "--i": 9 })}>
            <div className="lu-hd">
              <h2>{isAr ? "مهام اليوم" : "Today's tasks"}</h2>
              <span className="lu-note">{isAr ? `${done} من ${taskList.length}` : `${done} of ${taskList.length}`}</span>
            </div>
            <div className="lu-bar">
              <i style={{ width: `${armed ? dayPct * 100 : 0}%` }} />
            </div>
            {taskList.length === 0 && (
              <button type="button" className="lu-task" onClick={() => navigate("/daily-tasks")}>
                <span className="box" />
                <span className="tt">{isAr ? "لا توجد مهام اليوم — أضف مهمة" : "No tasks today — add one"}</span>
              </button>
            )}
            {taskList.slice(0, 6).map((t) => (
              <button
                key={t.id}
                type="button"
                className={cn("lu-task", t.done && "on")}
                aria-pressed={t.done}
                disabled={!canEditTask}
                onClick={(e) => {
                  if (!t.done) luluPop(e.currentTarget.querySelector(".box"));
                  toggleTask.mutate(t);
                }}
              >
                <span className="box">
                  <Check strokeWidth={3.2} />
                </span>
                <span className="tt">{t.title}</span>
              </button>
            ))}
          </section>
        )}

        {/* The week */}
        <section className="lu-cc lu-rise lt-sky lu-s12" style={v({ "--i": 10 })}>
          <div className="lu-hd">
            <h2>{isAr ? "هذا الأسبوع" : "This week"}</h2>
            <span className="lu-note">{weekNote}</span>
          </div>
          <div className="lu-week">
            {days.map((d) => {
              const key = localIso(d);
              const isToday = key === today;
              const n = Math.min(2, tasksByDate.get(key) ?? 0);
              const exp = (overview?.expiriesByDate[key] ?? 0) > 0;
              return (
                <button key={key} type="button" className={cn("lu-day", isToday && "today")} onClick={() => navigate(`/daily-tasks?date=${key}`)}>
                  <small>{d.toLocaleDateString(locale, { weekday: narrowChart ? "short" : "long" })}</small>
                  <b className="lu-num">{d.getDate()}</b>
                  <span className="dots">
                    {Array.from({ length: n }).map((_, j) => (
                      <i key={j} style={{ background: "var(--l-green)" }} />
                    ))}
                    {exp && <i style={{ background: "var(--l-amber)" }} />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* What ends in the coming months */}
        <section className="lu-cc lu-rise lt-violet lu-s8" style={v({ "--i": 11 })}>
          <div className="lu-hd">
            <h2>{isAr ? "ما ينتهي في الأشهر القادمة" : "Ending in the coming months"}</h2>
            <span className="lu-note">{isAr ? docsAr(upTotal) : `${upTotal} documents`}</span>
          </div>
          <svg className="lu-chart" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ direction: "ltr", marginTop: 8 }} role="img" aria-label={isAr ? "عدد الوثائق التي تنتهي في كل شهر" : "Documents ending each month"}>
            <line x1={pl} x2={W - pl} y1={H - bot} y2={H - bot} stroke="var(--l-line)" />
            {upcoming.map((m, i) => {
              const x = isAr ? W - pl - (i + 0.5) * step : pl + (i + 0.5) * step;
              const hg = m.count ? (m.count / maxUp) * (H - top - bot) : 4;
              const y = H - bot - hg;
              const [yy, mo] = m.month.split("-").map(Number);
              const label = new Date(yy, mo - 1, 1).toLocaleDateString(locale, { month: narrowChart ? "short" : "long" });
              return (
                <g key={m.month}>
                  <rect className="col" style={{ animationDelay: `${0.3 + i * 0.08}s` }} x={x - cw / 2} y={y} width={cw} height={hg} rx="12" fill={i ? "var(--d)" : "var(--c)"} />
                  <text x={x} y={y - 9} textAnchor="middle" style={{ fill: "var(--l-ink)", fontWeight: 600 }}>
                    {m.count}
                  </text>
                  <text x={x} y={H - 10} textAnchor="middle">
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </section>

        {/* By type */}
        <section className="lu-cc lu-rise lt-amber lu-s4" style={v({ "--i": 12 })}>
          <div className="lu-hd">
            <h2>{isAr ? "حسب النوع" : "By type"}</h2>
            <span className="lu-note">{isAr ? docsAr(tracked) : `${tracked} documents`}</span>
          </div>
          <div className="lu-types">
            {types
              .filter(([k], i) => i < 4 || (byType[k] ?? 0) > 0)
              .map(([k, ar, en, tone]) => {
                const n = byType[k] ?? 0;
                return (
                  <div key={k} className={`lt-${tone}`}>
                    <span>{isAr ? ar : en}</span>
                    <b className="lu-num">{n}</b>
                    <em>
                      <i style={{ width: armed ? `${(n / Math.max(1, typeTotal)) * 100}%` : 0 }} />
                    </em>
                  </div>
                );
              })}
          </div>
        </section>
      </div>
    </>
  );
}
