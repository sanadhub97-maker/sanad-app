import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { ApiError } from "@/utils/apiError";
import { pdfContentDisposition } from "@/utils/pdfHeaders";
import * as service from "./productivity.service";
import * as schedules from "./scheduled-reports.service";
import { idSchema, bulkSchema, scheduleSchema, onboardingSchema } from "./productivity.schemas";
import { exportEmployeeBatch } from "./bulk-export.service";
const router = Router(); router.use(requireAuth);
router.get("/alerts", asyncHandler(async (req, res) => { res.json({ data: await service.alertCenter(req.auth!) }); }));
router.post("/alerts/acknowledge", validate({ body: z.object({ key: z.string().min(1).max(300), done: z.boolean() }) }), asyncHandler(async (req, res) => { await service.acknowledge(req.auth!, req.body.key, req.body.done); res.json({ message: "Saved." }); }));
router.get("/quality", asyncHandler(async (req, res) => { res.json({ data: await service.dataQuality(req.auth!) }); }));
router.post("/employees/bulk", validate({ body: bulkSchema }), asyncHandler(async (req, res) => { res.json({ data: await service.bulkUpdate(req.auth!, req.body) }); }));
router.get("/employees/export", validate({ query: z.object({ ids: z.array(idSchema).min(1).max(25).refine(v => new Set(v).size === v.length) }) }), asyncHandler(async (req, res) => { await exportEmployeeBatch(req.auth!, req.query.ids as string[], res); }));
router.get("/onboarding", validate({ query: z.object({ q: z.string().trim().max(100).default(""), page: z.coerce.number().int().min(1).max(10000).default(1) }) }), asyncHandler(async (req, res) => { res.json({ data: await service.onboarding(req.auth!, req.query.q as string, Number(req.query.page)) }); }));
router.put("/onboarding/:id", validate({ params: z.object({ id: idSchema }), body: onboardingSchema }), asyncHandler(async (req, res) => { await service.setOnboarding(req.auth!, req.params.id as string, req.body.step, req.body.done); res.json({ message: "Saved." }); }));
router.get("/schedules", asyncHandler(async (req, res) => { res.json({ data: await schedules.listSchedules(req.auth!) }); }));
router.post("/schedules", validate({ body: scheduleSchema }), asyncHandler(async (req, res) => { res.json({ data: await schedules.createSchedule(req.auth!, req.body) }); }));
router.patch("/schedules/:id", validate({ params: z.object({ id: idSchema }), body: z.object({ enabled: z.boolean() }) }), asyncHandler(async (req, res) => { await schedules.ownedSchedule(req.auth!, req.params.id as string); res.json({ data: await prisma.reportSchedule.update({ where: { id: req.params.id as string }, data: { enabled: req.body.enabled } }) }); }));
router.post("/schedules/:id/run", validate({ params: z.object({ id: idSchema }) }), asyncHandler(async (req, res) => {
  const row = await schedules.ownedSchedule(req.auth!, req.params.id as string);
  if (await prisma.generatedReport.findFirst({ where: { scheduleId: row.id, status: "RUNNING" } })) throw ApiError.tooMany("A report is already being prepared.");
  const last = await prisma.generatedReport.findFirst({ where: { scheduleId: row.id }, orderBy: { createdAt: "desc" } });
  if (last && last.createdAt > new Date(Date.now() - 60_000)) throw ApiError.tooMany("Wait one minute between report runs.");
  // Reserve a single run before responding; scheduled runs have their own unique day slot.
  const run = await schedules.generateReport(row, `manual:${Math.floor(Date.now() / 60000)}`);
  if (!run) throw ApiError.tooMany("A report run has already started in this minute.");
  if (run.status !== "READY") throw ApiError.badRequest(run.error || "Report generation failed.");
  res.json({ message: "Report prepared. Refresh the list.", data: { id: run.id, status: run.status } });
}));
router.get("/runs/:id/pdf", validate({ params: z.object({ id: idSchema }) }), asyncHandler(async (req, res) => {
  const run = await prisma.generatedReport.findFirst({ where: { id: req.params.id as string, schedule: { userId: req.auth!.userId }, status: "READY" }, include: { schedule: true } });
  if (!run?.fileId) throw ApiError.notFound("Report not found.");
  schedules.assertReportAccess(req.auth!, run.schedule.kind);
  const file = await prisma.file.findUnique({ where: { id: run.fileId } }); if (!file) throw ApiError.notFound("Report file not found.");
  let metadata: { scheduleId: string; permissions: string[] };
  try { metadata = JSON.parse(file.relatedId || ""); } catch { throw ApiError.forbidden("Report permission metadata is unavailable. Generate a new report."); }
  if (file.module !== "scheduled-report" || file.uploadedById !== req.auth!.userId || metadata.scheduleId !== run.scheduleId || !Array.isArray(metadata.permissions)) throw ApiError.forbidden("Invalid report ownership.");
  for (const key of metadata.permissions) service.requireAccess(req.auth!, key);
  const bytes = await storage.read(file.storedName);
  await prisma.auditLog.create({ data: { userId: req.auth!.userId, action: "DOWNLOAD", module: "reports", recordId: run.id, description: "Downloaded scheduled report" } });
  res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", pdfContentDisposition(file.originalName)); res.send(bytes);
}));
export default router;
