import { prisma } from "@/lib/prisma";
import { DEFAULT_EXPIRATION_RULES, ExpirationRules } from "@/services/expiration";
import { DEFAULT_PRINT_THEME, isPrintThemeId, type PrintThemeId } from "@/services/printThemes";
import { isDigestCardSetting, type DigestCardSetting } from "@/services/whatsappDigestCard";
import { isDailyTextId, type DailyTextId } from "@/services/dailyTextIds";
import { isPaymentTextId, type PaymentTextId } from "@/services/paymentTextIds";

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
  /** The metal of the royal design (client lib/gold-tone). */
  goldTone?: "royal" | "champagne" | "rose" | "bronze" | "platinum" | "emerald";
  /** The status colours replace the design's own only when the admin turns this on. */
  statusCustom?: boolean;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeMode: "light",
  // The "Oasis" design palette: the logo blue, soft surfaces, calm status colours.
  primaryColor: "#0A7FB5", // logo blue, deepened for white
  secondaryColor: "#F5F8F7", // soft surface
  accentColor: "#E0F0F8", // hover wash
  successColor: "#2E7D57",
  warningColor: "#B86E0B",
  dangerColor: "#BF3A3A",
  infoColor: "#0A7FB5",
  sidebarStyle: "expanded",
  animationsEnabled: true,
  compactMode: false,
  goldTone: "royal",
  statusCustom: false,
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

const WHATSAPP_DIGEST_CARD_KEY = "whatsapp.digestCard";

/** The picture of the morning summary (services/whatsappDigestCard); "none" sends the text only. */
export async function getWhatsappDigestCardSetting(): Promise<DigestCardSetting> {
  const { card } = await getSetting<{ card: string }>(WHATSAPP_DIGEST_CARD_KEY, { card: "noir" });
  return isDigestCardSetting(card) ? card : "noir";
}

export async function setWhatsappDigestCardSetting(card: DigestCardSetting) {
  await setSetting(WHATSAPP_DIGEST_CARD_KEY, { card });
  return card;
}

const WHATSAPP_PAYMENTS_FORMAT_KEY = "whatsapp.paymentsFormat";

/** The evening payments message: its picture design ("none" sends the text) and its text design. Text in the first design until chosen. */
export async function getWhatsappPaymentsFormat(): Promise<{ card: DigestCardSetting; text: PaymentTextId }> {
  const v = await getSetting<{ card: string; text: string }>(WHATSAPP_PAYMENTS_FORMAT_KEY, { card: "none", text: "receipt" });
  return { card: isDigestCardSetting(v.card) ? v.card : "none", text: isPaymentTextId(v.text) ? v.text : "receipt" };
}

export async function setWhatsappPaymentsFormat(value: { card: DigestCardSetting; text: PaymentTextId }) {
  await setSetting(WHATSAPP_PAYMENTS_FORMAT_KEY, value);
  return value;
}

const WHATSAPP_DAILY_TEXT_KEY = "whatsapp.dailyText";

/** The design of the morning summary sent as text (services/dailyText). */
export async function getWhatsappDailyTextSetting(): Promise<DailyTextId> {
  const { design } = await getSetting<{ design: string }>(WHATSAPP_DAILY_TEXT_KEY, { design: "report" });
  return isDailyTextId(design) ? design : "report";
}

export async function setWhatsappDailyTextSetting(design: DailyTextId) {
  await setSetting(WHATSAPP_DAILY_TEXT_KEY, { design });
  return design;
}

const WHATSAPP_SCHEDULE_KEY = "whatsapp.schedule";

export type WhatsappDispatchMode = "text_only" | "card_only" | "both";

export type AlertLanguage = "ar" | "en";

export interface WhatsappScheduleSetting {
  dispatchMode: WhatsappDispatchMode;
  /** The language of the WhatsApp and email alerts. */
  language: AlertLanguage;
  sendTime: string; // e.g. "09:00"
  timezone: string; // e.g. "Asia/Riyadh"
  lastRunAt?: string | null;
}

