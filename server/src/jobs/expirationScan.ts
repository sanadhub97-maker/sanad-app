import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getTrackableItems, TrackableItem } from "@/services/expiringItems";
import { daysUntil } from "@/services/expiration";
import { getExpirationRules, markExpirationScanRun, setWhatsappScheduleSetting } from "@/services/settingsStore";
import { getBrandingContext } from "@/services/branding";
import { sendMail } from "@/services/email";
import { sendWhatsapp } from "@/services/whatsapp";
import { getActiveRecipients } from "@/services/whatsappRecipients";
import { alertContext } from "@/services/whatsappTemplates";
import { getAlertStyle, prepareAlert, type PreparedAlert } from "@/services/whatsappAlert";

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
  return item.sourceType === "COMPANY_DOCUMENT" && item.kindEn ? `${item.kindEn} of ${item.label}` : item.label;
}

export function messageFor(item: Pick<TrackableItem, "label" | "sourceType" | "kindEn">, threshold: string): string {
  if (threshold === "expired") return `${subjectEn(item)} has expired.`;
  return `${subjectEn(item)} will expire in ${threshold} day${threshold === "1" ? "" : "s"}.`;
}

export const NOTIFICATION_TITLE = { en: "Document Expiration Alert", ar: "تنبيه انتهاء وثيقة" };

const daysAr = (n: number) => (n === 1 ? "يوم واحد" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يومًا`);

/** What the Arabic message is about: "الإقامة للموظف فلان", or the document's own name. */
export function subjectAr(item: Pick<TrackableItem, "labelAr" | "documentAr" | "employeeNameAr"> & { sourceType?: string; kindAr?: string }): string {
  if (item.documentAr && item.employeeNameAr) return `${item.documentAr} للموظف ${item.employeeNameAr.trim()}`;
  return item.sourceType === "COMPANY_DOCUMENT" && item.kindAr ? `${item.kindAr} لـ${item.labelAr}` : item.labelAr;
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
  const alertStyle = await getAlertStyle(branding.company?.nameEn);
  const whatsappPhones = (await getActiveRecipients()).map((r) => r.phone);

  let dueCount = 0;

  for (const item of items) {
    const threshold = matchedThreshold(item, rules.notifyDaysBefore);
    if (!threshold) continue;
    dueCount++;

    const severity = severityFor(threshold);
    const message = messageFor(item, threshold);
    const messageAr = messageArFor(subjectAr(item), threshold);
    const dedupeBase = `${item.key}:${threshold}`;

    // In-app notifications (one row per recipient) — always attempted.
    await logOnce(`${dedupeBase}:SYSTEM`, "SYSTEM", async () => {
      await prisma.notification.createMany({
        data: recipients.map((r) => ({
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
      for (const recipient of recipients) {
        await logOnce(`${dedupeBase}:EMAIL:${recipient.id}`, "EMAIL", async () => {
          assertSent(
            await sendMail({
              to: recipient.email,
              subject: `${NOTIFICATION_TITLE.ar} | ${NOTIFICATION_TITLE.en}`,
              html: `<p dir="rtl" style="font-family:Tahoma,sans-serif">${messageAr}</p><p dir="ltr" style="font-family:Arial,sans-serif;color:#555">${message}</p>`,
            })
          );
        });
      }
    }

    if (whatsappSettings?.enabled) {
      // In the designs chosen in Settings → WhatsApp (message above still backs
      // the in-app and email channels). Prepared on first use, so a card is
      // only drawn when some number still has this alert to receive.
      let prepared: Promise<PreparedAlert> | null = null;
      const whatsappAlert = () => (prepared ??= prepareAlert(alertContext(item, companyName), alertStyle));
      // The numbers configured in Settings → WhatsApp decide who gets alerts.
      // With Meta and no list configured, fall back to notify-role users' phones.
      const phones =
        whatsappPhones.length > 0 || ["CALLMEBOT", "WHATSAPP_WEB"].includes(whatsappSettings.provider ?? "")
          ? whatsappPhones
          : recipients.flatMap((r) => (r.phone ? [r.phone] : []));
      for (const phone of phones) {
        const meta: LogMeta = { recipient: phone, relatedType: item.sourceType, relatedId: item.recordId };
        await logOnce(
          `${dedupeBase}:WHATSAPP:${phone}`,
          "WHATSAPP",
          async () => {
            const alert = await whatsappAlert();
            meta.message = alert.logText;
            if (alert.mode === "card_only") {
              assertSent(await sendWhatsapp(phone, alert.cardCaption || "", alert.image));
            } else if (alert.mode === "both") {
              assertSent(await sendWhatsapp(phone, alert.text));
              if (alert.image) {
                await new Promise((r) => setTimeout(r, 1200));
                assertSent(await sendWhatsapp(phone, alert.cardCaption || "", alert.image));
              }
            } else {
              assertSent(await sendWhatsapp(phone, alert.text));
            }
          },
          meta
        );
      }
    }
  }

  await markExpirationScanRun();
  await setWhatsappScheduleSetting({ lastRunAt: new Date().toISOString() }).catch(() => undefined);
  logger.info(`Expiration scan complete — ${dueCount} item(s) matched a notification threshold today`);
  return { dueCount };
}
