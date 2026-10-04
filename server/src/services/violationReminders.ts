import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { daysUntil } from "@/services/expiration";
import { riyadhNow, sendToUser, withDevices } from "@/services/push";
import { authorityName } from "@/constants/violations";
import { loadAuthContext } from "@/middleware/auth";
import { canViewSource } from "@/lib/security";

/*
 * Daily, with the expiration scan: reminders before an authority violation's
 * objection deadline (still NEW) and payment deadline (NEW or REJECTED) —
 * 7, 3 and 1 days before, on the day, and the day after it passed. In the
 * system's notifications and on the devices of the people who handle them.
 */

const STEPS = [7, 3, 1, 0, -1];
const ROLES = ["Super Admin", "Admin", "HR", "Manager", "Accountant"];
const money = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
const daysAr = (n: number) => (n === 1 ? "يوم واحد" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يومًا`);

/** Marks keys done in the notification log; returns those that weren't. */
async function claim(keys: string[]) {
  const done = await prisma.notificationLog.findMany({ where: { dedupeKey: { in: keys }, status: "SENT" }, select: { dedupeKey: true } });
  const seen = new Set(done.map((d) => d.dedupeKey));
  const fresh = keys.filter((k) => !seen.has(k));
  if (fresh.length)
    await prisma.notificationLog.createMany({
      data: fresh.map((dedupeKey) => ({ dedupeKey, channel: "SYSTEM" as const, status: "SENT" as const, sentAt: new Date(), relatedType: "VIOLATION" })),
      skipDuplicates: true,
    });
  return new Set(fresh);
}

export async function runViolationReminders() {
  const today = new Date(`${riyadhNow().date}T00:00:00.000Z`);
  const open = await prisma.violation.findMany({
    where: { deletedAt: null, kind: "AUTHORITY", status: { in: ["NEW", "REJECTED"] } },
    include: { branch: { select: { name: true } } },
  });
  if (open.length === 0) return 0;
  const staff = await prisma.user.findMany({
    where: { deletedAt: null, isActive: true, userRoles: { some: { role: { name: { in: ROLES } } } } },
    select: { id: true },
  });
  let sent = 0;
  for (const v of open) {
    const due: { which: "objection" | "pay"; n: number }[] = [];
    if (v.status === "NEW" && v.objectionDeadline) due.push({ which: "objection", n: daysUntil(v.objectionDeadline, today) });
    if (v.payDeadline) due.push({ which: "pay", n: daysUntil(v.payDeadline, today) });
    for (const { which, n } of due) {
      if (!STEPS.includes(n)) continue;
      const who = authorityName(v.authority, v.authorityName);
      const what = which === "pay" ? "السداد" : "الاعتراض";
      const titleAr = n < 0 ? `فات ميعاد ${what} — مخالفة ${who}` : n === 0 ? `اليوم آخر ميعاد ${what} — مخالفة ${who}` : `باقي ${daysAr(n)} على ${what} — مخالفة ${who}`;
      const messageAr = `${v.reason} · ${money(Number(v.amount))} ر.س${v.branch?.name ? ` · ${v.branch.name}` : ""}`;
      const title = n < 0 ? `${which === "pay" ? "Payment" : "Objection"} deadline passed — ${who}` : `${which === "pay" ? "Payment" : "Objection"} due in ${n} day(s) — ${who}`;
      const candidates = [...new Set([...staff.map((s) => s.id), ...(v.assigneeId ? [v.assigneeId] : [])])];
      const authorized = await Promise.all(candidates.map(async id => canViewSource(await loadAuthContext(id), "VIOLATION") ? id : null));
      const recipients = authorized.filter((id): id is string => id !== null);
      if (!recipients.length) continue;
      const base = `vio:${v.id}:${which}:${n}`;

      const fresh = await claim([`${base}:SYSTEM`]);
      if (fresh.size) {
        await prisma.notification.createMany({
          data: recipients.map((userId) => ({
            userId,
            severity: n <= 1 ? ("CRITICAL" as const) : ("WARNING" as const),
            title,
            message: messageAr,
            titleAr,
            messageAr,
            relatedType: "VIOLATION",
            relatedId: v.id,
          })),
        });
        sent++;
      }

      const devices = await withDevices(recipients);
      for (const userId of devices) {
        if (!canViewSource(await loadAuthContext(userId), "VIOLATION")) continue;
        const ok = await claim([`${base}:PUSH:${userId}`]);
        if (!ok.size) continue;
        await sendToUser(userId, {
          kind: n <= 0 ? "exp" : "soon",
          urgent: n <= 1,
          tag: `vio-${v.id}`,
          title: titleAr,
          body: messageAr,
          url: `/violations/${v.id}`,
          actions: [
            { action: "open", title: which === "pay" ? "سدّد" : "فتح المخالفة", url: `/violations/${v.id}` },
            { action: "all", title: "كل المخالفات", url: "/violations" },
          ],
        }).catch((err) => logger.warn({ err }, "Violation push failed"));
      }
    }
  }
  return sent;
}
