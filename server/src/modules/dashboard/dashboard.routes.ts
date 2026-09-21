import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/apiError";
import * as service from "@/modules/dashboard/dashboard.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/summary",
  asyncHandler(async (_req, res) => res.json({ data: await service.getSummary() }))
);
router.get(
  "/expiration-widget",
  asyncHandler(async (_req, res) => res.json({ data: await service.getExpirationWidget() }))
);
router.get(
  "/charts",
  asyncHandler(async (_req, res) => res.json({ data: await service.getCharts() }))
);
router.get(
  "/recent-activity",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw ApiError.unauthorized();
    res.json({ data: await service.getRecentActivity(req.auth.userId) });
  })
);

export default router;
