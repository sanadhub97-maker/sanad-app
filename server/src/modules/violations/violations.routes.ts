import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "@/modules/violations/violations.controller";
import {
  applySchema,
  createViolationSchema,
  exportQuerySchema,
  idParamSchema,
  listViolationsQuerySchema,
  objectionResultSchema,
  objectionSchema,
  paySchema,
  relatedQuerySchema,
  updateViolationSchema,
} from "@/modules/violations/violations.schemas";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("violations.view"), validate({ query: listViolationsQuerySchema }), controller.list);
router.get("/stats", requirePermission("violations.view"), controller.stats);
router.get("/export", requirePermission("violations.export"), validate({ query: exportQuerySchema }), controller.exportViolations);
router.get("/related-options", requirePermission("violations.view"), validate({ query: relatedQuerySchema }), controller.related);
router.get("/:id", requirePermission("violations.view"), validate({ params: idParamSchema }), controller.get);

router.post("/", requirePermission("violations.create"), validate({ body: createViolationSchema }), auditLog(AuditAction.CREATE, "violations"), controller.create);
router.patch("/:id", requirePermission("violations.edit"), validate({ params: idParamSchema, body: updateViolationSchema }), auditLog(AuditAction.UPDATE, "violations"), controller.update);
router.delete("/:id", requirePermission("violations.delete"), validate({ params: idParamSchema }), auditLog(AuditAction.DELETE, "violations"), controller.remove);

router.post("/:id/pay", requirePermission("violations.pay"), requirePermission("payments.create"), validate({ params: idParamSchema, body: paySchema }), auditLog(AuditAction.UPDATE, "violations", { description: () => "Paid with a payment voucher" }), controller.pay);
router.post("/:id/objection", requirePermission("violations.edit"), validate({ params: idParamSchema, body: objectionSchema }), auditLog(AuditAction.UPDATE, "violations", { description: () => "Objection filed" }), controller.objection);
router.post("/:id/objection-result", requirePermission("violations.edit"), validate({ params: idParamSchema, body: objectionResultSchema }), auditLog(AuditAction.UPDATE, "violations", { description: () => "Objection result" }), controller.objectionResult);
router.post("/:id/apply", requirePermission("violations.edit"), validate({ params: idParamSchema, body: applySchema }), auditLog(AuditAction.UPDATE, "violations", { description: () => "Penalty applied" }), controller.apply);

export default router;
