import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { loadAuthContext } from "@/middleware/auth";
import { canViewSource, escapeHtml } from "@/lib/security";
import { getTrackableItems, TrackableItem } from "@/services/expiringItems";
import { isEstablishmentSource } from "@/constants/documentSources";
import { daysUntil } from "@/services/expiration";
import { getExpirationRules, markExpirationScanRun, setWhatsappScheduleSetting, getWhatsappScheduleSetting } from "@/services/settingsStore";
import { getBrandingContext } from "@/services/branding";
import { sendMail } from "@/services/email";
import { sendDailyWhatsappDigest, whatsappEligible, type DigestEntry } from "@/services/whatsappDigest";
import { getActiveRecipients } from "@/services/whatsappRecipients";
import { pushDueItems } from "@/services/pushAlerts";
import { runViolationReminders } from "@/services/violationReminders";

// Roles considered "responsible" for expiration alerts in this build — a
// per-branch/per-user notify-list is a reasonable future enhancement, but
// out of scope here (see README "Explicitly Deferred").
const NOTIFY_ROLE_NAMES = ["Super Admin", "Admin", "HR", "Manager"];

function matchedThreshold(item: TrackableItem, notifyDaysBefore: number[]): string | null {
  const days = daysUntil(item.expiryDate);
  if (days <= 0) return "expired";
  return notifyDaysBefore.includes(days) ? String(days) : null;
}

function severityFor(threshold: string): "CRITICAL" | "WARNING" | "INFO" {
  if (threshold === "expired") return "CRITICAL";
  const days = Number(threshold);
  if (days <= 7) return "CRITICAL";
  if (days <= 30) return "WARNING";
  return "INFO";
}

/** What the English message is about: the employee's document, or a company document's kind and establishment. */
export function subjectEn(item: Pick<TrackableItem, "label" | "sourceType" | "kindEn">): string {
  return isEstablishmentSource(item.sourceType) && item.kindEn ? `${item.kindEn} of ${item.label}` : item.label;
}

export function messageFor(item: Pick<TrackableItem, "label" | "sourceType" | "kindEn">, threshold: string): string {
  if (threshold === "expired") return `${subjectEn(item)} has expired.`;
  return `${subjectEn(item)} will expire in ${threshold} day${threshold === "1" ? "" : "s"}.`;
}

export const NOTIFICATION_TITLE = { en: "Document Expiration Alert", ar: "تنبيه انتهاء وثيقة" };

