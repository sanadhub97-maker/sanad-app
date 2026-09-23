import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { getRecipientApiKey, normalizePhone } from "@/services/whatsappRecipients";

export const CALLMEBOT_PROVIDER = "CALLMEBOT";
const CALLMEBOT_API_URL = "https://api.callmebot.com/whatsapp.php";

interface WhatsappConfig {
  enabled: boolean;
  provider?: string;
  apiUrl?: string;
  apiKey?: string;
  // Meta: the sending number's Phone Number ID. CallMeBot: the WhatsApp number
  // that activated the key — its free API only delivers to that one number.
  phoneNumberId?: string;
}

type SendResult = { sent: boolean; reason?: string };

export async function getWhatsappConfig(): Promise<WhatsappConfig> {
  const row = await prisma.whatsappSettings.findUnique({ where: { id: 1 } });
  if (row?.enabled) {
    return {
      enabled: true,
      provider: row.provider ?? undefined,
      apiUrl: row.apiUrl ?? undefined,
      apiKey: row.apiKeyEncrypted ? decryptSecret(row.apiKeyEncrypted) : undefined,
      phoneNumberId: row.phoneNumberId ?? undefined,
    };
  }
  return {
    enabled: env.WHATSAPP_ENABLED,
    apiUrl: env.WHATSAPP_API_URL,
    apiKey: env.WHATSAPP_API_KEY,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
  };
}

/**
 * Sends a WhatsApp message through the configured provider: the official
 * WhatsApp Business (Cloud) API, or CallMeBot's free personal-use API. Neither
 * path automates WhatsApp Web (§23). No-ops safely until an administrator
 * configures credentials in Settings → WhatsApp.
 */
export async function sendWhatsapp(toPhoneE164: string, message: string): Promise<SendResult> {
  const config = await getWhatsappConfig();
  if (config.provider === CALLMEBOT_PROVIDER) return sendViaCallMeBot(config, toPhoneE164, message);
  return sendViaMetaCloud(config, toPhoneE164, message);
}

async function sendViaMetaCloud(config: WhatsappConfig, to: string, message: string): Promise<SendResult> {
  if (!config.enabled || !config.apiUrl || !config.apiKey || !config.phoneNumberId) {
    logger.warn({ to }, "WhatsApp not configured — skipping send");
    return { sent: false, reason: "WHATSAPP_NOT_CONFIGURED" };
  }

  const url = `${config.apiUrl.replace(/\/$/, "")}/${config.phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({ status: response.status, errorBody }, "WhatsApp send failed");
    return { sent: false, reason: `HTTP_${response.status}` };
  }

  return { sent: true };
}

async function sendViaCallMeBot(config: WhatsappConfig, to: string, message: string): Promise<SendResult> {
  if (!config.enabled) {
    logger.warn({ to }, "WhatsApp (CallMeBot) not configured — skipping send");
    return { sent: false, reason: "WHATSAPP_NOT_CONFIGURED" };
  }
  const apiKey = await getRecipientApiKey(to);
  if (!apiKey) {
    return { sent: false, reason: "No CallMeBot key saved for this number — add it to the recipients list first." };
  }

  const url = `${CALLMEBOT_API_URL}?${new URLSearchParams({ phone: normalizePhone(to), text: message, apikey: apiKey })}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const flatten = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  // The response echoes the message back; drop it so words inside an alert
  // can't be mistaken for an error below.
  const body = flatten(await response.text()).replace(flatten(message), "");

  // CallMeBot reports failures like an invalid key with a 2xx status (203) and
  // the reason only in the body, so the status code alone can't be trusted.
  if (response.status !== 200 || /invalid|error|not allowed|blocked|paused/i.test(body)) {
    logger.error({ status: response.status, body }, "WhatsApp (CallMeBot) send failed");
    return { sent: false, reason: body.slice(0, 200) || `HTTP_${response.status}` };
  }

  return { sent: true };
}
