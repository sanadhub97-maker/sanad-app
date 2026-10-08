import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "./vehicles.controller";
import { exportQuerySchema, idParamSchema, listQuerySchema, renewSchema, vehicleSchema } from "./vehicles.schemas";

// The establishments' cars and the three dates that expire on each.
const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("vehicles.view"), validate({ query: listQuerySchema }), controller.list);
router.get("/stats", requirePermission("vehicles.view"), controller.stats);
router.get("/export", requirePermission("vehicles.export"), validate({ query: exportQuerySchema }), controller.exportVehicles);
router.get("/:id", requirePermission("vehicles.view"), validate({ params: idParamSchema }), controller.get);
router.post("/", requirePermission("vehicles.create"), validate({ body: vehicleSchema }), auditLog(AuditAction.CREATE, "vehicles"), controller.create);
router.put("/:id", requirePermission("vehicles.edit"), validate({ params: idParamSchema, body: vehicleSchema }), auditLog(AuditAction.UPDATE, "vehicles"), controller.update);
router.post("/:id/renew", requirePermission("vehicles.edit"), validate({ params: idParamSchema, body: renewSchema }), auditLog(AuditAction.UPDATE, "vehicles", { description: (req) => `Renewed ${req.body?.kind}` }), controller.renew);
router.delete("/:id", requirePermission("vehicles.delete"), validate({ params: idParamSchema }), auditLog(AuditAction.DELETE, "vehicles"), controller.remove);

export default router;
