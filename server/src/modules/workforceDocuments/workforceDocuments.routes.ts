import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "@/modules/workforceDocuments/workforceDocuments.controller";
import {
  listWorkforceQuerySchema,
  createWorkforceDocSchema,
  updateWorkforceDocSchema,
  idParamSchema,
} from "@/modules/workforceDocuments/workforceDocuments.schemas";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("employees.view"), validate({ query: listWorkforceQuerySchema }), controller.listAllDocuments);
router.get("/category-counts", requirePermission("employees.view"), controller.getCategoryCounts);
router.get("/iqamas", requirePermission("employees.view"), validate({ query: listWorkforceQuerySchema }), controller.getIqamas);
router.get("/passports", requirePermission("employees.view"), validate({ query: listWorkforceQuerySchema }), controller.getPassports);
router.get("/health-certificates", requirePermission("employees.view"), validate({ query: listWorkforceQuerySchema }), controller.getHealthCertificates);
router.get("/medical-insurance", requirePermission("employees.view"), validate({ query: listWorkforceQuerySchema }), controller.getMedicalInsurance);
router.get("/visas", requirePermission("employees.view"), validate({ query: listWorkforceQuerySchema }), controller.getVisas);
router.get("/flight-tickets", requirePermission("employees.view"), validate({ query: listWorkforceQuerySchema }), controller.getFlightTickets);
router.get("/overview-stats", requirePermission("employees.view"), controller.getOverviewStats);

router.post(
  "/",
  requirePermission("employeeDocuments.create"),
  validate({ body: createWorkforceDocSchema }),
  auditLog(AuditAction.CREATE, "employeeDocuments"),
  controller.createDoc
);

router.put(
  "/:id",
  requirePermission("employeeDocuments.edit"),
  validate({ params: idParamSchema, body: updateWorkforceDocSchema }),
  auditLog(AuditAction.UPDATE, "employeeDocuments"),
  controller.updateDoc
);

router.delete(
  "/:id",
  requirePermission("employeeDocuments.delete"),
  validate({ params: idParamSchema }),
  auditLog(AuditAction.DELETE, "employeeDocuments"),
  controller.removeDoc
);

export default router;

