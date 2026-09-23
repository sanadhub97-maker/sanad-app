import cron from "node-cron";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { runExpirationScan } from "@/jobs/expirationScan";
import { hasExpirationScanRunToday } from "@/services/settingsStore";

export function startScheduledJobs() {
  cron.schedule(env.EXPIRATION_SCAN_CRON, () => {
    runExpirationScan().catch((err) => logger.error({ err }, "Scheduled expiration scan failed"));
  });
  logger.info(`Expiration scan scheduled (cron: "${env.EXPIRATION_SCAN_CRON}")`);

  // On a host that sleeps when idle (Render's free tier), the in-process cron
  // above never fires while the server is asleep. Catch up on boot instead, so
  // any wake-up — a daily ping or a user visit — still gets today's scan run.
  hasExpirationScanRunToday()
    .then((ranToday) => {
      if (ranToday) return;
      logger.info("No expiration scan recorded today — running catch-up scan");
      return runExpirationScan();
    })
    .catch((err) => logger.error({ err }, "Catch-up expiration scan failed"));
}
