import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { getTrackableItems } from "@/services/expiringItems";
import { daysUntil } from "@/services/expiration";
import { daysAr } from "@/services/whatsappTemplates";
import type { CreateTaskInput, UpdateTaskInput } from "@/modules/tasks/tasks.schemas";

// A task's day is a calendar date (no time zone): stored as midnight UTC.
const toDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const toDay = (d: Date) => d.toISOString().slice(0, 10);

const taskSelect = {
  id: true,
  date: true,
  title: true,
  category: true,
  priority: true,
  time: true,
  notes: true,
  done: true,
  doneAt: true,
  carriedFrom: true,
  sourceKey: true,
  createdAt: true,
  assignee: { select: { id: true, fullName: true } },
} as const;

type TaskRow = Awaited<ReturnType<typeof prisma.dailyTask.findFirstOrThrow<{ select: typeof taskSelect }>>>;
const shape = (t: TaskRow) => ({ ...t, date: toDay(t.date), carriedFrom: t.carriedFrom ? toDay(t.carriedFrom) : null });

const order = [{ done: "asc" as const }, { time: { sort: "asc" as const, nulls: "last" as const } }, { createdAt: "asc" as const }];

export async function listForDay(day: string) {
  const rows = await prisma.dailyTask.findMany({ where: { date: toDate(day), deletedAt: null }, select: taskSelect, orderBy: order });
  return rows.map(shape);
}

export async function listRange(from: string, to: string) {
  const rows = await prisma.dailyTask.findMany({
    where: { date: { gte: toDate(from), lte: toDate(to) }, deletedAt: null },
    select: taskSelect,
    orderBy: [{ date: "asc" }, ...order],
  });
  return rows.map(shape);
}

/** Sunday to Saturday around the given day: how many tasks, how many done. */
export async function weekSummary(day: string) {
  const d = toDate(day);
  const start = new Date(d.getTime() - d.getUTCDay() * 86_400_000);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const rows = await prisma.dailyTask.groupBy({
    by: ["date", "done"],
    where: { date: { gte: start, lte: end }, deletedAt: null },
    _count: { _all: true },
  });
  return Array.from({ length: 7 }, (_, i) => {
    const date = toDay(new Date(start.getTime() + i * 86_400_000));
    const onDay = rows.filter((r) => toDay(r.date) === date);
    return {
      date,
      total: onDay.reduce((n, r) => n + r._count._all, 0),
      done: onDay.filter((r) => r.done).reduce((n, r) => n + r._count._all, 0),
    };
  });
}

export async function create(input: CreateTaskInput, userId: string | undefined) {
  const task = await prisma.dailyTask.create({
    data: {
      date: toDate(input.date),
      title: input.title,
      category: input.category,
      priority: input.priority,
      assigneeId: input.assigneeId ?? null,
      time: input.time ?? null,
      notes: input.notes ?? null,
      sourceKey: input.sourceKey ?? null,
      createdById: userId ?? null,
    },
    select: taskSelect,
  });
  return shape(task);
}

async function findOrThrow(id: string) {
  const task = await prisma.dailyTask.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!task) throw ApiError.notFound("Task not found");
}

export async function update(id: string, input: UpdateTaskInput) {
  await findOrThrow(id);
  const task = await prisma.dailyTask.update({
    where: { id },
    data: {
      ...(input.date !== undefined && { date: toDate(input.date) }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
      ...(input.time !== undefined && { time: input.time }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.done !== undefined && { done: input.done, doneAt: input.done ? new Date() : null }),
    },
    select: taskSelect,
  });
  return shape(task);
}

export async function softDelete(id: string) {
  await findOrThrow(id);
  await prisma.dailyTask.update({ where: { id }, data: { deletedAt: new Date() } });
}

/** Moves the unfinished tasks of one day to another, remembering where they came from. */
export async function carryOver(from: string, to: string) {
  const { count } = await prisma.dailyTask.updateMany({
    where: { date: toDate(from), done: false, deletedAt: null },
    data: { date: toDate(to), carriedFrom: toDate(from) },
  });
  return { moved: count };
}

/** People a task can be assigned to. */
export async function assignees() {
  return prisma.user.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } });
}

/** Tasks the system proposes from its own data: documents expired or due within a week. */
export async function suggestions() {
  const items = (await getTrackableItems())
    .map((item) => ({ item, days: daysUntil(item.expiryDate) }))
    .filter((x) => x.days <= 7)
    .sort((a, b) => a.days - b.days)
    .slice(0, 8);
  const taken = new Set(
    (await prisma.dailyTask.findMany({ where: { sourceKey: { in: items.map((x) => x.item.key) }, deletedAt: null }, select: { sourceKey: true } })).map((t) => t.sourceKey)
  );
  return items.map(({ item, days }) => {
    const doc = item.documentAr ?? item.labelAr;
    const who = item.employeeNameAr?.trim();
    return {
      key: item.key,
      title: who ? `تجديد ${doc} — ${who}` : `تجديد ${doc}`,
      reason: `${days < 0 ? `منتهية منذ ${daysAr(-days)}` : days === 0 ? "تنتهي اليوم" : `تنتهي خلال ${daysAr(days)}`}${item.documentNumber ? ` · رقم ${item.documentNumber}` : ""}`,
      category: "documents" as const,
      priority: days <= 0 ? ("URGENT" as const) : ("HIGH" as const),
      added: taken.has(item.key),
    };
  });
}
