import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { buildWorkbook, ColumnDef } from "@/services/excel";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext, getPrintLogoPng } from "@/services/branding";
import { tableReportPdf } from "@/modules/pdf/templates";
import { assertLinkedFileAccess } from "@/modules/files/files.access";
import { hasPermission } from "@/lib/security";
import { L, isEn } from "@/services/lang";
import * as service from "./vehicles.service";

type Row = Record<string, unknown>;
const id = (req: Request) => String(req.params.id);

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.list(req.query as never));
});
export const stats = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await service.stats() });
});
export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.getById(id(req)) });
});
export const create = asyncHandler(async (req: Request, res: Response) => {
  await checkFiles(req);
  res.status(201).json({ data: await service.create(req.body, req.auth?.userId) });
});
export const update = asyncHandler(async (req: Request, res: Response) => {
  await checkFiles(req);
  res.json({ data: await service.update(id(req), req.body) });
});
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(id(req));
  res.json({ message: "Vehicle deleted." });
});
export const renew = asyncHandler(async (req: Request, res: Response) => {
  await checkFiles(req);
  res.json({ data: await service.renew(id(req), req.body, req.auth!.userId, hasPermission(req.auth, "payments.create")) });
});

async function checkFiles(req: Request) {
  for (const k of ["inspectionFileId", "insuranceFileId", "registrationFileId", "fileId"]) {
    await assertLinkedFileAccess(req.body?.[k], req.auth, ["vehicle"]);
  }
}

const dmy = (d: Date | null) => (d ? d.toISOString().slice(0, 10).split("-").reverse().join("/") : "—");
const left = (n: number | null) => (n === null ? "—" : n < 0 ? L(`منتهي من ${-n} يوم`, `${-n} days ago`) : n === 0 ? L("ينتهي اليوم", "Today") : L(`باقي ${n} يوم`, `${n} days left`));
const tone = (n: number | null) => (n === null ? "#64748b" : n <= 0 ? "#c6283b" : n <= 30 ? "#c26a06" : "#15803d");

/** The cars matching the page's filters, as a PDF in the chosen print design or an Excel sheet. */
export const exportVehicles = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  const cars = await service.exportRows(req.query as never);
  const rows: Row[] = cars.map((v, i) => ({
    n: i + 1,
    plate: `${v.plateLetters} ${v.plateNumber}`,
    make: [v.make, v.year].filter(Boolean).join(" "),
    branch: (v.branch ? (isEn() ? v.branch.nameEn || v.branch.name : v.branch.name) : L("بدون مؤسسة", "No establishment")),
    owner: v.ownerName || "—",
    serial: v.serialNumber || "—",
    driver: (v.driver ? (isEn() ? v.driver.fullNameEn || v.driver.fullNameAr : v.driver.fullNameAr) : "—"),
    inspection: dmy(v.inspectionExpiry), inspectionLeft: left(v.inspectionDays), inspectionDays: v.inspectionDays,
    insurance: dmy(v.insuranceExpiry), insuranceLeft: left(v.insuranceDays), insuranceDays: v.insuranceDays,
    registration: dmy(v.registrationExpiry), registrationLeft: left(v.registrationDays), registrationDays: v.registrationDays,
  }));
  const titleAr = "تقرير السيارات";
  const titleEn = "Vehicles Report";
  const summary = L(`${cars.length} سيارة · ${cars.filter((v) => v.nearestDays <= 0).length} فيها حاجة منتهية`, `${cars.length} vehicles · ${cars.filter((v) => v.nearestDays <= 0).length} with something expired`);
  const branding = await getBrandingContext();
  if (q.format === "xlsx") {
    const columns: ColumnDef<Row>[] = [
      { header: "#", subHeader: "No.", key: "n" },
      { header: "اللوحة", subHeader: "Plate", key: "plate" },
      { header: "السيارة", subHeader: "Vehicle", key: "make" },
      { header: "المؤسسة", subHeader: "Establishment", key: "branch" },
      { header: "المالك", subHeader: "Owner", key: "owner" },
      { header: "الرقم التسلسلي", subHeader: "Serial no.", key: "serial" },
      { header: "السائق", subHeader: "Driver", key: "driver" },
      { header: "انتهاء الفحص الدوري", subHeader: "Inspection expiry", key: "inspection" },
      { header: "الفحص", subHeader: "Inspection", key: "inspectionLeft" },
      { header: "انتهاء التأمين", subHeader: "Insurance expiry", key: "insurance" },
      { header: "التأمين", subHeader: "Insurance", key: "insuranceLeft" },
      { header: "انتهاء الاستمارة", subHeader: "Registration expiry", key: "registration" },
      { header: "الاستمارة", subHeader: "Registration", key: "registrationLeft" },
    ];
    const company = isEn() ? branding.company?.nameEn || branding.company?.nameAr : branding.company?.nameAr || branding.company?.nameEn;
    const buffer = await buildWorkbook(L(titleAr, titleEn), columns, rows, { logo: await getPrintLogoPng(), title: `${L(titleAr, titleEn)} (${summary})`, companyName: company || undefined });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="vehicles.xlsx"`);
    return res.send(buffer);
  }
  const esc = (v: unknown) => String(v ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const cell = (date: string, days: string, n: number) => `<span style="white-space:nowrap">${esc(date)}</span><br><b style="color:${tone(n)};white-space:nowrap;font-size:8pt">${esc(days)}</b>`;
  const html = tableReportPdf(
    `${titleAr} · ${summary}`,
    [
      { header: "اللوحة", subHeader: "Plate", render: (r: Row) => `<b style="white-space:nowrap">${esc(r.plate)}</b>` },
      { header: "السيارة", subHeader: "Vehicle", render: (r: Row) => `${esc(r.make)}<br><span style="color:#64748b;font-size:8pt">${esc(r.serial)}</span>` },
      { header: "المؤسسة / المالك", subHeader: "Establishment / owner", render: (r: Row) => `${esc(r.branch)}<br><span style="color:#64748b;font-size:8pt">${esc(r.owner)}</span>` },
      { header: "السائق", subHeader: "Driver", render: (r: Row) => esc(r.driver) },
      { header: "الفحص الدوري", subHeader: "Inspection", render: (r: Row) => cell(r.inspection as string, r.inspectionLeft as string, r.inspectionDays as number) },
      { header: "التأمين", subHeader: "Insurance", render: (r: Row) => cell(r.insurance as string, r.insuranceLeft as string, r.insuranceDays as number) },
      { header: "الاستمارة", subHeader: "Registration", render: (r: Row) => cell(r.registration as string, r.registrationLeft as string, r.registrationDays as number) },
    ],
    rows,
    branding,
    { titleEn: `${titleEn} · ${summary}` }
  );
  const pdf = await renderHtmlToPdf(html, { footerLabel: L(titleAr, titleEn) });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="vehicles.pdf"`);
  return res.send(pdf);
});
