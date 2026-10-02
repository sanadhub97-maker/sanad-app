import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import { upload } from "@/modules/files/files.upload";
import { validateUploadedFile } from "@/modules/files/files.validation";
import { uploadBudget, uploadLimiter } from "@/middleware/resourceLimits";
import * as controller from "@/modules/importExport/importExport.controller";
import { idParamSchema, importQuerySchema, listImportJobsQuerySchema } from "@/modules/importExport/importExport.schemas";

const router = Router();
router.use(requireAuth, requirePermission("employees.view"));

router.get("/employees/template", requirePermission("importExport.import"), controller.employeesTemplate);
router.post(
  "/employees/import",
  requirePermission("importExport.import"),
  requirePermission("employees.create"),
  requirePermission("employees.edit"),
  uploadLimiter,
  uploadBudget,
  upload.single("file"),
  validateUploadedFile,
  validate({ query: importQuerySchema }),
  auditLog(AuditAction.IMPORT, "employees"),
  controller.importEmployeesFile
);

router.get("/jobs", requirePermission("importExport.import"), validate({ query: listImportJobsQuerySchema }), controller.listJobs);
router.get("/jobs/:id", requirePermission("importExport.import"), validate({ params: idParamSchema }), controller.getJob);
router.get(
  "/jobs/:id/errors.xlsx",
  requirePermission("importExport.import"),
  validate({ params: idParamSchema }),
  controller.downloadJobErrors
);

export default router;
