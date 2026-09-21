import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "@/modules/branches/branches.controller";
import { createBranchSchema, idParamSchema, listBranchesQuerySchema, updateBranchSchema } from "@/modules/branches/branches.schemas";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("branches.view"), validate({ query: listBranchesQuerySchema }), controller.list);
router.get("/active", requirePermission("branches.view"), controller.listActive);
router.get("/next-code", requirePermission("branches.view"), controller.getNextCode);
router.get("/:id", requirePermission("branches.view"), validate({ params: idParamSchema }), controller.getById);

router.post(
  "/",
  requirePermission("branches.create"),
  validate({ body: createBranchSchema }),
  auditLog(AuditAction.CREATE, "branches"),
  controller.create
);

router.put(
  "/:id",
  requirePermission("branches.edit"),
  validate({ params: idParamSchema, body: updateBranchSchema }),
  auditLog(AuditAction.UPDATE, "branches"),
  controller.update
);

router.delete(
  "/:id",
  requirePermission("branches.delete"),
  validate({ params: idParamSchema }),
  auditLog(AuditAction.DELETE, "branches"),
  controller.remove
);

export default router;
