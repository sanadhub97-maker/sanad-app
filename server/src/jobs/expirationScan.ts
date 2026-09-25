import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getTrackableItems, TrackableItem } from "@/services/expiringItems";
import { daysUntil } from "@/services/expiration";
import { getExpirationRules, getWhatsappTemplateSetting, markExpirationScanRun } from "@/services/settingsStore";
import { getBrandingContext } from "@/services/branding";
import { sendMail } from "@/services/email";
import { sendWhatsapp } from "@/services/whatsapp";
import { getActiveRecipients } from "@/services/whatsappRecipients";
import { alertContext, renderWhatsappAlert } from "@/services/whatsappTemplates";

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

function messageFor(item: TrackableItem, threshold: string): string {
  if (threshold === "expired") return `${item.label} has expired.`;
  return `${item.label} will expire in ${threshold} day${threshold === "1" ? "" : "s"}.`;
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

export async function runExpirationScan() {
  logger.info("Starting daily expiration scan");
  const [items, rules, emailSettings, whatsappSettings, recipients, branding, whatsappTemplate] = await Promise.all([
    getTrackableItems(),
    getExpirationRules(),
    prisma.emailSettings.findUnique({ where: { id: 1 } }),
    prisma.whatsappSettings.findUnique({ where: { id: 1 } }),
    getRecipients(),
    getBrandingContext(),
    getWhatsappTemplateSetting(),
  ]);
  const companyName = branding.company?.nameAr || branding.company?.nameEn;
  const whatsappPhones = (await getActiveRecipients()).map((r) => r.phone);

  let dueCount = 0;

  for (const item of items) {
    const threshold = matchedThreshold(item, rules.notifyDaysBefore);
    if (!threshold) continue;
    dueCount++;

    const severity = severityFor(threshold);
    const message = messageFor(item, threshold);
    const dedupeBase = `${item.key}:${threshold}`;

    // In-app notifications (one row per recipient) — always attempted.
    await logOnce(`${dedupeBase}:SYSTEM`, "SYSTEM", async () => {
      await prisma.notification.createMany({
        data: recipients.map((r) => ({
          userId: r.id,
          severity,
          title: "Document Expiration Alert",
          message,
          relatedType: item.sourceType,
          relatedId: item.recordId,
        })),
      });
    });

    if (emailSettings?.enabled) {
      for (const recipient of recipients) {
        await logOnce(`${dedupeBase}:EMAIL:${recipient.id}`, "EMAIL", async () => {
          assertSent(await sendMail({ to: recipient.email, subject: "Document Expiration Alert", html: `<p>${message}</p>` }));
        });
      }
    }

    if (whatsappSettings?.enabled) {
      // Formatted for a chat bubble in the design chosen in Settings → WhatsApp;
      // message above still backs the in-app and email channels.
      const whatsappMessage = renderWhatsappAlert(whatsappTemplate, alertContext(item, companyName));
      // The numbers configured in Settings → WhatsApp decide who gets alerts.
      // With Meta and no list configured, fall back to notify-role users' phones.
      const phones =
        whatsappPhones.length > 0 || ["CALLMEBOT", "WHATSAPP_WEB"].includes(whatsappSettings.provider ?? "")
          ? whatsappPhones
          : recipients.flatMap((r) => (r.phone ? [r.phone] : []));
      for (const phone of phones) {
        await logOnce(
          `${dedupeBase}:WHATSAPP:${phone}`,
          "WHATSAPP",
          async () => {
            assertSent(await sendWhatsapp(phone, whatsappMessage));
          },
          { recipient: phone, message: whatsappMessage, relatedType: item.sourceType, relatedId: item.recordId }
        );
      }
    }
  }

  await markExpirationScanRun();
  logger.info(`Expiration scan complete — ${dueCount} item(s) matched a notification threshold today`);
}
