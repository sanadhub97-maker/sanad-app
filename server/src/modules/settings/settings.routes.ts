import { Router } from "express";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "@/modules/settings/settings.controller";
import {
  appearanceSettingsSchema,
  companySettingsSchema,
  emailSettingsSchema,
  expirationRulesSchema,
  testEmailSchema,
  testWhatsappSchema,
  whatsappSettingsSchema,
} from "@/modules/settings/settings.schemas";

const router = Router();
router.use(requireAuth);

router.get("/company", requirePermission("settings.view"), controller.getCompany);
router.put(
  "/company",
  requirePermission("settings.edit"),
  validate({ body: companySettingsSchema }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updateCompany
);

router.get("/appearance", requirePermission("settings.view"), controller.getAppearance);
router.put(
  "/appearance",
  requirePermission("settings.edit"),
  validate({ body: appearanceSettingsSchema }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updateAppearance
);

router.get("/expiration-rules", requirePermission("settings.view"), controller.getExpiration);
router.put(
  "/expiration-rules",
  requirePermission("settings.edit"),
  validate({ body: expirationRulesSchema }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updateExpiration
);

router.get("/email", requirePermission("settings.view"), controller.getEmail);
router.put(
  "/email",
  requirePermission("settings.edit"),
  validate({ body: emailSettingsSchema }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updateEmail
);
router.post("/email/test", requirePermission("settings.edit"), validate({ body: testEmailSchema }), controller.testEmail);

router.get("/whatsapp", requirePermission("settings.view"), controller.getWhatsapp);
router.put(
  "/whatsapp",
  requirePermission("settings.edit"),
  validate({ body: whatsappSettingsSchema }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updateWhatsapp
);
router.post("/whatsapp/test", requirePermission("settings.edit"), validate({ body: testWhatsappSchema }), controller.testWhatsapp);

export default router;
