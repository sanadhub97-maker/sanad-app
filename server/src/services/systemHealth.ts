import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendMail } from "@/services/email";
import { getWhatsappProvider } from "@/services/whatsapp";
import { getActiveRecipients, normalizePhone } from "@/services/whatsappRecipients";
import { hasStoredSession, WHATSAPP_WEB_PROVIDER } from "@/services/whatsappWeb";

/* The daily rounds watching themselves: after the morning round (and when an
   admin opens the site) this looks at what should have happened — a backup in
   the last day, the morning WhatsApp message sent, the round itself run — and
   tells the admins in the bell and by email when something did not. Each
   problem is told once a day. */

export type HealthCode = "backup" | "whatsapp" | "whatsappLink" | "cron";
export interface HealthProblem {
  code: HealthCode;
  titleAr: string;
  titleEn: string;
  detailAr: string;
  detailEn: string;
}

const HOUR = 60 * 60_000;
/** The Riyadh calendar day, YYYY-MM-DD. */
const riyadhDay = (at = new Date()) => new Date(at.getTime() + 3 * HOUR).toISOString().slice(0, 10);
/** The morning round runs at 08:00 Riyadh; until 09:00 today's results are not expected yet. */
const morningDue = (now: Date) => now.getTime() >= new Date(`${riyadhDay(now)}T09:00:00+03:00`).getTime();
const ADMIN_ROLES = ["Super Admin", "Admin"];

export async function checkSystemHealth(now = new Date()): Promise<HealthProblem[]> {
  const problems: HealthProblem[] = [];
  const day = riyadhDay(now);

  // The round itself: the last morning run should be within the last day and a bit.
  const beat = (await prisma.setting.findUnique({ where: { key: "jobs.cron.morning" } }))?.value as { finishedAt?: string; startedAt?: string; steps?: Record<string, string> } | undefined;
  const last = beat?.finishedAt ?? beat?.startedAt;
  if (!last || now.getTime() - new Date(last).getTime() > 26 * HOUR) {
    problems.push({
      code: "cron",
      titleAr: "الجولة الصباحية لم تعمل",
      titleEn: "The morning round did not run",
      detailAr: last ? `آخر تشغيل كان ${new Date(last).toLocaleString("ar-EG-u-nu-latn", { timeZone: "Asia/Riyadh" })}. لم تُرسل رسالة الصبح ولم تُؤخذ نسخة احتياطية منذ ذلك الوقت.` : "لا يوجد أي تشغيل مسجّل للجولة الصباحية.",
      detailEn: last ? `It last ran ${new Date(last).toISOString()}. No morning message or backup since.` : "No morning run is recorded.",
    });
  }

  // The backup: one finished in the last 30 hours, or the last one failed.
  const latest = await prisma.backupSnapshot.findFirst({ orderBy: { createdAt: "desc" } });
  const ready = await prisma.backupSnapshot.findFirst({ where: { status: "READY" }, orderBy: { createdAt: "desc" } });
  const auto = (await prisma.setting.findUnique({ where: { key: "automaticBackups" } }))?.value as { enabled?: boolean } | undefined;
  if (auto?.enabled !== false && morningDue(now) && (!ready || now.getTime() - ready.createdAt.getTime() > 30 * HOUR)) {
    problems.push({
      code: "backup",
      titleAr: "النسخة الاحتياطية لم تكتمل",
      titleEn: "The backup did not complete",
      detailAr: latest?.status === "FAILED" ? `فشلت آخر نسخة: ${(latest.error ?? "").slice(0, 160)}` : ready ? `آخر نسخة سليمة كانت ${ready.createdAt.toLocaleString("ar-EG-u-nu-latn", { timeZone: "Asia/Riyadh" })}.` : "لا توجد أي نسخة احتياطية سليمة.",
      detailEn: latest?.status === "FAILED" ? `The last backup failed: ${(latest.error ?? "").slice(0, 160)}` : ready ? `The last good backup was ${ready.createdAt.toISOString()}.` : "There is no good backup.",
    });
  }

  // The morning WhatsApp message, when WhatsApp is on and has recipients.
  const provider = await getWhatsappProvider();
  const recipients = provider ? await getActiveRecipients().catch(() => []) : [];
  if (provider && recipients.length) {
    if (provider === WHATSAPP_WEB_PROVIDER && !(await hasStoredSession().catch(() => true))) {
      problems.push({
        code: "whatsappLink",
        titleAr: "رقم الواتساب غير مربوط",
        titleEn: "The WhatsApp number is not linked",
        detailAr: "الربط بالرقم انتهى، فلن تُرسل رسائل الواتساب حتى يُربط من جديد من الإعدادات ← واتساب.",
        detailEn: "The linked number was signed out; nothing goes out on WhatsApp until it is linked again in Settings → WhatsApp.",
      });
    }
    if (morningDue(now)) {
      const logs = await prisma.notificationLog.findMany({ where: { dedupeKey: { startsWith: `whatsapp-daily:${day}:` } }, select: { dedupeKey: true, status: true, errorMessage: true } });
      // The picture's failure is fine when the text went instead.
      const sentTo = new Set(logs.filter((l) => l.status === "SENT").map((l) => l.dedupeKey.split(":")[2]));
      const failed = logs.filter((l) => l.status === "FAILED" && !l.dedupeKey.endsWith(":picture") && !sentTo.has(l.dedupeKey.split(":")[2]));
      const missing = new Set(recipients.map((r) => normalizePhone(r.phone)).filter((p) => p && !sentTo.has(p))).size;
      if (failed.length || missing > 0) {
        const reason = failed[0]?.errorMessage ?? logs.find((l) => l.status === "FAILED")?.errorMessage;
        problems.push({
          code: "whatsapp",
          titleAr: "رسالة الصبح لم تصل",
          titleEn: "The morning message did not go out",
          detailAr: `وصلت إلى ${sentTo.size} من ${recipients.length} رقم${reason ? `. السبب: ${reason.slice(0, 160)}` : "."}`,
          detailEn: `Reached ${sentTo.size} of ${recipients.length} numbers${reason ? `. Reason: ${reason.slice(0, 160)}` : "."}`,
        });
      }
    }
  }
  return problems;
}

