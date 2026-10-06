import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { createApp } from "@/app";
import { startScheduledJobs } from "@/jobs/scheduler";
import { startKeepAwake } from "@/jobs/keepAwake";
import { closePdfBrowser } from "@/services/pdf";

const app = createApp();

const server = app.listen(env.PORT, env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1", () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`);
  startScheduledJobs();
  startKeepAwake();
  // The PDF browser is no longer started here: idle, it held 100+ MB of the 512 MB host.
  // The reports page warms it when someone is about to print.
});
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
server.maxHeadersCount = 100;

async function shutdown() {
  logger.info("Shutting down...");
  await closePdfBrowser();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
