import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "@/modules/employees/employees.controller";
import { createEmployeeSchema, idParamSchema, listEmployeesQuerySchema, updateEmployeeSchema } from "@/modules/employees/employees.schemas";
import employeeDocumentsRoutes from "@/modules/employeeDocuments/employeeDocuments.routes";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("employees.view"), validate({ query: listEmployeesQuerySchema }), controller.list);
router.get("/next-number", requirePermission("employees.view"), controller.getNextNumber);
router.get("/:id", requirePermission("employees.view"), validate({ params: idParamSchema }), controller.getById);
router.get("/:id/pdf", requirePermission("employees.view"), validate({ params: idParamSchema }), controller.exportPdf);

router.post(
  "/",
  requirePermission("employees.create"),
  validate({ body: createEmployeeSchema }),
  auditLog(AuditAction.CREATE, "employees"),
  controller.create
);

router.put(
  "/:id",
  requirePermission("employees.edit"),
  validate({ params: idParamSchema, body: updateEmployeeSchema }),
  auditLog(AuditAction.UPDATE, "employees"),
  controller.update
);

router.delete(
  "/:id",
  requirePermission("employees.delete"),
  validate({ params: idParamSchema }),
  auditLog(AuditAction.DELETE, "employees"),
  controller.remove
);

router.use("/:employeeId/documents", employeeDocumentsRoutes);

export default router;
