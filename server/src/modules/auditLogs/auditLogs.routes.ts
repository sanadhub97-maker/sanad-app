import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import * as service from "@/modules/auditLogs/auditLogs.service";
import { listAuditLogsQuerySchema } from "@/modules/auditLogs/auditLogs.schemas";

const router = Router();
router.use(requireAuth, requirePermission("auditLogs.view"));

router.get(
  "/",
  validate({ query: listAuditLogsQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.list(req.query as never));
  })
);

export default router;
