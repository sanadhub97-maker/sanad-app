import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendWhatsapp } from "@/services/whatsapp";
import { getActiveRecipients, normalizePhone } from "@/services/whatsappRecipients";
import { getWhatsappScheduleSetting } from "@/services/settingsStore";
import { getBrandingContext } from "@/services/branding";
import { paymentCategoryLabel, paymentMethodLabel } from "@/constants/paymentCategories";
import { withLang } from "@/services/lang";
import { riyadhDay } from "@/services/whatsappDigest";

/* The evening WhatsApp message: the day's payments — paid that day and recorded
   in the last two days. A payment typed in today for an earlier date (a late
   entry, an import of old payments) is not "today's" and is left out. Each
   payment goes to each recipient once only — it never comes back in a later
   message, and it is not part of the expiry alerts. */

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MAX_TEXT = 3500;
const countAr = (n: number) => (n === 1 ? "دفعة واحدة" : n === 2 ? "دفعتان" : n <= 10 ? `${n} دفعات` : `${n} دفعة`);

export async function runDailyPaymentsDigest(now = new Date()) {
  const settings = await prisma.whatsappSettings.findUnique({ where: { id: 1 } });
  if (!settings?.enabled) return { sent: 0, payments: 0 };
  const phones = [...new Set((await getActiveRecipients()).map((r) => normalizePhone(r.phone)).filter(Boolean))];
  if (!phones.length) return { sent: 0, payments: 0 };

  const day = riyadhDay(now);
  // Today's payments, and yesterday's in case last evening's message could not go out.
  const since = new Date(`${day}T00:00:00+03:00`);
  since.setUTCDate(since.getUTCDate() - 1);
  // The payment date is a calendar day (stored at midnight UTC): yesterday or today only.
  const paidTo = new Date(`${day}T00:00:00Z`);
  const paidFrom = new Date(paidTo);
  paidFrom.setUTCDate(paidFrom.getUTCDate() - 1);
  const payments = await prisma.payment.findMany({
    where: { deletedAt: null, createdAt: { gte: since, lte: now }, paymentDate: { gte: paidFrom, lte: paidTo } },
    orderBy: { createdAt: "asc" },
    include: { branch: { select: { name: true, nameEn: true } }, employee: { select: { fullNameAr: true, fullNameEn: true } } },
  });
  if (!payments.length) return { sent: 0, payments: 0 };

  const { language } = await getWhatsappScheduleSetting();
  const en = language === "en";
  const branding = await getBrandingContext();
  const company = en ? branding.company?.nameEn || branding.company?.nameAr : branding.company?.nameAr || branding.company?.nameEn;
  const line = (p: (typeof payments)[number]) =>
    withLang(en ? "en" : "ar", () => {
      const who = (en ? p.employee?.fullNameEn || p.employee?.fullNameAr : p.employee?.fullNameAr) || p.supplierName || (en ? p.branch?.nameEn || p.branch?.name : p.branch?.name);
      return [
        `• ${paymentCategoryLabel(p.category, p.type)} — ${money(Number(p.total))} ${en ? "SAR" : "ر.س"}`,
        [who, paymentMethodLabel(p.method), p.paymentNumber].filter(Boolean).join(" · "),
        p.description ? p.description.slice(0, 200) : "",
      ].filter(Boolean).join("\n");
    });

  let sent = 0;
  for (const phone of phones) {
    const done = new Set(
      (
        await prisma.notificationLog.findMany({
          where: { dedupeKey: { in: payments.map((p) => `payment:${p.id}:WHATSAPP:${phone}`) }, status: "SENT" },
          select: { dedupeKey: true },
        })
      ).map((r) => r.dedupeKey)
    );
    const pending = payments.filter((p) => !done.has(`payment:${p.id}:WHATSAPP:${phone}`));
    if (!pending.length) continue;
    const total = pending.reduce((a, p) => a + Number(p.total), 0);
    const header = [`${en ? "💰 Today's payments" : "💰 مدفوعات اليوم"} — ${day}`, company].filter(Boolean).join("\n");
    const footer = en ? `Total: ${money(total)} SAR · ${pending.length} payment(s)` : `الإجمالي: ${money(total)} ر.س · ${countAr(pending.length)}`;
    // A long day goes out in several messages, each payment kept whole.
    const parts: { text: string; ids: string[] }[] = [];
    for (const p of pending) {
      const l = line(p);
      let part = parts[parts.length - 1];
      if (!part || part.text.length + l.length + 2 > MAX_TEXT) parts.push((part = { text: header, ids: [] }));
      part.text += `\n\n${l}`;
      part.ids.push(p.id);
    }
    parts[parts.length - 1].text += `\n\n${footer}`;
    for (const part of parts) {
      const dedupeKey = `whatsapp-payments:${day}:${phone}:${part.ids[0]}:${part.ids.length}`;
      const meta = { recipient: phone, message: part.text, templateCode: "PAYMENTS" };
      try {
        const result = await sendWhatsapp(phone, part.text);
        if (!result.sent) throw new Error(result.reason ?? "Send failed");
        await prisma.$transaction([
          prisma.notificationLog.upsert({
            where: { dedupeKey },
            update: { ...meta, status: "SENT", sentAt: new Date(), errorMessage: null },
            create: { ...meta, dedupeKey, channel: "WHATSAPP", status: "SENT", sentAt: new Date() },
          }),
          // One bookkeeping row per payment, so it is never sent again (hidden from the message feed).
          ...part.ids.map((id) => {
            const key = `payment:${id}:WHATSAPP:${phone}`;
            const data = { templateCode: "PAYMENT_ITEM", recipient: phone, relatedType: "PAYMENT", relatedId: id, status: "SENT" as const, sentAt: new Date(), errorMessage: null };
            return prisma.notificationLog.upsert({ where: { dedupeKey: key }, update: data, create: { ...data, dedupeKey: key, channel: "WHATSAPP" } });
          }),
        ]);
        sent++;
      } catch (err) {
        logger.error({ err, dedupeKey }, "Payments WhatsApp message failed");
        await prisma.notificationLog
          .upsert({
            where: { dedupeKey },
            update: { ...meta, status: "FAILED", errorMessage: (err as Error).message },
            create: { ...meta, dedupeKey, channel: "WHATSAPP", status: "FAILED", errorMessage: (err as Error).message },
          })
          .catch(() => undefined);
        break;
      }
    }
  }
  return { sent, payments: payments.length };
}
