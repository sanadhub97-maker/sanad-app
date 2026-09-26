import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  IdCard,
  ListChecks,
  Loader2,
  Plus,
  Printer,
  Sparkles,
  Trash2,
  User,
  Users,
  Wallet,
  CircleCheck,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppleIcon, type AppleTone } from "@/components/common/apple-icon";
import { tasksApi, type DailyTask, type TaskCategory, type TaskPriority } from "@/api/tasks";
import { useAuthStore } from "@/stores/authStore";
import { downloadFile, openPdfInNewTab } from "@/lib/download";
import { getErrorMessage } from "@/lib/api";
import { tr, isRtlLanguage } from "@/i18n";
import { cn } from "@/lib/utils";

const CATEGORIES: Record<TaskCategory, { ar: string; en: string; tone: AppleTone; icon: LucideIcon }> = {
  employees: { ar: "الموظفون", en: "Employees", tone: "indigo", icon: Users },
  documents: { ar: "الوثائق والإقامات", en: "Documents & iqamas", tone: "sky", icon: IdCard },
  branches: { ar: "المؤسسات", en: "Establishments", tone: "teal", icon: Building2 },
  payments: { ar: "المدفوعات", en: "Payments", tone: "rose", icon: Wallet },
  general: { ar: "عام", en: "General", tone: "zinc", icon: Check },
};
const PRIORITIES: Record<TaskPriority, { ar: string; en: string; cls: string }> = {
  URGENT: { ar: "عاجلة", en: "Urgent", cls: "text-destructive bg-destructive/15" },
  HIGH: { ar: "مهمة", en: "High", cls: "text-warning bg-warning/15" },
  NORMAL: { ar: "عادية", en: "Normal", cls: "text-primary bg-primary/10" },
};

// ---------- Dates: tasks belong to calendar days in the viewer's time ----------
const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
};
const dmy = (k: string) => k.split("-").reverse().join("/");
function fmt(k: string, o: Intl.DateTimeFormatOptions, locale: string) {
  try {
    return fromKey(k).toLocaleDateString(locale, o);
  } catch {
    return dmy(k);
  }
}

const prefersReducedMotion = () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
const CELEBRATE_MS = 760;
const SPARK_COLORS = ["hsl(var(--success))", "#52bcff", "#fbbf24", "#a78bfa", "#f472b6", "hsl(var(--success))", "#52bcff", "#fbbf24"];

/** A short burst of confetti over the page, for finishing every task of the day. */
function confetti() {
  const cv = document.createElement("canvas");
  cv.className = "fixed inset-0 pointer-events-none z-[80]";
  document.body.appendChild(cv);
  const ctx = cv.getContext("2d");
  if (!ctx) return cv.remove();
  const dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  cv.style.width = `${innerWidth}px`;
  cv.style.height = `${innerHeight}px`;
  ctx.scale(dpr, dpr);
  const colors = ["#4ade80", "#52bcff", "#fbbf24", "#a78bfa", "#f472b6", "#ffffff"];
  const bits = Array.from({ length: 120 }, (_, i) => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.38,
    vx: (Math.random() - 0.5) * 11,
    vy: -Math.random() * 12 - 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 6,
    h: 3 + Math.random() * 4,
    c: colors[i % colors.length],
  }));
  const t0 = performance.now();
  const frame = (now: number) => {
    const k = (now - t0) / 1900;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.vy += 0.32;
      b.x += b.vx;
      b.y += b.vy;
      b.r += b.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - k * k);
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
    if (k < 1) requestAnimationFrame(frame);
    else cv.remove();
  };
  requestAnimationFrame(frame);
}

