import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendWhatsapp } from "@/services/whatsapp";
import { WHATSAPP_WEB_PROVIDER } from "@/services/whatsappWeb";
import { getActiveRecipients, normalizePhone } from "@/services/whatsappRecipients";
import { getWhatsappPaymentsFormat, getWhatsappScheduleSetting } from "@/services/settingsStore";
import { getBrandingContext, getCardAssets } from "@/services/branding";
import { renderHtmlToPngFit } from "@/services/pdf";
import { withLang } from "@/services/lang";
import { riyadhDay } from "@/services/whatsappDigest";
import { DIGEST_CARD_MAX_HEIGHT, DIGEST_CARD_WIDTH } from "@/services/whatsappDigestCard";
import { paymentLines, paymentParties, paymentsCardCaption, paymentsCardDocument, paymentsTextMessages, type PaymentLine } from "@/services/paymentsMessage";

/* The evening WhatsApp message: the day's payments — paid that day and recorded
   in the last two days. A payment typed in today for an earlier date (a late
   entry, an import of old payments) is not "today's" and is left out. It goes
   in the form chosen in Settings → WhatsApp (a designed picture from the
   QR-linked number, or a text in one of six designs). Each payment goes to each
   recipient once only — it never comes back in a later message, and it is not
   part of the expiry alerts. */

/** The payments the evening message is about: paid yesterday or today, recorded since yesterday. */
export async function eveningPayments(now = new Date()) {
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
    include: { branch: { select: { name: true, nameEn: true } }, employee: { select: { fullNameAr: true, fullNameEn: true, branch: { select: { name: true, nameEn: true } } } } },
  });
  return { day, payments };
}

export async function runDailyPaymentsDigest(now = new Date()) {
  const settings = await prisma.whatsappSettings.findUnique({ where: { id: 1 } });
  if (!settings?.enabled) return { sent: 0, payments: 0 };
  const phones = [...new Set((await getActiveRecipients()).map((r) => normalizePhone(r.phone)).filter(Boolean))];
  if (!phones.length) return { sent: 0, payments: 0 };

  const { day, payments } = await eveningPayments(now);
  if (!payments.length) return { sent: 0, payments: 0 };

  const [{ language }, format, branding] = await Promise.all([getWhatsappScheduleSetting(), getWhatsappPaymentsFormat(), getBrandingContext()]);
  const lang = language === "en" ? "en" : "ar";
  const company = (lang === "en" ? branding.company?.nameEn || branding.company?.nameAr : branding.company?.nameAr || branding.company?.nameEn) ?? "";
  const card = format.card;
  const asPicture = card !== "none" && settings.provider === WHATSAPP_WEB_PROVIDER;
  const parties = await paymentParties(payments);
  const pictures = new Map<string, Buffer>();
  const picture = async (lines: PaymentLine[]) => {
    const key = lines.map((l) => l.id).join(",");
    if (!pictures.has(key) && card !== "none") {
      const { logo, mark } = await getCardAssets();
      const html = withLang(lang, () => paymentsCardDocument(card, { company, logo: logo ?? mark, day, lines, today: now }));
      pictures.set(key, await renderHtmlToPngFit(html, DIGEST_CARD_WIDTH, DIGEST_CARD_MAX_HEIGHT));
    }
    return pictures.get(key)!;
  };

  /** Sends one message, keeping its row in the log; false when it could not go out. */
  const deliver = async (phone: string, dedupeKey: string, text: string, png?: Buffer) => {
    const meta = { recipient: phone, message: text, templateCode: "PAYMENTS" };
    try {
      const result = await sendWhatsapp(phone, text, png);
      if (!result.sent) throw new Error(result.reason ?? "Send failed");
      await prisma.notificationLog.upsert({ where: { dedupeKey }, update: { ...meta, status: "SENT", sentAt: new Date(), errorMessage: null }, create: { ...meta, dedupeKey, channel: "WHATSAPP", status: "SENT", sentAt: new Date() } });
      return true;
    } catch (err) {
      logger.error({ err, dedupeKey }, "Payments WhatsApp message failed");
      await prisma.notificationLog
        .upsert({ where: { dedupeKey }, update: { ...meta, status: "FAILED", errorMessage: (err as Error).message }, create: { ...meta, dedupeKey, channel: "WHATSAPP", status: "FAILED", errorMessage: (err as Error).message } })
        .catch(() => undefined);
      return false;
    }
  };

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
    const lines = withLang(lang, () => paymentLines(pending, parties));
    const base = `whatsapp-payments:${day}:${phone}:${pending[0].id}:${pending.length}`;

    let delivered = false;
    if (asPicture) {
      try {
        delivered = await deliver(phone, `${base}:picture`, withLang(lang, () => paymentsCardCaption(company, lines)), await picture(lines));
      } catch (err) {
        logger.error({ err }, "Payments WhatsApp picture could not be drawn; sending the text");
      }
      if (delivered) sent++;
    }
    if (!delivered) {
      // The text, split into messages each holding whole payments; all of them go, or the payments wait for the next run.
      const parts = withLang(lang, () => paymentsTextMessages(format.text, company, day, lines));
      delivered = true;
      for (const [n, text] of parts.entries()) {
        if (!(await deliver(phone, `${base}:${n}`, text))) {
          delivered = false;
          break;
        }
        sent++;
      }
    }
    if (!delivered) continue;
    // One bookkeeping row per payment, so it is never sent again (hidden from the message feed).
    await prisma.$transaction(
      pending.map((p) => {
        const key = `payment:${p.id}:WHATSAPP:${phone}`;
        const data = { templateCode: "PAYMENT_ITEM", recipient: phone, relatedType: "PAYMENT", relatedId: p.id, status: "SENT" as const, sentAt: new Date(), errorMessage: null };
        return prisma.notificationLog.upsert({ where: { dedupeKey: key }, update: data, create: { ...data, dedupeKey: key, channel: "WHATSAPP" } });
      })
    );
  }
  return { sent, payments: payments.length };
}
