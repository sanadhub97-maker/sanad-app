import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3,
  FileSpreadsheet,
  FileText,
  List,
  Loader2,
  Plus,
  Printer,
  Sparkles,
  Star,
  Trash2,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/common/page-header";
import { luluPop } from "@/components/lulu/lulu-effects";
import { tasksApi, type DailyTask, type TaskCategory, type TaskPriority } from "@/api/tasks";
import { useAuthStore } from "@/stores/authStore";
import { downloadFile, openPdfInNewTab } from "@/lib/download";
import { getErrorMessage } from "@/lib/api";
import { tr, isRtlLanguage } from "@/i18n";
import { cn } from "@/lib/utils";
import "@/styles/tasks-royal.css";

/* Daily tasks in the Royal design, as in the approved preview: every task
   under its day with the Gregorian and Hijri date and the day's progress,
   seen as days, as the week board, or as the month. */

type View = "days" | "week" | "month";

const CATEGORIES: Record<TaskCategory, { ar: string; en: string; c: string; t: string; Icon: LucideIcon }> = {
  employees: { ar: "الموظفون", en: "Employees", c: "var(--l-indigo)", t: "var(--l-indigo-t)", Icon: Users },
  documents: { ar: "الوثائق والإقامات", en: "Documents & iqamas", c: "var(--l-teal)", t: "var(--l-teal-t)", Icon: FileText },
  branches: { ar: "المؤسسات", en: "Establishments", c: "var(--l-violet)", t: "var(--l-violet-t)", Icon: Building2 },
  payments: { ar: "المدفوعات", en: "Payments", c: "var(--ry-gold)", t: "var(--ry-gold-t)", Icon: Wallet },
  general: { ar: "عام", en: "General", c: "var(--l-sky)", t: "var(--l-sky-t)", Icon: Star },
};
const PRIORITIES: Record<TaskPriority, { ar: string; en: string; c: string; t: string }> = {
  URGENT: { ar: "عاجلة", en: "Urgent", c: "var(--l-rose)", t: "var(--l-rose-t)" },
  HIGH: { ar: "مهمة", en: "High", c: "var(--l-amber)", t: "var(--l-amber-t)" },
  NORMAL: { ar: "عادية", en: "Normal", c: "var(--l-sky)", t: "var(--l-sky-t)" },
};
const RANK: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, NORMAL: 2 };

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
const daysBetween = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
const weekStart = (k: string) => addDays(k, -fromKey(k).getDay());
const monthStart = (k: string) => `${k.slice(0, 7)}-01`;
const monthEnd = (k: string) => {
  const d = fromKey(monthStart(k));
  return keyOf(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};
const addMonths = (k: string, n: number) => {
  const d = fromKey(monthStart(k));
  return keyOf(new Date(d.getFullYear(), d.getMonth() + n, 1));
};
/** The Sunday-first grid of a month: five weeks, or six when the month needs it. */
function monthGrid(month: string) {
  const from = weekStart(month);
  const weeks = daysBetween(from, monthEnd(month)) >= 35 ? 6 : 5;
  return { from, to: addDays(from, weeks * 7 - 1) };
}
function fmt(k: string, o: Intl.DateTimeFormatOptions, locale: string) {
  try {
    return fromKey(k).toLocaleDateString(locale, o);
  } catch {
    return k.split("-").reverse().join("/");
  }
}

const prefersReducedMotion = () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

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
  const colors = ["#1f45c4", "#2f7fe0", "#c99a2e", "#0f9d6e", "#7c6cf0", "#ffffff"];
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

// ---------- People ----------
const hueOf = (id: string) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.replace(/^ال(?=..)/, "").charAt(0))
    .join(" ");
function Avatar({ person }: { person: { id: string; fullName: string } | null }) {
  if (!person)
    return (
      <span className="tk-av" style={{ ["--h" as string]: 225 }} title={tr("بدون مسؤول", "Unassigned")}>
        <User />
      </span>
    );
  return (
    <span className="tk-av" style={{ ["--h" as string]: hueOf(person.id) }} title={person.fullName}>
      {initials(person.fullName)}
    </span>
  );
}

const tone = (c: string, t: string) => ({ ["--c" as string]: c, ["--t" as string]: t }) as CSSProperties;

