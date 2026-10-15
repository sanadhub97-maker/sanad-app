import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "./certificates.controller";
import { experienceQuerySchema, salaryQuerySchema } from "./certificates.schemas";

// Letters printed for an employee: the experience certificate and the salary certificate. Nothing is stored; each print is audited.
const router = Router();
router.use(requireAuth);

router.get(
  "/experience/pdf",
  requirePermission("employees.export"),
  validate({ query: experienceQuerySchema }),
  auditLog(AuditAction.EXPORT, "employees", { description: () => "Printed an experience certificate" }),
  controller.experiencePdf
);
router.get(
  "/salary/pdf",
  requirePermission("employees.export"),
  validate({ query: salaryQuerySchema }),
  auditLog(AuditAction.EXPORT, "employees", { description: () => "Printed a salary certificate" }),
  controller.salaryPdf
);

export default router;