const daysAr = (n: number) => (n === 1 ? "يوم واحد" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يومًا`);

/** One line of the daily WhatsApp summary: ended, ending today, or ending in N days. */
export function dailyLine(item: TrackableItem, days: number, language: "ar" | "en"): string {
  const expiry = item.expiryDate.toISOString().slice(0, 10);
  if (language === "en") {
    const when = days < 0 ? `expired ${-days} day${days === -1 ? "" : "s"} ago` : days === 0 ? "expires today" : `expires in ${days} day${days === 1 ? "" : "s"}`;
    return `${subjectEn(item)} ${when}.\nExpiry: ${expiry}`;
  }
  const subject = subjectAr(item);
  const when = days < 0 ? `انتهت صلاحية ${subject} منذ ${daysAr(-days)}` : days === 0 ? `تنتهي صلاحية ${subject} اليوم` : `تنتهي صلاحية ${subject} خلال ${daysAr(days)}`;
  return `${days < 0 ? "🔴" : days <= 7 ? "🟠" : "🟡"} ${when}.\nتاريخ الانتهاء: ${expiry}`;
}

/** What the Arabic message is about: "الإقامة للموظف فلان", or the document's own name. */
export function subjectAr(item: Pick<TrackableItem, "labelAr" | "documentAr" | "employeeNameAr"> & { sourceType?: string; kindAr?: string }): string {
  if (item.documentAr && item.employeeNameAr) return `${item.documentAr} للموظف ${item.employeeNameAr.trim()}`;
  return item.sourceType && isEstablishmentSource(item.sourceType) && item.kindAr ? `${item.kindAr} لـ${item.labelAr}` : item.labelAr;
}

/** The Arabic twin of messageFor. */
export function messageArFor(subject: string, threshold: string): string {
  if (threshold === "expired") return `انتهت صلاحية ${subject}.`;
  return `تنتهي صلاحية ${subject} خلال ${daysAr(Number(threshold))}.`;
}

async function getRecipients() {
  return prisma.user.findMany({
    where: { deletedAt: null, isActive: true, userRoles: { some: { role: { name: { in: NOTIFY_ROLE_NAMES } } } } },
    select: { id: true, email: true, phone: true, fullName: true },
  });
}

type LogMeta = { recipient?: string; message?: string; relatedType?: string; relatedId?: string };

async function logOnce(dedupeKey: string, channel: "SYSTEM" | "EMAIL" | "WHATSAPP", action: () => Promise<void>, meta: LogMeta = {}) {
  const existing = await prisma.notificationLog.findUnique({ where: { dedupeKey } });
  // Only a delivered notification is final — a failed one is retried the next
  // time the scan runs, instead of being silently dropped for good.
  if (existing?.status === "SENT") return;

  try {
    await action();
    await prisma.notificationLog.upsert({
      where: { dedupeKey },
      update: { ...meta, status: "SENT", sentAt: new Date(), errorMessage: null },
      create: { ...meta, dedupeKey, channel, status: "SENT", sentAt: new Date() },
    });
  } catch (err) {
    logger.error({ err, dedupeKey }, "Notification dispatch failed");
    const errorMessage = (err as Error).message;
    await prisma.notificationLog
      .upsert({
        where: { dedupeKey },
        update: { ...meta, status: "FAILED", errorMessage },
        create: { ...meta, dedupeKey, channel, status: "FAILED", errorMessage },
      })
      .catch(() => undefined);
  }
}

function assertSent(result: { sent: boolean; reason?: string }) {
  if (!result.sent) throw new Error(result.reason ?? "Send failed");
}

let activeScan: Promise<{ dueCount: number }> | null = null;
export function runExpirationScan() {
  return activeScan ??= performExpirationScan().finally(() => { activeScan = null; });
}

async function performExpirationScan() {
  logger.info("Starting daily expiration scan");
  const [items, rules, emailSettings, whatsappSettings, recipients, branding] = await Promise.all([
    getTrackableItems(),
    getExpirationRules(),
    prisma.emailSettings.findUnique({ where: { id: 1 } }),
    prisma.whatsappSettings.findUnique({ where: { id: 1 } }),
    getRecipients(),
    getBrandingContext(),
  ]);
  const companyName = branding.company?.nameAr || branding.company?.nameEn;
  // WhatsApp and email go out in the language chosen in Settings → WhatsApp.
  const { language } = await getWhatsappScheduleSetting();
  const whatsappPhones = (await getActiveRecipients()).map((r) => r.phone);
  const recipientAuth = new Map(await Promise.all(recipients.map(async (recipient) => [recipient.id, await loadAuthContext(recipient.id)] as const)));

  const whatsappGroups = new Map<string, DigestEntry[]>();
  let dueCount = 0;
  const due: Parameters<typeof pushDueItems>[0] = [];

  // WhatsApp: every morning, everything already expired or ending within the "ending soon"
  // window, most urgent first — it keeps coming until the document is renewed.
  if (whatsappSettings?.enabled) {
    const fallback = !whatsappPhones.length && !["CALLMEBOT", "WHATSAPP_WEB"].includes(whatsappSettings.provider ?? "");
    const phones = fallback ? recipients.flatMap((r) => (r.phone ? [r.phone] : [])) : whatsappPhones;
    const lang = language === "en" ? "en" : "ar";
    const daily = items
      .map((item) => ({ item, days: daysUntil(item.expiryDate) }))
      .filter(({ item, days }) => days <= rules.expiringSoonThresholdDays && whatsappEligible(item))
      .sort((a, b) => a.days - b.days)
      .map(({ item, days }) => ({ item, dedupeBase: `${item.key}:daily`, text: dailyLine(item, days, lang) }));
    for (const phone of new Set(phones)) whatsappGroups.set(phone, daily);
  }

  for (const item of items) {
    const threshold = matchedThreshold(item, rules.notifyDaysBefore);
    if (!threshold) continue;
    dueCount++;

    const severity = severityFor(threshold);
    const message = messageFor(item, threshold);
    const messageAr = messageArFor(subjectAr(item), threshold);
    const dedupeBase = `${item.key}:${threshold}`;
    due.push({ item, threshold, dedupeBase });
    const itemRecipients = recipients.filter((recipient) => canViewSource(recipientAuth.get(recipient.id), item.sourceType));

    // In-app notifications (one row per recipient) — always attempted.
    await logOnce(`${dedupeBase}:SYSTEM`, "SYSTEM", async () => {
      await prisma.notification.createMany({
        data: itemRecipients.map((r) => ({
          userId: r.id,
          severity,
          title: NOTIFICATION_TITLE.en,
          message,
          titleAr: NOTIFICATION_TITLE.ar,
          messageAr,
          relatedType: item.sourceType,
          relatedId: item.recordId,
        })),
      });
    });

    if (emailSettings?.enabled) {
      for (const recipient of itemRecipients) {
        await logOnce(`${dedupeBase}:EMAIL:${recipient.id}`, "EMAIL", async () => {
          assertSent(
            await sendMail({
              to: recipient.email,
              subject: language === "en" ? NOTIFICATION_TITLE.en : NOTIFICATION_TITLE.ar,
              html:
                language === "en"
                  ? `<p dir="ltr" style="font-family:Arial,sans-serif">${escapeHtml(message)}</p>`
                  : `<p dir="rtl" style="font-family:Tahoma,sans-serif">${escapeHtml(messageAr)}</p>`,
            })
          );
        });
      }
    }
  }
  const digestTitle = language === "en" ? "Document expiration summary" : "ملخص تنبيهات انتهاء الوثائق";
  await sendDailyWhatsappDigest(
    whatsappGroups,
    digestTitle + (companyName ? "\n" + companyName : ""),
    language === "en" ? "✅ No document has expired or ends soon." : "✅ لا توجد وثائق منتهية أو قريبة من الانتهاء اليوم."
  );

  // On the devices of the responsible users (Web Push).
  await pushDueItems(due, recipients.map((r) => r.id)).catch((err) => logger.error({ err }, "Expiry push failed"));

  // Violations whose objection or payment deadline is near.
  await runViolationReminders().catch((err) => logger.error({ err }, "Violation reminders failed"));

  await markExpirationScanRun();
  await setWhatsappScheduleSetting({ lastRunAt: new Date().toISOString() }).catch(() => undefined);
  logger.info(`Expiration scan complete — ${dueCount} item(s) matched a notification threshold today`);
  return { dueCount };
}
