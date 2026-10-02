import { escapeHtml } from "@/lib/security";
import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { buildWorkbook, ColumnDef } from "@/services/excel";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext, getPrintLogoPng } from "@/services/branding";
import { tableReportPdf } from "@/modules/pdf/templates";
import * as service from "@/modules/tasks/tasks.service";
import { L, isEn } from "@/services/lang";

type Row = Record<string, unknown>;
const q = (req: Request) => req.query as Record<string, string>;

export const listDay = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.listForDay(q(req).date) });
});
/** Every task between two days, and how many unfinished ones are left before the viewer's today. */
export const range = asyncHandler(async (req: Request, res: Response) => {
  const { from, to, today } = q(req);
  const [tasks, overdue] = await Promise.all([service.listRange(from, to), today ? service.overdueCount(today) : Promise.resolve(0)]);
  res.json({ data: { tasks, overdue } });
});
export const week =asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.weekSummary(q(req).date) });
});
export const assignees = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await service.assignees() });
});
export const suggestions = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.suggestions(req.auth!) });
});
export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ data: await service.create(req.body, req.auth?.userId) });
});
export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.update(String(req.params.id), req.body) });
});
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.softDelete(String(req.params.id));
  res.json({});
});
export const carry = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.carryOver(req.body.from, req.body.to) });
});

// Category, priority and status in both languages; the export uses the interface language.
const CATEGORY: Record<string, [string, string]> = { employees: ["الموظفون", "Employees"], documents: ["الوثائق والإقامات", "Documents & iqamas"], branches: ["المؤسسات", "Establishments"], payments: ["المدفوعات", "Payments"], general: ["عام", "General"] };
const PRIORITY: Record<string, [string, string]> = { URGENT: ["عاجلة", "Urgent"], HIGH: ["مهمة", "High"], NORMAL: ["عادية", "Normal"] };
const pickL = (m: Record<string, [string, string]>, k: string) => (m[k] ? L(m[k][0], m[k][1]) : k);
const dmy = (day: string) => day.split("-").reverse().join("/");
const weekday = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString(isEn() ? "en-GB" : "ar-EG", { weekday: "long", timeZone: "UTC" });

/** The day's (or range's) tasks as a PDF in the chosen print design, or an Excel sheet. */
export const exportTasks = asyncHandler(async (req: Request, res: Response) => {
  const { from, to, format } = q(req);
  const tasks = await service.listRange(from, to);
  const oneDay = from === to;
  const rows: Row[] = tasks.map((t, i) => ({
    n: i + 1,
    date: dmy(t.date),
    title: t.title,
    category: pickL(CATEGORY, t.category),
    priority: pickL(PRIORITY, t.priority),
    done: t.done,
    status: t.done ? L("منجزة", "Done") : L("متبقية", "Open"),
  }));
  // The PDF template numbers its rows itself; only the Excel sheet needs its own "#".
  const columns: ColumnDef<Row>[] = [
    ...(format === "xlsx" ? [{ header: "#", subHeader: "No.", key: "n" }] : []),
    ...(oneDay ? [] : [{ header: "التاريخ", subHeader: "Date", key: "date" }]),
    { header: "المهمة", subHeader: "Task", key: "title" },
    { header: "التصنيف", subHeader: "Category", key: "category" },
    { header: "الأولوية", subHeader: "Priority", key: "priority" },
    { header: "الحالة", subHeader: "Status", key: "status" },
  ];
  const done = tasks.filter((t) => t.done).length;
  const periodAr = oneDay ? `${weekday(from)} ${dmy(from)}` : `من ${dmy(from)} إلى ${dmy(to)}`;
  const periodEn = oneDay ? `${weekday(from)} ${dmy(from)}` : `${dmy(from)} to ${dmy(to)}`;
  const titleAr = `تقرير المهام اليومية — ${periodAr}`;
  const titleEn = `Daily Tasks — ${periodEn}`;
  const summary = L(`${tasks.length} مهمة · ${done} منجزة · ${tasks.length - done} متبقية`, `${tasks.length} tasks · ${done} done · ${tasks.length - done} open`);
  const filenameBase = oneDay ? `daily-tasks-${from}` : `daily-tasks-${from}-to-${to}`;
  const branding = await getBrandingContext();

  if (format === "xlsx") {
    const company = isEn() ? branding.company?.nameEn || branding.company?.nameAr : branding.company?.nameAr || branding.company?.nameEn;
    const buffer = await buildWorkbook(oneDay ? L(`المهام ${dmy(from).replace(/\//g, "-")}`, `Tasks ${dmy(from).replace(/\//g, "-")}`) : L("المهام", "Tasks"), columns, rows, {
      logo: await getPrintLogoPng(),
      title: `${L(titleAr, titleEn)} (${summary})`,
      companyName: company || undefined,
    });
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
        c.key === "status"
          ? `<b style="color:${r.done ? "#15803d" : "#b45309"};white-space:nowrap">${esc(r.status)}</b>`
          : c.key === "date"
            ? `<span style="white-space:nowrap">${esc(r.date)}</span>`
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
