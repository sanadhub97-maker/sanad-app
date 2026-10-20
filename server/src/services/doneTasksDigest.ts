import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { loadAuthContext } from "@/middleware/auth";
import { hasPermission } from "@/lib/security";
import { riyadhNow, sendToUser, withDevices } from "@/services/push";
import { sendWhatsapp } from "@/services/whatsapp";
import { getActiveRecipients, normalizePhone } from "@/services/whatsappRecipients";
import { getWhatsappScheduleSetting } from "@/services/settingsStore";

/* The evening summary of the tasks finished that day: one push to every user who
   may see tasks, and one WhatsApp message to the numbers in Settings → WhatsApp.
   Each goes out once a day — a second run of the same day finds its row in the
   notification log and stays quiet. */

const GREEN = "#10b981";
const dayLabel = (day: string, lang: "ar" | "en") =>
  new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "ar-EG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

/** The tasks marked done during the Riyadh calendar day `day` (YYYY-MM-DD), earliest first. */
export async function tasksDoneOn(day: string) {
  const from = new Date(`${day}T00:00:00+03:00`);
  const to = new Date(from.getTime() + 24 * 3600_000);
  const rows = await prisma.dailyTask.findMany({
    where: { deletedAt: null, done: true, doneAt: { gte: from, lt: to } },
    select: { title: true, doneAt: true, assignee: { select: { fullName: true } } },
    orderBy: { doneAt: "asc" },
    take: 200,
  });
  return rows.map((r) => ({ title: r.title.trim(), at: riyadhNow(r.doneAt!).hm, by: r.assignee?.fullName?.trim() || null }));
}

/** Marks a key as sent; false when it already was. */
async function firstTime(dedupeKey: string, channel: "SYSTEM" | "WHATSAPP", meta: { recipient?: string; message?: string } = {}) {
  const seen = await prisma.notificationLog.findUnique({ where: { dedupeKey }, select: { status: true } });
  if (seen?.status === "SENT") return false;
  await prisma.notificationLog.upsert({
    where: { dedupeKey },
    update: { ...meta, status: "SENT", sentAt: new Date(), errorMessage: null },
    create: { ...meta, dedupeKey, channel, templateCode: "DONE_TASKS", status: "SENT", sentAt: new Date() },
  });
  return true;
}

export async function runDoneTasksDigest(now = new Date()) {
  const { date: day } = riyadhNow(now);
  const done = await tasksDoneOn(day);
  if (!done.length) return { push: 0, whatsapp: 0, tasks: 0 };

  const label = dayLabel(day, "ar");
  const first = done.slice(0, 3).map((t) => t.title).join("، ");
  const rest = done.length - 3;
  const body = `${label}: ${first}${rest > 0 ? ` وَ${rest} غيرها` : ""}.`;
  const title = done.length === 1 ? "اتنجزت مهمة النهارده" : `اتنجز ${done.length} مهمة النهارده`;

  let push = 0;
  const users = await prisma.user.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true } });
  const withDev = await withDevices(users.map((u) => u.id));
  for (const u of users.filter((x) => withDev.has(x.id))) {
    const auth = await loadAuthContext(u.id);
    if (!hasPermission(auth ?? undefined, "tasks.view")) continue;
    if (!(await firstTime(`done-tasks:${day}:${u.id}`, "SYSTEM", { recipient: u.id, message: body }))) continue;
    await sendToUser(u.id, {
      kind: "task",
      tag: `done-${day}`,
      title,
      body,
      url: "/daily-tasks",
      card: { k: GREEN, ic: "check", kind: "مهام منجزة", who: label, tag: "إنجاز", no: String(done.length), date: label, ring: [String(done.length), "منجزة"], pct: 100, used: 100, life: first },
      actions: [{ action: "tasks", title: "المهام", url: "/daily-tasks" }],
    })
      .then(() => push++)
      .catch((err) => logger.warn({ err }, "Push (done tasks) failed"));
  }

  let whatsapp = 0;
  const settings = await prisma.whatsappSettings.findUnique({ where: { id: 1 } });
  if (settings?.enabled) {
    const { language } = await getWhatsappScheduleSetting();
    const en = language === "en";
    const lines = done.map((t) => `✅ ${t.title}${t.by ? ` — ${t.by}` : ""} (${t.at})`);
    const text = `*${en ? `Tasks completed — ${dayLabel(day, "en")}` : `المهام المنجزة — ${dayLabel(day, "ar")}`}*\n${en ? `${done.length} done` : `العدد: ${done.length}`}\n\n${lines.join("\n")}`;
    const phones = [...new Set((await getActiveRecipients()).map((r) => normalizePhone(r.phone)).filter(Boolean))];
    for (const phone of phones) {
      const key = `done-tasks:${day}:${phone}`;
      const sentBefore = await prisma.notificationLog.findUnique({ where: { dedupeKey: key }, select: { status: true } });
      if (sentBefore?.status === "SENT") continue;
      try {
        const result = await sendWhatsapp(phone, text);
        if (!result.sent) throw new Error(result.reason ?? "Send failed");
        await firstTime(key, "WHATSAPP", { recipient: phone, message: text });
        whatsapp++;
      } catch (err) {
        logger.error({ err, key }, "Done tasks WhatsApp message failed");
      }
    }
  }
  return { push, whatsapp, tasks: done.length };
}
