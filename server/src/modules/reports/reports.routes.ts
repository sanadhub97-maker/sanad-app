import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import * as controller from "@/modules/reports/reports.controller";
import {
  activityReportQuerySchema,
  documentsReportQuerySchema,
  employeeReportQuerySchema,
  paymentsReportQuerySchema,
} from "@/modules/reports/reports.schemas";

const router = Router();
router.use(requireAuth, requirePermission("reports.view"));

router.get("/employees", validate({ query: employeeReportQuerySchema }), controller.employees);
router.get("/documents", validate({ query: documentsReportQuerySchema }), controller.documents);
router.get("/payments", validate({ query: paymentsReportQuerySchema }), controller.payments);
router.get("/activity", requirePermission("auditLogs.view"), validate({ query: activityReportQuerySchema }), controller.activity);

export default router;
