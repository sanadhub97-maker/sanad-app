import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/apiError";
import * as service from "@/modules/dashboard/dashboard.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/summary",
  asyncHandler(async (req, res) => res.json({ data: await service.getSummary(req.auth!) }))
);
router.get(
  "/expiration-widget",
  asyncHandler(async (req, res) => res.json({ data: await service.getExpirationWidget(req.auth!) }))
);
router.get(
  "/charts",
  asyncHandler(async (req, res) => res.json({ data: await service.getCharts(req.auth!) }))
);
router.get(
  "/overview",
  asyncHandler(async (req, res) => res.json({ data: await service.getOverview(req.auth!) }))
);
router.get(
  "/recent-activity",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw ApiError.unauthorized();
    res.json({ data: await service.getRecentActivity(req.auth) });
  })
);

export default router;
