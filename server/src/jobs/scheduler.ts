import cron from "node-cron";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { runExpirationScan } from "@/jobs/expirationScan";

export function startScheduledJobs() {
  cron.schedule(env.EXPIRATION_SCAN_CRON, () => {
    runExpirationScan().catch((err) => logger.error({ err }, "Scheduled expiration scan failed"));
  });
  logger.info(`Expiration scan scheduled (cron: "${env.EXPIRATION_SCAN_CRON}")`);
}
