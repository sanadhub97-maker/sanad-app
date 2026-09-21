import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { paginationMeta, skipTake } from "@/utils/pagination";
import type { z } from "zod";
import type { listNotificationsQuerySchema } from "@/modules/notifications/notifications.schemas";

type ListQuery = z.infer<typeof listNotificationsQuerySchema>;

export async function list(userId: string, query: ListQuery) {
  const { page, pageSize, isRead, severity } = query;
  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(isRead !== undefined ? { isRead } : {}),
    ...(severity ? { severity } : {}),
  };

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(page, pageSize) }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { data, meta: paginationMeta(page, pageSize, total), unreadCount };
}

export async function markRead(userId: string, id: string) {
  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) throw ApiError.notFound("Notification not found");
  return prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
}

export async function remove(userId: string, id: string) {
  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) throw ApiError.notFound("Notification not found");
  await prisma.notification.delete({ where: { id } });
}
