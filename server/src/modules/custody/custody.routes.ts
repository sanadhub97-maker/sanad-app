import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "./custody.controller";
import {
  createClearanceSchema,
  createHandoverSchema,
  employeeParamSchema,
  idParamSchema,
  listQuerySchema,
  returnItemsSchema,
  updateClearanceSchema,
  updateHandoverSchema,
} from "./custody.schemas";

// Custody handovers (/custody/handovers) and end-of-service clearances (/custody/clearances).
const router = Router();
router.use(requireAuth);

router.get("/stats", requirePermission("custody.view"), controller.stats);
router.get("/employees/:employeeId/items", requirePermission("custody.view"), validate({ params: employeeParamSchema }), controller.employeeItems);

router.get("/handovers", requirePermission("custody.view"), validate({ query: listQuerySchema }), controller.listHandovers);
router.get("/handovers/:id", requirePermission("custody.view"), validate({ params: idParamSchema }), controller.getHandover);
router.get("/handovers/:id/pdf", requirePermission("custody.export"), validate({ params: idParamSchema }), auditLog(AuditAction.EXPORT, "custody", { description: () => "Printed a custody handover" }), controller.handoverPdf);
router.post("/handovers", requirePermission("custody.create"), validate({ body: createHandoverSchema }), auditLog(AuditAction.CREATE, "custody"), controller.createHandover);
router.put("/handovers/:id", requirePermission("custody.edit"), validate({ params: idParamSchema, body: updateHandoverSchema }), auditLog(AuditAction.UPDATE, "custody"), controller.updateHandover);
router.post("/handovers/:id/return", requirePermission("custody.edit"), validate({ params: idParamSchema, body: returnItemsSchema }), auditLog(AuditAction.UPDATE, "custody", { description: () => "Custody items returned" }), controller.returnItems);
router.delete("/handovers/:id", requirePermission("custody.delete"), validate({ params: idParamSchema }), auditLog(AuditAction.DELETE, "custody"), controller.removeHandover);

router.get("/clearances", requirePermission("custody.view"), validate({ query: listQuerySchema }), controller.listClearances);
router.get("/clearances/:id", requirePermission("custody.view"), validate({ params: idParamSchema }), controller.getClearance);
router.get("/clearances/:id/pdf", requirePermission("custody.export"), validate({ params: idParamSchema }), auditLog(AuditAction.EXPORT, "custody", { description: () => "Printed a clearance" }), controller.clearancePdf);
router.post("/clearances", requirePermission("custody.create"), validate({ body: createClearanceSchema }), auditLog(AuditAction.CREATE, "custody", { description: () => "Clearance created" }), controller.createClearance);
router.put("/clearances/:id", requirePermission("custody.edit"), validate({ params: idParamSchema, body: updateClearanceSchema }), auditLog(AuditAction.UPDATE, "custody", { description: () => "Clearance updated" }), controller.updateClearance);
router.post("/clearances/:id/issue", requirePermission("custody.edit"), validate({ params: idParamSchema }), auditLog(AuditAction.UPDATE, "custody", { description: () => "Clearance certificate issued" }), controller.issueClearance);
router.delete("/clearances/:id", requirePermission("custody.delete"), validate({ params: idParamSchema }), auditLog(AuditAction.DELETE, "custody", { description: () => "Clearance deleted" }), controller.removeClearance);

export default router;