/** Tells the admins about each problem, once a day each: in the bell, and by email when it is set up. */
export async function alertSystemHealth(problems: HealthProblem[], now = new Date()) {
  if (problems.length === 0) return 0;
  const day = riyadhDay(now);
  const admins = await prisma.user.findMany({
    where: { deletedAt: null, isActive: true, userRoles: { some: { role: { name: { in: ADMIN_ROLES } } } } },
    select: { id: true, email: true },
  });
  if (admins.length === 0) return 0;
  let told = 0;
  for (const p of problems) {
    const dedupeKey = `health:${day}:${p.code}`;
    try {
      // Claimed first, so two rounds at once cannot both tell it.
      await prisma.notificationLog.create({ data: { dedupeKey, channel: "SYSTEM", status: "SENT", sentAt: new Date(), message: p.titleEn, templateCode: "HEALTH" } });
    } catch {
      continue;
    }
    told++;
    await prisma.notification.createMany({
      data: admins.map((a) => ({ userId: a.id, severity: "CRITICAL" as const, title: p.titleEn, message: p.detailEn, titleAr: p.titleAr, messageAr: p.detailAr, relatedType: "SYSTEM_HEALTH", relatedId: p.code })),
    });
    for (const a of admins) {
      if (!a.email) continue;
      await sendMail({
        to: a.email,
        subject: `تنبيه من نظام سند: ${p.titleAr}`,
        html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.8;color:#1f1a10"><h2 style="color:#8a6a35;margin:0 0 8px">${p.titleAr}</h2><p style="margin:0 0 12px">${p.detailAr}</p><p style="margin:0;color:#7a6c55;font-size:13px">وصلك هذا التنبيه لأن نظام سند يراقب جولته اليومية. افتح النظام للمتابعة.</p></div>`,
      }).catch((err) => logger.warn({ err }, "Health email failed"));
    }
  }
  return told;
}

/** The check and its alerts together, never throwing: it must not break the round it watches. */
export async function watchSystemHealth(now = new Date()) {
  try {
    const problems = await checkSystemHealth(now);
    await alertSystemHealth(problems, now);
    return problems;
  } catch (err) {
    logger.error({ err }, "System health check failed");
    return [];
  }
}
