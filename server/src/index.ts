import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { createApp } from "@/app";
import { startScheduledJobs } from "@/jobs/scheduler";
import { closePdfBrowser } from "@/services/pdf";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`);
  startScheduledJobs();
});

async function shutdown() {
  logger.info("Shutting down...");
  await closePdfBrowser();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
