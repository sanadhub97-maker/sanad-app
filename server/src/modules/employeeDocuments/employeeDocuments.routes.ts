import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "@/modules/employeeDocuments/employeeDocuments.controller";
import { createEmployeeDocumentSchema, updateEmployeeDocumentSchema } from "@/modules/employeeDocuments/employeeDocuments.schemas";

// Mounted at /employees/:employeeId/documents (see employees.routes.ts) —
// mergeParams lets us read :employeeId here.
const router = Router({ mergeParams: true });

router.get("/", requirePermission("employeeDocuments.view"), controller.list);
router.get("/:id", requirePermission("employeeDocuments.view"), controller.getById);

router.post(
  "/",
  requirePermission("employeeDocuments.create"),
  validate({ body: createEmployeeDocumentSchema }),
  auditLog(AuditAction.CREATE, "employeeDocuments"),
  controller.create
);

router.put(
  "/:id",
  requirePermission("employeeDocuments.edit"),
  validate({ body: updateEmployeeDocumentSchema }),
  auditLog(AuditAction.UPDATE, "employeeDocuments"),
  controller.update
);

router.delete(
  "/:id",
  requirePermission("employeeDocuments.delete"),
  auditLog(AuditAction.DELETE, "employeeDocuments"),
  controller.remove
);

export default router;
