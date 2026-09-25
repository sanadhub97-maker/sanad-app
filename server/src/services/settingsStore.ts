import { prisma } from "@/lib/prisma";
import { DEFAULT_EXPIRATION_RULES, ExpirationRules } from "@/services/expiration";
import { DEFAULT_PRINT_THEME, isPrintThemeId, type PrintThemeId } from "@/services/printThemes";
import { DEFAULT_WHATSAPP_TEMPLATE, isWhatsappTemplateId, type WhatsappTemplateId } from "@/services/whatsappTemplates";

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

const EXPIRATION_SCAN_KEY = "jobs.expirationScan";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function hasExpirationScanRunToday(): Promise<boolean> {
  const { lastRunDate } = await getSetting<{ lastRunDate: string | null }>(EXPIRATION_SCAN_KEY, { lastRunDate: null });
  return lastRunDate === todayUtc();
}

export function markExpirationScanRun() {
  return setSetting(EXPIRATION_SCAN_KEY, { lastRunDate: todayUtc() });
}

export function setAppearanceSettings(value: AppearanceSettings) {
  return setSetting(APPEARANCE_KEY, value);
}

const PRINT_THEME_KEY = "print.theme";

/** The print design chosen in Settings → Print (see services/printThemes). */
export async function getPrintThemeSetting(): Promise<PrintThemeId> {
  const { theme } = await getSetting<{ theme: string }>(PRINT_THEME_KEY, { theme: DEFAULT_PRINT_THEME });
  return isPrintThemeId(theme) ? theme : DEFAULT_PRINT_THEME;
}

export async function setPrintThemeSetting(theme: PrintThemeId) {
  await setSetting(PRINT_THEME_KEY, { theme });
  return theme;
}

const WHATSAPP_TEMPLATE_KEY = "whatsapp.template";

/** The WhatsApp alert design chosen in Settings → WhatsApp (see services/whatsappTemplates). */
export async function getWhatsappTemplateSetting(): Promise<WhatsappTemplateId> {
  const { template } = await getSetting<{ template: string }>(WHATSAPP_TEMPLATE_KEY, { template: DEFAULT_WHATSAPP_TEMPLATE });
  return isWhatsappTemplateId(template) ? template : DEFAULT_WHATSAPP_TEMPLATE;
}

export async function setWhatsappTemplateSetting(template: WhatsappTemplateId) {
  await setSetting(WHATSAPP_TEMPLATE_KEY, { template });
  return template;
}

// Signature boxes and the seal at the end of every printed document
// (Settings → Print). Defaults are the texts the templates always had.
export interface SignatureBox {
  ar: string;
  en: string;
  /** An image printed on the box's name line (e.g. the signer's name plate). */
  nameFileId?: string | null;
}
export interface DocumentSignatures {
  boxes: SignatureBox[];
  sealAr: string;
  sealEn: string;
}
export type SignatureDocument = "report" | "voucher" | "profile";
export interface PrintSignatures {
  showSignatures: boolean;
  showSeal: boolean;
  report: DocumentSignatures;
  voucher: DocumentSignatures;
  profile: DocumentSignatures;
}

export const DEFAULT_PRINT_SIGNATURES: PrintSignatures = {
  showSignatures: true,
  showSeal: true,
  report: {
    boxes: [
      { ar: "إعداد التقرير وتدقيقه", en: "Prepared & Audited By" },
      { ar: "اعتماد الإدارة العامة", en: "Executive Management Approval" },
    ],
    sealAr: "ختم الرقابة\nوالاعتماد",
    sealEn: "OFFICIAL SEAL",
  },
  voucher: {
    boxes: [
      { ar: "المستلم / المفوض بالصرف", en: "Recipient / Authorized Receiver" },
      { ar: "المحاسب المالي", en: "Financial Accountant" },
      { ar: "الاعتماد المالي العام", en: "Financial Authorization" },
    ],
    sealAr: "الإدارة المالية\nمعتمد للصرف",
    sealEn: "FINANCIAL SEAL",
  },
  profile: {
    boxes: [
      { ar: "إعداد شؤون الموظفين", en: "HR Operations Specialist" },
      { ar: "اعتماد المدير العام", en: "General Manager Approval" },
    ],
    sealAr: "شؤون الموظفين\nمعتمد",
    sealEn: "HR DEPARTMENT",
  },
};

const PRINT_SIGNATURES_KEY = "print.signatures";

export function getPrintSignatures(): Promise<PrintSignatures> {
  return getSetting(PRINT_SIGNATURES_KEY, DEFAULT_PRINT_SIGNATURES);
}

export function setPrintSignatures(value: PrintSignatures) {
  return setSetting(PRINT_SIGNATURES_KEY, value);
}
