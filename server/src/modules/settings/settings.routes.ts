import { Router } from "express";
import { z } from "zod";
import { PRINT_THEME_IDS } from "@/services/printThemes";
import { DIGEST_CARD_IDS } from "@/services/whatsappDigestCard";
import { DAILY_TEXT_IDS } from "@/services/dailyTextIds";
import { PAYMENT_TEXT_IDS } from "@/services/paymentTextIds";
import { AuditAction } from "@prisma/client";
import { requireAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { validate } from "@/middleware/validate";
import { auditLog } from "@/middleware/audit";
import * as controller from "@/modules/settings/settings.controller";
import { asyncHandler } from "@/utils/asyncHandler";
import { DEFAULT_DOMESTIC_PROFESSIONS, getDomesticProfessions, setDomesticProfessions } from "@/services/domesticInsurance";
import {
  appearanceSettingsSchema,
  companySettingsSchema,
  emailSettingsSchema,
  expirationRulesSchema,
  testEmailSchema,
  testWhatsappSchema,
  whatsappSettingsSchema,
  whatsappRecipientsSchema,
  whatsappScheduleSchema,
} from "@/modules/settings/settings.schemas";

const router = Router();
router.use(requireAuth);

// Domestic professions, whose medical insurance follows the iqama. Every signed-in
// user reads them (the employee form suggests them); changing them needs settings.edit.
router.get("/domestic-professions", asyncHandler(async (_req, res) => {
  res.json({ data: { professions: await getDomesticProfessions(), defaults: DEFAULT_DOMESTIC_PROFESSIONS } });
}));
router.put(
  "/domestic-professions",
  requirePermission("settings.edit"),
  validate({ body: z.object({ professions: z.array(z.string().trim().min(1).max(100)).max(100) }) }),
  auditLog(AuditAction.UPDATE, "settings", { description: () => "Updated the domestic professions" }),
  asyncHandler(async (req, res) => {
    res.json({ data: { professions: await setDomesticProfessions(req.body.professions) }, message: "Saved." });
  })
);

router.get("/branding", controller.getBranding);
router.get("/branding/mark", controller.getBrandingMark);
router.get("/company", requirePermission("settings.view"), controller.getCompany);
router.put(
  "/company",
  requirePermission("settings.edit"),
  validate({ body: companySettingsSchema }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updateCompany
);

// Every signed-in user's theme loads it (colors and toggles only); changing it still needs settings.edit.
router.get("/appearance", controller.getAppearance);
router.put(
  "/appearance",
  requirePermission("settings.edit"),
  validate({ body: appearanceSettingsSchema }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updateAppearance
);

router.get("/print-theme", requirePermission("settings.view"), controller.getPrintTheme);
const signatureBox = z.object({
  nameAr: z.string().trim().max(150).optional(),
  nameEn: z.string().trim().max(150).optional(),
  ar: z.string().trim().min(1).max(80),
  en: z.string().trim().max(80).default(""),
  nameFileId: z.string().min(1).nullable().optional(),
});
const documentSignatures = z.object({
  boxes: z.array(signatureBox).max(3),
  sealAr: z.string().trim().max(60).default(""),
  sealEn: z.string().trim().max(40).default(""),
});
router.get("/print-signatures", requirePermission("settings.view"), controller.getPrintSignaturesSettings);
router.put(
  "/print-signatures",
  requirePermission("settings.edit"),
  validate({
    body: z.object({
      signatures: z.object({
        showSignatures: z.boolean(),
        showSeal: z.boolean(),
        report: documentSignatures,
        voucher: documentSignatures,
        profile: documentSignatures,
        certificate: documentSignatures.optional(),
      }),
      stampFileId: z.string().min(1).nullable(),
      signatureFileId: z.string().min(1).nullable(),
    }),
  }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updatePrintSignaturesSettings
);
router.get("/print-theme/preview", requirePermission("settings.view"), controller.previewPrintTheme);
router.put(
  "/print-theme",
  requirePermission("settings.edit"),
  validate({ body: z.object({ theme: z.enum(PRINT_THEME_IDS) }) }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updatePrintTheme
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
router.get("/whatsapp/recipients", requirePermission("settings.view"), controller.getWhatsappRecipients);
router.put(
  "/whatsapp/recipients",
  requirePermission("settings.edit"),
  validate({ body: whatsappRecipientsSchema }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updateWhatsappRecipients
);
router.get("/whatsapp/web/status", requirePermission("settings.view"), controller.getWhatsappWebStatus);
router.get("/whatsapp/messages", requirePermission("settings.view"), controller.getWhatsappMessages);
router.get("/whatsapp/daily-preview", requirePermission("settings.view"), controller.getWhatsappDailyPreview);
router.put(
  "/whatsapp/daily-text",
  requirePermission("settings.edit"),
  validate({ body: z.object({ design: z.enum(DAILY_TEXT_IDS) }) }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updateWhatsappDailyText
);
router.get("/whatsapp/digest-cards", requirePermission("settings.view"), controller.getWhatsappDigestCards);
router.get("/whatsapp/payments-preview", requirePermission("settings.view"), controller.getWhatsappPaymentsPreview);
router.put(
  "/whatsapp/payments-format",
  requirePermission("settings.edit"),
  validate({ body: z.object({ card: z.enum(["none", ...DIGEST_CARD_IDS]), text: z.enum(PAYMENT_TEXT_IDS) }) }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updateWhatsappPaymentsFormat
);
router.put(
  "/whatsapp/digest-card",
  requirePermission("settings.edit"),
  validate({ body: z.object({ card: z.enum(["none", ...DIGEST_CARD_IDS]) }) }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updateWhatsappDigestCard
);
router.get("/whatsapp/schedule", requirePermission("settings.view"), controller.getWhatsappSchedule);
router.put(
  "/whatsapp/schedule",
  requirePermission("settings.edit"),
  validate({ body: whatsappScheduleSchema }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.updateWhatsappSchedule
);
router.post(
  "/whatsapp/run-scan",
  requirePermission("settings.edit"),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.runWhatsappScanNow
);
router.post(
  "/whatsapp/web/connect",
  requirePermission("settings.edit"),
  validate({ body: z.object({ phone: z.string().regex(/^\+?\d{8,15}$/, "Enter the number with its country code").optional() }).default({}) }),
  auditLog(AuditAction.UPDATE, "settings"),
  controller.connectWhatsappWeb
);
router.post("/whatsapp/web/logout", requirePermission("settings.edit"), auditLog(AuditAction.UPDATE, "settings"), controller.logoutWhatsappWeb);
router.post("/whatsapp/test", requirePermission("settings.edit"), validate({ body: testWhatsappSchema }), controller.testWhatsapp);

export default router;
