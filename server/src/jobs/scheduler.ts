import cron from "node-cron";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { runExpirationScan } from "@/jobs/expirationScan";
import { hasExpirationScanRunToday } from "@/services/settingsStore";
import { resumeWhatsappWebOnBoot } from "@/services/whatsappWeb";

export function startScheduledJobs() {
  // The local dev server shares the production database; if it ran the scan
  // it would mark the day as done while being unable to send (its encryption
  // key can't read production's credentials). Scheduled work is production-only.
  if (env.NODE_ENV !== "production") {
    logger.info("Scheduled jobs disabled outside production");
    return;
  }

  cron.schedule(env.EXPIRATION_SCAN_CRON, () => {
    runExpirationScan().catch((err) => logger.error({ err }, "Scheduled expiration scan failed"));
  });
  logger.info(`Expiration scan scheduled (cron: "${env.EXPIRATION_SCAN_CRON}")`);

  // On a host that sleeps when idle (Render's free tier), the in-process cron
  // above never fires while the server is asleep. Catch up on boot instead, so
  // any wake-up — a daily ping or a user visit — still gets today's scan run.
  resumeWhatsappWebOnBoot()
    .then(() => hasExpirationScanRunToday())
    .then((ranToday) => {
      if (ranToday) return;
      logger.info("No expiration scan recorded today — running catch-up scan");
      return runExpirationScan();
    })
    .catch((err) => logger.error({ err }, "Catch-up expiration scan failed"));
}
