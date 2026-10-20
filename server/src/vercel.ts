import type { Request, Response } from "express";
import { createApp } from "@/app";
import { logger } from "@/lib/logger";
import { runExpirationScan } from "@/jobs/expirationScan";
import { hasExpirationScanRunToday } from "@/services/settingsStore";
import { pushMorningBrief } from "@/services/pushAlerts";
import { runScheduledBackup } from "@/modules/maintenance/backups.service";
import { flushWhatsappWeb } from "@/services/whatsappWeb";
import { runDailyPaymentsDigest } from "@/services/paymentsDigest";
import { runDoneTasksDigest } from "@/services/doneTasksDigest";
import { prisma } from "@/lib/prisma";
import { watchSystemHealth } from "@/services/systemHealth";
import { runMonthlyReport } from "@/services/monthlyReport";

/* Entry points for Vercel (api/index.js and api/cron.js at the repository
   root): the API as one function, and the daily jobs that node-cron runs on
   an always-on host, called once a day by Vercel Cron. */

export const app = createApp();

/** Each run leaves its time and outcome, so a missed or failed day can be seen afterwards. */
async function heartbeat(job: string, value: Record<string, unknown>) {
  const key = `jobs.cron.${job}`;
  await prisma.setting.upsert({ where: { key }, update: { value: value as never }, create: { key, value: value as never } }).catch(() => undefined);
}

/** The daily rounds: in the morning the backup, the morning brief, the expiry scan with its
 * WhatsApp summary and (early in a month) the monthly report, then a check that all went out;
 * in the evening (?job=payments) the WhatsApp message with the day's payments and the summary of the tasks finished. */
export async function cron(req: Request, res: Response) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const job = req.query?.job === "payments" ? "payments" : "morning";
  const startedAt = new Date().toISOString();
  await heartbeat(job, { startedAt, status: "running" });
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
  if (job === "payments") {
    await step("payments", () => runDailyPaymentsDigest());
    await step("doneTasks", () => runDoneTasksDigest());
  } else {
    await step("backup", () => runScheduledBackup());
    await step("brief", () => pushMorningBrief());
    await step("scan", async () => {
      if (!(await hasExpirationScanRunToday())) await runExpirationScan();
    });
    // On the first days of a month, last month's report (once).
    await step("monthly", () => runMonthlyReport());
  }
  await flushWhatsappWeb();
  await heartbeat(job, { startedAt, finishedAt: new Date().toISOString(), status: "done", steps: done });
  // After the morning round its own results; in the evening, a morning round that never came.
  await watchSystemHealth();
  res.json({ data: done });
}
