import { api } from "@/lib/api";

export interface CompanySettings {
  nameAr?: string | null;
  nameEn?: string | null;
  logoFileId?: string | null;
  logoDarkFileId?: string | null;
  printLogoFileId?: string | null;
  faviconFileId?: string | null;
  stampFileId?: string | null;
  signatureFileId?: string | null;
  crNumber?: string | null;
  vatNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}

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
  goldTone?: "royal" | "champagne" | "rose" | "bronze" | "platinum" | "emerald";
  statusCustom?: boolean;
}

export interface ExpirationRules {
  expiringSoonThresholdDays: number;
  notifyDaysBefore: number[];
}

export interface EmailSettingsView {
  enabled: boolean;
  host?: string | null;
  port?: number | null;
  secure?: boolean;
  username?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  hasPassword?: boolean;
}

export interface WhatsappSettingsView {
  enabled: boolean;
  provider?: string | null;
  apiUrl?: string | null;
  phoneNumberId?: string | null;
  businessAccountId?: string | null;
  hasApiKey?: boolean;
}

// PUT bodies add back the plaintext secret fields the GET views omit.
export interface EmailSettingsInput extends Omit<EmailSettingsView, "hasPassword"> {
  password?: string;
}
export interface WhatsappSettingsInput extends Omit<WhatsappSettingsView, "hasApiKey"> {
  apiKey?: string;
}

export interface CompanyBranding {
  nameAr: string | null;
  nameEn: string | null;
  logoFileId: string | null;
  logoDarkFileId: string | null;
}

