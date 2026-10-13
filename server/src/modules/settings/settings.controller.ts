import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/apiError";
import { canViewSource, escapeHtml, hasPermission } from "@/lib/security";
import { assertBrandFile, PRINT_NAME_IMAGE_MODULES } from "@/modules/files/files.access";
import * as service from "@/modules/settings/settings.service";
import { sendMail } from "@/services/email";
import { sendWhatsapp, getWhatsappProvider, CALLMEBOT_PROVIDER } from "@/services/whatsapp";
import { WHATSAPP_WEB_PROVIDER } from "@/services/whatsappWeb";
import { getBrandingContext } from "@/services/branding";
import { listRecipients, saveRecipients } from "@/services/whatsappRecipients";
import * as whatsappWeb from "@/services/whatsappWeb";
import { prisma } from "@/lib/prisma";
import { listWhatsappMessages, recordWhatsappMessage } from "@/services/whatsappLog";
import { getWhatsappScheduleSetting, setWhatsappScheduleSetting } from "@/services/settingsStore";
import { rescheduleExpirationScan } from "@/jobs/scheduler";
import { runExpirationScan } from "@/jobs/expirationScan";
import { dailyMessageParts } from "@/services/whatsappDigest";
import { getWhatsappDigestCardSetting, setWhatsappDigestCardSetting } from "@/services/settingsStore";
import { DIGEST_CARD_IDS, DIGEST_CARD_WIDTH, digestCardCaption, digestCardDocument, type DigestCardSetting } from "@/services/whatsappDigestCard";
import { dailyEmptyText, dailyPicture, gatherDailySummary, renderDailyEntry, renderDailyHeader, renderDailyTail } from "@/services/dailySummary";
import { getCardAssets } from "@/services/branding";

/** Settings → WhatsApp: the morning summary exactly as it will go out tomorrow, message by message, on today's real data. */
export const getWhatsappDailyPreview = asyncHandler(async (req: Request, res: Response) => {
  const { lang, company, docs, tasks } = await gatherDailySummary((item) => canViewSource(req.auth, item.sourceType));
  const messages = withLang(lang, () => dailyMessageParts(docs.map(renderDailyEntry), renderDailyHeader(company, docs, tasks), dailyEmptyText(), renderDailyTail(tasks)));
  res.json({ data: { messages, documents: docs.length, tasks: tasks.length, language: lang, generatedAt: new Date().toISOString() } });
});

/** Settings → WhatsApp: the four pictures of the morning summary, drawn on today's real documents and open tasks. */
export const getWhatsappDigestCards = asyncHandler(async (req: Request, res: Response) => {
  const [{ lang, company, docs, tasks }, card, provider, assets] = await Promise.all([
    gatherDailySummary((item) => canViewSource(req.auth, item.sourceType)),
    getWhatsappDigestCardSetting(),
    getWhatsappProvider(),
    getCardAssets(),
  ]);
  const data = { company, logo: assets.logo ?? assets.mark, documents: docs.map((d) => ({ ...d.context, sourceType: d.item.sourceType })), tasks };
  const cards = withLang(lang, () => Object.fromEntries(DIGEST_CARD_IDS.map((id) => [id, digestCardDocument(id, data)])));
  res.json({ data: { card, canSendCards: provider === WHATSAPP_WEB_PROVIDER, width: DIGEST_CARD_WIDTH, caption: withLang(lang, () => digestCardCaption(data)), cards } });
});

