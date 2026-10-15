import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendWhatsapp } from "@/services/whatsapp";
import { normalizePhone } from "@/services/whatsappRecipients";
import type { TrackableItem } from "@/services/expiringItems";

export type DigestEntry = { item: TrackableItem; dedupeBase: string; text: string };
export function whatsappEligible(item: TrackableItem) {
  return item.sourceType === "COMPANY_DOCUMENT" || item.sourceType === "VEHICLE" || item.onSponsorship === true;
}

/** Keep whole entries together and leave room below provider text limits. */
export function digestParts(entries: DigestEntry[], header: string, bullet = "• ") {
  const parts: { text: string; entries: DigestEntry[] }[] = [];
  for (const entry of entries) {
    const line = `${bullet}${entry.text.slice(0, 2400)}`;
    let part = parts[parts.length - 1];
    if (!part || part.text.length + line.length + 2 > 3500) {
      part = { text: header.slice(0, 400), entries: [] };
      parts.push(part);
    }
    part.text += `\n\n${line}`;
    part.entries.push(entry);
  }
  return parts;
}

export async function sendWhatsappDigests(groups: Map<string, DigestEntry[]>, header: string) {
  // Normalize before dedupe so equivalent recipient formatting cannot double-send.
  const normalized = new Map<string, Map<string, DigestEntry>>();
  for (const [phone, entries] of groups) {
    const key = normalizePhone(phone);
    if (!key) continue;
    const unique = normalized.get(key) ?? new Map<string, DigestEntry>();
    for (const entry of entries) if (whatsappEligible(entry.item)) unique.set(entry.dedupeBase, entry);
    normalized.set(key, unique);
  }
  for (const [phone, unique] of normalized) {
    const entries = [...unique.values()].sort((a, b) => a.dedupeBase.localeCompare(b.dedupeBase));
    const keys = entries.map(e => `${e.dedupeBase}:WHATSAPP:${phone}`);
    if (!keys.length) continue;
    const delivered = new Set((await prisma.notificationLog.findMany({
      where: { dedupeKey: { in: keys }, status: "SENT" }, select: { dedupeKey: true },
    })).map(row => row.dedupeKey));
    const pending = entries.filter(e => !delivered.has(`${e.dedupeBase}:WHATSAPP:${phone}`));
    for (const part of digestParts(pending, header)) {
      const hash = createHash("sha256").update(JSON.stringify(part.entries.map(e => e.dedupeBase))).digest("hex");
      const dedupeKey = `whatsapp-digest:${phone}:${hash}`;
      const meta = { recipient: phone, message: part.text, templateCode: "DIGEST" };
      try {
        const existing = await prisma.notificationLog.findUnique({ where: { dedupeKey } });
        if (existing?.status !== "SENT") {
          const result = await sendWhatsapp(phone, part.text);
          if (!result.sent) throw new Error(result.reason ?? "Send failed");
          await prisma.notificationLog.upsert({ where: { dedupeKey },
            update: { ...meta, status: "SENT", sentAt: new Date(), errorMessage: null },
            create: { ...meta, dedupeKey, channel: "WHATSAPP", status: "SENT", sentAt: new Date() },
          });
        }
        // Preserve per-document threshold dedupe, including pre-digest deliveries.
        // These bookkeeping rows are excluded from the visible message feed.
        await prisma.$transaction(part.entries.map(entry => {
          const key = `${entry.dedupeBase}:WHATSAPP:${phone}`;
          const data = { templateCode: "DIGEST_ITEM", recipient: phone, relatedType: entry.item.sourceType,
            relatedId: entry.item.recordId, status: "SENT" as const, sentAt: new Date(), errorMessage: null };
          return prisma.notificationLog.upsert({ where: { dedupeKey: key }, update: data,
            create: { ...data, dedupeKey: key, channel: "WHATSAPP" },
          });
        }));
      } catch (err) {
        logger.error({ err, dedupeKey }, "WhatsApp digest failed");
        // Do not replace a successful delivery when only bookkeeping failed.
        const existing = await prisma.notificationLog.findUnique({ where: { dedupeKey } });
        if (existing?.status !== "SENT") await prisma.notificationLog.upsert({ where: { dedupeKey },
          update: { ...meta, status: "FAILED", errorMessage: (err as Error).message },
          create: { ...meta, dedupeKey, channel: "WHATSAPP", status: "FAILED", errorMessage: (err as Error).message },
        });
        break; // Retry this recipient's unsent remainder at the next scan.
      }
    }
  }
}

/** The Riyadh calendar day (yyyy-mm-dd) a moment falls on. */
export function riyadhDay(at: Date = new Date()) {
  return new Date(at.getTime() + 3 * 60 * 60_000).toISOString().slice(0, 10);
}

