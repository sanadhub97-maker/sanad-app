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

export type PrintThemeId =
  | "classic" | "royal" | "emerald" | "executive" | "burgundy" | "sapphire" | "bronze"
  | "turquoise" | "slate" | "amethyst" | "olive" | "crimson"
  | "ledger" | "blueprint" | "mono" | "ribbon" | "mosaic" | "ocean" | "sadu" | "glass" | "gazette" | "prism";

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
export type WhatsappTemplateId = "classic" | "card" | "compact" | "priority" | "bilingual";
export type WhatsappPreviewState = "expired" | "week" | "month";
export interface WhatsappTemplateSettings {
  template: WhatsappTemplateId;
  /** False when the system has no documents yet and the previews use an example. */
  sampleIsReal: boolean;
  previews: Record<WhatsappTemplateId, Record<WhatsappPreviewState, string>>;
}

export type WhatsappCardId =
  | "pass" | "ios" | "bento" | "health" | "lock" | "letter"
  | "titanium" | "whitecard" | "ultra" | "vision" | "pearl";
export type WhatsappCardSetting = WhatsappCardId | "none";
export interface WhatsappCardsPreview {
  card: WhatsappCardSetting;
  /** Pictures go out only from a QR-linked number; other providers send the text design. */
  canSendCards: boolean;
  sampleIsReal: boolean;
  /** Stylesheet and markup of every card, rendered live in the preview. */
  css: string;
  cards: Record<WhatsappCardId, string>;
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
  getWhatsappCards: async (state: WhatsappPreviewState) =>
    (await api.get<{ data: WhatsappCardsPreview }>("/settings/whatsapp/cards", { params: { state } })).data.data,
  updateWhatsappCard: async (card: WhatsappCardSetting) =>
    (await api.put<{ data: { card: WhatsappCardSetting }; message: string }>("/settings/whatsapp/card", { card })).data,
  getWhatsappTemplate: async () =>
    (await api.get<{ data: WhatsappTemplateSettings }>("/settings/whatsapp/template")).data.data,
  updateWhatsappTemplate: async (template: WhatsappTemplateId) =>
    (await api.put<{ data: { template: WhatsappTemplateId }; message: string }>("/settings/whatsapp/template", { template })).data,
  getPrintTheme: async () => (await api.get<{ data: { theme: PrintThemeId } }>("/settings/print-theme")).data.data.theme,
  updatePrintTheme: async (theme: PrintThemeId) =>
    (await api.put<{ data: { theme: PrintThemeId }; message: string }>("/settings/print-theme", { theme })).data,
  getBranding: async () => (await api.get<{ data: CompanyBranding }>("/settings/branding")).data.data,
  getCompany: async () => (await api.get<{ data: CompanySettings }>("/settings/company")).data.data,
  updateCompany: async (input: CompanySettings) => (await api.put<{ data: CompanySettings; message: string }>("/settings/company", input)).data,

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
