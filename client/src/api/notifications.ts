import { api } from "@/lib/api";
import type { NotificationItem, Paginated } from "@/types/models";

export const notificationsApi = {
  list: async (params: Record<string, unknown> = {}) => {
    const res = await api.get<Paginated<NotificationItem> & { unreadCount: number }>("/notifications", { params });
    return res.data;
  },
  markRead: async (id: string) => {
    await api.post(`/notifications/${id}/read`);
  },
  markAllRead: async () => {
    await api.post("/notifications/read-all");
  },
  remove: async (id: string) => {
    await api.delete(`/notifications/${id}`);
  },
};
