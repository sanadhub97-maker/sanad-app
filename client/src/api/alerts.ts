import { api } from "@/lib/api";

export interface LiveAlert { key: string; title: string; titleEn: string; due: string; severity: string; category: string; status: string; acknowledged: boolean; href: string }

export const alertsApi = {
  list: async () => (await api.get<{ data: LiveAlert[] }>("/alerts")).data.data,
  acknowledge: (key: string, done: boolean) => api.post("/alerts/acknowledge", { key, done }),
};
