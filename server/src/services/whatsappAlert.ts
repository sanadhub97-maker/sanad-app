import { logger } from "@/lib/logger";
import { renderHtmlToPng } from "@/services/pdf";
import { getCardAssets } from "@/services/branding";
import { getWhatsappProvider } from "@/services/whatsapp";
import { WHATSAPP_WEB_PROVIDER } from "@/services/whatsappWeb";
import { getWhatsappCardSetting, getWhatsappTemplateSetting } from "@/services/settingsStore";
import { renderWhatsappAlert, type AlertContext, type WhatsappTemplateId } from "@/services/whatsappTemplates";
import { cardDocument, CARD_HEIGHT, CARD_WIDTH, type WhatsappCardSetting } from "@/services/whatsappCards";

export const CARD_NAMES_AR: Record<Exclude<WhatsappCardSetting, "none">, string> = {
  pass: "بطاقة المحفظة",
  ios: "قائمة iOS",
  bento: "الداكن",
  health: "ملخص صحة",
  lock: "إشعار الشاشة",
  letter: "الخطاب الرسمي",
  titanium: "التيتانيوم",
  whitecard: "البطاقة البيضاء",
  ultra: "ساعة Ultra",
  vision: "زجاج Vision",
  pearl: "اللؤلؤي",
};

/** How alerts go out right now: the chosen designs, and whether pictures can be sent. */
export interface AlertStyle {
  template: WhatsappTemplateId;
  card: WhatsappCardSetting;
  /** Only the QR-linked number sends pictures; other providers send the text design. */
  canSendCards: boolean;
  companyEn: string | null;
}

export async function getAlertStyle(companyEn: string | null | undefined): Promise<AlertStyle> {
  const [template, card, provider] = await Promise.all([getWhatsappTemplateSetting(), getWhatsappCardSetting(), getWhatsappProvider()]);
  return { template, card, canSendCards: provider === WHATSAPP_WEB_PROVIDER, companyEn: companyEn ?? null };
}

export interface PreparedAlert {
  /** What is sent: the full text design, or with a card, a short caption. */
  text: string;
  image?: Buffer;
  /** For the live feed: says which card went with the caption. */
  logText: string;
}

/** One alert, ready to send to every recipient (the card is rendered once).
 * If the card can't be drawn, the alert still goes out as the text design. */
export async function prepareAlert(context: AlertContext, style: AlertStyle): Promise<PreparedAlert> {
  const text = renderWhatsappAlert(style.template, context);
  if (style.card === "none" || !style.canSendCards) return { text, logText: text };
  try {
    const assets = await getCardAssets();
    const image = await renderHtmlToPng(cardDocument(style.card, context, style.companyEn, assets), CARD_WIDTH, CARD_HEIGHT);
    const caption = renderWhatsappAlert("compact", context);
    return { text: caption, image, logText: `🖼️ بطاقة «${CARD_NAMES_AR[style.card]}»\n${caption}` };
  } catch (err) {
    logger.error({ err, card: style.card }, "WhatsApp card render failed — sending the text design instead");
    return { text, logText: text };
  }
}
