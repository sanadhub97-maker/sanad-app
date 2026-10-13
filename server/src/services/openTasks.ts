import { prisma } from "@/lib/prisma";
import { riyadhDay } from "@/services/whatsappDigest";
import type { TaskLine } from "@/services/whatsappTemplates";

/** Today's unfinished tasks and those left from earlier days: the late ones first, then by priority and time. */
export async function openTasks(): Promise<TaskLine[]> {
  const today = riyadhDay();
  const rows = await prisma.dailyTask.findMany({
    where: { deletedAt: null, done: false, date: { lte: new Date(`${today}T00:00:00Z`) } },
    select: { title: true, priority: true, time: true, date: true, assignee: { select: { fullName: true } } },
    orderBy: [{ date: "asc" }, { time: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    take: 200,
  });
  const rank = { URGENT: 0, HIGH: 1, NORMAL: 2 } as const;
  return rows
    .map((r) => ({
      title: r.title.trim(),
      priority: r.priority,
      time: r.time,
      assignee: r.assignee?.fullName?.trim() || null,
      daysLate: Math.round((Date.parse(`${today}T00:00:00Z`) - r.date.getTime()) / 86_400_000),
    }))
    .sort((a, b) => Number(b.daysLate > 0) - Number(a.daysLate > 0) || rank[a.priority] - rank[b.priority]);
}
