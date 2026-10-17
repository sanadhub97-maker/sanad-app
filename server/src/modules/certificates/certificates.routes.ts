import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "./certificates.controller";
import {
  experienceQuerySchema,
  idParamSchema,
  listSavedCertificatesSchema,
  salaryQuerySchema,
  saveExperienceSchema,
  saveSalarySchema,
} from "./certificates.schemas";

const router = Router();
router.use(requireAuth);

router.get("/signers", controller.signersInfo);
router.get("/", validate({ query: listSavedCertificatesSchema }), controller.listSaved);

router.post(
  "/experience",
  validate({ body: saveExperienceSchema }),
  auditLog(AuditAction.CREATE, "employees", { description: () => "Saved an experience certificate" }),
  controller.createExperience
);
router.put(
  "/experience/:id",
  validate({ params: idParamSchema, body: saveExperienceSchema }),
  auditLog(AuditAction.UPDATE, "employees", { description: () => "Updated an experience certificate" }),
  controller.updateExperience
);

router.post(
  "/salary",
  validate({ body: saveSalarySchema }),
  auditLog(AuditAction.CREATE, "employees", { description: () => "Saved a salary certificate" }),
  controller.createSalary
);
router.put(
  "/salary/:id",
  validate({ params: idParamSchema, body: saveSalarySchema }),
  auditLog(AuditAction.UPDATE, "employees", { description: () => "Updated a salary certificate" }),
  controller.updateSalary
);

router.delete(
  "/:id",
  validate({ params: idParamSchema }),
  auditLog(AuditAction.DELETE, "employees", { description: () => "Deleted a saved certificate" }),
  controller.removeSaved
);

router.get(
  "/experience/pdf",
  validate({ query: experienceQuerySchema }),
  auditLog(AuditAction.EXPORT, "employees", { description: () => "Printed an experience certificate" }),
  controller.experiencePdf
);
router.get(
  "/salary/pdf",
  validate({ query: salaryQuerySchema }),
  auditLog(AuditAction.EXPORT, "employees", { description: () => "Printed a salary certificate" }),
  controller.salaryPdf
);

export default router;