export interface SignatureBox {
  nameAr?: string;
  nameEn?: string;
  ar: string;
  en: string;
  /** Image printed on the box's name line. */
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
export interface PrintSignaturesSettings {
  signatures: PrintSignatures;
  stampFileId: string | null;
  signatureFileId: string | null;
}

export type PrintThemeId = "malaki" | "zumurrudi" | "aqiq";

export interface WhatsappMessageItem {
  id: string;
  to: string | null;
  name: string | null;
  message: string | null;
  status: "SENT" | "FAILED" | "PENDING";
  error: string | null;
  kind: "ALERT" | "TEST";
  at: string;
}
export type DigestCardSetting = "noir" | "ivory" | "emerald" | "sapphire" | "none";
export interface WhatsappDigestCards {
  card: DigestCardSetting;
  canSendCards: boolean;
  width: number;
  caption: string;
  /** Each design as a whole page, drawn on today's documents and open tasks. */
  cards: Record<Exclude<DigestCardSetting, "none">, string>;
}
export type DailyTextId = "report" | "grouped" | "cards" | "brief" | "letter" | "executive" | "dashboard" | "timeline";
export interface WhatsappDailyPreview {
  /** The text design in use, and each design's messages exactly as they go out. */
  design: DailyTextId;
  designs: Record<DailyTextId, string[]>;
  messages: string[];
  documents: number;
  tasks: number;
  language: "ar" | "en";
  generatedAt: string;
}
export type WhatsappDispatchMode = "text_only" | "card_only" | "both";

export interface WhatsappScheduleSettings {
  dispatchMode: WhatsappDispatchMode;
  /** The language of WhatsApp and email alerts. */
  language?: "ar" | "en";
  sendTime: string; // "09:00"
  timezone: string; // "Asia/Riyadh"
  lastRunAt?: string | null;
}

export interface WhatsappMessagesFeed {
  items: WhatsappMessageItem[];
  stats: { sentToday: number; failedToday: number; total: number };
}

export const settingsApi = {
  getWhatsappMessages: async (status?: "SENT" | "FAILED") =>
    (await api.get<{ data: WhatsappMessagesFeed }>("/settings/whatsapp/messages", { params: { limit: 40, status } })).data.data,
  getPrintSignatures: async () =>
    (await api.get<{ data: PrintSignaturesSettings }>("/settings/print-signatures")).data.data,
  updatePrintSignatures: async (input: PrintSignaturesSettings) =>
    (await api.put<{ data: PrintSignaturesSettings; message: string }>("/settings/print-signatures", input)).data,
  getWhatsappDigestCards: async () =>
    (await api.get<{ data: WhatsappDigestCards }>("/settings/whatsapp/digest-cards")).data.data,
  updateWhatsappDigestCard: async (card: DigestCardSetting) =>
    (await api.put<{ data: { card: DigestCardSetting }; message: string }>("/settings/whatsapp/digest-card", { card })).data,
  updateWhatsappDailyText: async (design: DailyTextId) =>
    (await api.put<{ data: { design: DailyTextId }; message: string }>("/settings/whatsapp/daily-text", { design })).data,
  getWhatsappDailyPreview: async () =>
    (await api.get<{ data: WhatsappDailyPreview }>("/settings/whatsapp/daily-preview")).data.data,
  getWhatsappSchedule: async () =>
    (await api.get<{ data: WhatsappScheduleSettings }>("/settings/whatsapp/schedule")).data.data,
  updateWhatsappSchedule: async (input: Partial<WhatsappScheduleSettings>) =>
    (await api.put<{ data: WhatsappScheduleSettings; message: string }>("/settings/whatsapp/schedule", input)).data,
  runExpirationScanNow: async () =>
    (await api.post<{ data: { dueCount: number }; message: string }>("/settings/whatsapp/run-scan")).data,
  getPrintTheme: async () => (await api.get<{ data: { theme: PrintThemeId } }>("/settings/print-theme")).data.data.theme,
  updatePrintTheme: async (theme: PrintThemeId) =>
    (await api.put<{ data: { theme: PrintThemeId }; message: string }>("/settings/print-theme", { theme })).data,
  getBranding: async () => (await api.get<{ data: CompanyBranding }>("/settings/branding")).data.data,
  getBrandingMark: async () => (await api.get<{ data: { mark: string | null } }>("/settings/branding/mark")).data.data.mark,
  getCompany: async () => (await api.get<{ data: CompanySettings }>("/settings/company")).data.data,
  updateCompany: async (input: CompanySettings) => (await api.put<{ data: CompanySettings; message: string }>("/settings/company", input)).data,

  /** Domestic professions: their medical insurance follows the iqama. */
  getDomesticProfessions: async () => (await api.get<{ data: { professions: string[]; defaults: string[] } }>("/settings/domestic-professions")).data.data,
  saveDomesticProfessions: async (professions: string[]) => (await api.put<{ data: { professions: string[] } }>("/settings/domestic-professions", { professions })).data.data,
  getAppearance: async () => (await api.get<{ data: AppearanceSettings }>("/settings/appearance")).data.data,
  updateAppearance: async (input: AppearanceSettings) =>
    (await api.put<{ data: AppearanceSettings; message: string }>("/settings/appearance", input)).data,

  getExpirationRules: async () => (await api.get<{ data: ExpirationRules }>("/settings/expiration-rules")).data.data,
  updateExpirationRules: async (input: ExpirationRules) =>
    (await api.put<{ data: ExpirationRules; message: string }>("/settings/expiration-rules", input)).data,

  getEmail: async () => (await api.get<{ data: EmailSettingsView }>("/settings/email")).data.data,
  updateEmail: async (input: EmailSettingsInput) => (await api.put("/settings/email", input)).data,
  testEmail: async (to: string) => (await api.post<{ message: string }>("/settings/email/test", { to })).data,

  getWhatsapp: async () => (await api.get<{ data: WhatsappSettingsView }>("/settings/whatsapp")).data.data,
  updateWhatsapp: async (input: WhatsappSettingsInput) => (await api.put("/settings/whatsapp", input)).data,
  testWhatsapp: async (to: string) => (await api.post<{ message: string }>("/settings/whatsapp/test", { to })).data,
  getWhatsappWebStatus: async () => (await api.get<{ data: WhatsappWebStatus }>("/settings/whatsapp/web/status")).data.data,
  connectWhatsappWeb: async (phone?: string) =>
    (await api.post<{ data: WhatsappWebStatus }>("/settings/whatsapp/web/connect", phone ? { phone } : {})).data.data,
  logoutWhatsappWeb: async () => (await api.post<{ data: WhatsappWebStatus }>("/settings/whatsapp/web/logout")).data.data,
  getWhatsappRecipients: async () =>
    (await api.get<{ data: WhatsappRecipient[] }>("/settings/whatsapp/recipients")).data.data,
  updateWhatsappRecipients: async (recipients: WhatsappRecipientInput[]) =>
    (await api.put<{ data: WhatsappRecipient[] }>("/settings/whatsapp/recipients", { recipients })).data.data,
};

export interface WhatsappWebStatus {
  status: "disconnected" | "connecting" | "qr" | "pairing" | "finishing" | "connected";
  qr: string | null;
  /** 8-character code to type on the phone when linking by number. */
  pairingCode: string | null;
  phone: string | null;
  lastError: string | null;
}

export interface WhatsappRecipient {
  id: string;
  name: string;
  phone: string;
  enabled: boolean;
  hasApiKey: boolean;
}

export interface WhatsappRecipientInput {
  id?: string;
  name: string;
  phone: string;
  enabled: boolean;
  apiKey?: string;
}
