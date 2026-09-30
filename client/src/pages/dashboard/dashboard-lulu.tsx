import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Bell, Building2, Check, Clock, Download, FileText, HeartPulse, IdCard, LogIn, Pencil, Plus, Sparkles, Trash2, TrendingDown, TrendingUp, Upload, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { dashboardApi, type DashboardAttentionItem } from "@/api/dashboard";
import { tasksApi, type DailyTask } from "@/api/tasks";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

/* The home page in the Royal design, as approved in the preview: a royal-blue
   welcome with a stack of documents, the compliance gauge, four stat cards,
   payments by category month by month, documents by status, what ends soon,
   the latest activity, payments by branch, and today's tasks. */

function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const daysAr = (n: number) => (n === 1 ? "يوم واحد" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يومًا`);
const docsAr = (n: number) => (n === 1 ? "وثيقة واحدة" : n === 2 ? "وثيقتان" : n <= 10 ? `${n} وثائق` : `${n} وثيقة`);
const v = (o: Record<string, string | number>) => o as CSSProperties;
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const kfmt = (n: number, isAr: boolean) => (n >= 1000 ? `${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} ${isAr ? "ألف" : "k"}` : fmt(n));
const PALETTE = ["#1e3a8a", "#2f5fe0", "#d4a441", "#20b2a6", "#8b8ff5", "#7cc4f5", "#a3adc4"];

/** Waits two frames so gauges and bars grow from zero. */
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
      const k = Math.min(1, Math.max(0, (now - t0 - 250) / 1100));
      setN(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [to]);
  return <>{fmt(n)}</>;
}

function curve(pts: [number, number][]) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** A small trend line; the oldest value sits on the reading side's start. */
function Spark({ values, color, rtl, delay = 0.6 }: { values: number[]; color: string; rtl: boolean; delay?: number }) {
  if (values.length < 2 || values.every((x) => x === values[0])) return null;
  const w = 84, h = 28, mn = Math.min(...values), mx = Math.max(...values), r = mx - mn || 1;
  const pts = values.map((x, i): [number, number] => [rtl ? w - (i * w) / (values.length - 1) : (i * w) / (values.length - 1), h - 3 - ((x - mn) / r) * (h - 6)]);
  const d = curve(pts);
  const id = `sp${color.replace(/[^a-z0-9]/gi, "")}`;
  const last = pts[pts.length - 1];
  return (
    <svg className="ry-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".3" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="ry-fade" style={v({ "--d": `${delay + 0.5}s` })} d={`${d} L${pts[pts.length - 1][0]} ${h} L${pts[0][0]} ${h}Z`} fill={`url(#${id})`} />
      <path className="ry-draw" style={v({ "--d": `${delay}s` })} pathLength={1} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle className="ry-fade" style={v({ "--d": `${delay + 1.1}s` })} cx={last[0]} cy={last[1]} r="2.8" fill={color} />
    </svg>
  );
}

