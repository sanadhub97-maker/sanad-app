import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { buildWorkbook, ColumnDef } from "@/services/excel";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext, getPrintLogoPng } from "@/services/branding";
import { tableReportPdf } from "@/modules/pdf/templates";
import * as service from "@/modules/violations/violations.service";
import { L, isEn } from "@/services/lang";
import { assertLinkedFileAccess } from "@/modules/files/files.access";
import { visiblePaymentLink } from "@/lib/financialVisibility";

type Row = Record<string, unknown>;

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.list(req.query as never);
  res.json({ ...result, data: result.data.map(item => visiblePaymentLink(item, req.auth)) });
});
export const stats = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await service.stats() });
});
export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: visiblePaymentLink(await service.getById(String(req.params.id)), req.auth) });
});
export const create = asyncHandler(async (req: Request, res: Response) => {
  await assertLinkedFileAccess(req.body.fileId, req.auth, ["violation"]);
  res.status(201).json({ data: visiblePaymentLink(await service.create(req.body, req.auth?.userId), req.auth) });
});
export const update = asyncHandler(async (req: Request, res: Response) => {
  await assertLinkedFileAccess(req.body.fileId, req.auth, ["violation"]);
  res.json({ data: visiblePaymentLink(await service.update(String(req.params.id), req.body, req.auth?.userId), req.auth) });
});
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.softDelete(String(req.params.id));
  res.json({ message: "Violation deleted." });
});
export const pay = asyncHandler(async (req: Request, res: Response) => {
  await assertLinkedFileAccess(req.body.fileId, req.auth, ["payment"]);
  res.json({ data: visiblePaymentLink(await service.pay(String(req.params.id), req.body, req.auth!.userId), req.auth) });
});
export const objection = asyncHandler(async (req: Request, res: Response) => {
  await assertLinkedFileAccess(req.body.fileId, req.auth, ["violation"]);
  res.json({ data: visiblePaymentLink(await service.objection(String(req.params.id), req.body, req.auth?.userId), req.auth) });
});
export const objectionResult = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: visiblePaymentLink(await service.objectionResult(String(req.params.id), req.body, req.auth?.userId), req.auth) });
});
export const apply = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: visiblePaymentLink(await service.apply(String(req.params.id), req.body, req.auth?.userId), req.auth) });
});
export const related = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  res.json({ data: await service.relatedOptions(q.employeeId, q.branchId, req.auth!) });
});

const STATE: Record<string, [string, string, string]> = {
  NEW: ["جديدة", "New", "#2563eb"],
  OBJECTION: ["تحت الاعتراض", "Objection filed", "#7c3aed"],
  ACCEPTED: ["أُلغيت بالاعتراض", "Cancelled on objection", "#64748b"],
  REJECTED: ["رُفض الاعتراض", "Objection rejected", "#c2410c"],
  PAID: ["مسددة", "Paid", "#15803d"],
  OVERDUE: ["متأخرة السداد", "Overdue", "#b91c1c"],
  OPEN: ["قائم", "Open", "#b45309"],
  APPLIED: ["اتطبّق", "Applied", "#15803d"],
};
const dmy = (day: string | null) => (day ? day.split("-").reverse().join("/") : "—");
const money = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

/** The violations matching the page's filters, as a PDF in the chosen print design or an Excel sheet. */
export const exportViolations = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  const items = await service.listAll(q as never);
  const staff = q.kind === "STAFF";
  const rows: Row[] = items.map((v, i) => ({
    n: i + 1,
    date: dmy(v.date),
    who: staff ? (isEn() ? v.employee?.fullNameEn || v.employee?.fullNameAr : v.employee?.fullNameAr) || "—" : v.authorityLabel,
    number: v.number || "—",
    branch: (isEn() ? v.branch?.nameEn || v.branch?.name : v.branch?.name) || "—",
    reason: v.reason,
    penalty: v.penalty || "—",
    amount: v.amount ? money(v.amount) : "—",
    due: dmy(v.payDeadline),
    stateKey: v.state,
    state: STATE[v.state] ? L(STATE[v.state][0], STATE[v.state][1]) : v.state,
  }));
  const columns: ColumnDef<Row>[] = [
    ...(q.format === "xlsx" ? [{ header: "#", subHeader: "No.", key: "n" }] : []),
    { header: "التاريخ", subHeader: "Date", key: "date" },
    staff ? { header: "الموظف", subHeader: "Employee", key: "who" } : { header: "الجهة", subHeader: "Authority", key: "who" },
    ...(staff ? [] : [{ header: "رقم المخالفة", subHeader: "Number", key: "number" }]),
    { header: "الفرع / المؤسسة", subHeader: "Establishment", key: "branch" },
    { header: "السبب", subHeader: "Reason", key: "reason" },
    ...(staff ? [{ header: "الجزاء", subHeader: "Penalty", key: "penalty" }] : []),
    { header: "المبلغ (ر.س)", subHeader: "Amount (SAR)", key: "amount" },
    ...(staff ? [] : [{ header: "آخر ميعاد للسداد", subHeader: "Pay by", key: "due" }]),
    { header: "الحالة", subHeader: "Status", key: "state" },
  ];
  const total = items.reduce((a, v) => a + (v.amount || 0), 0);
  const unpaid = items.filter((v) => v.open).reduce((a, v) => a + (v.amount || 0), 0);
  const titleAr = staff ? "تقرير جزاءات الموظفين" : "تقرير المخالفات";
  const titleEn = staff ? "Staff Penalties Report" : "Violations Report";
  const summary = staff
    ? L(`${items.length} جزاء`, `${items.length} penalties`)
    : L(`${items.length} مخالفة · الإجمالي ${money(total)} ر.س · غير مسدد ${money(unpaid)} ر.س`, `${items.length} violations · total SAR ${money(total)} · unpaid SAR ${money(unpaid)}`);
  const branding = await getBrandingContext();
  const filenameBase = staff ? "staff-penalties" : "violations";

  if (q.format === "xlsx") {
    const company = isEn() ? branding.company?.nameEn || branding.company?.nameAr : branding.company?.nameAr || branding.company?.nameEn;
    const buffer = await buildWorkbook(L(titleAr, titleEn), columns, rows, { logo: await getPrintLogoPng(), title: `${L(titleAr, titleEn)} (${summary})`, companyName: company || undefined });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.xlsx"`);
    return res.send(buffer);
  }

  const esc = (v: unknown) => String(v ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = tableReportPdf(
    `${titleAr} · ${summary}`,
    columns.map((c) => ({
      header: c.header,
      subHeader: c.subHeader,
      render: (r: Row) =>
        c.key === "state"
          ? `<b style="color:${STATE[String(r.stateKey)]?.[2] ?? "#334155"};white-space:nowrap">${esc(r.state)}</b>`
          : c.key === "date" || c.key === "due" || c.key === "amount"
            ? `<span style="white-space:nowrap">${esc(r[c.key])}</span>`
            : esc(r[c.key]),
    })),
    rows,
    branding,
    { titleEn: `${titleEn} · ${summary}` }
  );
  const pdf = await renderHtmlToPdf(html, { footerLabel: L(titleAr, titleEn) });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filenameBase}.pdf"`);
  return res.send(pdf);
});
