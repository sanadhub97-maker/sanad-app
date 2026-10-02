import { DocumentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { TrackableItem } from "@/services/expiringItems";
import { getTrackableItems } from "@/services/expiringItems";
import { computeStatus, daysUntil } from "@/services/expiration";
import { getExpirationRules } from "@/services/settingsStore";
import { paymentCategoryLabel } from "@/constants/paymentCategories";
import { riyadhNow, sendToUser, withDevices, type PushMessage } from "@/services/push";
import { sealToken } from "@/services/pushCard";
import { loadAuthContext } from "@/middleware/auth";
import { canViewSource, hasPermission } from "@/lib/security";

/* What each event says on a lock screen — the designs approved in the push preview. */

const NOTIFY_ROLE_NAMES = ["Super Admin", "Admin", "HR", "Manager"];
const C = { exp: "#e5484d", soon: "#f59e0b", brief: "#2f5fe0", task: "#10b981", pay: "#9333ea" };

const daysAr = (n: number) => (n === 1 ? "يوم واحد" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يومًا`);
const dmy = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
const dayName = (d: Date) => new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(d);
const money = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
const firstName = (s?: string | null) => (s || "").trim().split(/\s+/)[0] || "";

/** The app page of a tracked document. */
export function itemPath(item: Pick<TrackableItem, "sourceType" | "recordId" | "employeeId">) {
  switch (item.sourceType) {
    case "COMPANY_DOCUMENT":
      return `/company-documents/${item.recordId}`;
    case "EMPLOYEE_IQAMA":
      return `/employee-documents/${item.recordId}/IQAMA`;
    case "EMPLOYEE_PASSPORT":
      return `/employee-documents/${item.recordId}/PASSPORT`;
    default:
      return item.employeeId ? `/employee-documents/${item.employeeId}/${item.recordId}` : "/employee-documents";
  }
}

const whoOf = (item: TrackableItem) => (item.employeeNameAr || item.labelAr || item.label || "").trim();

/** An expired or soon-to-expire document, as a push. */
export function expiryMessage(item: TrackableItem, threshold: string): PushMessage {
  const days = daysUntil(item.expiryDate);
  const who = whoOf(item);
  const kind = item.kindAr || item.documentAr || "وثيقة";
  const url = itemPath(item);
  const employeeUrl = item.employeeId ? `/employees/${item.employeeId}` : null;
  if (threshold === "expired") {
    const late = Math.max(0, -days);
    return {
      kind: "exp",
      urgent: true,
      tag: `exp-${item.key}`,
      title: `${kind} منتهية الصلاحية`,
      body: late === 0 ? `${kind} — ${who} انتهت اليوم. جدّدها قبل ما تتحسب غرامة.` : `${kind} — ${who} انتهت من ${daysAr(late)}. جدّدها قبل ما تتحسب غرامة.`,
      url,
      card: { k: C.exp, ic: "id", kind, who, tag: "منتهي", no: item.documentNumber || "—", date: dmy(item.expiryDate), ring: [String(late), late === 0 ? "اليوم" : "يوم متأخر"], pct: 100, used: 100, life: late === 0 ? "انتهت اليوم" : `انتهت من ${daysAr(late)}` },
      actions: [
        { action: "open", title: "تجديد الآن", url },
        ...(employeeUrl ? [{ action: "emp", title: "ملف الموظف", url: employeeUrl }] : [{ action: "all", title: "كل الوثائق", url: item.sourceType === "COMPANY_DOCUMENT" ? "/company-documents" : "/employee-documents" }]),
      ],
    };
  }
  const left = Math.max(1, days);
  const share = Math.round(100 - Math.min(left, 90) / 0.9);
  return {
    kind: "soon",
    urgent: left <= 7,
    tag: `soon-${item.key}`,
    title: `${kind} تنتهي بعد ${daysAr(left)}`,
    body: `${who} · تنتهي ${dayName(item.expiryDate)}.`,
    url,
    card: { k: C.soon, ic: "clock", kind, who, tag: "قريب", no: item.documentNumber || "—", date: dmy(item.expiryDate), ring: [String(left), "يوم باقي"], pct: share, used: share, life: `تنتهي ${dayName(item.expiryDate)}` },
    actions: [
      { action: "open", title: "ابدأ التجديد", url },
      { action: "all", title: "كل القريبة", url: item.sourceType === "COMPANY_DOCUMENT" ? "/company-documents" : "/employee-documents" },
    ],
  };
}

async function notifyUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null, isActive: true, userRoles: { some: { role: { name: { in: NOTIFY_ROLE_NAMES } } } } },
    select: { id: true, fullName: true },
  });
}

/** Marks keys as done in the notification log; returns the ones that weren't. */
async function claim(keys: string[], meta: { relatedType?: string; relatedId?: string; message?: string } = {}) {
  if (keys.length === 0) return new Set<string>();
  const done = await prisma.notificationLog.findMany({ where: { dedupeKey: { in: keys }, status: "SENT" }, select: { dedupeKey: true } });
  const seen = new Set(done.map((d) => d.dedupeKey));
  const fresh = keys.filter((k) => !seen.has(k));
  if (fresh.length)
    await prisma.notificationLog.createMany({
      data: fresh.map((dedupeKey) => ({ dedupeKey, channel: "SYSTEM" as const, status: "SENT" as const, sentAt: new Date(), ...meta })),
      skipDuplicates: true,
    });
  return new Set(fresh);
}

/**
 * The documents the daily scan found due, pushed to each responsible user's
 * devices: the three most pressing on their own, the rest folded into one.
 */
export async function pushDueItems(due: { item: TrackableItem; threshold: string; dedupeBase: string }[], recipientIds: string[]) {
  if (due.length === 0) return;
  const users = await withDevices(recipientIds);
  const ordered = [...due].sort((a, b) => daysUntil(a.item.expiryDate) - daysUntil(b.item.expiryDate));
  for (const userId of users) {
    const auth = await loadAuthContext(userId);
    const visible = ordered.filter((d) => canViewSource(auth, d.item.sourceType));
    const keyOf = (d: (typeof due)[number]) => `${d.dedupeBase}:PUSH:${userId}`;
    const fresh = await claim(visible.map(keyOf), { message: "push" });
    const pending = visible.filter((d) => fresh.has(keyOf(d)));
    for (const d of pending.slice(0, 3)) await sendToUser(userId, expiryMessage(d.item, d.threshold)).catch((err) => logger.warn({ err }, "Push (expiry) failed"));
    const rest = pending.slice(3);
    if (rest.length > 0) {
      const expired = rest.filter((d) => d.threshold === "expired").length;
      await sendToUser(userId, {
        kind: expired ? "exp" : "soon",
        tag: `due-${riyadhNow().date}`,
        title: `${rest.length} تنبيهات تانية النهارده`,
        body: [expired && `${expired} منتهية`, rest.length - expired && `${rest.length - expired} قريبة من الانتهاء`].filter(Boolean).join(" و") + ". افتحها من لوحة التحكم.",
        url: "/dashboard",
      }).catch((err) => logger.warn({ err }, "Push (expiry summary) failed"));
    }
  }
}

/** 08:00 — the day in one notification: what expired, what's close, what's on the list. */
export async function pushMorningBrief() {
  const users = await notifyUsers();
  const withDev = await withDevices(users.map((u) => u.id));
  if (withDev.size === 0) return;
  const { date } = riyadhNow();
  const [items, rules] = await Promise.all([getTrackableItems(), getExpirationRules()]);
  const today = new Date(`${date}T00:00:00Z`);
  const label = dayName(today);
  for (const u of users.filter((x) => withDev.has(x.id))) {
    const auth = await loadAuthContext(u.id);
    if (!auth) continue;
    const visible = items.filter((item) => canViewSource(auth, item.sourceType));
    const expired = visible.filter((item) => computeStatus(item.expiryDate, rules) === DocumentStatus.EXPIRED).length;
    const soon = visible.filter((item) => computeStatus(item.expiryDate, rules) === DocumentStatus.EXPIRING_SOON).length;
    const fresh = await claim([`brief:${date}:${u.id}`]);
    if (fresh.size === 0) continue;
    const tasks = hasPermission(auth, "tasks.view") ? await prisma.dailyTask.count({ where: { date: today, deletedAt: null, done: false, OR: [{ assigneeId: u.id }, { assigneeId: null }] } }) : 0;
    const parts = [expired && `${expired} وثائق منتهية`, soon && `${soon} قريبين من الانتهاء`, tasks && `${tasks} مهام`].filter(Boolean) as string[];
    const total = expired + soon;
    const share = visible.length ? Math.round(((visible.length - total) / visible.length) * 100) : 100;
    await sendToUser(u.id, {
      kind: "brief",
      tag: `brief-${date}`,
      title: `صباح الخير يا ${firstName(u.fullName)}`,
      body: parts.length ? `النهارده عندك ${parts.join("، و")}.` : "كل الوثائق سليمة ومفيش مهام النهارده.",
      url: "/dashboard",
      card: { k: C.brief, ic: "sun", kind: "ملخص اليوم", who: label, tag: "صباحي", no: `${expired} · ${soon} · ${tasks}`, date: "اليوم", ring: [String(expired), "منتهية"], pct: share, used: share, life: parts.length ? parts.join(" · ") : "كله تمام" },
      actions: [
        { action: "open", title: "افتح لوحة التحكم", url: "/dashboard" },
        ...(tasks ? [{ action: "tasks", title: "المهام", url: "/daily-tasks" }] : []),
      ],
    }).catch((err) => logger.warn({ err }, "Push (brief) failed"));
  }
}

/** Every minute — a task whose time has come, to whoever it's for. */
export async function pushTaskReminders() {
  const { date, hm } = riyadhNow();
  const tasks = await prisma.dailyTask.findMany({
    where: { date: new Date(`${date}T00:00:00Z`), time: hm, done: false, deletedAt: null },
    select: { id: true, title: true, notes: true, time: true, assigneeId: true, createdById: true, category: true },
  });
  if (tasks.length === 0) return;
  const withDev = await withDevices(tasks.flatMap((t) => (t.assigneeId ?? t.createdById) || []));
  for (const t of tasks) {
    const userId = t.assigneeId ?? t.createdById;
    if (!userId || !withDev.has(userId)) continue;
    const auth = await loadAuthContext(userId);
    if (!hasPermission(auth ?? undefined, "tasks.view")) continue;
    const fresh = await claim([`task:${t.id}:${date}:${hm}`], { relatedType: "DAILY_TASK", relatedId: t.id });
    if (fresh.size === 0) continue;
    const iat = Date.now();
    const exp = iat + 2 * 24 * 3600_000;
    await sendToUser(userId, {
      kind: "task",
      tag: `task-${t.id}`,
      title: `مهمة الساعة ${hm}`,
      body: t.notes ? `${t.title} — ${t.notes}` : t.title,
      url: "/daily-tasks",
      card: { k: C.task, ic: "check", kind: "مهمة اليوم", who: t.title, tag: "مهمة", no: t.category === "general" ? "عامة" : t.category, date: hm, ring: [hm, "الساعة"], pct: 70, used: 45, life: "دلوقتي" },
      actions: !hasPermission(auth ?? undefined, "tasks.edit") ? [] : [
        { action: "done", title: "تم", call: `/api/push/act/${sealToken({ a: "done", id: t.id, u: userId, exp, iat })}` },
        { action: "snooze", title: "تأجيل ساعة", call: `/api/push/act/${sealToken({ a: "snooze", id: t.id, u: userId, exp, iat })}` },
      ],
    }).catch((err) => logger.warn({ err }, "Push (task) failed"));
  }
}

/** A new payment voucher, to the responsible users other than the one who entered it. */
export async function pushPaymentCreated(paymentId: string, createdById: string) {
  const users = (await notifyUsers()).filter((u) => u.id !== createdById);
  const withDev = await withDevices(users.map((u) => u.id));
  if (withDev.size === 0) return;
  const p = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { branch: { select: { name: true } }, createdBy: { select: { fullName: true } } },
  });
  if (!p) return;
  const what = paymentCategoryLabel(p.category, p.type);
  const where = p.branch?.name || p.supplierName || "";
  const total = `${money(Number(p.total))} ر.س`;
  const msg: PushMessage = {
    kind: "pay",
    tag: `pay-${p.id}`,
    title: "سند صرف جديد",
    body: [what, total, where].filter(Boolean).join(" · ") + (p.createdBy?.fullName ? `. سجّله ${p.createdBy.fullName}.` : "."),
    url: "/payments",
    card: { k: C.pay, ic: "receipt", kind: "سند صرف", who: where || what, tag: "جديد", no: p.paymentNumber, date: total, ring: ["✓", "مسجّل"], pct: 100, used: 100, life: `${what} · سُجّل النهارده` },
    actions: [{ action: "open", title: "عرض السندات", url: "/payments" }],
  };
  for (const id of withDev) {
    if (!canViewSource(await loadAuthContext(id), "PAYMENT")) continue;
    await sendToUser(id, msg).catch((err) => logger.warn({ err }, "Push (payment) failed"));
  }
}

/** What a button on a task notification does: "done" or "snooze" for an hour. */
export async function runTaskAction(token: { a: string; id: string; u: string; exp: number; iat: number }) {
  if (!token || !Number.isFinite(token.exp) || !Number.isFinite(token.iat) || Date.now() >= token.exp || !["done", "snooze"].includes(token.a) || typeof token.u !== "string" || typeof token.id !== "string") return false;
  const auth = await loadAuthContext(token.u);
  if (!hasPermission(auth ?? undefined, "tasks.edit")) return false;
  const session = await prisma.session.findFirst({ where: { userId: token.u, revokedAt: null, expiresAt: { gt: new Date() }, createdAt: { lte: new Date(token.iat) } }, select: { id: true } });
  if (!session) return false;
  const task = await prisma.dailyTask.findFirst({ where: { id: token.id, deletedAt: null } });
  if (!task || (task.assigneeId ?? task.createdById) !== token.u) return false;
  if (token.a === "done") {
    await prisma.dailyTask.update({ where: { id: task.id }, data: { done: true, doneAt: new Date() } });
    return true;
  }
  if (token.a === "snooze") {
    const [h, m] = (task.time || riyadhNow().hm).split(":").map(Number);
    const next = Math.min(23 * 60 + 59, h * 60 + m + 60);
    await prisma.dailyTask.update({ where: { id: task.id }, data: { time: `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}` } });
    return true;
  }
  return false;
}
