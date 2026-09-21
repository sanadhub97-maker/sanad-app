import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import {
  DEFAULT_APPEARANCE,
  getAppearanceSettings,
  setAppearanceSettings,
  getExpirationRules,
  setExpirationRules,
} from "@/services/settingsStore";
import { DEFAULT_EXPIRATION_RULES } from "@/services/expiration";
import type { z } from "zod";
import type {
  appearanceSettingsSchema,
  companySettingsSchema,
  emailSettingsSchema,
  expirationRulesSchema,
  whatsappSettingsSchema,
} from "@/modules/settings/settings.schemas";

export async function getCompanySettings() {
  const row = await prisma.companySettings.findUnique({ where: { id: 1 } });
  return row ?? { id: 1, nameAr: null, nameEn: null };
}

export async function updateCompanySettings(input: z.infer<typeof companySettingsSchema>) {
  const data = { ...input, email: input.email || undefined };
  return prisma.companySettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
}

export function getAppearance() {
  return getAppearanceSettings();
}

export function updateAppearance(input: z.infer<typeof appearanceSettingsSchema>) {
  return setAppearanceSettings({ ...DEFAULT_APPEARANCE, ...input });
}

export function getExpiration() {
  return getExpirationRules();
}

export function updateExpiration(input: z.infer<typeof expirationRulesSchema>) {
  return setExpirationRules({ ...DEFAULT_EXPIRATION_RULES, ...input });
}

export async function getEmailSettings() {
  const row = await prisma.emailSettings.findUnique({ where: { id: 1 } });
  if (!row) return { enabled: false };
  const { passwordEncrypted, ...safe } = row;
  return { ...safe, hasPassword: Boolean(passwordEncrypted) };
}

export async function updateEmailSettings(input: z.infer<typeof emailSettingsSchema>) {
  const existing = await prisma.emailSettings.findUnique({ where: { id: 1 } });
  const passwordEncrypted = input.password ? encryptSecret(input.password) : existing?.passwordEncrypted;

  const row = await prisma.emailSettings.upsert({
    where: { id: 1 },
    update: {
      enabled: input.enabled,
      host: input.host,
      port: input.port,
      secure: input.secure,
      username: input.username,
      passwordEncrypted,
      fromName: input.fromName,
      fromEmail: input.fromEmail || undefined,
    },
    create: {
      id: 1,
      enabled: input.enabled,
      host: input.host,
      port: input.port,
      secure: input.secure,
      username: input.username,
      passwordEncrypted,
      fromName: input.fromName,
      fromEmail: input.fromEmail || undefined,
    },
  });

  const { passwordEncrypted: _omit, ...safe } = row;
  return { ...safe, hasPassword: Boolean(row.passwordEncrypted) };
}

export async function getWhatsappSettings() {
  const row = await prisma.whatsappSettings.findUnique({ where: { id: 1 } });
  if (!row) return { enabled: false };
  const { apiKeyEncrypted, ...safe } = row;
  return { ...safe, hasApiKey: Boolean(apiKeyEncrypted) };
}

export async function updateWhatsappSettings(input: z.infer<typeof whatsappSettingsSchema>) {
  const existing = await prisma.whatsappSettings.findUnique({ where: { id: 1 } });
  const apiKeyEncrypted = input.apiKey ? encryptSecret(input.apiKey) : existing?.apiKeyEncrypted;

  const row = await prisma.whatsappSettings.upsert({
    where: { id: 1 },
    update: {
      enabled: input.enabled,
      provider: input.provider,
      apiUrl: input.apiUrl,
      apiKeyEncrypted,
      phoneNumberId: input.phoneNumberId,
      businessAccountId: input.businessAccountId,
    },
    create: {
      id: 1,
      enabled: input.enabled,
      provider: input.provider,
      apiUrl: input.apiUrl,
      apiKeyEncrypted,
      phoneNumberId: input.phoneNumberId,
      businessAccountId: input.businessAccountId,
    },
  });

  const { apiKeyEncrypted: _omit, ...safe } = row;
  return { ...safe, hasApiKey: Boolean(row.apiKeyEncrypted) };
}
