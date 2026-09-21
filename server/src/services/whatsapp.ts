import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

interface WhatsappConfig {
  enabled: boolean;
  apiUrl?: string;
  apiKey?: string;
  phoneNumberId?: string;
}

async function getWhatsappConfig(): Promise<WhatsappConfig> {
  const row = await prisma.whatsappSettings.findUnique({ where: { id: 1 } });
  if (row?.enabled) {
    return {
      enabled: true,
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
 * Sends a WhatsApp message via the official WhatsApp Business (Cloud) API —
 * a plain HTTPS POST to the configured Business API endpoint, never
 * WhatsApp-Web automation (§23). No-ops safely until an administrator
 * configures real Meta Business credentials in Settings → WhatsApp.
 */
export async function sendWhatsapp(toPhoneE164: string, message: string): Promise<{ sent: boolean; reason?: string }> {
  const config = await getWhatsappConfig();
  if (!config.enabled || !config.apiUrl || !config.apiKey || !config.phoneNumberId) {
    logger.warn({ to: toPhoneE164 }, "WhatsApp not configured — skipping send");
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
      to: toPhoneE164,
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
