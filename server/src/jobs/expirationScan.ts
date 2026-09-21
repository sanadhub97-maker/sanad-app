import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getTrackableItems, TrackableItem } from "@/services/expiringItems";
import { daysUntil } from "@/services/expiration";
import { getExpirationRules } from "@/services/settingsStore";
import { sendMail } from "@/services/email";
import { sendWhatsapp } from "@/services/whatsapp";

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

async function logOnce(dedupeKey: string, channel: "SYSTEM" | "EMAIL" | "WHATSAPP", action: () => Promise<void>) {
  const existing = await prisma.notificationLog.findUnique({ where: { dedupeKey } });
  if (existing) return; // already processed by a previous run — idempotent (§41)

  try {
    await action();
    await prisma.notificationLog.create({ data: { dedupeKey, channel, status: "SENT", sentAt: new Date() } });
  } catch (err) {
    logger.error({ err, dedupeKey }, "Notification dispatch failed");
    await prisma.notificationLog
      .create({ data: { dedupeKey, channel, status: "FAILED", errorMessage: (err as Error).message } })
      .catch(() => undefined);
  }
}

export async function runExpirationScan() {
  logger.info("Starting daily expiration scan");
  const [items, rules, emailSettings, whatsappSettings, recipients] = await Promise.all([
    getTrackableItems(),
    getExpirationRules(),
    prisma.emailSettings.findUnique({ where: { id: 1 } }),
    prisma.whatsappSettings.findUnique({ where: { id: 1 } }),
    getRecipients(),
  ]);

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
          await sendMail({ to: recipient.email, subject: "Document Expiration Alert", html: `<p>${message}</p>` });
        });
      }
    }

    if (whatsappSettings?.enabled) {
      for (const recipient of recipients) {
        if (!recipient.phone) continue;
        await logOnce(`${dedupeBase}:WHATSAPP:${recipient.id}`, "WHATSAPP", async () => {
          await sendWhatsapp(recipient.phone!, message);
        });
      }
    }
  }

  logger.info(`Expiration scan complete — ${dueCount} item(s) matched a notification threshold today`);
}
