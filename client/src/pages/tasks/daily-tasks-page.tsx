import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Clock, FileSpreadsheet, Loader2, Plus, Printer, Trash2, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { luluPop } from "@/components/lulu/lulu-effects";
import { tasksApi, type DailyTask, type TaskCategory, type TaskPriority } from "@/api/tasks";
import { useAuthStore } from "@/stores/authStore";
import { downloadFile, openPdfInNewTab } from "@/lib/download";
import { getErrorMessage } from "@/lib/api";
import { tr, isRtlLanguage } from "@/i18n";
import { cn } from "@/lib/utils";

/* Daily tasks in the Pearl design, as in the approved preview: the tasks of
   the day in the green card, what is coming up in the amber one, and the week
   to move between days. */

const CATEGORIES: Record<TaskCategory, { ar: string; en: string; tone: string }> = {
  employees: { ar: "الموظفون", en: "Employees", tone: "lt-indigo" },
  documents: { ar: "الوثائق والإقامات", en: "Documents & iqamas", tone: "lt-sky" },
  branches: { ar: "المؤسسات", en: "Establishments", tone: "lt-teal" },
  payments: { ar: "المدفوعات", en: "Payments", tone: "lt-violet" },
  general: { ar: "عام", en: "General", tone: "lt-green" },
};
const PRIORITIES: Record<TaskPriority, { ar: string; en: string; tone: string }> = {
  URGENT: { ar: "عاجلة", en: "Urgent", tone: "lt-rose" },
  HIGH: { ar: "مهمة", en: "High", tone: "lt-amber" },
  NORMAL: { ar: "عادية", en: "Normal", tone: "lt-sky" },
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
  // The dashboard's week strip opens a day with ?date=YYYY-MM-DD.
  const [searchParams] = useSearchParams();
  const asked = searchParams.get("date");
  const [day, setDay] = useState(asked && /^d{4}-d{2}-d{2}$/.test(asked) ? asked : today);
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


  const dayTitle = day === today ? tr("مهام اليوم", "Today's tasks") : tr(`مهام ${fmt(day, { weekday: "long" }, locale)} ${dmy(day)}`, `Tasks for ${fmt(day, { weekday: "long" }, locale)} ${dmy(day)}`);
  const week = weekQuery.data ?? [];
  const weekNote = week.length ? `${fmt(week[0].date, { day: "numeric", month: "long" }, locale)} – ${fmt(week[week.length - 1].date, { day: "numeric", month: "long" }, locale)}` : "";
  const suggestions = suggestionsQuery.data ?? [];
  const sel = "h-9 rounded-xl border-0 bg-[var(--l-surface)] px-2.5 text-[13px] text-foreground shadow-[var(--l-shadow)] focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <>
      <PageHeader
        title={tr("المهام اليومية", "Daily Tasks")}
        description={`${dayLabel} · ${hijri.replace(/\s*(هـ|AH)$/, "")} ${isRtl ? "هـ" : "AH"}`}
        actions={
          can.exp && (
            <>
              <div className="inline-flex h-11 rounded-[14px] bg-[var(--l-surface)] p-1 shadow-[var(--l-shadow)]" role="group" aria-label={tr("نطاق التصدير", "Export range")}>
                {(["day", "week"] as const).map((r) => (
                  <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)} className={cn("rounded-[11px] px-4 text-[13px] font-semibold", range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                    {r === "day" ? tr("اليوم", "Day") : tr("الأسبوع", "Week")}
                  </button>
                ))}
              </div>
              <Button variant="outline" onClick={printPdf}>
                <Printer /> {tr("طباعة / PDF", "Print / PDF")}
              </Button>
              <Button variant="outline" onClick={excel}>
                <FileSpreadsheet /> Excel
              </Button>
            </>
          )
        }
      />

      <div className="lu-grid">
        {/* The day's tasks */}
        <section className="lu-cc lu-rise lt-green lu-s8" style={{ ["--i" as string]: 0 }}>
          <div className="lu-hd">
            <h2>{dayTitle}</h2>
            <span key={bumps} className="lu-note">
              {tr(`${done} من ${tasks.length}`, `${done} of ${tasks.length}`)}
              {urgentOpen ? tr(` · ${urgentOpen} عاجلة`, ` · ${urgentOpen} urgent`) : ""}
            </span>
          </div>
          {can.create && (
            <form onSubmit={submit}>
              <div className="mt-3 flex gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder={tr("اكتب مهمة جديدة…", "Write a new task…")}
                  aria-label={tr("عنوان المهمة", "Task title")}
                  className="h-11 min-w-0 flex-1 rounded-xl border-0 bg-[var(--l-surface)] px-3.5 text-[14.5px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                />
                <button type="submit" className="lu-do" style={{ minHeight: 44 }} disabled={create.isPending}>
                  {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />} {tr("إضافة", "Add")}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <select className={sel} value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} aria-label={tr("التصنيف", "Category")}>
                  {Object.entries(CATEGORIES).map(([k, c]) => (
                    <option key={k} value={k}>
                      {isRtl ? c.ar : c.en}
                    </option>
                  ))}
                </select>
                <select className={sel} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} aria-label={tr("الأولوية", "Priority")}>
                  {(["NORMAL", "HIGH", "URGENT"] as const).map((p) => (
                    <option key={p} value={p}>
                      {isRtl ? PRIORITIES[p].ar : PRIORITIES[p].en}
                    </option>
                  ))}
                </select>
                <select className={sel} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} aria-label={tr("المسؤول", "Assignee")}>
                  <option value="">{tr("بدون مسؤول", "Unassigned")}</option>
                  {(assigneesQuery.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
                <input type="time" className={sel} value={time} onChange={(e) => setTime(e.target.value)} aria-label={tr("الوقت", "Time")} />
              </div>
            </form>
          )}
          <div className="lu-bar">
            <i style={{ width: `${pct * 100}%` }} />
          </div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {(["all", "open", "done"] as const).map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={cn("lu-fchip lt-green", filter === f && "on")} style={{ height: 34, padding: "0 12px", fontSize: 12.5 }}>
                {f === "all" ? tr("الكل", "All") : f === "open" ? tr("المتبقية", "Open") : tr("المنجزة", "Done")}
              </button>
            ))}
            {carryable > 0 && can.edit && (
              <button type="button" className="lu-fchip lt-amber ms-auto" style={{ height: 34, padding: "0 12px", fontSize: 12.5 }} onClick={() => carry.mutate()} disabled={carry.isPending}>
                <Carry className="h-4 w-4" /> {tr(`ترحيل ${carryable} من أمس`, `Move ${carryable} from yesterday`)}
              </button>
            )}
          </div>

          {dayQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tr("جاري التحميل...", "Loading...")}
            </div>
          ) : shown.length === 0 ? (
            <div className="lu-task" style={{ cursor: "default" }}>
              <span className="box" />
              <span className="tt">{tasks.length ? tr("لا توجد مهام بهذا التصنيف", "No tasks match this filter") : tr("لا توجد مهام لهذا اليوم — اكتب مهمة بالأعلى", "No tasks for this day — write one above")}</span>
            </div>
          ) : (
            shown.map((t) => {
              const cat = CATEGORIES[t.category] ?? CATEGORIES.general;
              const pri = PRIORITIES[t.priority];
              const on = animating[t.id] ? animating[t.id] === "done" : t.done;
              return (
                <div
                  key={t.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(t.id, el);
                    else rowRefs.current.delete(t.id);
                  }}
                  className="flex items-center gap-1"
                >
                  <button
                    type="button"
                    className={cn("lu-task", on && "on")}
                    aria-pressed={t.done}
                    disabled={!can.edit}
                    onClick={(e) => {
                      if (!t.done) luluPop(e.currentTarget.querySelector(".box"));
                      toggle.mutate({ task: t });
                    }}
                  >
                    <span className="box">
                      <Check strokeWidth={3.2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="tt block">{t.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] text-muted-foreground">
                        {t.priority !== "NORMAL" && <span className={cn("lu-chip", pri.tone)} style={{ padding: "1px 8px", fontSize: 11 }}>{isRtl ? pri.ar : pri.en}</span>}
                        <span className={cat.tone} style={{ color: "var(--c)" }}>{isRtl ? cat.ar : cat.en}</span>
                        {t.time && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t.time}
                          </span>
                        )}
                        {t.assignee && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {t.assignee.fullName}
                          </span>
                        )}
                        {t.carriedFrom && <span>{tr(`مرحّلة من ${dmy(t.carriedFrom)}`, `Moved from ${dmy(t.carriedFrom)}`)}</span>}
                      </span>
                    </span>
                  </button>
                  {can.del && (
                    <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-[var(--l-surface)] hover:text-destructive" onClick={() => remove.mutate(t.id)} aria-label={tr("حذف المهمة", "Delete task")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* Coming up: what the system suggests */}
        <section className="lu-cc lu-rise lt-amber lu-s4" style={{ ["--i" as string]: 1 }}>
          <div className="lu-hd">
            <h2>{tr("القادمة", "Coming up")}</h2>
            <span className="lu-note">{suggestions.length ? tr(`${suggestions.length} مقترحة`, `${suggestions.length} suggested`) : tr("لا شيء", "Nothing")}</span>
          </div>
          {suggestions.length === 0 && (
            <div className="lu-prow lt-green" style={{ ["--j" as string]: 0 }}>
              <span className="lu-pi">
                <Check />
              </span>
              <span className="lu-cell">
                <b>{tr("لا توجد اقتراحات الآن", "Nothing to suggest right now")}</b>
                <small>{tr("كل الوثائق بعيدة عن الانتهاء", "No document is close to ending")}</small>
              </span>
            </div>
          )}
          {suggestions.map((s, j) => (
            <div key={s.key} className={cn("lu-prow", s.priority === "URGENT" ? "lt-rose" : "lt-amber")} style={{ ["--j" as string]: j }}>
              <span className="lu-pi">
                <Clock />
              </span>
              <span className="lu-cell">
                <b>{s.title}</b>
                <small>{s.reason}</small>
              </span>
              {can.create && (
                <button type="button" className={cn("lu-do", s.added && "done")} disabled={s.added || create.isPending} onClick={(e) => { luluPop(e.currentTarget); addSuggestion(s); }}>
                  {s.added ? <><Check /> {tr("أضيفت", "Added")}</> : tr("أضف", "Add")}
                </button>
              )}
            </div>
          ))}
        </section>

        {/* The week: pick a day */}
        <section className="lu-cc lu-rise lt-sky lu-s12" style={{ ["--i" as string]: 2 }}>
          <div className="lu-hd">
            <h2>{tr("هذا الأسبوع", "This week")}</h2>
            <div className="flex items-center gap-1.5">
              <span className="lu-note">{weekNote}</span>
              <button type="button" className="lu-btn" style={{ height: 36, minWidth: 36, padding: 0 }} onClick={() => setDay(addDays(day, -7))} aria-label={tr("الأسبوع السابق", "Previous week")}>
                <Prev />
              </button>
              <button type="button" className="lu-btn" style={{ height: 36, padding: "0 12px", fontSize: 13 }} onClick={() => setDay(today)}>
                {tr("اليوم", "Today")}
              </button>
              <button type="button" className="lu-btn" style={{ height: 36, minWidth: 36, padding: 0 }} onClick={() => setDay(addDays(day, 7))} aria-label={tr("الأسبوع التالي", "Next week")}>
                <Next />
              </button>
            </div>
          </div>
          <div className="lu-week">
            {week.map((w) => (
              <button
                key={w.date}
                type="button"
                onClick={() => setDay(w.date)}
                aria-pressed={w.date === day}
                className={cn("lu-day", w.date === today && "today")}
                style={w.date === day && w.date !== today ? { boxShadow: "inset 0 0 0 2px var(--c)" } : undefined}
              >
                <small>{fmt(w.date, { weekday: "long" }, locale)}</small>
                <b className="lu-num">{fromKey(w.date).getDate()}</b>
                <span className="dots">
                  {Array.from({ length: Math.min(3, w.done) }).map((_, j) => (
                    <i key={`d${j}`} style={{ background: "var(--l-green)" }} />
                  ))}
                  {Array.from({ length: Math.min(3 - Math.min(3, w.done), w.total - w.done) }).map((_, j) => (
                    <i key={`o${j}`} style={{ background: "var(--l-amber)" }} />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
