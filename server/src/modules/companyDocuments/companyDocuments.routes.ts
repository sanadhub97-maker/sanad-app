import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import { makeController } from "@/modules/companyDocuments/companyDocuments.controller";
import {
  createCompanyDocumentSchema,
  idParamSchema,
  listCompanyDocumentsQuerySchema,
  updateCompanyDocumentSchema,
} from "@/modules/companyDocuments/companyDocuments.schemas";

export function makeCompanyDocumentsRouter() {
  const router = Router();
  const controller = makeController();
  const p = (action: string) => `companyDocuments.${action}`;

  router.use(requireAuth);

  router.get("/", requirePermission(p("view")), validate({ query: listCompanyDocumentsQuerySchema }), controller.list);
  router.get("/category-counts", requirePermission(p("view")), controller.categoryCounts);
  router.get("/:id", requirePermission(p("view")), validate({ params: idParamSchema }), controller.getById);

  router.post(
    "/",
    requirePermission(p("create")),
    validate({ body: createCompanyDocumentSchema }),
    auditLog(AuditAction.CREATE, "companyDocuments"),
    controller.create
  );

  router.put(
    "/:id",
    requirePermission(p("edit")),
    validate({ params: idParamSchema, body: updateCompanyDocumentSchema }),
    auditLog(AuditAction.UPDATE, "companyDocuments"),
    controller.update
  );

  router.delete(
    "/:id",
    requirePermission(p("delete")),
    validate({ params: idParamSchema }),
    auditLog(AuditAction.DELETE, "companyDocuments"),
    controller.remove
  );

  return router;
}
