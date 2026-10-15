import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext, getEstablishmentBranding } from "@/services/branding";
import { L, isEn } from "@/services/lang";
import { printParty } from "@/modules/custody/custody.service";
import type { PrintEstablishment } from "@/modules/custody/custody.print";
import { experienceHtml, salaryHtml, type CertSigners } from "./certificates.print";
import type { ExperienceQuery, SalaryQuery } from "./certificates.schemas";

const asDate = (v: string | undefined) => (v ? new Date(`${v}T00:00:00Z`) : null);
const todayRiyadh = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });

/** The employee and the letterhead: their establishment, or a name typed by hand. */
async function party(q: ExperienceQuery | SalaryQuery) {
  const employee = await prisma.employee.findFirst({
    where: { id: q.employeeId, deletedAt: null },
    select: {
      id: true, employeeNumber: true, fullNameAr: true, fullNameEn: true, jobTitle: true, jobTitleEn: true,
      nationality: true, nationalityEn: true, iqamaNumber: true, branchId: true, gender: true, joiningDate: true,
      branch: { select: { id: true, name: true, nameEn: true, logoFileId: true } },
    },
  });
  if (!employee) throw ApiError.notFound("Employee not found");
  const printed = await printParty(employee);
  let est: PrintEstablishment = printed.est;
  if (q.establishment === "manual") {
    // A name typed by hand prints with its own initial in the medallion, never another establishment's logo.
    const { brandColor } = await getEstablishmentBranding(null);
    est = { name: q.estName!, nameEn: q.estNameEn ?? null, cr: q.estCr ?? null, vat: null, city: q.estCity ?? null, phone: null, logoDataUrl: null, brandColor, logoTransparent: false };
  }
  const issue = q.issueDate ?? todayRiyadh();
  return {
    // the establishment's own stamp; a name typed by hand has none and gets the gold seal with that name
    stamp: q.establishment === "manual" ? null : printed.stamp,
    employee,
    est,
    emp: { ...printed.emp, female: employee.gender === "FEMALE" },
    job: q.jobTitle ?? printed.emp.job,
    start: asDate(q.startDate) ?? employee.joiningDate,
    issueDate: asDate(issue)!,
    day: issue.replace(/-/g, ""),
  };
}

/** The signatures in Settings → Print → Certificates, with this print's names in place of the saved ones. */
async function signers(names: string[] | undefined, stamp: string | null): Promise<CertSigners> {
  const { signatures, nameImages } = await getBrandingContext("certificate");
  const boxes = signatures.showSignatures ? signatures.certificate.boxes : [];
  return {
    boxes: boxes.map((b, i) => {
      const saved = (isEn() ? b.nameEn || b.nameAr : b.nameAr || b.nameEn) || "";
      return { title: (isEn() ? b.en || b.ar : b.ar || b.en) || "", name: names?.[i]?.trim() || saved.trim(), image: b.nameFileId ? nameImages[b.nameFileId] ?? null : null };
    }),
    seal: { show: signatures.showSeal, stamp },
  };
}

/** The signers a certificate prints with, for the form: titles, saved names, whether a stamp is uploaded. */
export const signersInfo = asyncHandler(async (_req: Request, res: Response) => {
  const { signatures } = await getBrandingContext("certificate");
  res.json({
    data: {
      showSignatures: signatures.showSignatures,
      showSeal: signatures.showSeal,
      boxes: signatures.certificate.boxes.map((b) => ({ ar: b.ar, en: b.en, nameAr: b.nameAr ?? "", nameEn: b.nameEn ?? "", hasNameImage: !!b.nameFileId })),
    },
  });
});

async function sendPdf(res: Response, number: string, html: string) {
  const pdf = await renderHtmlToPdf(html, { bare: true, fitSelector: ".ry .body" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${number}.pdf"`);
  res.send(pdf);
}

/** The experience certificate as a PDF. */
export const experiencePdf = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as ExperienceQuery;
  const p = await party(q);
  const number = `EXP-${p.day}-${p.employee.employeeNumber}`;
  const html = await experienceHtml({
    est: p.est, emp: p.emp, number, issueDate: p.issueDate, job: p.job, start: p.start,
    end: q.stillWorking ? null : asDate(q.endDate),
    stillWorking: q.stillWorking,
    conduct: q.conduct,
    note: q.note ?? null,
    signers: await signers(q.names, p.stamp),
  });
  await sendPdf(res, number, html);
});

/** The salary certificate as a PDF. */
export const salaryPdf = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as SalaryQuery;
  const p = await party(q);
  const number = `SAL-${p.day}-${p.employee.employeeNumber}`;
  const parts = [
    { label: L("الراتب الأساسي", "Basic salary"), amount: q.basic ?? 0 },
    { label: L("بدل السكن", "Housing allowance"), amount: q.housing ?? 0 },
    { label: L("بدل المواصلات", "Transport allowance"), amount: q.transport ?? 0 },
    ...(q.others ?? []),
  ];
  const html = await salaryHtml({
    est: p.est, emp: p.emp, number, issueDate: p.issueDate, job: p.job, start: p.start,
    recipient: q.recipient ?? null,
    parts,
    bank: q.bankName ? { name: q.bankName, iban: q.iban ?? null } : null,
    note: q.note ?? null,
    signers: await signers(q.names, p.stamp),
  });
  await sendPdf(res, number, html);
});
