import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/apiError";
import * as service from "@/modules/settings/settings.service";
import { sendMail } from "@/services/email";
import { sendWhatsapp, getWhatsappProvider, CALLMEBOT_PROVIDER } from "@/services/whatsapp";
import { WHATSAPP_WEB_PROVIDER } from "@/services/whatsappWeb";
import { getBrandingContext } from "@/services/branding";
import { listRecipients, saveRecipients } from "@/services/whatsappRecipients";
import * as whatsappWeb from "@/services/whatsappWeb";
import { prisma } from "@/lib/prisma";
import { listWhatsappMessages, recordWhatsappMessage } from "@/services/whatsappLog";
import { getTrackableItems } from "@/services/expiringItems";
import { daysUntil } from "@/services/expiration";
import { getWhatsappTemplateSetting, setWhatsappTemplateSetting, getWhatsappCardSetting, setWhatsappCardSetting, getWhatsappScheduleSetting, setWhatsappScheduleSetting } from "@/services/settingsStore";
import { rescheduleExpirationScan } from "@/jobs/scheduler";
import { runExpirationScan } from "@/jobs/expirationScan";
import { getCardAssets } from "@/services/branding";
import { getAlertStyle, prepareAlert } from "@/services/whatsappAlert";
import { CARD_PREVIEW_CSS, WHATSAPP_CARD_IDS, cardMarkup, type WhatsappCardSetting } from "@/services/whatsappCards";
import {
  WHATSAPP_TEMPLATE_IDS,
  alertContext,
  renderWhatsappAlert,
  type AlertContext,
  type WhatsappTemplateId,
} from "@/services/whatsappTemplates";

/** A real document to fill the WhatsApp alert preview and test message — the
 * next one to expire, preferring an employee's — or a labelled example when
 * the system has none yet. */
async function sampleAlertContext(companyName: string | null | undefined): Promise<{ context: AlertContext; real: boolean }> {
  const ranked = (await getTrackableItems())
    .map((item) => ({ item, days: daysUntil(item.expiryDate) }))
    .sort(
      (a, b) =>
        Number(Boolean(b.item.employeeNameAr)) - Number(Boolean(a.item.employeeNameAr)) ||
        Number(b.days >= 0) - Number(a.days >= 0) ||
        Math.abs(a.days) - Math.abs(b.days)
    );
  if (ranked[0]) return { context: alertContext(ranked[0].item, companyName), real: true };
  return {
    context: {
      company: companyName || "المنشأة",
      employeeAr: "اسم الموظف (مثال)",
      documentAr: "الإقامة",
      documentEn: "Iqama",
      expiryDate: new Date(Date.now() + 7 * 86_400_000),
      daysLeft: 7,
    },
    real: false,
  };
}

// The same document in each state, so the designs can be compared as it nears expiry.
const PREVIEW_STATES = { expired: -3, week: 7, month: 30 } as const;

export const getWhatsappTemplate = asyncHandler(async (_req: Request, res: Response) => {
  const [{ company }, template] = await Promise.all([getBrandingContext(), getWhatsappTemplateSetting()]);
  const { context, real } = await sampleAlertContext(company?.nameAr || company?.nameEn);
  const previews = Object.fromEntries(
    WHATSAPP_TEMPLATE_IDS.map((id) => [
      id,
      Object.fromEntries(
        Object.entries(PREVIEW_STATES).map(([state, days]) => [
          state,
          renderWhatsappAlert(id, { ...context, daysLeft: days, expiryDate: new Date(Date.now() + days * 86_400_000) }),
        ])
      ),
    ])
  );
  res.json({ data: { template, sampleIsReal: real, previews } });
});

/** The picture designs, as live markup on the sample document in one state
 * — Settings shows them without drawing a single image on the server. */
