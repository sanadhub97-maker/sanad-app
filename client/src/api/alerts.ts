import { api } from "@/lib/api";

export interface LiveAlert { key: string; title: string; titleEn: string; due: string; severity: string; category: string; status: string; acknowledged: boolean; href: string }

export const alertsApi = {
  list: async () => (await api.get<{ data: LiveAlert[] }>("/alerts")).data.data,
  acknowledge: (key: string, done: boolean) => api.post("/alerts/acknowledge", { key, done }),
};

export type RibbonCat = "expired" | "soon" | "tasks" | "violations" | "tax";
export interface AlertsRibbonSettings {
  enabled: boolean;
  speed: number;
  direction: "rtl" | "ltr";
  skin: "black" | "ivory" | "emerald";
  height: "compact" | "regular" | "large";
  fontSize: number;
  chips: "pill" | "plain";
  categories: Record<RibbonCat, boolean>;
  maxItems: number;
  pauseOnHover: boolean;
  showCount: boolean;
  showDue: boolean;
  showAllClear: boolean;
}
export interface RibbonItem { key: string; cat: RibbonCat; title: string; date: string; days: number; time?: string | null; href: string }

export const ribbonApi = {
  get: async () => (await api.get<{ data: { settings: AlertsRibbonSettings; items: RibbonItem[] } }>("/alerts/ribbon")).data.data,
  getSettings: async () => (await api.get<{ data: AlertsRibbonSettings }>("/settings/alerts-ribbon")).data.data,
  saveSettings: async (input: AlertsRibbonSettings) => (await api.put<{ data: AlertsRibbonSettings; message: string }>("/settings/alerts-ribbon", input)).data,
};
