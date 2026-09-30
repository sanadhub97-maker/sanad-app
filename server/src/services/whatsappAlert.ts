import { logger } from "@/lib/logger";
import { renderHtmlToPng } from "@/services/pdf";
import { getCardAssets } from "@/services/branding";
import { getWhatsappProvider } from "@/services/whatsapp";
import { WHATSAPP_WEB_PROVIDER } from "@/services/whatsappWeb";
import { getWhatsappCardSetting, getWhatsappScheduleSetting, getWhatsappTemplateSetting, type WhatsappDispatchMode } from "@/services/settingsStore";
import { renderWhatsappAlert, type AlertContext, type WhatsappTemplateId } from "@/services/whatsappTemplates";
import { cardDocument, CARD_HEIGHT, CARD_WIDTH, type WhatsappCardSetting } from "@/services/whatsappCards";
import { L, isEn } from "@/services/lang";

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

/** How alerts go out right now: the chosen designs, dispatch mode, and whether pictures can be sent. */
export interface AlertStyle {
  template: WhatsappTemplateId;
  card: WhatsappCardSetting;
  dispatchMode: WhatsappDispatchMode;
  /** Only the QR-linked number sends pictures; other providers send the text design. */
  canSendCards: boolean;
  companyEn: string | null;
}

export async function getAlertStyle(companyEn: string | null | undefined): Promise<AlertStyle> {
  const [template, card, schedule, provider] = await Promise.all([
    getWhatsappTemplateSetting(),
    getWhatsappCardSetting(),
    getWhatsappScheduleSetting(),
    getWhatsappProvider(),
  ]);
  return {
    template,
    card,
    dispatchMode: schedule.dispatchMode,
    canSendCards: provider === WHATSAPP_WEB_PROVIDER,
    companyEn: companyEn ?? null,
  };
}

export interface PreparedAlert {
  mode: WhatsappDispatchMode;
  /** Full text design (sent in text_only or both). */
  text: string;
  /** Rendered card image (sent in card_only or both). */
  image?: Buffer;
  /** Short caption sent with the card image when card_only or both. */
  cardCaption?: string;
  /** For the live feed and audit logs. */
  logText: string;
}

/** One alert, ready to send to every recipient according to the chosen dispatch mode. */
export async function prepareAlert(context: AlertContext, style: AlertStyle): Promise<PreparedAlert> {
  const text = renderWhatsappAlert(style.template, context);

  // If text-only mode chosen, or no card chosen, or provider cannot send cards:
  if (style.dispatchMode === "text_only" || style.card === "none" || !style.canSendCards) {
    return { mode: "text_only", text, logText: text };
  }

  try {
    const assets = await getCardAssets();
    const image = await renderHtmlToPng(cardDocument(style.card, context, style.companyEn, assets), CARD_WIDTH, CARD_HEIGHT);
    const cardName = CARD_NAMES_AR[style.card] ?? "بطاقة معتمدة";

    if (style.dispatchMode === "card_only") {
      const doc = isEn() ? context.documentEn || context.documentAr : context.documentAr || context.documentEn;
      const caption = L(`📋 تنبيه وثيقة رسمية: ${doc || "إشعار نظام"}`, `📋 Document alert: ${doc || "System notice"}`);
      return {
        mode: "card_only",
        text: caption,
        cardCaption: caption,
        image,
        logText: `🖼️ بطاقة تنبيه فقط «${cardName}»\n${caption}`,
      };
    }

    // Both together (text message + card image)
    const cardCaption = L(`🖼️ بطاقة توثيق «${cardName}»`, "🖼️ Document card");
    return {
      mode: "both",
      text,
      cardCaption,
      image,
      logText: `⚡ كلاهما معاً (نص + بطاقة «${cardName}»)\n${text}`,
    };
  } catch (err) {
    logger.error({ err, card: style.card }, "WhatsApp card render failed — fallback to text-only design");
    return { mode: "text_only", text, logText: text };
  }
}
