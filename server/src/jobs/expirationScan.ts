import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getTrackableItems, TrackableItem } from "@/services/expiringItems";
import { daysUntil } from "@/services/expiration";
import { getExpirationRules, markExpirationScanRun } from "@/services/settingsStore";
import { getBrandingContext } from "@/services/branding";
import { sendMail } from "@/services/email";
import { sendWhatsapp, CALLMEBOT_PROVIDER } from "@/services/whatsapp";
import { getActiveRecipients } from "@/services/whatsappRecipients";

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

const SOURCE_TYPE_LABELS_AR: Record<TrackableItem["sourceType"], string> = {
  EMPLOYEE_IQAMA: "الإقامة",
  EMPLOYEE_PASSPORT: "جواز السفر",
  EMPLOYEE_DOCUMENT: "مستند موظف",
  COMPANY_DOCUMENT: "وثيقة مؤسسة",
};

function formatDateAr(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** A WhatsApp-specific message: branded, Arabic-first, and formatted for a
 * chat bubble (WhatsApp's `*bold*` markup) — kept separate from messageFor()
 * above, which still backs the in-app/email channels. */
function whatsappMessageFor(item: TrackableItem, threshold: string, companyName?: string | null): string {
  const typeLabel = SOURCE_TYPE_LABELS_AR[item.sourceType];
  const subject = item.employeeName ? `${item.employeeName} — ${typeLabel}` : item.label;
  const dateStr = formatDateAr(new Date(item.expiryDate));
  const statusLine =
    threshold === "expired" ? "⚠️ *منتهية الصلاحية*" : `⏳ *متبقٍ ${threshold} يوم على الانتهاء*`;

  return [
    `🔔 *تنبيه انتهاء صلاحية*${companyName ? ` — ${companyName}` : ""}`,
    "",
    `📌 ${subject}`,
    `📅 تاريخ الانتهاء: ${dateStr}`,
    statusLine,
    "",
    "يرجى المبادرة بالتجديد في أقرب وقت ممكن.",
    "— نظام SanaD لإدارة الوثائق والتراخيص",
  ].join("\n");
}

async function getRecipients() {
  return prisma.user.findMany({
    where: { deletedAt: null, isActive: true, userRoles: { some: { role: { name: { in: NOTIFY_ROLE_NAMES } } } } },
    select: { id: true, email: true, phone: true, fullName: true },
  });
}

async function logOnce(dedupeKey: string, channel: "SYSTEM" | "EMAIL" | "WHATSAPP", action: () => Promise<void>) {
  const existing = await prisma.notificationLog.findUnique({ where: { dedupeKey } });
  // Only a delivered notification is final — a failed one is retried the next
  // time the scan runs, instead of being silently dropped for good.
  if (existing?.status === "SENT") return;

  try {
    await action();
    await prisma.notificationLog.upsert({
      where: { dedupeKey },
      update: { status: "SENT", sentAt: new Date(), errorMessage: null },
      create: { dedupeKey, channel, status: "SENT", sentAt: new Date() },
    });
  } catch (err) {
    logger.error({ err, dedupeKey }, "Notification dispatch failed");
    const errorMessage = (err as Error).message;
    await prisma.notificationLog
      .upsert({
        where: { dedupeKey },
        update: { status: "FAILED", errorMessage },
        create: { dedupeKey, channel, status: "FAILED", errorMessage },
      })
      .catch(() => undefined);
  }
}

function assertSent(result: { sent: boolean; reason?: string }) {
  if (!result.sent) throw new Error(result.reason ?? "Send failed");
}

export async function runExpirationScan() {
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
      const whatsappMessage = whatsappMessageFor(item, threshold, companyName);
      // The numbers configured in Settings → WhatsApp decide who gets alerts.
      // With Meta and no list configured, fall back to notify-role users' phones.
      const phones =
        whatsappPhones.length > 0 || whatsappSettings.provider === CALLMEBOT_PROVIDER
          ? whatsappPhones
          : recipients.flatMap((r) => (r.phone ? [r.phone] : []));
      for (const phone of phones) {
        await logOnce(`${dedupeBase}:WHATSAPP:${phone}`, "WHATSAPP", async () => {
          assertSent(await sendWhatsapp(phone, whatsappMessage));
        });
      }
    }
  }

  await markExpirationScanRun();
  logger.info(`Expiration scan complete — ${dueCount} item(s) matched a notification threshold today`);
}
