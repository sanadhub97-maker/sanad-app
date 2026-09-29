import { logger } from "@/lib/logger";

// Render's free plan puts a service to sleep after 15 minutes without
// incoming requests, and the next visitor waits 30–60 s for it to wake. A
// request to our own public address every 10 minutes counts as incoming
// traffic, so the system stays awake. One service running all month fits in
// the free plan's 750 hours. RENDER_EXTERNAL_URL is set by Render itself, so
// this does nothing anywhere else (local development).
const EVERY_MS = 10 * 60 * 1000;

export function startKeepAwake() {
  const base = process.env.RENDER_EXTERNAL_URL;
  if (!base) return;
  const url = `${base.replace(/\/$/, "")}/api/health`;
  const ping = () =>
    fetch(url, { signal: AbortSignal.timeout(20_000) }).catch((err) => logger.warn({ err }, "Keep-awake ping failed"));
  setInterval(ping, EVERY_MS).unref();
  logger.info(`Keep-awake: pinging ${url} every 10 minutes`);
}