export const getWhatsappCards = asyncHandler(async (req: Request, res: Response) => {
  const state = String(req.query.state ?? "week") as keyof typeof PREVIEW_STATES;
  const days = PREVIEW_STATES[state] ?? PREVIEW_STATES.week;
  const [{ company }, card, provider, assets] = await Promise.all([getBrandingContext(), getWhatsappCardSetting(), getWhatsappProvider(), getCardAssets()]);
  const { context, real } = await sampleAlertContext(company?.nameAr || company?.nameEn);
  const shown = { ...context, daysLeft: days, expiryDate: new Date(Date.now() + days * 86_400_000) };
  const cards = Object.fromEntries(WHATSAPP_CARD_IDS.map((id) => [id, cardMarkup(id, shown, company?.nameEn, assets)]));
  res.json({ data: { card, canSendCards: provider === WHATSAPP_WEB_PROVIDER, sampleIsReal: real, css: CARD_PREVIEW_CSS, cards } });
});

export const updateWhatsappCard = asyncHandler(async (req: Request, res: Response) => {
  const card = await setWhatsappCardSetting((req.body as { card: WhatsappCardSetting }).card);
  res.json({ data: { card }, message: "WhatsApp card design saved." });
});

export const updateWhatsappTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await setWhatsappTemplateSetting((req.body as { template: WhatsappTemplateId }).template);
  res.json({ data: { template }, message: "WhatsApp message design saved." });
});

export const getWhatsappMessages = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as { limit?: string; status?: string };
  const limit = Math.min(Math.max(Number(q.limit) || 40, 1), 100);
  const status = q.status === "SENT" || q.status === "FAILED" ? q.status : undefined;
  res.json({ data: await listWhatsappMessages({ limit, status }) });
});
import { getPrintThemeSetting, setPrintThemeSetting, getPrintSignatures, setPrintSignatures, type PrintSignatures } from "@/services/settingsStore";

export const getPrintSignaturesSettings = asyncHandler(async (_req: Request, res: Response) => {
  const [signatures, company] = await Promise.all([
    getPrintSignatures(),
    prisma.companySettings.findUnique({ where: { id: 1 }, select: { stampFileId: true, signatureFileId: true } }),
  ]);
  res.json({ data: { signatures, stampFileId: company?.stampFileId ?? null, signatureFileId: company?.signatureFileId ?? null } });
});

export const updatePrintSignaturesSettings = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { signatures: PrintSignatures; stampFileId: string | null; signatureFileId: string | null };
  await setPrintSignatures(body.signatures);
  // The stamp and signature images live on the company record.
  await prisma.companySettings.updateMany({
    where: { id: 1 },
    data: { stampFileId: body.stampFileId, signatureFileId: body.signatureFileId },
  });
  res.json({ data: body, message: "Signature settings saved." });
});
import { isPrintThemeId, type PrintThemeId } from "@/services/printThemes";
import { employeeProfilePdf, paymentReceiptPdf, tableReportPdf } from "@/modules/pdf/templates";
import * as paymentsService from "@/modules/payments/payments.service";
import * as employeesService from "@/modules/employees/employees.service";
import { renderHtmlToPdf } from "@/services/pdf";

export const getPrintTheme = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: { theme: await getPrintThemeSetting() } });
});
export const updatePrintTheme = asyncHandler(async (req: Request, res: Response) => {
  const theme = await setPrintThemeSetting((req.body as { theme: PrintThemeId }).theme);
  res.json({ data: { theme }, message: "Print design saved." });
});

/** A real report (the establishments list) in the requested design, so the
 * admin sees the actual PDF before choosing it. */
