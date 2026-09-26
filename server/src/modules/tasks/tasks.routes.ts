import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "@/modules/tasks/tasks.controller";
import { carrySchema, createTaskSchema, dayQuerySchema, exportQuerySchema, idParamSchema, updateTaskSchema } from "@/modules/tasks/tasks.schemas";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("tasks.view"), validate({ query: dayQuerySchema }), controller.listDay);
router.get("/week", requirePermission("tasks.view"), validate({ query: dayQuerySchema }), controller.week);
router.get("/assignees", requirePermission("tasks.view"), controller.assignees);
router.get("/suggestions", requirePermission("tasks.view"), controller.suggestions);
router.get("/export", requirePermission("tasks.export"), validate({ query: exportQuerySchema }), controller.exportTasks);

router.post("/", requirePermission("tasks.create"), validate({ body: createTaskSchema }), auditLog(AuditAction.CREATE, "tasks"), controller.create);
router.post("/carry", requirePermission("tasks.edit"), validate({ body: carrySchema }), auditLog(AuditAction.UPDATE, "tasks"), controller.carry);
router.patch(
  "/:id",
  requirePermission("tasks.edit"),
  validate({ params: idParamSchema, body: updateTaskSchema }),
  auditLog(AuditAction.UPDATE, "tasks"),
  controller.update
);
router.delete("/:id", requirePermission("tasks.delete"), validate({ params: idParamSchema }), auditLog(AuditAction.DELETE, "tasks"), controller.remove);

export default router;
