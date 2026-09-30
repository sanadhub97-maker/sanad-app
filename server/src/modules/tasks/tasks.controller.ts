import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { buildWorkbook, ColumnDef } from "@/services/excel";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext, getPrintLogoPng } from "@/services/branding";
import { tableReportPdf } from "@/modules/pdf/templates";
import * as service from "@/modules/tasks/tasks.service";

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
export const suggestions = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await service.suggestions() });
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

const CATEGORY_AR: Record<string, string> = { employees: "الموظفون", documents: "الوثائق والإقامات", branches: "المؤسسات", payments: "المدفوعات", general: "عام" };
const PRIORITY_AR: Record<string, string> = { URGENT: "عاجلة", HIGH: "مهمة", NORMAL: "عادية" };
const dmy = (day: string) => day.split("-").reverse().join("/");
const weekdayAr = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("ar-EG", { weekday: "long", timeZone: "UTC" });

/** The day's (or range's) tasks as a PDF in the chosen print design, or an Excel sheet. */
export const exportTasks = asyncHandler(async (req: Request, res: Response) => {
  const { from, to, format } = q(req);
  const tasks = await service.listRange(from, to);
  const oneDay = from === to;
  const rows: Row[] = tasks.map((t, i) => ({
    n: i + 1,
    date: dmy(t.date),
    title: t.title,
    category: CATEGORY_AR[t.category] ?? t.category,
    priority: PRIORITY_AR[t.priority] ?? t.priority,
    assignee: t.assignee?.fullName ?? "—",
    time: t.time ?? "—",
    status: t.done ? "منجزة" : "متبقية",
  }));
  const columns: ColumnDef<Row>[] = [
    { header: "#", subHeader: "No.", key: "n" },
    ...(oneDay ? [] : [{ header: "التاريخ", subHeader: "Date", key: "date" }]),
    { header: "المهمة", subHeader: "Task", key: "title" },
    { header: "التصنيف", subHeader: "Category", key: "category" },
    { header: "الأولوية", subHeader: "Priority", key: "priority" },
    { header: "المسؤول", subHeader: "Assignee", key: "assignee" },
    { header: "الوقت", subHeader: "Time", key: "time" },
    { header: "الحالة", subHeader: "Status", key: "status" },
  ];
  const done = tasks.filter((t) => t.done).length;
  const period = oneDay ? `${weekdayAr(from)} ${dmy(from)}` : `من ${dmy(from)} إلى ${dmy(to)}`;
  const title = `تقرير المهام اليومية — ${period}`;
  const summary = `${tasks.length} مهمة · ${done} منجزة · ${tasks.length - done} متبقية`;
  const filenameBase = oneDay ? `daily-tasks-${from}` : `daily-tasks-${from}-to-${to}`;
  const branding = await getBrandingContext();

  if (format === "xlsx") {
    const company = branding.company?.nameAr ? `${branding.company.nameAr}${branding.company.nameEn ? ` — ${branding.company.nameEn}` : ""}` : undefined;
    const buffer = await buildWorkbook(oneDay ? `المهام ${dmy(from).replace(/\//g, "-")}` : "المهام", columns, rows, {
      logo: await getPrintLogoPng(),
      title: `${title} (${summary})`,
      companyName: company,
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.xlsx"`);
    return res.send(buffer);
  }

  const esc = (v: unknown) => String(v ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = tableReportPdf(
    title,
    columns.map((c) => ({
      header: c.header,
      subHeader: c.subHeader,
      render: (r: Row) => (c.key === "status" ? `<b style="color:${r.status === "منجزة" ? "#15803d" : "#b45309"}">${esc(r.status)}</b>` : esc(r[c.key])),
    })),
    rows,
    branding,
    { titleEn: `Daily Tasks Report · ${summary}` }
  );
  const pdf = await renderHtmlToPdf(html, { footerLabel: title });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filenameBase}.pdf"`);
  return res.send(pdf);
});