export default function DailyTasksPage() {
  const { i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const locale = isRtl ? "ar-EG-u-nu-latn" : "en-GB";
  const hijriLocale = isRtl ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-u-ca-islamic-umalqura";
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const can = { create: hasPermission("tasks.create"), edit: hasPermission("tasks.edit"), del: hasPermission("tasks.delete"), exp: hasPermission("tasks.export") };
  const me = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const today = keyOf(new Date());
  // The dashboard's week strip opens a day with ?date=YYYY-MM-DD.
  const [searchParams] = useSearchParams();
  const asked = searchParams.get("date");
  const opened = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today;

  const [view, setView] = useState<View>("days");
  const [anchor, setAnchor] = useState(() => weekStart(opened));
  const [month, setMonth] = useState(() => monthStart(opened));
  const [cats, setCats] = useState<TaskCategory[]>([]);
  const [pri, setPri] = useState<"all" | TaskPriority>("all");
  const [status, setStatus] = useState<"all" | "open" | "done">("all");
  const scrollTarget = useRef<string | null>(opened !== today ? opened : null);

  const range = view === "month" ? monthGrid(month) : { from: anchor, to: addDays(anchor, 6) };
  const rangeKey = ["tasks", "range", range.from, range.to, today] as const;
  const rangeQuery = useQuery({ queryKey: rangeKey, queryFn: () => tasksApi.range(range.from, range.to, today), placeholderData: (prev) => prev });
  const todayQuery = useQuery({ queryKey: ["tasks", "day", today], queryFn: () => tasksApi.day(today) });
  const assigneesQuery = useQuery({ queryKey: ["tasks", "assignees"], queryFn: tasksApi.assignees, staleTime: 5 * 60_000 });
  const suggestionsQuery = useQuery({ queryKey: ["tasks", "suggestions"], queryFn: tasksApi.suggestions });

  const tasks = useMemo(() => rangeQuery.data?.tasks ?? [], [rangeQuery.data]);
  const overdue = rangeQuery.data?.overdue ?? 0;
  const byDay = useMemo(() => {
    const m = new Map<string, DailyTask[]>();
    for (const t of tasks) m.set(t.date, [...(m.get(t.date) ?? []), t]);
    return m;
  }, [tasks]);
  const on = (k: string) => byDay.get(k) ?? [];
  const pass = (t: DailyTask) => (!cats.length || cats.includes(t.category)) && (pri === "all" || t.priority === pri) && (status === "all" || (status === "done" ? t.done : !t.done));
  const sorted = (list: DailyTask[]) =>
    list
      .filter(pass)
      .sort((a, b) => Number(a.done) - Number(b.done) || RANK[a.priority] - RANK[b.priority] || (a.time ?? "99").localeCompare(b.time ?? "99") || a.createdAt.localeCompare(b.createdAt));

  // What the band and the side cards count: the week shown, or the month's own days.
  const scope = view === "month" ? { from: month, to: monthEnd(month) } : range;
  const scoped = tasks.filter((t) => t.date >= scope.from && t.date <= scope.to);
  const scopedDone = scoped.filter((t) => t.done).length;
  const pct = scoped.length ? Math.round((scopedDone / scoped.length) * 100) : 0;
  const urgentOpen = scoped.filter((t) => !t.done && t.priority === "URGENT").length;
  const todayList = todayQuery.data ?? [];

  // Opening a day from the dashboard or the month brings it into view.
  useEffect(() => {
    const k = scrollTarget.current;
    if (!k || view !== "days" || !rangeQuery.data) return;
    const el = document.getElementById(`tk-day-${k}`);
    if (!el) return;
    scrollTarget.current = null;
    requestAnimationFrame(() => el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }));
  }, [view, rangeQuery.data, anchor]);

  // ---------- Changes ----------
  const refresh = () => {
    for (const k of ["range", "day", "week", "suggestions"]) void queryClient.invalidateQueries({ queryKey: ["tasks", k] });
  };
  const patchRange = (fn: (list: DailyTask[]) => DailyTask[]) =>
    queryClient.setQueryData<{ tasks: DailyTask[]; overdue: number }>(rangeKey, (old) => (old ? { ...old, tasks: fn(old.tasks) } : old));

  function celebrateIfAllDone(list: DailyTask[]) {
    if (!list.length || list.some((t) => !t.done)) return;
    toast.success(tr("🎉 أحسنت! أنجزت كل مهام اليوم", "🎉 Well done! Every task for today is complete"));
    if (!prefersReducedMotion()) confetti();
  }

  const toggle = useMutation({
    mutationFn: (task: DailyTask) => tasksApi.update(task.id, { done: !task.done }),
    onMutate: (task) => {
      const nowDone = !task.done;
      patchRange((list) => list.map((t) => (t.id === task.id ? { ...t, done: nowDone } : t)));
      if (nowDone) navigator.vibrate?.(12);
      if (nowDone && task.date === today) {
        const list = (todayQuery.data ?? []).map((t) => (t.id === task.id ? { ...t, done: true } : t));
        celebrateIfAllDone(list.some((t) => t.id === task.id) ? list : [...list, { ...task, done: true }]);
      }
    },
    onError: (err, task) => {
      patchRange((list) => list.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
      toast.error(getErrorMessage(err));
    },
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) => tasksApi.remove(id),
    onSuccess: (_r, id) => {
      patchRange((list) => list.filter((t) => t.id !== id));
      toast.success(tr("تم حذف المهمة", "Task deleted"));
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const carry = useMutation({
    mutationFn: (from: string) => tasksApi.carry(from, today),
    onSuccess: ({ moved }) => {
      toast.success(tr(`تم نقل ${moved} مهام إلى اليوم`, `Moved ${moved} tasks to today`));
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // ---------- New task ----------
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>("general");
  const [priority, setPriority] = useState<TaskPriority>("NORMAL");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [time, setTime] = useState("");
  const [formDate, setFormDate] = useState(today);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!assigneeId && me) setAssigneeId(me);
  }, [me, assigneeId]);

  const create = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: (task) => {
      if (task.date >= range.from && task.date <= range.to) patchRange((list) => [...list, task]);
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      titleRef.current?.focus();
      return toast.error(tr("اكتب عنوان المهمة أولاً", "Type the task first"));
    }
    const date = formDate || today;
    create.mutate(
      { date, title: title.trim(), category, priority, assigneeId: assigneeId || null, time: time || null },
      {
        onSuccess: () => {
          setTitle("");
          setTime("");
          toast.success(tr(`تمت إضافة المهمة ليوم ${fmt(date, { weekday: "long" }, locale)}`, `Task added for ${fmt(date, { weekday: "long" }, locale)}`));
          if (view !== "month" && weekStart(date) !== anchor) {
            scrollTarget.current = date;
            setAnchor(weekStart(date));
          }
        },
      }
    );
  };
  const addTo = (k: string) => {
    setFormDate(k);
    titleRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    titleRef.current?.focus({ preventScroll: true });
  };

  const addSuggestion = (s: { key: string; title: string; titleEn?: string; category: TaskCategory; priority: TaskPriority }) =>
    create.mutate(
      { date: today, title: isRtl ? s.title : (s.titleEn ?? s.title), category: s.category, priority: s.priority, assigneeId: me ?? null, sourceKey: s.key },
      { onSuccess: () => toast.success(tr("أضيفت لمهام اليوم", "Added to today")) }
    );

  // ---------- Moving around ----------
  const step = (d: number) => (view === "month" ? setMonth((m) => addMonths(m, d)) : setAnchor((a) => addDays(a, 7 * d)));
  const goToday = () => {
    setAnchor(weekStart(today));
    setMonth(monthStart(today));
  };
  const openDay = (k: string) => {
    scrollTarget.current = k;
    setAnchor(weekStart(k));
    setView("days");
  };
  const switchView = (v: View) => {
    if (v === "month") setMonth(monthStart(view === "month" ? month : anchor <= today && today <= addDays(anchor, 6) ? today : anchor));
    else if (view === "month") setAnchor(weekStart(month <= today && today <= monthEnd(month) ? today : month));
    setView(v);
  };

  // ---------- Export: the week or the month on screen ----------
  const exportRange = () => (view === "month" ? { from: month, to: monthEnd(month) } : range);
  const printPdf = () => {
    const r = exportRange();
    void openPdfInNewTab("/tasks/export", { ...r, format: "pdf" }, `daily-tasks-${r.from}.pdf`).catch(() => undefined);
  };
  const excel = () => {
    const r = exportRange();
    void downloadFile("/tasks/export", { ...r, format: "xlsx" }, `daily-tasks-${r.from}.xlsx`).catch(() => undefined);
  };

  // ---------- Words ----------
  const hijri = (k: string) => `${fmt(k, { day: "numeric", month: "long", year: "numeric" }, hijriLocale).replace(/\s*(هـ|AH)$/, "")} ${isRtl ? "هـ" : "AH"}`;
  const hijriDay = (k: string) => fmt(k, { day: "numeric" }, hijriLocale);
  const hijriDm = (k: string) => fmt(k, { day: "numeric", month: "long" }, hijriLocale);
  const rel = (k: string) => {
    const d = daysBetween(today, k);
    if (d === 0) return tr("اليوم", "Today");
    if (d === 1) return tr("غدًا", "Tomorrow");
    if (d === -1) return tr("أمس", "Yesterday");
    return d < 0 ? tr(`منذ ${-d} أيام`, `${-d} days ago`) : tr(`بعد ${d} أيام`, `In ${d} days`);
  };
  const dm = (k: string) => fmt(k, { day: "numeric", month: "long" }, locale);
  const rangeLabel = view === "month" ? fmt(month, { month: "long", year: "numeric" }, locale) : `${dm(range.from)} – ${dm(range.to)}`;
  const catName = (c: TaskCategory) => (isRtl ? CATEGORIES[c].ar : CATEGORIES[c].en);
  const Prev = isRtl ? ChevronRight : ChevronLeft;
  const Next = isRtl ? ChevronLeft : ChevronRight;
  const Carry = isRtl ? ArrowLeft : ArrowRight;
  const C = 2 * Math.PI * 30;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const suggestions = suggestionsQuery.data ?? [];
  const assignees = assigneesQuery.data ?? [];

  // ---------- Pieces ----------
  const taskRow = (t: DailyTask, j: number) => {
    const cat = CATEGORIES[t.category] ?? CATEGORIES.general;
    return (
      <div key={t.id} className={cn("tk-task", `p-${t.priority}`, t.done && "done")} style={{ ["--j" as string]: j }}>
        <button
          type="button"
          className="tk-ck"
          aria-pressed={t.done}
          aria-label={t.done ? tr("إلغاء الإنجاز", "Mark as open") : tr("تم", "Mark as done")}
          disabled={!can.edit}
          onClick={(e) => {
            if (!t.done) luluPop(e.currentTarget);
            toggle.mutate(t);
          }}
        >
          <Check strokeWidth={3.2} />
        </button>
        <div className="tk-tb">
          <b>{t.title}</b>
          <div className="tk-meta">
            <span className="tk-pill" style={tone(cat.c, cat.t)}>
              {catName(t.category)}
            </span>
            {t.priority !== "NORMAL" && (
              <span className="tk-pill" style={tone(PRIORITIES[t.priority].c, PRIORITIES[t.priority].t)}>
                {isRtl ? PRIORITIES[t.priority].ar : PRIORITIES[t.priority].en}
              </span>
            )}
            {t.time && (
              <span>
                <Clock />
                {t.time}
              </span>
            )}
            {t.assignee && (
              <span>
                <User />
                {t.assignee.fullName}
              </span>
            )}
            {t.carriedFrom && (
              <span className="moved">
                <Carry />
                {tr(`منقولة من ${fmt(t.carriedFrom, { weekday: "long" }, locale)} ${dm(t.carriedFrom)}`, `Moved from ${fmt(t.carriedFrom, { weekday: "long" }, locale)} ${dm(t.carriedFrom)}`)}
              </span>
            )}
            {!t.done && t.date < today && <span className="late">{tr("متأخرة", "Overdue")}</span>}
          </div>
          {t.notes && <div className="tk-note">{t.notes}</div>}
        </div>
        <div className="tk-end">
          {can.del && (
            <button type="button" className="tk-del" onClick={() => remove.mutate(t.id)} aria-label={tr("حذف المهمة", "Delete task")}>
              <Trash2 />
            </button>
          )}
          <Avatar person={t.assignee} />
        </div>
      </div>
    );
  };

  const dayProgress = (k: string) => {
    const all = on(k);
    const d = all.filter((t) => t.done).length;
    const p = all.length ? (d / all.length) * 100 : 0;
    return (
      <div className="tk-prog">
        <small>{all.length ? tr(`${d} من ${all.length} منجزة`, `${d} of ${all.length} done`) : tr("لا توجد مهام", "No tasks")}</small>
        <div className="tk-bar">
          <i className={cn(p === 100 && "full")} style={{ width: `${p}%` }} />
        </div>
      </div>
    );
  };

  const daysView = weekDays.map((k, i) => {
    const past = k < today;
    const all = on(k);
    const list = sorted(all);
    const open = all.filter((t) => !t.done).length;
    return (
      <section key={k} id={`tk-day-${k}`} className={cn("tk-card tk-day tk-rise", k === today && "today", past && "past")} style={{ ["--i" as string]: i }}>
        <div className="tk-dh">
          <div className="tk-cal">
            <small>{fmt(k, { month: "short" }, locale)}</small>
            <b>{fromKey(k).getDate()}</b>
          </div>
          <div className="t">
            <h3>
              {fmt(k, { weekday: "long" }, locale)} <span className="tag">{rel(k)}</span>
            </h3>
            <p>
              {fmt(k, { day: "numeric", month: "long", year: "numeric" }, locale)} · {hijri(k)}
            </p>
          </div>
          {past && open > 0 && can.edit && (
            <button type="button" className="tk-btn sm" onClick={() => carry.mutate(k)} disabled={carry.isPending}>
              <Carry /> {tr(`انقل ${open} إلى اليوم`, `Move ${open} to today`)}
            </button>
          )}
          {dayProgress(k)}
        </div>
        <div>
          {list.length ? (
            list.map(taskRow)
          ) : (
            <div className="tk-empty">{all.length ? tr("لا توجد مهام مطابقة للفلتر في هذا اليوم", "No tasks match the filter on this day") : tr("يوم فارغ — لا توجد مهام", "A free day — no tasks")}</div>
          )}
        </div>
        {!past && can.create && (
          <button type="button" className="tk-more" onClick={() => addTo(k)}>
            + {tr(`أضف مهمة ليوم ${fmt(k, { weekday: "long" }, locale)}`, `Add a task for ${fmt(k, { weekday: "long" }, locale)}`)}
          </button>
        )}
      </section>
    );
  });

  const weekView = (
    <div className="tk-board">
      {weekDays.map((k, i) => {
        const all = on(k);
        return (
          <div key={k} className={cn("tk-bcol tk-rise", k === today && "today")} style={{ ["--i" as string]: i }}>
            <div className="tk-bh">
              <small>{fmt(k, { weekday: "long" }, locale)}</small>
              <b>{fromKey(k).getDate()}</b>
              <em>
                {fmt(k, { month: "short" }, locale)} · {hijriDm(k)}
              </em>
            </div>
            <div className="tk-bl">
              {sorted(all).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={cn("tk-bt", `p-${t.priority}`, t.done && "done")}
                  aria-pressed={t.done}
                  disabled={!can.edit}
                  onClick={() => toggle.mutate(t)}
                >
                  {t.title}
                  <small>
                    {catName(t.category)}
                    {t.time ? ` · ${t.time}` : ""}
                    {t.assignee ? ` · ${t.assignee.fullName}` : ""}
                  </small>
                </button>
              ))}
              {!sorted(all).length && <div className="tk-empty" style={{ padding: "14px 4px" }}>—</div>}
            </div>
            <div className="tk-bf">
              <span>{tr(`${all.length} مهام`, `${all.length} tasks`)}</span>
              <span>{tr(`${all.filter((t) => t.done).length} منجزة`, `${all.filter((t) => t.done).length} done`)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const grid = monthGrid(month);
  const cells = Array.from({ length: daysBetween(grid.from, grid.to) + 1 }, (_, i) => addDays(grid.from, i));
  const monthView = (
    <div className="tk-card tk-month tk-rise">
      <div className="tk-mgrid">
        {cells.slice(0, 7).map((k) => (
          <div key={`w${k}`} className="tk-mwd">
            {fmt(k, { weekday: "short" }, locale)}
          </div>
        ))}
        {cells.map((k) => {
          const all = on(k).filter(pass);
          const dn = all.filter((t) => t.done).length;
          return (
            <button key={k} type="button" className={cn("tk-mday", k.slice(0, 7) !== month.slice(0, 7) && "out", k === today && "today")} onClick={() => openDay(k)}>
              <span className="n">
                <b>{fromKey(k).getDate()}</b>
                <small>{hijriDay(k)}</small>
              </span>
              <span className="dots">
                {all.slice(0, 12).map((t) => (
                  <i key={t.id} style={{ ["--c" as string]: (CATEGORIES[t.category] ?? CATEGORIES.general).c, opacity: t.done ? 0.45 : 1 }} />
                ))}
              </span>
              {all.length > 0 && (
                <span className={cn("cnt", dn === all.length && "all")}>{dn === all.length ? tr("✓ كلها منجزة", "✓ All done") : tr(`${all.length - dn} متبقية`, `${all.length - dn} open`)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Who has what, among the tasks counted.
  const who = new Map<string, { person: { id: string; fullName: string } | null; total: number; done: number }>();
  for (const t of scoped) {
    const row = who.get(t.assignee?.id ?? "") ?? { person: t.assignee, total: 0, done: 0 };
    row.total++;
    if (t.done) row.done++;
    who.set(t.assignee?.id ?? "", row);
  }
  const people = [...who.values()].sort((a, b) => b.total - a.total).slice(0, 6);

  const scopeWord = view === "month" ? tr("الشهر", "month") : tr("الأسبوع", "week");

  return (
    <>
      <PageHeader
        title={tr("المهام اليومية", "Daily Tasks")}
        description={`${fmt(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, locale)} · ${hijri(today)}`}
        actions={
          <>
            {can.exp && (
              <>
                <button type="button" className="tk-btn" onClick={printPdf}>
                  <Printer /> {view === "month" ? tr("طباعة الشهر", "Print month") : tr("طباعة الأسبوع", "Print week")}
                </button>
                <button type="button" className="tk-btn" onClick={excel}>
                  <FileSpreadsheet /> Excel
                </button>
              </>
            )}
            {can.create && (
              <button type="button" className="tk-btn pri" onClick={() => addTo(today)}>
                <Plus /> {tr("مهمة جديدة", "New task")}
              </button>
            )}
          </>
        }
      />

      <div className="tk">
        {/* The numbers of the week (or month) on screen */}
        <div className="tk-card tk-band tk-rise" style={{ ["--i" as string]: 0 }}>
          <div className="tk-ring">
            <div className="r">
              <svg viewBox="0 0 74 74" aria-hidden="true">
                <circle cx="37" cy="37" r="30" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="8" />
                <circle className="v" cx="37" cy="37" r="30" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(C * pct) / 100} ${C}`} />
              </svg>
              <b>{pct}%</b>
            </div>
            <div>
              <h3>{tr(`إنجاز ${scopeWord}`, `This ${scopeWord}'s progress`)}</h3>
              <p>
                {tr(`${scopedDone} من ${scoped.length} مهمة منجزة`, `${scopedDone} of ${scoped.length} tasks done`)} · {dm(scope.from)} – {dm(scope.to)}
              </p>
            </div>
          </div>
          <div>
            <span className="l">
              <i style={{ background: "hsl(var(--primary))" }} />
              {tr("مهام اليوم", "Today's tasks")}
            </span>
            <span className="v">
              {todayList.filter((t) => !t.done).length}
              <small> / {todayList.length}</small>
            </span>
            <span className="s">{tr("متبقية من إجمالي اليوم", "Open of today's total")}</span>
          </div>
          <div>
            <span className="l">
              <i style={{ background: "var(--l-violet)" }} />
              {tr("متأخرة", "Overdue")}
            </span>
            <span className="v" style={{ color: overdue ? "var(--l-violet)" : undefined }}>
              {overdue}
            </span>
            <span className="s">{overdue ? tr("من أيام سابقة ولم تُنجز", "From earlier days, still open") : tr("لا شيء متأخر", "Nothing overdue")}</span>
          </div>
          <div>
            <span className="l">
              <i style={{ background: "var(--l-rose)" }} />
              {tr(`عاجلة هذا ${scopeWord}`, `Urgent this ${scopeWord}`)}
            </span>
            <span className="v" style={{ color: urgentOpen ? "var(--l-rose)" : undefined }}>
              {urgentOpen}
            </span>
            <span className="s">{tr("لم تُنجز بعد", "Not done yet")}</span>
          </div>
          <div>
            <span className="l">
              <i style={{ background: "var(--l-green)" }} />
              {tr("تم إنجازها", "Done")}
            </span>
            <span className="v" style={{ color: "var(--l-green)" }}>
              {scopedDone}
            </span>
            <span className="s">{tr(`هذا ${scopeWord}`, `This ${scopeWord}`)}</span>
          </div>
        </div>

        {can.create && (
          <form className="tk-card tk-add tk-rise" style={{ ["--i" as string]: 1 }} onSubmit={submit} autoComplete="off">
            <div className="row">
              <div className="tt">
                <Plus />
                <input
                  ref={titleRef}
                  className="tk-in"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder={tr("اكتب مهمة جديدة واضغط Enter…", "Write a new task and press Enter…")}
                  aria-label={tr("عنوان المهمة", "Task title")}
                />
              </div>
              <button type="submit" className="tk-btn pri" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />} {tr("إضافة", "Add")}
              </button>
            </div>
            <div className="row">
              <select className="tk-in" value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} aria-label={tr("التصنيف", "Category")}>
                {(Object.keys(CATEGORIES) as TaskCategory[]).map((k) => (
                  <option key={k} value={k}>
                    {catName(k)}
                  </option>
                ))}
              </select>
              <select className="tk-in" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} aria-label={tr("الأولوية", "Priority")}>
                {(["NORMAL", "HIGH", "URGENT"] as const).map((p) => (
                  <option key={p} value={p}>
                    {isRtl ? PRIORITIES[p].ar : PRIORITIES[p].en}
                  </option>
                ))}
              </select>
              <select className="tk-in" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} aria-label={tr("المسؤول", "Assignee")}>
                <option value="">{tr("بدون مسؤول", "Unassigned")}</option>
                {assignees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
              <input type="date" className="tk-in" value={formDate} onChange={(e) => setFormDate(e.target.value)} aria-label={tr("التاريخ", "Date")} />
              <input type="time" className="tk-in" value={time} onChange={(e) => setTime(e.target.value)} aria-label={tr("الوقت", "Time")} />
            </div>
          </form>
        )}

        <div className="tk-tools tk-rise" style={{ ["--i" as string]: 2 }}>
          <div className="tk-views" role="group" aria-label={tr("طريقة العرض", "View")}>
            {(
              [
                ["days", List, tr("الأيام", "Days")],
                ["week", Columns3, tr("الأسبوع", "Week")],
                ["month", CalendarDays, tr("الشهر", "Month")],
              ] as const
            ).map(([v, Icon, label]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => switchView(v)}>
                <Icon /> {label}
              </button>
            ))}
          </div>
          <div className="tk-nav">
            <button type="button" className="ib" onClick={() => step(-1)} aria-label={tr("السابق", "Previous")}>
              <Prev />
            </button>
            <b>{rangeLabel}</b>
            <button type="button" className="ib" onClick={() => step(1)} aria-label={tr("التالي", "Next")}>
              <Next />
            </button>
            <button type="button" className="tk-chip" onClick={goToday}>
              {tr("اليوم", "Today")}
            </button>
          </div>
          <div className="sp" />
          {(Object.keys(CATEGORIES) as TaskCategory[]).map((k) => (
            <button
              key={k}
              type="button"
              className="tk-chip"
              aria-pressed={cats.includes(k)}
              style={tone(CATEGORIES[k].c, CATEGORIES[k].t)}
              onClick={() => setCats((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))}
            >
              <i />
              {catName(k)}
              <span>{scoped.filter((t) => t.category === k).length}</span>
            </button>
          ))}
          <select className="tk-chip" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label={tr("الحالة", "Status")}>
            <option value="all">{tr("كل الحالات", "Any status")}</option>
            <option value="open">{tr("المتبقية", "Open")}</option>
            <option value="done">{tr("المنجزة", "Done")}</option>
          </select>
          <select className="tk-chip" value={pri} onChange={(e) => setPri(e.target.value as typeof pri)} aria-label={tr("الأولوية", "Priority")}>
            <option value="all">{tr("كل الأولويات", "Any priority")}</option>
            {(["URGENT", "HIGH", "NORMAL"] as const).map((p) => (
              <option key={p} value={p}>
                {isRtl ? PRIORITIES[p].ar : PRIORITIES[p].en}
              </option>
            ))}
          </select>
        </div>

        <div className={cn("tk-layout", view === "week" && "wide")}>
          <div className="tk-col" key={`${view}-${range.from}`}>
            {rangeQuery.isLoading ? (
              <div className="tk-card tk-load">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tr("جاري التحميل...", "Loading...")}
              </div>
            ) : view === "days" ? (
              daysView
            ) : view === "week" ? (
              weekView
            ) : (
              monthView
            )}
          </div>

          {view !== "week" && (
            <div className="tk-col">
              <div className="tk-card tk-sc tk-rise" style={{ ["--i" as string]: 3 }}>
                <h3>
                  <Sparkles /> {tr("اقتراحات من النظام", "Suggested by SanaD")}
                </h3>
                <p>{tr("من الوثائق المنتهية أو التي تنتهي خلال أسبوع.", "From documents that ended or end within a week.")}</p>
                {suggestions.length === 0 && (
                  <div className="tk-sug">
                    <span className="si" style={tone("var(--l-green)", "var(--l-green-t)")}>
                      <Check />
                    </span>
                    <div>
                      <b>{tr("لا توجد اقتراحات الآن", "Nothing to suggest right now")}</b>
                      <small>{tr("كل الوثائق بعيدة عن الانتهاء", "No document is close to ending")}</small>
                    </div>
                    <span />
                  </div>
                )}
                {suggestions.map((s) => {
                  const cat = CATEGORIES[s.category] ?? CATEGORIES.general;
                  const pc = s.priority === "URGENT" ? PRIORITIES.URGENT : cat;
                  return (
                    <div key={s.key} className="tk-sug">
                      <span className="si" style={tone(pc.c, pc.t)}>
                        <cat.Icon />
                      </span>
                      <div>
                        <b>{isRtl ? s.title : (s.titleEn ?? s.title)}</b>
                        <small>{isRtl ? s.reason : (s.reasonEn ?? s.reason)}</small>
                      </div>
                      {can.create ? (
                        <button
                          type="button"
                          className={cn("add", s.added && "ok")}
                          disabled={s.added || create.isPending}
                          onClick={(e) => {
                            luluPop(e.currentTarget);
                            addSuggestion(s);
                          }}
                        >
                          {s.added ? (
                            <>
                              <Check /> {tr("أضيفت", "Added")}
                            </>
                          ) : (
                            <>
                              <Plus /> {tr("أضف", "Add")}
                            </>
                          )}
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="tk-card tk-sc tk-rise" style={{ ["--i" as string]: 4 }}>
                <h3>
                  <Users /> {tr(`توزيع مهام ${scopeWord}`, `Who has what this ${scopeWord}`)}
                </h3>
                <p>{tr("المسؤول عن كل مهمة، وكم أنجز.", "Who each task is with, and how much is done.")}</p>
                <div className="tk-who">
                  {people.length === 0 && <div className="tk-empty" style={{ padding: 6 }}>{tr("لا توجد مهام بعد", "No tasks yet")}</div>}
                  {people.map((p) => (
                    <div key={p.person?.id ?? "none"}>
                      <Avatar person={p.person} />
                      <span>{p.person?.fullName ?? tr("بدون مسؤول", "Unassigned")}</span>
                      <b>
                        {p.done}/{p.total}
                      </b>
                      <span className="tk-bar">
                        <i className={cn(p.done === p.total && "full")} style={{ width: `${(p.done / p.total) * 100}%` }} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tk-card tk-sc tk-rise" style={{ ["--i" as string]: 5 }}>
                <h3>
                  <List /> {tr("حسب التصنيف", "By category")}
                </h3>
                <p>{tr(`مهام ${scopeWord} موزعة على التصنيفات.`, `This ${scopeWord}'s tasks by category.`)}</p>
                <div className="tk-who">
                  {(Object.keys(CATEGORIES) as TaskCategory[]).map((k) => {
                    const v = CATEGORIES[k];
                    const n = scoped.filter((t) => t.category === k).length;
                    return (
                      <div key={k}>
                        <span className="tk-av" style={{ background: v.t, color: v.c }}>
                          <v.Icon />
                        </span>
                        <span>{catName(k)}</span>
                        <b>{n}</b>
                        <span className="tk-bar">
                          <i style={{ width: `${scoped.length ? (n / scoped.length) * 100 : 0}%`, background: v.c }} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
