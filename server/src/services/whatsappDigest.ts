import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendWhatsapp } from "@/services/whatsapp";
import { normalizePhone } from "@/services/whatsappRecipients";
import type { TrackableItem } from "@/services/expiringItems";

export type DigestEntry = { item: TrackableItem; dedupeBase: string; text: string };
export function whatsappEligible(item: TrackableItem) {
  return item.sourceType === "COMPANY_DOCUMENT" || item.onSponsorship === true;
}

/** Keep whole entries together and leave room below provider text limits. */
export function digestParts(entries: DigestEntry[], header: string) {
  const parts: { text: string; entries: DigestEntry[] }[] = [];
  for (const entry of entries) {
    const line = `• ${entry.text.slice(0, 2400)}`;
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