export default function DailyTasksPage() {
  const { i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const locale = isRtl ? "ar-EG-u-nu-latn" : "en-GB";
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const can = { create: hasPermission("tasks.create"), edit: hasPermission("tasks.edit"), del: hasPermission("tasks.delete"), exp: hasPermission("tasks.export") };
  const queryClient = useQueryClient();

  const today = keyOf(new Date());
  const [day, setDay] = useState(today);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [range, setRange] = useState<"day" | "week">("day");
  // Tasks mid-animation keep their old place in the list until it finishes.
  const [animating, setAnimating] = useState<Record<string, "done" | "undone">>({});
  // Counts completions this visit, so the done counter bounces on a change only.
  const [bumps, setBumps] = useState(0);

  const dayQuery = useQuery({ queryKey: ["tasks", "day", day], queryFn: () => tasksApi.day(day) });
  const weekQuery = useQuery({ queryKey: ["tasks", "week", day], queryFn: () => tasksApi.week(day) });
  const prevQuery = useQuery({ queryKey: ["tasks", "day", addDays(today, -1)], queryFn: () => tasksApi.day(addDays(today, -1)), enabled: day === today });
  const assigneesQuery = useQuery({ queryKey: ["tasks", "assignees"], queryFn: tasksApi.assignees, staleTime: 5 * 60_000 });
  const suggestionsQuery = useQuery({ queryKey: ["tasks", "suggestions"], queryFn: tasksApi.suggestions });

  const tasks = dayQuery.data ?? [];
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? done / tasks.length : 0;
  const urgentOpen = tasks.filter((t) => !t.done && t.priority === "URGENT").length;
  const carryable = day === today ? (prevQuery.data ?? []).filter((t) => !t.done).length : 0;

  const shown = useMemo(() => {
    const placeDone = (t: DailyTask) => (animating[t.id] ? animating[t.id] === "undone" : t.done);
    return tasks
      .filter((t) => (filter === "all" ? true : filter === "done" ? t.done : !t.done))
      .slice()
      .sort((a, b) => Number(placeDone(a)) - Number(placeDone(b)) || (a.time ?? "99").localeCompare(b.time ?? "99") || a.createdAt.localeCompare(b.createdAt));
  }, [tasks, filter, animating]);

  // ---------- Rows glide to their new place (FLIP) ----------
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const flipFrom = useRef<Map<string, number> | null>(null);
  const snapshot = () => {
    flipFrom.current = new Map([...rowRefs.current].map(([id, el]) => [id, el.getBoundingClientRect().top]));
  };
  useLayoutEffect(() => {
    const from = flipFrom.current;
    if (!from) return;
    flipFrom.current = null;
    rowRefs.current.forEach((el, id) => {
      const before = from.get(id);
      if (before == null) return;
      const dy = before - el.getBoundingClientRect().top;
      if (Math.abs(dy) > 1) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["tasks", "week"] });
    void queryClient.invalidateQueries({ queryKey: ["tasks", "suggestions"] });
  };

  const setDayCache = (key: string, fn: (list: DailyTask[]) => DailyTask[]) =>
    queryClient.setQueryData<DailyTask[]>(["tasks", "day", key], (old) => fn(old ?? []));

  const toggle = useMutation({
    mutationFn: ({ task }: { task: DailyTask }) => tasksApi.update(task.id, { done: !task.done }),
    onMutate: ({ task }) => {
      const nowDone = !task.done;
      setDayCache(day, (list) => list.map((t) => (t.id === task.id ? { ...t, done: nowDone } : t)));
      if (prefersReducedMotion()) {
        if (nowDone) celebrateIfAllDone(task.id);
        return;
      }
      if (nowDone) navigator.vibrate?.(12);
      setBumps((b) => b + 1);
      setAnimating((a) => ({ ...a, [task.id]: nowDone ? "done" : "undone" }));
      window.setTimeout(
        () => {
          snapshot();
          setAnimating(({ [task.id]: _gone, ...rest }) => rest);
          if (nowDone) celebrateIfAllDone(task.id);
        },
        nowDone ? CELEBRATE_MS : 320
      );
    },
    onError: (err, { task }) => {
      setDayCache(day, (list) => list.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
      toast.error(getErrorMessage(err));
    },
    onSettled: invalidate,
  });

  function celebrateIfAllDone(justDoneId: string) {
    const list = queryClient.getQueryData<DailyTask[]>(["tasks", "day", day]) ?? [];
    if (!list.length || list.some((t) => !t.done && t.id !== justDoneId)) return;
    toast.success(tr("🎉 أحسنت! أنجزت كل مهام اليوم", "🎉 Well done! Every task for today is complete"));
    if (!prefersReducedMotion()) confetti();
  }

  const remove = useMutation({
    mutationFn: (id: string) => tasksApi.remove(id),
    onSuccess: (_r, id) => {
      snapshot();
      setDayCache(day, (list) => list.filter((t) => t.id !== id));
      toast.success(tr("تم حذف المهمة", "Task deleted"));
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // ---------- New task ----------
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>("general");
  const [priority, setPriority] = useState<TaskPriority>("NORMAL");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [time, setTime] = useState("");
  const me = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    if (!assigneeId && me) setAssigneeId(me);
  }, [me, assigneeId]);

  const create = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: (task) => {
      snapshot();
      setDayCache(task.date, (list) => [...list, task]);
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error(tr("اكتب عنوان المهمة أولاً", "Type the task first"));
    create.mutate(
      { date: day, title: title.trim(), category, priority, assigneeId: assigneeId || null, time: time || null },
      { onSuccess: () => { setTitle(""); setTime(""); toast.success(tr("تمت إضافة المهمة", "Task added")); } }
    );
  };

  const carry = useMutation({
    mutationFn: () => tasksApi.carry(addDays(today, -1), today),
    onSuccess: ({ moved }) => {
      toast.success(tr(`تم ترحيل ${moved} مهام إلى اليوم`, `Moved ${moved} tasks to today`));
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const addSuggestion = (s: { key: string; title: string; category: TaskCategory; priority: TaskPriority }) =>
    create.mutate(
      { date: today, title: s.title, category: s.category, priority: s.priority, assigneeId: me ?? null, sourceKey: s.key },
      { onSuccess: () => { setDay(today); toast.success(tr("أضيفت لمهام اليوم", "Added to today")); } }
    );

  // ---------- Export ----------
  const exportRange = () => {
    if (range === "day") return { from: day, to: day };
    const start = addDays(day, -fromKey(day).getDay());
    return { from: start, to: addDays(start, 6) };
  };
  const printPdf = () => {
    const r = exportRange();
    void openPdfInNewTab("/tasks/export", { ...r, format: "pdf" }, `daily-tasks-${r.from}.pdf`).catch(() => undefined);
  };
  const excel = () => {
    const r = exportRange();
    void downloadFile("/tasks/export", { ...r, format: "xlsx" }, `daily-tasks-${r.from}.xlsx`).catch(() => undefined);
  };

  const dayLabel =
    (day === today ? tr("اليوم · ", "Today · ") : day === addDays(today, -1) ? tr("أمس · ", "Yesterday · ") : day === addDays(today, 1) ? tr("غدًا · ", "Tomorrow · ") : "") +
    fmt(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, locale);
  const hijri = fmt(day, { day: "numeric", month: "long", year: "numeric" }, isRtl ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-u-ca-islamic-umalqura");
  const Prev = isRtl ? ChevronRight : ChevronLeft;
  const Next = isRtl ? ChevronLeft : ChevronRight;
  const Carry = isRtl ? ArrowLeft : ArrowRight;
  const ringC = 2 * Math.PI * 19;

  const fieldCls = "h-9 rounded-xl border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <AppleIcon icon={ListChecks} tone="emerald" size="lg" />
          <div>
            <h1 className="text-2xl font-bold leading-tight">{tr("المهام اليومية", "Daily Tasks")}</h1>
            <p className="text-sm text-muted-foreground">{tr("سجل مهام كل يوم بتاريخه، مع الطباعة والتصدير", "A to-do list for every day, printable and exportable")}</p>
          </div>
        </div>
        {can.exp && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-muted p-0.5" role="group" aria-label={tr("نطاق التصدير", "Export range")}>
              {(["day", "week"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={range === r}
                  onClick={() => setRange(r)}
                  className={cn("rounded-lg px-3 py-1 text-xs font-semibold", range === r ? "bg-background shadow-sm" : "text-muted-foreground")}
                >
                  {r === "day" ? tr("اليوم", "Day") : tr("الأسبوع", "Week")}
                </button>
              ))}
            </div>
            <Button variant="outline" className="rounded-full" onClick={printPdf}>
              <Printer /> {tr("طباعة / PDF", "Print / PDF")}
            </Button>
            <Button variant="outline" className="rounded-full" onClick={excel}>
              <FileSpreadsheet /> Excel
            </Button>
          </div>
        )}
      </Card>

      {/* Day picker */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold">{dayLabel}</div>
            <div className="text-xs text-muted-foreground">{isRtl ? `${hijri} هـ` : `${hijri} AH`}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setDay(addDays(day, -1))} aria-label={tr("اليوم السابق", "Previous day")}>
              <Prev />
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setDay(today)}>
              {tr("اليوم", "Today")}
            </Button>
            <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setDay(addDays(day, 1))} aria-label={tr("اليوم التالي", "Next day")}>
              <Next />
            </Button>
            <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className={fieldCls} aria-label={tr("اختر تاريخًا", "Pick a date")} />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {(weekQuery.data ?? []).map((w) => (
            <button
              key={w.date}
              type="button"
              onClick={() => setDay(w.date)}
              aria-pressed={w.date === day}
              className={cn(
                "grid justify-items-center gap-0.5 rounded-2xl border px-1 py-2 transition-colors",
                w.date === day ? "bg-white/70 dark:bg-white/[0.17] border-[var(--glass-edge)] shadow-sm" : "border-transparent bg-muted hover:bg-white/50 dark:hover:bg-white/[0.1]"
              )}
            >
              <span className="text-[11px] text-muted-foreground">{fmt(w.date, { weekday: "short" }, locale)}</span>
              <span className={cn("text-lg font-bold leading-tight", w.date === today && "text-primary")}>{fromKey(w.date).getDate()}</span>
              <span className="h-1 w-3/4 overflow-hidden rounded-full bg-border">
                <span className="block h-full rounded-full bg-success transition-all duration-500" style={{ width: `${w.total ? (w.done / w.total) * 100 : 0}%` }} />
              </span>
              <span className="hidden sm:block text-[10.5px] text-muted-foreground">{w.total ? `${w.done}/${w.total}` : "—"}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <AppleIcon icon={ListChecks} tone="blue" size="md" />
          <div><div className="text-2xl font-bold leading-none">{tasks.length}</div><div className="text-xs text-muted-foreground mt-1">{tr("إجمالي المهام", "Total tasks")}</div></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <AppleIcon icon={CircleCheck} tone="emerald" size="md" />
          <div><div key={bumps} className={cn("text-2xl font-bold leading-none inline-block", bumps > 0 && "task-bump")}>{done}</div><div className="text-xs text-muted-foreground mt-1">{tr("منجزة", "Done")}</div></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <AppleIcon icon={Clock} tone="orange" size="md" />
          <div><div className="text-2xl font-bold leading-none">{tasks.length - done}</div><div className="text-xs text-muted-foreground mt-1">{tr("متبقية", "Remaining")}{urgentOpen ? tr(` · ${urgentOpen} عاجلة`, ` · ${urgentOpen} urgent`) : ""}</div></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <svg viewBox="0 0 46 46" className="h-12 w-12 shrink-0" aria-hidden="true">
            <circle cx="23" cy="23" r="19" fill="none" className="stroke-border" strokeWidth="5" />
            <circle cx="23" cy="23" r="19" fill="none" className="stroke-success task-ring" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(ringC * pct).toFixed(1)} ${ringC.toFixed(1)}`} transform="rotate(-90 23 23)" />
            <text x="23" y="27" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">{Math.round(pct * 100)}%</text>
          </svg>
          <div><div className="font-bold leading-none">{tr("نسبة الإنجاز", "Completion")}</div><div className="text-xs text-muted-foreground mt-1">{tr(`${done} من ${tasks.length}`, `${done} of ${tasks.length}`)}</div></div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div className="space-y-4 min-w-0">
          {can.create && (
            <Card className="p-4">
              <form onSubmit={submit} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    placeholder={tr("اكتب المهمة... مثال: مراجعة إقامات فرع بيشة", "Type a task… e.g. review the Bisha branch iqamas")}
                    aria-label={tr("عنوان المهمة", "Task title")}
                    className="h-11 min-w-0 flex-1 rounded-2xl border border-input bg-background px-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button type="submit" className="h-11 rounded-full px-5" disabled={create.isPending}>
                    {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />} {tr("إضافة", "Add")}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <label className="flex items-center gap-1.5">{tr("التصنيف", "Category")}
                    <select className={fieldCls} value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>
                      {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{isRtl ? c.ar : c.en}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5">{tr("الأولوية", "Priority")}
                    <select className={fieldCls} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                      {(["NORMAL", "HIGH", "URGENT"] as const).map((p) => <option key={p} value={p}>{isRtl ? PRIORITIES[p].ar : PRIORITIES[p].en}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5">{tr("المسؤول", "Assignee")}
                    <select className={fieldCls} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                      <option value="">{tr("غير محدد", "Unassigned")}</option>
                      {(assigneesQuery.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5">{tr("الوقت", "Time")}
                    <input type="time" className={fieldCls} value={time} onChange={(e) => setTime(e.target.value)} />
                  </label>
                </div>
              </form>
            </Card>
          )}

          <Card className="py-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <h2 className="text-[15px] font-bold">{day === today ? tr("مهام اليوم", "Today's tasks") : tr(`مهام ${fmt(day, { weekday: "long" }, locale)} ${dmy(day)}`, `Tasks for ${fmt(day, { weekday: "long" }, locale)} ${dmy(day)}`)}</h2>
              <div className="flex flex-wrap items-center gap-2">
                {carryable > 0 && can.edit && (
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => carry.mutate()} disabled={carry.isPending}>
                    <Carry /> {tr(`ترحيل ${carryable} مهام غير منجزة من أمس`, `Move ${carryable} unfinished from yesterday`)}
                  </Button>
                )}
                <div className="inline-flex rounded-xl bg-muted p-0.5" role="group" aria-label={tr("تصفية", "Filter")}>
                  {(["all", "open", "done"] as const).map((f) => (
                    <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={cn("rounded-lg px-3 py-1 text-xs font-semibold", filter === f ? "bg-background shadow-sm" : "text-muted-foreground")}>
                      {f === "all" ? tr("الكل", "All") : f === "open" ? tr("المتبقية", "Open") : tr("المنجزة", "Done")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {dayQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 border-t border-border py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{tr("جاري التحميل...", "Loading...")}</div>
            ) : shown.length === 0 ? (
              <div className="grid justify-items-center gap-1.5 border-t border-border px-4 py-10 text-center">
                <AppleIcon icon={ListChecks} tone="emerald" size="lg" />
                <b>{tasks.length ? tr("لا توجد مهام بهذا التصنيف", "No tasks match this filter") : tr("لا توجد مهام لهذا اليوم", "No tasks for this day")}</b>
                <span className="text-sm text-muted-foreground">{tasks.length ? tr("غيّر التصفية لعرض باقي المهام", "Change the filter to see the rest") : tr("اكتب مهمة في الخانة بالأعلى واضغط إضافة", "Type a task above and press Add")}</span>
              </div>
            ) : (
              shown.map((t) => {
                const cat = CATEGORIES[t.category] ?? CATEGORIES.general;
                const pri = PRIORITIES[t.priority];
                const anim = animating[t.id];
                return (
                  <div
                    key={t.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(t.id, el);
                      else rowRefs.current.delete(t.id);
                    }}
                    className={cn("task-row grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 py-3", t.done && "is-done", anim === "done" && "just-done", anim === "undone" && "just-undone")}
                  >
                    <button
                      type="button"
                      className="task-chk"
                      aria-pressed={t.done}
                      aria-label={t.done ? tr("إلغاء الإنجاز", "Mark as not done") : tr("تعليم كمنجزة", "Mark as done")}
                      disabled={!can.edit}
                      onClick={() => toggle.mutate({ task: t })}
                    >
                      {t.done && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                      {anim === "done" && (
                        <>
                          <span className="task-wave" />
                          {SPARK_COLORS.map((c, i) => {
                            const a = (i / SPARK_COLORS.length) * Math.PI * 2 + 0.3;
                            const dist = 20 + (i % 3) * 7;
                            return <span key={i} className="task-spark" style={{ ["--c" as string]: c, ["--dx" as string]: `${(Math.cos(a) * dist).toFixed(1)}px`, ["--dy" as string]: `${(Math.sin(a) * dist).toFixed(1)}px` }} />;
                          })}
                        </>
                      )}
                    </button>
                    <AppleIcon icon={cat.icon} tone={cat.tone} size="sm" className="hidden sm:flex" />
                    <div className="min-w-0">
                      <b className="task-title font-semibold">{t.title}</b>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-px font-semibold before:h-1.5 before:w-1.5 before:rounded-full before:bg-current", pri.cls)}>{isRtl ? pri.ar : pri.en}</span>
                        <span>{isRtl ? cat.ar : cat.en}</span>
                        {t.time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t.time}</span>}
                        {t.assignee && <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{t.assignee.fullName}</span>}
                        {t.carriedFrom && <span className="inline-flex items-center gap-1"><Carry className="h-3.5 w-3.5" />{tr(`مرحّلة من ${dmy(t.carriedFrom)}`, `Moved from ${dmy(t.carriedFrom)}`)}</span>}
                      </div>
                    </div>
                    {can.del && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground" onClick={() => remove.mutate(t.id)} aria-label={tr("حذف المهمة", "Delete task")}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-primary" />{tr("مقترحة من النظام", "Suggested by the system")}</h3>
            <p className="text-xs text-muted-foreground">{tr("وثائق منتهية أو تنتهي خلال أسبوع، تضيفها كمهمة بضغطة.", "Documents expired or due within a week, one tap to add.")}</p>
            {(suggestionsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{tr("لا توجد اقتراحات الآن.", "Nothing to suggest right now.")}</p>
            ) : (
              (suggestionsQuery.data ?? []).map((s) => (
                <div key={s.key} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 rounded-2xl border border-border bg-muted p-2.5">
                  <AppleIcon icon={IdCard} tone={s.priority === "URGENT" ? "red" : "orange"} size="sm" />
                  <div className="min-w-0">
                    <b className="block text-[13px]">{s.title}</b>
                    <span className="text-[11.5px] text-muted-foreground">{s.reason}</span>
                  </div>
                  {can.create && (
                    <Button size="sm" variant={s.added ? "outline" : "default"} className="col-start-2 justify-self-start rounded-full" disabled={s.added || create.isPending} onClick={() => addSuggestion(s)}>
                      {s.added ? <><Check /> {tr("أضيفت", "Added")}</> : <><Plus /> {tr("أضف كمهمة اليوم", "Add to today")}</>}
                    </Button>
                  )}
                </div>
              ))
            )}
          </Card>
          <Card className="p-4 space-y-2.5">
            <h3 className="font-bold">{tr("حسب التصنيف", "By category")}</h3>
            {Object.entries(CATEGORIES).map(([k, c]) => {
              const list = tasks.filter((t) => t.category === k);
              return (
                <div key={k} className="flex items-center gap-2.5 text-sm">
                  <AppleIcon icon={c.icon} tone={c.tone} size="xs" />
                  <span>{isRtl ? c.ar : c.en}</span>
                  <b className="ms-auto">{list.filter((t) => t.done).length}/{list.length}</b>
                </div>
              );
            })}
          </Card>
        </aside>
      </div>
    </div>
  );
}
