import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "@/modules/payments/payments.controller";
import { createPaymentSchema, idParamSchema, listPaymentsQuerySchema, updatePaymentSchema } from "@/modules/payments/payments.schemas";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("payments.view"), validate({ query: listPaymentsQuerySchema }), controller.list);
router.get("/:id", requirePermission("payments.view"), validate({ params: idParamSchema }), controller.getById);
router.get("/:id/receipt.pdf", requirePermission("payments.view"), validate({ params: idParamSchema }), controller.receiptPdf);

router.post(
  "/",
  requirePermission("payments.create"),
  validate({ body: createPaymentSchema }),
  auditLog(AuditAction.CREATE, "payments"),
  controller.create
);

router.put(
  "/:id",
  requirePermission("payments.edit"),
  validate({ params: idParamSchema, body: updatePaymentSchema }),
  auditLog(AuditAction.UPDATE, "payments"),
  controller.update
);

router.delete(
  "/:id",
  requirePermission("payments.delete"),
  validate({ params: idParamSchema }),
  auditLog(AuditAction.DELETE, "payments"),
  controller.remove
);

export default router;
