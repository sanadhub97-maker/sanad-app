import { prisma } from "@/lib/prisma";
import { DEFAULT_EXPIRATION_RULES, ExpirationRules } from "@/services/expiration";

const EXPIRATION_RULES_KEY = "expirationRules";

export interface AppearanceSettings {
  themeMode: "light" | "dark" | "system";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  infoColor: string;
  sidebarStyle: "expanded" | "collapsed";
  animationsEnabled: boolean;
  compactMode: boolean;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeMode: "system",
  primaryColor: "#0B1F3A", // dark navy
  secondaryColor: "#1E3A8A", // royal blue
  accentColor: "#2563EB", // blue
  successColor: "#16A34A",
  warningColor: "#F59E0B",
  dangerColor: "#DC2626",
  infoColor: "#0EA5E9",
  sidebarStyle: "expanded",
  animationsEnabled: true,
  compactMode: false,
};

const APPEARANCE_KEY = "appearance";

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  return { ...fallback, ...(row.value as object) } as T;
}

async function setSetting<T extends object>(key: string, value: T): Promise<T> {
  await prisma.setting.upsert({
    where: { key },
    update: { value: value as never },
    create: { key, value: value as never },
  });
  return value;
}

export function getExpirationRules(): Promise<ExpirationRules> {
  return getSetting(EXPIRATION_RULES_KEY, DEFAULT_EXPIRATION_RULES);
}

export function setExpirationRules(rules: ExpirationRules) {
  return setSetting(EXPIRATION_RULES_KEY, rules);
}

export function getAppearanceSettings(): Promise<AppearanceSettings> {
  return getSetting(APPEARANCE_KEY, DEFAULT_APPEARANCE);
}

export function setAppearanceSettings(value: AppearanceSettings) {
  return setSetting(APPEARANCE_KEY, value);
}