export const DEFAULT_WHATSAPP_SCHEDULE: WhatsappScheduleSetting = {
  dispatchMode: "both",
  language: "ar",
  sendTime: "09:00",
  timezone: "Asia/Riyadh",
  lastRunAt: null,
};

export function isWhatsappDispatchMode(val: unknown): val is WhatsappDispatchMode {
  return val === "text_only" || val === "card_only" || val === "both";
}

/** Configuration for alert delivery mode (text only, card only, or both) and daily scheduled send time. */
export async function getWhatsappScheduleSetting(): Promise<WhatsappScheduleSetting> {
  const data = await getSetting<WhatsappScheduleSetting>(WHATSAPP_SCHEDULE_KEY, DEFAULT_WHATSAPP_SCHEDULE);
  return {
    dispatchMode: isWhatsappDispatchMode(data.dispatchMode) ? data.dispatchMode : DEFAULT_WHATSAPP_SCHEDULE.dispatchMode,
    language: data.language === "en" ? "en" : "ar",
    sendTime: typeof data.sendTime === "string" && /^\d{2}:\d{2}$/.test(data.sendTime) ? data.sendTime : DEFAULT_WHATSAPP_SCHEDULE.sendTime,
    timezone: typeof data.timezone === "string" && data.timezone ? data.timezone : DEFAULT_WHATSAPP_SCHEDULE.timezone,
    lastRunAt: data.lastRunAt ?? null,
  };
}

export async function setWhatsappScheduleSetting(input: Partial<WhatsappScheduleSetting>): Promise<WhatsappScheduleSetting> {
  const current = await getWhatsappScheduleSetting();
  const updated: WhatsappScheduleSetting = {
    dispatchMode: input.dispatchMode && isWhatsappDispatchMode(input.dispatchMode) ? input.dispatchMode : current.dispatchMode,
    language: input.language === "en" || input.language === "ar" ? input.language : current.language,
    sendTime: input.sendTime && /^\d{2}:\d{2}$/.test(input.sendTime) ? input.sendTime : current.sendTime,
    timezone: input.timezone || current.timezone,
    lastRunAt: input.lastRunAt !== undefined ? input.lastRunAt : current.lastRunAt,
  };
  await setSetting(WHATSAPP_SCHEDULE_KEY, updated);
  return updated;
}

// Signature boxes and the seal at the end of every printed document
// (Settings → Print). Defaults are the texts the templates always had.
export interface SignatureBox {
  nameAr?: string;
  nameEn?: string;
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
export type SignatureDocument = "report" | "voucher" | "profile" | "certificate";
export interface PrintSignatures {
  showSignatures: boolean;
  showSeal: boolean;
  report: DocumentSignatures;
  voucher: DocumentSignatures;
  profile: DocumentSignatures;
  /** The experience and salary certificates. */
  certificate: DocumentSignatures;
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
  certificate: {
    boxes: [
      { ar: "مدير الموارد البشرية", en: "HR Manager" },
      { ar: "المدير العام", en: "General Manager" },
    ],
    sealAr: "مختوم ومعتمد",
    sealEn: "SEALED & APPROVED",
  },
};

const PRINT_SIGNATURES_KEY = "print.signatures";

export async function getPrintSignatures(): Promise<PrintSignatures> {
  const stored = await getSetting<PrintSignatures & { certificate?: DocumentSignatures }>(PRINT_SIGNATURES_KEY, { ...DEFAULT_PRINT_SIGNATURES, certificate: undefined as never });
  if (stored.certificate) return stored;
  // Certificates not set up yet: their two signers start with the employee profile's names and name images.
  const base = DEFAULT_PRINT_SIGNATURES.certificate;
  const from = stored.profile?.boxes ?? [];
  return {
    ...stored,
    certificate: { ...base, boxes: base.boxes.map((b, i) => ({ ...b, nameAr: from[i]?.nameAr, nameEn: from[i]?.nameEn, nameFileId: from[i]?.nameFileId ?? null })) },
  };
}

export function setPrintSignatures(value: PrintSignatures) {
  return setSetting(PRINT_SIGNATURES_KEY, value);
}

/** Any stored setting by key (for modules that keep their own, e.g. push). */
export const readSetting = getSetting;
export const writeSetting = setSetting;