export default function DashboardLulu() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canTasks = hasPermission("tasks.view");
  const canEditTask = hasPermission("tasks.edit");
  const today = localIso();
  const armed = useArmed();
  const locale = isAr ? "ar-EG-u-nu-latn" : "en-GB";

  const { data: summary } = useQuery({ queryKey: ["dashboard", "summary"], queryFn: dashboardApi.summary });
  const { data: charts } = useQuery({ queryKey: ["dashboard", "charts"], queryFn: dashboardApi.charts });
  const { data: overview } = useQuery({ queryKey: ["dashboard", "overview"], queryFn: dashboardApi.overview });
  const { data: recent } = useQuery({ queryKey: ["dashboard", "recent"], queryFn: dashboardApi.recentActivity, staleTime: 60_000 });
  const dayKey = ["tasks", "day", today];
  const { data: tasks } = useQuery({ queryKey: dayKey, queryFn: () => tasksApi.day(today), enabled: canTasks });

  const toggleTask = useMutation({
    mutationFn: (x: DailyTask) => tasksApi.update(x.id, { done: !x.done }),
    onMutate: (x) => {
      queryClient.setQueryData<DailyTask[]>(dayKey, (old) => old?.map((y) => (y.id === x.id ? { ...y, done: !x.done } : y)));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: () => toast.error(isAr ? "تعذّر تحديث المهمة" : "Couldn't update the task"),
  });

  const dateLine = useMemo(() => {
    const d = new Date();
    const g = d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    let h = "";
    try {
      h = d.toLocaleDateString(isAr ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      /* no Hijri calendar in this browser */
    }
    return h ? `${g} · ${h.replace(/\s*(هـ|AH)$/, "")} ${isAr ? "هـ" : "AH"}` : g;
  }, [locale, isAr]);
  const hour = new Date().getHours();
  const greeting = isAr ? (hour < 12 ? "صباح الخير" : "مساء الخير") : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user?.fullName ?? "").trim().split(/\s+/)[0] ?? "";

  const tracked = summary?.totalTrackedDocuments ?? 0;
  const valid = summary?.validDocuments ?? 0;
  const soon = overview?.endingIn30 ?? summary?.expiringDocuments ?? 0;
  const expired = overview?.expired ?? summary?.expiredDocuments ?? 0;
  const score = tracked ? valid / tracked : 1;
  const pct = Math.round(score * 100);
  const taskList = tasks ?? [];
  const done = taskList.filter((x) => x.done).length;
  const nearest = (overview?.attention ?? []).find((a) => a.days >= 0);

  // The last six months, oldest first.
  const months = useMemo(() => {
    const n = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(n.getFullYear(), n.getMonth() - 5 + i, 1);
      return { key: localIso(d).slice(0, 7), label: d.toLocaleDateString(locale, { month: "long" }) };
    });
  }, [locale]);
  const monthly = useMemo(() => {
    const byKey = new Map((charts?.monthlyPayments ?? []).map((m) => [String(m.month).slice(0, 7), m.total]));
    return months.map((m) => byKey.get(m.key) ?? 0);
  }, [charts, months]);
  const thisMonth = summary?.monthlyPaymentsAmount ?? monthly[5] ?? 0;
  const change = monthly[4] > 0 ? ((thisMonth - monthly[4]) / monthly[4]) * 100 : null;

  // Payments by category, month by month: the six biggest categories, the rest together.
  const cats = useMemo(() => {
    const rows = charts?.monthlyByCategory ?? [];
    const totals = new Map<string, number>();
    rows.forEach((r) => totals.set(r.category, (totals.get(r.category) ?? 0) + r.total));
    const order = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const top = order.slice(0, 6);
    const rest = order.slice(6);
    const list = top.map((k, i) => ({ key: k, name: t(`paymentCategories.${k}`, { defaultValue: k }), color: PALETTE[i], vals: months.map(() => 0) }));
    if (rest.length) list.push({ key: "__other", name: isAr ? "أخرى" : "Other", color: PALETTE[6], vals: months.map(() => 0) });
    rows.forEach((r) => {
      const mi = months.findIndex((m) => m.key === String(r.month).slice(0, 7));
      if (mi < 0) return;
      const c = list.find((x) => x.key === (top.includes(r.category) ? r.category : "__other"));
      if (c) c.vals[mi] += r.total;
    });
    return list;
  }, [charts, months, t, isAr]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [tip, setTip] = useState<number | null>(null);
  const visible = cats.filter((c) => !hidden.has(c.key));
  const colTotals = months.map((_, i) => visible.reduce((s, c) => s + c.vals[i], 0));
  const sbMax = Math.max(1000, Math.ceil(Math.max(0, ...colTotals) / 1000) * 1000);
  const sixTotal = cats.reduce((s, c) => s + c.vals.reduce((a, b) => a + b, 0), 0);
  const toggleCat = (k: string) =>
    setHidden((cur) => {
      const next = new Set(cur);
      if (next.has(k)) next.delete(k);
      else if (next.size < cats.length - 1) next.add(k);
      return next;
    });

  const types: [string, string, string, string][] = [
    ["IQAMA", "الإقامات", "Iqamas", "indigo"],
    ["PASSPORT", "جوازات السفر", "Passports", "amber"],
    ["HEALTH_CERTIFICATE", "الشهادات الصحية", "Health certificates", "teal"],
    ["MEDICAL_INSURANCE", "التأمين الطبي", "Medical insurance", "violet"],
    ["COMPANY", "وثائق الشركة", "Company documents", "sky"],
  ];
  const byType = overview?.byType ?? {};
  const typeMax = Math.max(1, ...types.map(([k]) => byType[k] ?? 0));

  const branchPays = (charts?.paymentsByBranch ?? []).filter((b) => b.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
  const branchMax = Math.max(1, ...branchPays.map((b) => b.total));

  const attention = (overview?.attention ?? []).slice(0, 6);
  const stOf = (d: number) => (d <= 7 ? "bad" : d <= 30 ? "warn" : "ok");
  const leftText = (d: number) => (d < 0 ? (isAr ? `انتهت منذ ${daysAr(-d)}` : `Expired ${-d}d ago`) : d === 0 ? (isAr ? "تنتهي اليوم" : "Ends today") : isAr ? `بعد ${daysAr(d)}` : `In ${d} days`);
  const toneOfDoc = (item: DashboardAttentionItem) => (item.sourceType === "COMPANY_DOCUMENT" ? "sky" : item.sourceType === "EMPLOYEE_PASSPORT" ? "amber" : /تأمين/.test(item.documentAr) ? "violet" : /صحي/.test(item.documentAr) ? "teal" : "indigo");
  const openItem = (item: DashboardAttentionItem) => navigate(item.employeeId ? `/employees/${item.employeeId}` : "/company-documents");
  const hijriOf = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    try {
      return d.toLocaleDateString(isAr ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-u-ca-islamic-umalqura", { day: "numeric", month: "long" });
    } catch {
      return "";
    }
  };
  const dateOf = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString(locale, Math.abs(days) > 200 ? { day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "long" });
  };

  const rel = useMemo(() => new Intl.RelativeTimeFormat(isAr ? "ar" : "en", { numeric: "auto" }), [isAr]);
  const ago = (iso: string) => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 3600) return rel.format(-Math.max(1, Math.round(s / 60)), "minute");
    if (s < 86400) return rel.format(-Math.round(s / 3600), "hour");
    return rel.format(-Math.round(s / 86400), "day");
  };
  const actIcon = (a: string): [typeof Plus, string] =>
    a === "CREATE" ? [Plus, "green"] : a === "UPDATE" ? [Pencil, "indigo"] : a === "DELETE" ? [Trash2, "rose"] : a === "LOGIN" || a === "LOGOUT" ? [LogIn, "sky"] : a === "IMPORT" ? [Upload, "teal"] : [Download, "amber"];
  const activity = (recent?.recentActivities ?? []).slice(0, 5);

  const stats = [
    { icon: Users, tone: "indigo", label: isAr ? "الموظفون" : "Employees", value: summary?.totalEmployees ?? 0, unit: "", note: isAr ? `${summary?.activeEmployees ?? 0} على رأس العمل` : `${summary?.activeEmployees ?? 0} on duty`, kind: "ok", href: "/employees", spark: [] as number[] },
    { icon: FileText, tone: "teal", label: isAr ? "الوثائق المتابعة" : "Tracked documents", value: tracked, unit: "", note: isAr ? `${valid} سارية` : `${valid} valid`, kind: "ok", href: "/employee-documents", spark: [] },
    {
      icon: Clock,
      tone: "amber",
      label: isAr ? "تنتهي خلال 30 يومًا" : "Ending within 30 days",
      value: soon,
      unit: "",
      note: nearest ? (isAr ? `أقربها ${leftText(nearest.days)}` : `Nearest ${leftText(nearest.days).toLowerCase()}`) : isAr ? "لا شيء قريب" : "Nothing soon",
      kind: soon ? "warn" : "ok",
      href: "/employee-documents?status=EXPIRING_SOON",
      spark: (overview?.upcoming ?? []).map((m) => m.count),
    },
    {
      icon: Wallet,
      tone: "amber",
      gold: true,
      label: isAr ? "مدفوعات الشهر" : "This month's payments",
      value: Math.round(thisMonth),
      unit: isAr ? "ر.س" : "SAR",
      note: change === null ? (isAr ? "هذا الشهر" : "This month") : `${change >= 0 ? "+" : ""}${change.toFixed(1)}% ${isAr ? "عن الشهر الماضي" : "vs last month"}`,
      kind: change !== null && change < 0 ? "bad" : "ok",
      href: "/payments",
      spark: monthly,
    },
  ];

  const R = 50 - 13 / 2 - 1;
  const seg = (n: number) => (tracked ? (n / tracked) * 100 : 0);
  const donutParts: [number, string][] = [
    [seg(valid), "var(--l-green)"],
    [seg(soon), "var(--l-amber)"],
    [seg(expired), "var(--l-rose)"],
  ];
  let start = 0;

  return (
    <>
      <PageHeader
        title={isAr ? "لوحة التحكم" : "Dashboard"}
        description={dateLine}
        actions={
          <>
            {hasPermission("reports.view") && (
              <button type="button" className="ry-btn" onClick={() => navigate("/reports")}>
                <Download /> {isAr ? "تقرير الشهر" : "Monthly report"}
              </button>
            )}
            {hasPermission("employees.create") && (
              <Button onClick={() => navigate("/employees?new=true")}>
                <Plus className="h-4 w-4" /> {isAr ? "إضافة موظف" : "Add employee"}
              </Button>
            )}
          </>
        }
      />

      <div className="ry-grid">
        <section className="ry-card ry-welcome ry-s8 ry-sheen" style={v({ "--i": 1 })}>
          <div>
            <span className="chipw">
              <Sparkles /> {isAr ? "ملخص اليوم" : "Today's summary"}
            </span>
            <h2>
              {greeting}
              {firstName && (isAr ? ` يا ${firstName}` : `, ${firstName}`)}
            </h2>
            <p>
              {isAr ? (
                <>
                  {soon > 0 ? <>لديك <b>{docsAr(soon)}</b> تنتهي خلال 30 يومًا</> : <>لا شيء ينتهي خلال الثلاثين يومًا القادمة</>}{expired > 0 && <>{soon > 0 ? " و" : "، ولديك "}<b>{docsAr(expired)} منتهية</b></>}
                  {nearest && (
                    <>
                      ، أقربها <b>{(nearest.documentAr || "").replace(/^ال/, "")} {nearest.nameAr.trim().split(/\s+/).slice(0, 2).join(" ")} {leftText(nearest.days)}</b>
                    </>
                  )}
                  {canTasks && taskList.length > 0 && <>، و{taskList.length - done} مهام مفتوحة اليوم</>}.
                </>
              ) : (
                <>
                  <b>{soon} documents</b> end within 30 days{expired > 0 && <> and <b>{expired} have expired</b></>}
                  {canTasks && taskList.length > 0 && <>; {taskList.length - done} tasks are open today</>}.
                </>
              )}
            </p>
            <div className="btns">
              <button type="button" className="ry-btn white" onClick={() => navigate("/employee-documents?status=EXPIRING_SOON")}>
                <Bell /> {isAr ? "راجع التنبيهات" : "Review alerts"}
              </button>
              <button type="button" className="ry-btn glass" onClick={() => navigate("/employee-documents")}>
                <Upload /> {isAr ? "رفع وثيقة" : "Upload a document"}
              </button>
            </div>
          </div>
          <div className="ry-art" aria-hidden="true">
            {(
              [
                ["c3", isAr ? "رخصة بلدية" : "Municipal licence"],
                ["c2", isAr ? "شهادة صحية" : "Health certificate"],
                ["c1", isAr ? "إقامة" : "Iqama"],
              ] as const
            ).map(([c, label]) => (
              <div key={c} className={cn("ry-idc", c)}>
                <div className="h">
                  <i />
                  {label}
                </div>
                <div className="p">
                  <span className="pa" />
                  <div className="ln">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <i className="chip" />
              </div>
            ))}
            <span className="ok">
              <Check strokeWidth={2.6} />
            </span>
            {soon + expired > 0 && (
              <span className="bub">
                <i />
                {isAr ? `${docsAr(soon + expired)} تحتاج متابعة` : `${soon + expired} need follow-up`}
              </span>
            )}
          </div>
        </section>

        <section className="ry-card ry-s4 ry-sheen" style={v({ "--i": 2 })}>
          <div className="ry-ch">
            <div>
              <h3>{isAr ? "صحة الامتثال" : "Compliance"}</h3>
              <small>{isAr ? "كل وثائق الشركة والموظفين" : "Every company and employee document"}</small>
            </div>
            <span className={cn("ry-pill", score >= 0.9 ? "ok" : score >= 0.6 ? "warn" : "bad")}>
              <i />
              {isAr ? (score >= 0.9 ? "ممتاز" : score >= 0.6 ? "جيد" : "يحتاج متابعة") : score >= 0.9 ? "Excellent" : score >= 0.6 ? "Good" : "Needs follow-up"}
            </span>
          </div>
          <div className="ry-g">
            <svg viewBox="0 0 220 128" aria-hidden="true">
              <defs>
                <linearGradient id="ryg" x1={isAr ? 1 : 0} y1="0" x2={isAr ? 0 : 1} y2="0">
                  <stop offset="0" stopColor="#2f5fe0" />
                  <stop offset="1" stopColor="#0f9d6e" />
                </linearGradient>
              </defs>
              <path d={isAr ? "M200 116 A90 90 0 0 0 20 116" : "M20 116 A90 90 0 0 1 200 116"} fill="none" stroke="var(--ry-track)" strokeWidth="16" strokeLinecap="round" />
              <path className="arc" d={isAr ? "M200 116 A90 90 0 0 0 20 116" : "M20 116 A90 90 0 0 1 200 116"} fill="none" stroke="url(#ryg)" strokeWidth="16" strokeLinecap="round" pathLength={100} strokeDasharray={`${armed ? score * 100 : 0} 100`} />
              {Array.from({ length: 11 }, (_, k) => {
                const a = (Math.PI * k) / 10;
                return <circle key={k} cx={110 + 72 * Math.cos(a)} cy={116 - 72 * Math.sin(a)} r={k % 5 === 0 ? 2.2 : 1.4} fill="var(--l-line)" />;
              })}
            </svg>
            <div className="gv">
              <b>
                <Count to={pct} />%
              </b>
              <small>{isAr ? "من الوثائق سارية" : "of documents are valid"}</small>
            </div>
          </div>
          <div className="ry-gl">
            {(
              [
                [valid, isAr ? "سارية" : "Valid", "var(--l-green)"],
                [soon, isAr ? "تنتهي قريبًا" : "Ending soon", "var(--l-amber)"],
                [expired, isAr ? "منتهية" : "Expired", "var(--l-rose)"],
              ] as const
            ).map(([n, label, c]) => (
              <div key={label}>
                <b>
                  <i style={{ background: c }} />
                  <Count to={n} />
                </b>
                {label}
              </div>
            ))}
          </div>
        </section>

        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <button key={s.label} type="button" className={cn("ry-card ry-stat ry-s3 ry-sheen", `lt-${s.tone}`)} style={v({ "--i": 3 + i, ...(s.gold ? { "--c": "var(--ry-gold)", "--t": "var(--ry-gold-t)" } : {}) })} onClick={() => navigate(s.href)}>
              <span className="t">
                <span className="l">{s.label}</span>
                <span className="ic">
                  <Icon />
                </span>
              </span>
              <span className="v">
                <span>
                  <Count to={s.value} />
                </span>
                {s.unit && <small>{s.unit}</small>}
              </span>
              <span className="f">
                <span className={cn("ry-delta", s.kind !== "ok" && s.kind)}>
                  {s.kind === "warn" ? <AlertTriangle /> : s.kind === "bad" ? <TrendingDown /> : <TrendingUp />}
                  {s.note}
                </span>
                <Spark values={s.spark} color={s.gold ? "#c99a2e" : s.tone === "amber" ? "#d97706" : "#1f45c4"} rtl={isAr} delay={0.6 + i * 0.1} />
              </span>
            </button>
          );
        })}

        <section className="ry-card ry-s8" style={v({ "--i": 7 })}>
          <div className="ry-ch">
            <div>
              <h3>{isAr ? "المدفوعات حسب الفئة" : "Payments by category"}</h3>
              <small>
                {isAr ? `آخر 6 أشهر: ${fmt(sixTotal)} ر.س` : `Last 6 months: ${fmt(sixTotal)} SAR`}
                {cats.length > 1 && (isAr ? " · اضغط على أي فئة لإخفائها" : " · tap a category to hide it")}
              </small>
            </div>
            <div className="ry-legend">
              {cats.map((c) => (
                <button key={c.key} type="button" className={cn("ry-lg", hidden.has(c.key) && "off")} style={v({ "--c": c.color })} onClick={() => toggleCat(c.key)} aria-pressed={!hidden.has(c.key)}>
                  <i />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          {sixTotal === 0 ? (
            <div className="ry-empty">{isAr ? "لا توجد مدفوعات في آخر 6 أشهر" : "No payments in the last 6 months"}</div>
          ) : (
            <div className="ry-sb">
              <div className="ry-sb-y">
                {[1, 0.75, 0.5, 0.25, 0].map((f) => (
                  <span key={f}>{f ? kfmt(sbMax * f, isAr) : "0"}</span>
                ))}
              </div>
              <div className="ry-sb-plot" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }} onMouseLeave={() => setTip(null)}>
                {[0, 25, 50, 75, 100].map((b) => (
                  <i key={b} className="ry-sb-gl" style={{ bottom: `calc(22px + (100% - 22px) * ${b / 100})` }} />
                ))}
                {months.map((m, i) => (
                  <div key={m.key} className="ry-sb-col" onMouseEnter={() => setTip(i)} onFocus={() => setTip(i)} onClick={() => setTip(i)}>
                    <div className="ry-sb-stack" style={v({ "--d": `${0.3 + i * 0.07}s`, height: `${(colTotals[i] / sbMax) * 100}%` })}>
                      {cats.map((c) => (
                        <i key={c.key} style={{ flexGrow: hidden.has(c.key) ? 0 : c.vals[i], background: c.color }} />
                      ))}
                    </div>
                    <span className="ry-sb-x">{m.label}</span>
                    {tip === i && (
                      <div className="ry-sb-tip" style={{ left: "50%" }}>
                        <b>
                          {m.label} · {fmt(colTotals[i])} {isAr ? "ر.س" : "SAR"}
                        </b>
                        {visible
                          .filter((c) => c.vals[i] > 0)
                          .sort((a, b) => b.vals[i] - a.vals[i])
                          .map((c) => (
                            <div key={c.key}>
                              <i style={{ background: c.color }} />
                              {c.name}
                              <span>{fmt(c.vals[i])}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="ry-card ry-s4" style={v({ "--i": 8 })}>
          <div className="ry-ch">
            <div>
              <h3>{isAr ? "حالة الوثائق" : "Documents by status"}</h3>
              <small>{isAr ? `${docsAr(tracked)} تحت المتابعة` : `${tracked} documents tracked`}</small>
            </div>
          </div>
          <div className="ry-donut">
            <div className="ry-dn">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r={R} fill="none" stroke="var(--ry-track)" strokeWidth="13" />
                {donutParts.map(([len, color], k) => {
                  const off = start;
                  start += len;
                  const l = Math.max(0, len - 0.6);
                  return len > 0 ? <circle key={k} className="seg" cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="13" pathLength={100} strokeDasharray={`${armed ? l : 0} ${100 - (armed ? l : 0)}`} strokeDashoffset={-off} style={{ transitionDelay: `${0.3 + k * 0.3}s` }} /> : null;
                })}
              </svg>
              <div className="ctr">
                <div>
                  <b>
                    <Count to={pct} />%
                  </b>
                  <small>{isAr ? "سارية" : "valid"}</small>
                </div>
              </div>
            </div>
            <div className="ry-leg">
              {(
                [
                  [isAr ? "سارية" : "Valid", valid, "var(--l-green)"],
                  [isAr ? "قريبة" : "Soon", soon, "var(--l-amber)"],
                  [isAr ? "منتهية" : "Expired", expired, "var(--l-rose)"],
                ] as const
              ).map(([n, val, c]) => (
                <div key={n}>
                  <i style={{ background: c }} />
                  <span>{n}</span>
                  <b>{val}</b>
                  <span className="p">{tracked ? ((val / tracked) * 100).toFixed(1) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ry-types ry-hb">
            {types.map(([k, ar, en, tone]) => {
              const n = byType[k] ?? 0;
              return (
                <div key={k} className={`lt-${tone}`}>
                  <span>{isAr ? ar : en}</span>
                  <b>{n}</b>
                  <span className="tr">
                    <i style={{ width: armed ? `${(n / typeMax) * 100}%` : 0 }} />
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="ry-card flush ry-s8" style={v({ "--i": 9 })}>
          <div className="ry-ch" style={{ padding: "18px 20px 0" }}>
            <div>
              <h3>{isAr ? "وثائق تنتهي قريبًا" : "Documents ending soon"}</h3>
              <small>{isAr ? "مرتبة من الأقرب · اضغط على أي صف لفتحه" : "Soonest first · open any row"}</small>
            </div>
            <button type="button" className="ry-link" onClick={() => navigate("/employee-documents?status=EXPIRING_SOON")}>
              {isAr ? "عرض الكل" : "View all"}
            </button>
          </div>
          {overview && attention.length === 0 ? (
            <div className="ry-empty">{isAr ? "كل الوثائق سارية، لا شيء ينتهي قريبًا" : "Every document is valid; nothing ends soon"}</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ry-tbl">
                <thead>
                  <tr>
                    <th>{isAr ? "الموظف أو الجهة" : "Employee or party"}</th>
                    <th>{isAr ? "الوثيقة" : "Document"}</th>
                    <th className="hide-m">{isAr ? "تاريخ الانتهاء" : "Expiry"}</th>
                    <th>{isAr ? "المتبقي" : "Left"}</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.map((item, j) => {
                    const st = item.days < 0 ? "bad" : stOf(item.days);
                    const tone = toneOfDoc(item);
                    const name = (isAr ? item.nameAr : item.nameEn || item.nameAr).trim();
                    const Icon = item.sourceType === "COMPANY_DOCUMENT" ? Building2 : /صحي|تأمين/.test(item.documentAr) ? HeartPulse : IdCard;
                    return (
                      <tr key={item.key} style={v({ "--j": j })} onClick={() => openItem(item)}>
                        <td className="full">
                          <div className="ry-emp">
                            <span className={cn("ry-av", `lt-${tone}`, item.sourceType === "COMPANY_DOCUMENT" && "b")}>{item.sourceType === "COMPANY_DOCUMENT" ? <Icon /> : name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}</span>
                            <div>
                              <b>{name}</b>
                              <small>{item.branchName ?? (isAr ? "—" : "—")}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={cn("ry-type", `lt-${tone}`)}>
                            <i />
                            {isAr ? item.documentAr : item.documentEn}
                          </span>
                        </td>
                        <td className="hide-m">
                          <b style={{ fontWeight: 600 }}>{dateOf(item.days)}</b>
                          <small>{hijriOf(item.days)}</small>
                        </td>
                        <td className="full">
                          <div className="ry-left">
                            <span className="tr">
                              <i className={st} style={{ width: armed ? `${item.days < 0 ? 100 : Math.max(5, Math.min(100, (item.days / 30) * 100))}%` : 0 }} />
                            </span>
                            <small className={st}>{leftText(item.days)}</small>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="ry-card ry-s4" style={v({ "--i": 10 })}>
          <div className="ry-ch">
            <div>
              <h3>{isAr ? "آخر النشاط" : "Latest activity"}</h3>
              <small>{isAr ? "ما تم في النظام مؤخرًا" : "What happened recently"}</small>
            </div>
          </div>
          {activity.length === 0 ? (
            <div className="ry-empty" style={{ minHeight: 140 }}>
              {isAr ? "لا يوجد نشاط بعد" : "No activity yet"}
            </div>
          ) : (
            <div className="ry-tl">
              {activity.map((a, j) => {
                const [Icon, tone] = actIcon(a.action);
                return (
                  <div key={a.id} className={cn("it", `lt-${tone}`)} style={v({ "--j": j })}>
                    <span className="di">
                      <Icon />
                    </span>
                    <div>
                      <b>
                        {t(`auditLogs.actions.${a.action}`, { defaultValue: a.action })} · {t(`moduleNames.${a.module}`, { defaultValue: a.module })}
                      </b>
                      <small>
                        {a.user?.fullName ?? (isAr ? "النظام" : "System")} · {ago(a.createdAt)}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className={cn("ry-card", canTasks ? "ry-s6" : "ry-s12")} style={v({ "--i": 11 })}>
          <div className="ry-ch">
            <div>
              <h3>{isAr ? "المدفوعات حسب الفرع" : "Payments by branch"}</h3>
              <small>{isAr ? "كل المدفوعات المسجّلة" : "All recorded payments"}</small>
            </div>
            <button type="button" className="ry-link" onClick={() => navigate("/payments")}>
              {isAr ? "المدفوعات" : "Payments"}
            </button>
          </div>
          {branchPays.length === 0 ? (
            <div className="ry-empty" style={{ minHeight: 140 }}>
              {isAr ? "لا توجد مدفوعات مسجّلة" : "No payments yet"}
            </div>
          ) : (
            <div className="ry-hb">
              {branchPays.map((b, i) => (
                <div key={b.branch}>
                  <span>{b.branch === "Unassigned" ? (isAr ? "بدون فرع" : "No branch") : b.branch}</span>
                  <b>
                    {fmt(b.total)} {isAr ? "ر.س" : "SAR"}
                  </b>
                  <span className="tr">
                    <i style={{ width: armed ? `${(b.total / branchMax) * 100}%` : 0, background: i === 0 ? "#1f45c4" : i === 1 ? "#2f5fe0" : "#7c9cf0", transitionDelay: `${0.4 + i * 0.07}s` }} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {canTasks && (
          <section className="ry-card ry-s6" style={v({ "--i": 12 })}>
            <div className="ry-ch">
              <div>
                <h3>{isAr ? "مهام اليوم" : "Today's tasks"}</h3>
                <small>{isAr ? `أنجزت ${done} من ${taskList.length}` : `${done} of ${taskList.length} done`}</small>
              </div>
              <button type="button" className="ry-link" onClick={() => navigate("/daily-tasks")}>
                {isAr ? "كل المهام" : "All tasks"}
              </button>
            </div>
            <div className="ry-prog">
              <i style={{ width: `${armed && taskList.length ? (done / taskList.length) * 100 : 0}%` }} />
            </div>
            {taskList.length === 0 && (
              <button type="button" className="ry-task" onClick={() => navigate("/daily-tasks")}>
                <span className="bx">
                  <Plus />
                </span>
                <span>
                  <b>{isAr ? "لا توجد مهام اليوم" : "No tasks today"}</b>
                  <small>{isAr ? "أضف مهمة من صفحة المهام اليومية" : "Add one from daily tasks"}</small>
                </span>
              </button>
            )}
            {taskList.slice(0, 5).map((x) => (
              <button key={x.id} type="button" className={cn("ry-task", x.done && "done")} aria-pressed={x.done} disabled={!canEditTask} onClick={() => toggleTask.mutate(x)}>
                <span className="bx">
                  <Check strokeWidth={2.6} />
                </span>
                <span className="min-w-0">
                  <b className="truncate">{x.title}</b>
                  {x.notes && <small className="truncate">{x.notes}</small>}
                </span>
              </button>
            ))}
          </section>
        )}
      </div>
    </>
  );
}
