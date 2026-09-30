import { api } from "@/lib/api";

export type TaskCategory = "employees" | "documents" | "branches" | "payments" | "general";
export type TaskPriority = "URGENT" | "HIGH" | "NORMAL";

export interface DailyTask {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  time: string | null;
  notes: string | null;
  done: boolean;
  doneAt: string | null;
  carriedFrom: string | null;
  sourceKey: string | null;
  createdAt: string;
  assignee: { id: string; fullName: string } | null;
}

export interface WeekDay {
  date: string;
  total: number;
  done: number;
}

export interface TaskSuggestion {
  key: string;
  title: string;
  reason: string;
  category: TaskCategory;
  priority: TaskPriority;
  added: boolean;
}

export interface NewTask {
  date: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  assigneeId?: string | null;
  time?: string | null;
  notes?: string | null;
  sourceKey?: string | null;
}

export const tasksApi = {
  day: async (date: string) => (await api.get<{ data: DailyTask[] }>("/tasks", { params: { date } })).data.data,
  /** Every task from one day to another, and the unfinished ones left before today. */
  range: async (from: string, to: string, today: string) =>
    (await api.get<{ data: { tasks: DailyTask[]; overdue: number } }>("/tasks/range", { params: { from, to, today } })).data.data,
  week: async (date: string) => (await api.get<{ data: WeekDay[] }>("/tasks/week", { params: { date } })).data.data,
  assignees: async () => (await api.get<{ data: { id: string; fullName: string }[] }>("/tasks/assignees")).data.data,
  suggestions: async () => (await api.get<{ data: TaskSuggestion[] }>("/tasks/suggestions")).data.data,
  create: async (input: NewTask) => (await api.post<{ data: DailyTask }>("/tasks", input)).data.data,
  update: async (id: string, patch: Partial<Omit<NewTask, "sourceKey">> & { done?: boolean }) =>
    (await api.patch<{ data: DailyTask }>(`/tasks/${id}`, patch)).data.data,
  remove: async (id: string) => {
    await api.delete(`/tasks/${id}`);
  },
  carry: async (from: string, to: string) => (await api.post<{ data: { moved: number } }>("/tasks/carry", { from, to })).data.data,
};
