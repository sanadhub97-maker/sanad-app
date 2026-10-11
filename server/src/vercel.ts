import type { Request, Response } from "express";
import { createApp } from "@/app";
import { logger } from "@/lib/logger";
import { runExpirationScan } from "@/jobs/expirationScan";
import { hasExpirationScanRunToday } from "@/services/settingsStore";
import { pushMorningBrief } from "@/services/pushAlerts";
import { runScheduledBackup } from "@/modules/maintenance/backups.service";
import { flushWhatsappWeb } from "@/services/whatsappWeb";

/* Entry points for Vercel (api/index.js and api/cron.js at the repository
   root): the API as one function, and the daily jobs that node-cron runs on
   an always-on host, called once a day by Vercel Cron. */

export const app = createApp();

/** The daily round: the backup, the morning brief, and the expiry scan with its WhatsApp alerts. */
export async function cron(req: Request, res: Response) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const done: Record<string, string> = {};
  const step = async (name: string, run: () => Promise<unknown>) => {
    try {
      await run();
      done[name] = "ok";
    } catch (err) {
      logger.error({ err }, `Daily ${name} failed`);
      done[name] = "failed";
    }
  };
  await step("backup", () => runScheduledBackup());
  await step("brief", () => pushMorningBrief());
  await step("scan", async () => {
    if (!(await hasExpirationScanRunToday())) await runExpirationScan();
  });
  await flushWhatsappWeb();
  res.json({ data: done });
}
