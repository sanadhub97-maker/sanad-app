import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import * as service from "./alerts.service";
import { getAlertsRibbon, ribbonItems } from "@/services/alertsRibbon";

// The notifications page's current alerts; each user sees what their permissions allow.
const router = Router();
router.use(requireAuth);
router.get("/", asyncHandler(async (req, res) => { res.json({ data: await service.alertCenter(req.auth!) }); }));
// The top bar ribbon: its look as set for the organisation, and what it carries for this user.
router.get("/ribbon", asyncHandler(async (req, res) => {
  const settings = await getAlertsRibbon();
  res.json({ data: { settings, items: settings.enabled ? await ribbonItems(req.auth!, settings) : [] } });
}));
router.post(
  "/acknowledge",
  validate({ body: z.object({ key: z.string().min(1).max(300), done: z.boolean() }) }),
  asyncHandler(async (req, res) => { await service.acknowledge(req.auth!, req.body.key, req.body.done); res.json({ message: "Saved." }); })
);
export default router;