export const updateWhatsappDigestCard = asyncHandler(async (req: Request, res: Response) => {
  const card = await setWhatsappDigestCardSetting((req.body as { card: DigestCardSetting }).card);
  res.json({ data: { card }, message: L("تم حفظ تصميم صورة الملخص اليومي.", "Daily summary picture saved.") });
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
  await Promise.all([
    assertBrandFile(body.stampFileId, ["company-stamp"]),
    assertBrandFile(body.signatureFileId, ["company-signature", "company-stamp"]),
    ...[body.signatures.report, body.signatures.voucher, body.signatures.profile].flatMap((doc) => doc.boxes.map((box) => assertBrandFile(box.nameFileId, PRINT_NAME_IMAGE_MODULES))),
  ]);
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
import { L, isEn, withLang } from "@/services/lang";

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
    if (!hasPermission(req.auth, "payments.view") || !hasPermission(req.auth, "payments.export")) throw ApiError.forbidden("Payment export permission is required.");
    const latest = await prisma.payment.findFirst({ where: { deletedAt: null }, orderBy: { paymentDate: "desc" }, select: { id: true } });
    if (latest) {
      const payment = await paymentsService.getById(latest.id);
      return send(await renderHtmlToPdf(paymentReceiptPdf(payment as never, branding), { footerLabel: L("سند صرف", "Payment Receipt") }), "voucher");
    }
  }
  if (doc === "profile") {
    if (!hasPermission(req.auth, "employees.view") || !hasPermission(req.auth, "employees.export")) throw ApiError.forbidden("Employee export permission is required.");
    const first = await prisma.employee.findFirst({ where: { deletedAt: null }, orderBy: { employeeNumber: "asc" }, select: { id: true } });
    if (first) {
      const employee = await employeesService.getById(first.id, req.auth);
      return send(await renderHtmlToPdf(employeeProfilePdf(employee as never, branding), { footerLabel: L("ملف الموظف", "Employee Profile") }), "profile");
    }
  }

  const canSeeStaff = hasPermission(req.auth, "employees.view");
  const branches = hasPermission(req.auth, "branches.view") ? await prisma.branch.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
    take: 60,
    include: { _count: { select: { employees: { where: { deletedAt: null, ...(canSeeStaff ? {} : { id: { in: [] } }) } } } } },
  }) : [];
  const html = tableReportPdf(
    "تقرير المؤسسات والمنشآت",
    [
      { header: "اسم المؤسسة", subHeader: "Establishment", render: (r) => escapeHtml((isEn() && r.nameEn) || r.name) },
      { header: "الرمز", subHeader: "Code", render: (r) => `<span class="nowrap">${escapeHtml(r.code)}</span>` },
      { header: "المدينة", subHeader: "City", render: (r) => escapeHtml((isEn() && r.cityEn) || r.city || "—") },
      { header: "الموظفون", subHeader: "Staff", render: (r) => String(r.staff) },
      { header: "الحالة", subHeader: "Status", render: (r) => `<span class="badge-status status-${r.status}">${r.status === "ACTIVE" ? L("نشط", "Active") : L("غير نشط", "Inactive")}</span>` },
    ],
    branches.map((b) => ({ name: b.name, nameEn: b.nameEn, code: b.code, city: b.city, cityEn: b.cityEn, staff: b._count.employees, status: b.status })),
    branding,
    { titleEn: "Establishments Report" }
  );
  send(await renderHtmlToPdf(html, { footerLabel: L("تقرير المؤسسات والمنشآت — معاينة تصميم الطباعة", "Establishments report — print design preview") }), "print-design");
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
  res.json({ data: updated, message: "Alert delivery and daily schedule saved." });
});

export const runWhatsappScanNow = asyncHandler(async (_req: Request, res: Response) => {
  const result = await runExpirationScan();
  res.json({
    data: { dueCount: result.dueCount },
    message: `Document scan finished. Documents due for an alert: ${result.dueCount}`,
  });
});

export const testWhatsapp = asyncHandler(async (req: Request, res: Response) => {
  const [provider, { language }] = await Promise.all([getWhatsappProvider(), getWhatsappScheduleSetting()]);
  const en = language === "en";
  const providerLabel =
    provider === WHATSAPP_WEB_PROVIDER ? (en ? "a number linked by QR code" : "رقم مربوط بكود QR") : provider === CALLMEBOT_PROVIDER ? "CallMeBot" : en ? "official WhatsApp (Meta)" : "واتساب الرسمي (Meta)";
  // The test is today's summary, as it goes out each morning: the chosen picture, or the text.
  const summary = await gatherDailySummary((item) => canViewSource(req.auth, item.sourceType));
  const header = (en
    ? ["🧪 *A test message from SanaD*", `_Sent through ${providerLabel}. This is today's summary as it goes out each morning; it is not a new alert._`]
    : ["🧪 *رسالة تجريبية من نظام SanaD*", `_وصلت عبر: ${providerLabel}. ده ملخص النهارده بالشكل اللي بيوصل كل صباح، وليس تنبيهًا جديدًا._`]
  ).join("\n");
  const cardId = await getWhatsappDigestCardSetting();
  let result: { sent: boolean; reason?: string } = { sent: false };
  let logText = "";
  if (cardId !== "none" && provider === WHATSAPP_WEB_PROVIDER) {
    const picture = await dailyPicture(summary, cardId).catch(() => null);
    if (picture) {
      logText = `${header}\n\n${picture.caption}`;
      result = await sendWhatsapp(req.body.to, logText, picture.png);
    }
  }
  if (!logText) {
    const parts = withLang(summary.lang, () => dailyMessageParts(summary.docs.map(renderDailyEntry), renderDailyHeader(summary.company, summary.docs, summary.tasks), dailyEmptyText(), renderDailyTail(summary.tasks)));
    logText = `${header}\n\n${parts[0]}`;
    result = await sendWhatsapp(req.body.to, logText);
  }
  await recordWhatsappMessage({
    to: req.body.to,
    message: logText,
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