/** The messages the morning summary is sent as: the heading and the documents, split below the
 * provider's limit with each document kept whole, then the closing section (the open tasks). */
export function dailyMessageParts(texts: string[], header: string, emptyText: string, tail = "") {
  const parts: string[] = [];
  for (const text of texts.length ? texts : [emptyText]) {
    const line = text.slice(0, 2400);
    if (!parts.length || parts[parts.length - 1].length + line.length + 2 > 3500) parts.push(header.slice(0, 1200));
    parts[parts.length - 1] += `\n\n${line}`;
  }
  if (tail) {
    const sep = "\n\n━━━━━━━━━━━━━━━\n\n";
    if (parts[parts.length - 1].length + sep.length + tail.length <= 3500) parts[parts.length - 1] += sep + tail;
    else {
      let cur = "";
      for (const block of tail.split("\n\n")) {
        const piece = block.slice(0, 3400);
        if (cur && cur.length + piece.length + 2 > 3500) { parts.push(cur); cur = ""; }
        cur = cur ? `${cur}\n\n${piece}` : piece;
      }
      if (cur) parts.push(cur);
    }
  }
  return parts;
}

/**
 * The morning summary, sent every day: each recipient gets today's list once,
 * whatever was sent on earlier days (so an expired or ending document stays in
 * view until it is renewed). A failed part is retried by a later run that day.
 */
export async function sendDailyWhatsappDigest(
  groups: Map<string, DigestEntry[]>,
  header: string,
  emptyText: string,
  day = riyadhDay(),
  tail = "",
  /** The designed picture with its caption; when it can't go out, the text goes instead. */
  image?: { png: Buffer; caption: string }
) {
  const normalized = new Map<string, DigestEntry[]>();
  for (const [phone, entries] of groups) {
    const key = normalizePhone(phone);
    if (!key) continue;
    const unique = new Map((normalized.get(key) ?? []).map((e) => [e.dedupeBase, e]));
    for (const entry of entries) if (whatsappEligible(entry.item)) unique.set(entry.dedupeBase, entry);
    normalized.set(key, [...unique.values()]);
  }
  for (const [phone, entries] of normalized) {
    if (image) {
      const dedupeKey = `whatsapp-daily:${day}:${phone}:picture`;
      if ((await prisma.notificationLog.findUnique({ where: { dedupeKey } }))?.status === "SENT") continue;
      const meta = { recipient: phone, message: image.caption, templateCode: "DIGEST" };
      try {
        const result = await sendWhatsapp(phone, image.caption, image.png);
        if (!result.sent) throw new Error(result.reason ?? "Send failed");
        await prisma.notificationLog.upsert({ where: { dedupeKey },
          update: { ...meta, status: "SENT", sentAt: new Date(), errorMessage: null },
          create: { ...meta, dedupeKey, channel: "WHATSAPP", status: "SENT", sentAt: new Date() },
        });
        continue;
      } catch (err) {
        logger.error({ err, dedupeKey }, "Daily WhatsApp picture failed; sending the text");
        await prisma.notificationLog.upsert({ where: { dedupeKey },
          update: { ...meta, status: "FAILED", errorMessage: (err as Error).message },
          create: { ...meta, dedupeKey, channel: "WHATSAPP", status: "FAILED", errorMessage: (err as Error).message },
        }).catch(() => undefined);
      }
    }
    const parts = dailyMessageParts(entries.map((e) => e.text).filter(Boolean), header, emptyText, tail);
    for (const [n, text] of parts.entries()) {
      const dedupeKey = `whatsapp-daily:${day}:${phone}:${n}`;
      if ((await prisma.notificationLog.findUnique({ where: { dedupeKey } }))?.status === "SENT") continue;
      const meta = { recipient: phone, message: text, templateCode: "DIGEST" };
      try {
        const result = await sendWhatsapp(phone, text);
        if (!result.sent) throw new Error(result.reason ?? "Send failed");
        await prisma.notificationLog.upsert({ where: { dedupeKey },
          update: { ...meta, status: "SENT", sentAt: new Date(), errorMessage: null },
          create: { ...meta, dedupeKey, channel: "WHATSAPP", status: "SENT", sentAt: new Date() },
        });
      } catch (err) {
        logger.error({ err, dedupeKey }, "Daily WhatsApp summary failed");
        await prisma.notificationLog.upsert({ where: { dedupeKey },
          update: { ...meta, status: "FAILED", errorMessage: (err as Error).message },
          create: { ...meta, dedupeKey, channel: "WHATSAPP", status: "FAILED", errorMessage: (err as Error).message },
        }).catch(() => undefined);
        break;
      }
    }
  }
}
