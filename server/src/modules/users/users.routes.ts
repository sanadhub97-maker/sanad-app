import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "@/modules/users/users.controller";
import { createUserSchema, idParamSchema, listUsersQuerySchema, updateUserSchema } from "@/modules/users/users.schemas";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("users.view"), validate({ query: listUsersQuerySchema }), controller.list);
router.get("/:id", requirePermission("users.view"), validate({ params: idParamSchema }), controller.getById);

router.post(
  "/",
  requirePermission("users.create"),
  validate({ body: createUserSchema }),
  auditLog(AuditAction.CREATE, "users"),
  controller.create
);

router.put(
  "/:id",
  requirePermission("users.edit"),
  validate({ params: idParamSchema, body: updateUserSchema }),
  auditLog(AuditAction.UPDATE, "users"),
  controller.update
);

router.delete(
  "/:id",
  requirePermission("users.delete"),
  validate({ params: idParamSchema }),
  auditLog(AuditAction.DELETE, "users"),
  controller.remove
);

export default router;
