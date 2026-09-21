import { z } from "zod";
import { emptyToUndefined } from "@/utils/zodHelpers";

export const companySettingsSchema = z.object({
  nameAr: emptyToUndefined(z.string().max(150).optional()),
  nameEn: emptyToUndefined(z.string().max(150).optional()),
  logoFileId: emptyToUndefined(z.string().optional()),
  faviconFileId: emptyToUndefined(z.string().optional()),
  stampFileId: emptyToUndefined(z.string().optional()),
  signatureFileId: emptyToUndefined(z.string().optional()),
  crNumber: emptyToUndefined(z.string().max(50).optional()),
  vatNumber: emptyToUndefined(z.string().max(50).optional()),
  phone: emptyToUndefined(z.string().max(30).optional()),
  email: emptyToUndefined(z.string().email().optional()),
  website: emptyToUndefined(z.string().max(200).optional()),
  address: emptyToUndefined(z.string().max(255).optional()),
  city: emptyToUndefined(z.string().max(100).optional()),
  country: emptyToUndefined(z.string().max(100).optional()),
});

export const appearanceSettingsSchema = z.object({
  themeMode: z.enum(["light", "dark", "system"]),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  successColor: z.string(),
  warningColor: z.string(),
  dangerColor: z.string(),
  infoColor: z.string(),
  sidebarStyle: z.enum(["expanded", "collapsed"]),
  animationsEnabled: z.boolean(),
  compactMode: z.boolean(),
});

export const expirationRulesSchema = z.object({
  expiringSoonThresholdDays: z.number().int().min(1).max(365),
  notifyDaysBefore: z.array(z.number().int().min(0).max(365)).min(1),
});

export const emailSettingsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().max(200).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  secure: z.boolean().default(true),
  username: z.string().max(200).optional(),
  password: z.string().max(500).optional(), // omitted => keep existing secret
  fromName: z.string().max(150).optional(),
  fromEmail: z.string().email().optional().or(z.literal("")),
});

export const whatsappSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().max(100).optional(),
  apiUrl: z.string().max(300).optional(),
  apiKey: z.string().max(500).optional(), // omitted => keep existing secret
  phoneNumberId: z.string().max(100).optional(),
  businessAccountId: z.string().max(100).optional(),
});

export const testEmailSchema = z.object({ to: z.string().email() });
export const testWhatsappSchema = z.object({ to: z.string().min(6) });
