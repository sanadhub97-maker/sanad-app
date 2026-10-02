import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { notificationVisibility } from "@/lib/security";
import type { AuthContext } from "@/types/express";
import { paginationMeta, skipTake } from "@/utils/pagination";
import { getTrackableItems } from "@/services/expiringItems";
import { NOTIFICATION_TITLE, messageArFor, messageFor, subjectAr } from "@/jobs/expirationScan";
import type { z } from "zod";
import type { listNotificationsQuerySchema } from "@/modules/notifications/notifications.schemas";

type ListQuery = z.infer<typeof listNotificationsQuerySchema>;

export async function list(userId: string, query: ListQuery, auth: AuthContext) {
  const { page, pageSize, isRead, severity } = query;
  const where: Prisma.NotificationWhereInput = {
    userId,
    ...notificationVisibility(auth),
    ...(isRead !== undefined ? { isRead } : {}),
    ...(severity ? { severity } : {}),
  };

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(page, pageSize) }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false, ...notificationVisibility(auth) } }),
  ]);

  return { data: await withArabic(data), meta: paginationMeta(page, pageSize, total), unreadCount };
}

export async function markRead(userId: string, id: string, auth: AuthContext) {
  const notification = await prisma.notification.findFirst({ where: { id, userId, ...notificationVisibility(auth) } });
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

type Row = Awaited<ReturnType<typeof prisma.notification.findMany>>[number];

/** Notifications made before the Arabic text existed get it once, from the
 * document they are about (or their English label when it is gone), and it
 * is saved so this only happens the first time they are listed. */
async function withArabic(rows: Row[]): Promise<Row[]> {
  const arabic = /[؀-ۿ]/;
  // The " — " form is an early wording, redone in the sentence form. Company
  // documents' early messages gave only the establishment's name, in Arabic
  // even in the English text: both are redone from the document.
  const missing = rows.filter(
    (r) => !r.messageAr || / — [^ ]+( [^ ]+)?\.$/.test(r.messageAr) || (r.relatedType === "COMPANY_DOCUMENT" && arabic.test(r.message))
  );
  if (!missing.length) return rows;
  const items = await getTrackableItems().catch(() => []);
  const byRecord = new Map(items.map((i) => [`${i.sourceType}:${i.recordId}`, i]));
  const filled = new Map<string, { titleAr: string; messageAr: string; message?: string }>();
  for (const r of missing) {
    const days = /will expire in (\d+) day/.exec(r.message)?.[1];
    const english = r.message.replace(/ (has expired|will expire in \d+ days?)\.$/, "");
    const item = byRecord.get(`${r.relatedType}:${r.relatedId}`);
    const subject = item ? subjectAr(item) : english;
    const titleAr = r.title === NOTIFICATION_TITLE.en ? NOTIFICATION_TITLE.ar : r.title;
    const messageAr = messageArFor(subject, days ?? "expired");
    filled.set(r.id, { titleAr, messageAr, ...(item && arabic.test(r.message) ? { message: messageFor(item, days ?? "expired") } : {}) });
  }
  await Promise.all(
    [...filled].map(([id, data]) => prisma.notification.update({ where: { id }, data }).catch(() => undefined))
  );
  return rows.map((r) => (filled.has(r.id) ? { ...r, ...filled.get(r.id)! } : r));
}
