import cron from "node-cron";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { runExpirationScan } from "@/jobs/expirationScan";
import { getWhatsappScheduleSetting, hasExpirationScanRunToday } from "@/services/settingsStore";
import { resumeWhatsappWebOnBoot } from "@/services/whatsappWeb";
import { pushMorningBrief, pushTaskReminders } from "@/services/pushAlerts";

let scheduledScanTask: cron.ScheduledTask | null = null;

/**
 * Dynamically reschedules the daily expiration scan job based on user settings
 * (Settings → WhatsApp: Daily scheduled send time).
 */
export async function rescheduleExpirationScan(timeStr?: string, timezone = "Asia/Riyadh") {
  if (scheduledScanTask) {
    scheduledScanTask.stop();
    scheduledScanTask = null;
  }

  let sendTime = timeStr;
  let tz = timezone;
  if (!sendTime) {
    const setting = await getWhatsappScheduleSetting().catch(() => null);
    sendTime = setting?.sendTime || "09:00";
    tz = setting?.timezone || "Asia/Riyadh";
  }

  const [hourStr, minStr] = (sendTime || "09:00").split(":");
  const hour = parseInt(hourStr, 10) || 9;
  const min = parseInt(minStr, 10) || 0;
  const cronExpr = `${min} ${hour} * * *`;

  try {
    scheduledScanTask = cron.schedule(
      cronExpr,
      () => {
        logger.info({ cronExpr, sendTime, timezone: tz }, "Triggering scheduled daily expiration scan");
        runExpirationScan().catch((err) => logger.error({ err }, "Scheduled expiration scan failed"));
      },
      { timezone: tz }
    );
    logger.info(`Expiration scan scheduled daily at ${sendTime} (${tz}, cron: "${cronExpr}")`);
  } catch (err) {
    logger.error({ err, cronExpr, timezone: tz }, "Failed to schedule daily expiration scan");
  }
}

export async function startScheduledJobs() {
  resumeWhatsappWebOnBoot().catch((err) => logger.error({ err }, "Resume WhatsApp Web on boot failed"));

  // Push: the morning brief at 08:00, and each task at its own time.
  cron.schedule("0 8 * * *", () => void pushMorningBrief().catch((err) => logger.error({ err }, "Morning brief push failed")), { timezone: "Asia/Riyadh" });
  cron.schedule("* * * * *", () => void pushTaskReminders().catch((err) => logger.error({ err }, "Task reminder push failed")));

  await rescheduleExpirationScan().catch((err) => logger.error({ err }, "Failed to initialize scheduled scan"));

  // In production on hosts that sleep when idle (e.g. Render), catch up on boot if not run today
  if (env.NODE_ENV === "production") {
    hasExpirationScanRunToday()
      .then((ranToday) => {
        if (ranToday) return;
        logger.info("No expiration scan recorded today — running catch-up scan");
        return runExpirationScan();
      })
      .catch((err) => logger.error({ err }, "Catch-up expiration scan failed"));
  }
}
