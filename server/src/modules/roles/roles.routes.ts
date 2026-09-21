import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "@/modules/roles/roles.controller";
import { createRoleSchema, idParamSchema, updateRoleSchema } from "@/modules/roles/roles.schemas";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("roles.view"), controller.list);
router.get("/permissions", requirePermission("roles.view"), controller.permissionsCatalogue);
router.get("/:id", requirePermission("roles.view"), validate({ params: idParamSchema }), controller.getById);

router.post(
  "/",
  requirePermission("roles.create"),
  validate({ body: createRoleSchema }),
  auditLog(AuditAction.CREATE, "roles"),
  controller.create
);

router.put(
  "/:id",
  requirePermission("roles.edit"),
  validate({ params: idParamSchema, body: updateRoleSchema }),
  auditLog(AuditAction.UPDATE, "roles"),
  controller.update
);

router.delete(
  "/:id",
  requirePermission("roles.delete"),
  validate({ params: idParamSchema }),
  auditLog(AuditAction.DELETE, "roles"),
  controller.remove
);

export default router;