export const previewPrintTheme = asyncHandler(async (req: Request, res: Response) => {
  const theme = String(req.query.theme ?? "");
  if (!isPrintThemeId(theme)) throw ApiError.badRequest("Unknown print design.");
  const doc = String(req.query.doc ?? "report");
  const branding = { ...(await getBrandingContext()), printTheme: theme };
  // The live preview (live=1) takes plain bytes: browsers and download
  // managers that grab application/pdf responses would hand the page nothing.
  const live = req.query.live === "1";
  const send = (pdf: Buffer, name: string) => {
    res.setHeader("Content-Type", live ? "application/octet-stream" : "application/pdf");
    if (!live) res.setHeader("Content-Disposition", `inline; filename="${name}-${theme}.pdf"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(pdf);
  };

  // The latest real payment voucher, or the first employee's profile, in the design.
  if (doc === "voucher") {
    const latest = await prisma.payment.findFirst({ where: { deletedAt: null }, orderBy: { paymentDate: "desc" }, select: { id: true } });
    if (latest) {
      const payment = await paymentsService.getById(latest.id);
      return send(await renderHtmlToPdf(paymentReceiptPdf(payment as never, branding), { footerLabel: "Payment Receipt" }), "voucher");
    }
  }
  if (doc === "profile") {
    const first = await prisma.employee.findFirst({ where: { deletedAt: null }, orderBy: { employeeNumber: "asc" }, select: { id: true } });
    if (first) {
      const employee = await employeesService.getById(first.id);
      return send(await renderHtmlToPdf(employeeProfilePdf(employee as never, branding), { footerLabel: "Employee Profile" }), "profile");
    }
  }

  const branches = await prisma.branch.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
    take: 60,
    include: { _count: { select: { employees: { where: { deletedAt: null } } } } },
  });
  const html = tableReportPdf(
    "تقرير المؤسسات والمنشآت",
    [
      { header: "اسم المؤسسة", subHeader: "Establishment", render: (r) => String(r.name) },
      { header: "الرمز", subHeader: "Code", render: (r) => `<span class="nowrap">${r.code}</span>` },
      { header: "المدينة", subHeader: "City", render: (r) => String(r.city ?? "—") },
      { header: "الموظفون", subHeader: "Staff", render: (r) => String(r.staff) },
      { header: "الحالة", subHeader: "Status", render: (r) => `<span class="badge-status status-${r.status}">${r.status === "ACTIVE" ? "نشط" : "غير نشط"}</span>` },
    ],
    branches.map((b) => ({ name: b.name, code: b.code, city: b.city, staff: b._count.employees, status: b.status })),
    branding,
    { titleEn: "Establishments Report" }
  );
  send(await renderHtmlToPdf(html, { footerLabel: "تقرير المؤسسات والمنشآت — معاينة تصميم الطباعة" }), "print-design");
});

export const getCompany = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await service.getCompanySettings() });
});
// Name and logos only — every signed-in user sees them in the top bar, while
// the full company record stays behind settings.view.
export const getBranding = asyncHandler(async (_req: Request, res: Response) => {
  const company = await service.getCompanySettings();
  res.json({
    data: {
      nameAr: company.nameAr,
      nameEn: company.nameEn,
      logoFileId: "logoFileId" in company ? company.logoFileId : null,
      logoDarkFileId: "logoDarkFileId" in company ? company.logoDarkFileId : null,
    },
  });
});

/** The symbol part of the company logo (without the name under it), for the
 * dashboard banner's watermark. */
export const getBrandingMark = asyncHandler(async (_req: Request, res: Response) => {
  const { mark } = await getCardAssets();
  res.json({ data: { mark } });
});

export const updateCompany =asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.updateCompanySettings(req.body), message: "Company settings saved." });
});

export const getAppearance = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await service.getAppearance() });
});
export const updateAppearance = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.updateAppearance(req.body), message: "Appearance settings saved." });
});

export const getExpiration = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await service.getExpiration() });
});
export const updateExpiration = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.updateExpiration(req.body), message: "Expiration rules saved." });
});

export const getEmail = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await service.getEmailSettings() });
});
export const updateEmail = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.updateEmailSettings(req.body), message: "Email settings saved." });
});
export const testEmail = asyncHandler(async (req: Request, res: Response) => {
  const result = await sendMail({
    to: req.body.to,
    subject: "SanaD test email",
    html: "<p>This is a test email from your SanaD Documents & Licenses Management System.</p>",
  });
  if (!result.sent) throw ApiError.badRequest("Email is not configured yet — save SMTP settings first.");
  res.json({ message: `Test email sent to ${req.body.to}.` });
});

export const getWhatsapp = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await service.getWhatsappSettings() });
});
export const updateWhatsapp = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.updateWhatsappSettings(req.body), message: "WhatsApp settings saved." });
});
export const getWhatsappRecipients = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await listRecipients() });
});
export const updateWhatsappRecipients = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await saveRecipients(req.body.recipients) });
});

export const getWhatsappWebStatus = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: whatsappWeb.getWhatsappWebStatus() });
});
export const connectWhatsappWeb = asyncHandler(async (req: Request, res: Response) => {
  await whatsappWeb.beginLinking((req.body as { phone?: string } | undefined)?.phone);
  res.json({ data: whatsappWeb.getWhatsappWebStatus() });
});
export const logoutWhatsappWeb = asyncHandler(async (_req: Request, res: Response) => {
  await whatsappWeb.logoutWhatsappWeb();
  res.json({ data: whatsappWeb.getWhatsappWebStatus() });
});

export const getWhatsappSchedule = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await getWhatsappScheduleSetting() });
});

export const updateWhatsappSchedule = asyncHandler(async (req: Request, res: Response) => {
  const updated = await setWhatsappScheduleSetting(req.body);
  await rescheduleExpirationScan(updated.sendTime, updated.timezone);
  res.json({ data: updated, message: "تم حفظ خيارات وطريقة إرسال التنبيهات والجدولة اليومية بنجاح." });
});

export const runWhatsappScanNow = asyncHandler(async (_req: Request, res: Response) => {
  const result = await runExpirationScan();
  res.json({
    data: { dueCount: result.dueCount },
    message: `تم تشغيل فحص الوثائق بنجاح (${result.dueCount} وثيقة مستحقة للتنبيه).`,
  });
});

export const testWhatsapp = asyncHandler(async (req: Request, res: Response) => {
  const [{ company }, provider] = await Promise.all([getBrandingContext(), getWhatsappProvider()]);
  const providerLabel =
    provider === WHATSAPP_WEB_PROVIDER ? "رقم مربوط بكود QR" : provider === CALLMEBOT_PROVIDER ? "CallMeBot" : "واتساب الرسمي (Meta)";
  // The test is the chosen design (card and text) on a real document, so it
  // looks exactly like the alerts this number will get.
  const { context } = await sampleAlertContext(company?.nameAr || company?.nameEn);
  const alert = await prepareAlert(context, await getAlertStyle(company?.nameEn));
  const header = ["🧪 *رسالة تجريبية من نظام SanaD*", `_وصلت عبر: ${providerLabel}. هذا مثال على شكل التنبيهات، وليس تنبيهًا جديدًا._`, ""].join("\n");

  let result: { sent: boolean; reason?: string };

  if (alert.mode === "card_only") {
    // Send card only
    const caption = `${header}\n${alert.cardCaption || ""}`;
    result = await sendWhatsapp(req.body.to, caption, alert.image);
  } else if (alert.mode === "both") {
    // Send formatted text message
    result = await sendWhatsapp(req.body.to, `${header}\n${alert.text}`);
    if (result.sent && alert.image) {
      await new Promise((r) => setTimeout(r, 1200));
      await sendWhatsapp(req.body.to, alert.cardCaption || "", alert.image);
    }
  } else {
    // text_only
    result = await sendWhatsapp(req.body.to, `${header}\n${alert.text}`);
  }

  await recordWhatsappMessage({
    to: req.body.to,
    message: `${header}\n${alert.logText}`,
    sent: result.sent,
    error: result.reason,
    kind: "TEST",
  }).catch(() => undefined);
  if (!result.sent) {
    throw ApiError.badRequest(
      result.reason === "WHATSAPP_NOT_CONFIGURED"
        ? "WhatsApp is not configured yet — save the WhatsApp settings first."
        : `WhatsApp send failed: ${result.reason}`
    );
  }
  res.json({ message: `Test WhatsApp message sent to ${req.body.to}.` });
});
