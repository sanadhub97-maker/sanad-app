import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { listRecipients, normalizePhone } from "@/services/whatsappRecipients";

// The feed behind Settings → WhatsApp → "live alerts": every WhatsApp message
// the system sends (expiration alerts and test messages) with its text,
// recipient and delivery result, read from NotificationLog.

export type WhatsappLogKind = "ALERT" | "TEST";

/** Records a message that doesn't go through the expiration scan's dedupe
 * (e.g. a test message from Settings). */
export async function recordWhatsappMessage(input: {
  to: string;
  message: string;
  sent: boolean;
  error?: string | null;
  kind: WhatsappLogKind;
}) {
  await prisma.notificationLog.create({
    data: {
      dedupeKey: `${input.kind.toLowerCase()}:${randomUUID()}`,
      channel: "WHATSAPP",
      templateCode: input.kind,
      recipient: normalizePhone(input.to),
      message: input.message,
      status: input.sent ? "SENT" : "FAILED",
      errorMessage: input.sent ? null : input.error ?? null,
      sentAt: input.sent ? new Date() : null,
    },
  });
}

export async function listWhatsappMessages(opts: { limit: number; status?: "SENT" | "FAILED" }) {
  const [rows, recipients, sentToday, failedToday, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where: { channel: "WHATSAPP", ...(opts.status ? { status: opts.status } : {}) },
      orderBy: { createdAt: "desc" },
      take: opts.limit,
    }),
    listRecipients(),
    countSince("SENT"),
    countSince("FAILED"),
    prisma.notificationLog.count({ where: { channel: "WHATSAPP" } }),
  ]);
  const nameByPhone = new Map(recipients.map((r) => [normalizePhone(r.phone), r.name]));

  const items = rows.map((r) => {
    // Rows from before the recipient was stored carry it in the dedupe key
    // ("<item>:<threshold>:WHATSAPP:<phone>").
    const to = r.recipient ?? r.dedupeKey.split(":WHATSAPP:")[1] ?? null;
    return {
      id: r.id,
      to,
      name: to ? nameByPhone.get(normalizePhone(to)) || null : null,
      message: r.message,
      status: r.status,
      error: r.errorMessage,
      kind: (r.templateCode === "TEST" ? "TEST" : "ALERT") as WhatsappLogKind,
      at: (r.sentAt ?? r.createdAt).toISOString(),
    };
  });
  return { items, stats: { sentToday, failedToday, total } };
}

/** Messages with this status since midnight Riyadh time. */
function countSince(status: "SENT" | "FAILED") {
  const riyadhMidnight = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date())}T00:00:00+03:00`);
  return prisma.notificationLog.count({ where: { channel: "WHATSAPP", status, createdAt: { gte: riyadhMidnight } } });
}
