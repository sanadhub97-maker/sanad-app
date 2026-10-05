import { taxReportQuerySchema, violationReportQuerySchema } from "./reports.schemas";
import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { hasPermission } from "@/lib/security";
import { ApiError } from "@/utils/apiError";
import * as controller from "@/modules/reports/reports.controller";
import {
  activityReportQuerySchema,
  documentsReportQuerySchema,
  employeeReportQuerySchema,
  paymentsReportQuerySchema,
} from "@/modules/reports/reports.schemas";

const router = Router();
router.use(requireAuth, requirePermission("reports.view"));
router.get("/summary", controller.summary);
router.use((req, _res, next) => {
  if (req.query.format && req.query.format !== "json" && !hasPermission(req.auth, "reports.export")) return next(ApiError.forbidden("Report export permission is required."));
  next();
});

router.get("/employees", requirePermission("employees.view"), validate({ query: employeeReportQuerySchema }), controller.employees);
router.get("/documents", requirePermission("employees.view", "employeeDocuments.view", "companyDocuments.view"), validate({ query: documentsReportQuerySchema }), controller.documents);
router.get("/payments", requirePermission("payments.view"), validate({ query: paymentsReportQuerySchema }), controller.payments);
router.get("/activity", requirePermission("auditLogs.view"), validate({ query: activityReportQuerySchema }), controller.activity);

router.get("/tax-declarations", requirePermission("taxReturns.view"), validate({ query: taxReportQuerySchema }), controller.taxDeclarations);
router.get("/violations", requirePermission("violations.view"), validate({ query: violationReportQuerySchema }), controller.violationReport);

export default router;
