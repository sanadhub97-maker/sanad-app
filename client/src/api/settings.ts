import { api } from "@/lib/api";

export interface CompanySettings {
  nameAr?: string | null;
  nameEn?: string | null;
  logoFileId?: string | null;
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

export const settingsApi = {
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
  getWhatsappRecipients: async () =>
    (await api.get<{ data: WhatsappRecipient[] }>("/settings/whatsapp/recipients")).data.data,
  updateWhatsappRecipients: async (recipients: WhatsappRecipientInput[]) =>
    (await api.put<{ data: WhatsappRecipient[] }>("/settings/whatsapp/recipients", { recipients })).data.data,
};

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
