import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "@/modules/taxReturns/taxReturns.controller";
import {
  createTaxReturnSchema,
  idParamSchema,
  listTaxReturnsQuerySchema,
  statsQuerySchema,
  updateTaxReturnSchema,
} from "@/modules/taxReturns/taxReturns.schemas";

const router = Router();
router.use(requireAuth);

router.get(
  "/stats-alerts",
  requirePermission("payments.view", "taxReturns.view"),
  validate({ query: statsQuerySchema }),
  controller.statsAndAlerts
);

router.get(
  "/",
  requirePermission("payments.view", "taxReturns.view"),
  validate({ query: listTaxReturnsQuerySchema }),
  controller.list
);

router.get(
  "/:id",
  requirePermission("payments.view", "taxReturns.view"),
  validate({ params: idParamSchema }),
  controller.get
);

router.post(
  "/",
  requirePermission("payments.create", "taxReturns.create"),
  validate({ body: createTaxReturnSchema }),
  auditLog(AuditAction.CREATE, "taxReturns", {
    description: (req) => `Created ${req.body.kind} return for ${req.body.year} ${req.body.quarter ? `Q${req.body.quarter}` : ""}`,
  }),
  controller.create
);

router.patch(
  "/:id",
  requirePermission("payments.edit", "taxReturns.edit"),
  validate({ params: idParamSchema, body: updateTaxReturnSchema }),
  auditLog(AuditAction.UPDATE, "taxReturns", {
    description: () => "Updated tax/zakat return",
  }),
  controller.update
);

router.put(
  "/:id",
  requirePermission("payments.edit", "taxReturns.edit"),
  validate({ params: idParamSchema, body: updateTaxReturnSchema }),
  auditLog(AuditAction.UPDATE, "taxReturns", {
    description: () => "Updated tax/zakat return",
  }),
  controller.update
);

router.delete(
  "/:id",
  requirePermission("payments.delete", "taxReturns.delete"),
  validate({ params: idParamSchema }),
  auditLog(AuditAction.DELETE, "taxReturns", {
    description: () => "Deleted tax/zakat return",
  }),
  controller.remove
);

export default router;
