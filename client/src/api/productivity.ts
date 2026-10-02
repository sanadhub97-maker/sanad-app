import { api } from "@/lib/api";
export interface LiveAlert { key: string; title: string; titleEn: string; due: string; severity: string; category: string; status: string; acknowledged: boolean; href: string }
export interface Quality { scanned: number; checkedAt: string; issues: { key: string; title: string; titleEn: string; severity: string; href: string; records: { id: string; name: string; href: string }[] }[] }
export interface Onboarding { total: number; page: number; rows: { id: string; name: string; nameEn: string | null; number: string; completed: number; total: number; steps: { key: string; title: string; titleEn: string; done: boolean; automatic: boolean }[] }[] }
export interface ScheduleInput { name: string; kind: string; frequency: string; time: string; weekday: number; monthday: number; language: string; enabled: boolean }
export interface Schedule extends ScheduleInput { id: string; runs: { id: string; status: string; error: string | null; createdAt: string }[] }
const get = async <T,>(path: string, params?: Record<string, unknown>) => (await api.get<{ data: T }>(`/productivity${path}`, { params })).data.data;
export const productivityApi = {
  alerts: () => get<LiveAlert[]>("/alerts"),
  acknowledge: (key: string, done: boolean) => api.post("/productivity/alerts/acknowledge", { key, done }),
  quality: () => get<Quality>("/quality"),
  onboarding: (q: string, page: number) => get<Onboarding>("/onboarding", { q, page }),
  setStep: (id: string, step: string, done: boolean) => api.put(`/productivity/onboarding/${id}`, { step, done }),
  bulk: (ids: string[], changes: Record<string, unknown>) => api.post<{ data: { count: number } }>("/productivity/employees/bulk", { ids, changes }),
  schedules: () => get<Schedule[]>("/schedules"),
  createSchedule: (input: ScheduleInput) => api.post("/productivity/schedules", input),
  toggleSchedule: (id: string, enabled: boolean) => api.patch(`/productivity/schedules/${id}`, { enabled }),
  runSchedule: (id: string) => api.post(`/productivity/schedules/${id}/run`, {}, { timeout: 180000 }),
};
