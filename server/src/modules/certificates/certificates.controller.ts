import crypto from "crypto";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { renderHtmlToPdf } from "@/services/pdf";
import { getBrandingContext, getEstablishmentBranding } from "@/services/branding";
import { L, isEn } from "@/services/lang";
import { printParty } from "@/modules/custody/custody.service";
import type { PrintEstablishment } from "@/modules/custody/custody.print";
import { experienceHtml, salaryHtml, type CertSigners } from "./certificates.print";
import type {
  ExperienceQuery,
  ListSavedCertificatesQuery,
  SalaryQuery,
  SaveExperienceInput,
  SaveSalaryInput,
} from "./certificates.schemas";

const asDate = (v: string | undefined) => (v ? new Date(`${v}T00:00:00Z`) : null);
const todayRiyadh = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });

const SAVED_CERTS_KEY = "certificates.saved.v1";

export interface StoredCertificateRecord {
  id: string;
  kind: "SALARY" | "EXPERIENCE";
  number: string;
  employeeId: string;
  establishment: "employee" | "manual";
  estName?: string | null;
  estNameEn?: string | null;
  estCr?: string | null;
  estCity?: string | null;
  jobTitle?: string | null;
  startDate?: string | null;
  issueDate: string;
  note?: string | null;
  names: string[];
  // Experience fields
  endDate?: string | null;
  stillWorking?: boolean;
  conduct?: boolean;
  // Salary fields
  recipient?: string | null;
  basic?: number;
  housing?: number;
  transport?: number;
  others?: { label: string; amount: number }[];
  toBank?: boolean;
  bankName?: string | null;
  iban?: string | null;
  createdAt: string;
  updatedAt: string;
}

async function readStoredCertificates(): Promise<StoredCertificateRecord[]> {
  const row = await prisma.setting.findUnique({ where: { key: SAVED_CERTS_KEY } });
  if (!row || !Array.isArray(row.value)) return [];
  return row.value as unknown as StoredCertificateRecord[];
}

async function writeStoredCertificates(records: StoredCertificateRecord[]) {
  const value = records as unknown as Prisma.InputJsonValue;
  await prisma.setting.upsert({
    where: { key: SAVED_CERTS_KEY },
    create: { key: SAVED_CERTS_KEY, value },
    update: { value },
  });
}

function nextCertNumber(kind: "SALARY" | "EXPERIENCE", issueDate: string, existing: StoredCertificateRecord[]) {
  const prefix = kind === "SALARY" ? "SAL" : "EXP";
  const year = (issueDate || todayRiyadh()).slice(0, 4);
  const head = `${prefix}-${year}-`;
  let maxSeq = 0;
  for (const r of existing) {
    if (r.number.startsWith(head)) {
      const n = Number(r.number.slice(head.length));
      if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
    }
  }
  return `${head}${String(maxSeq + 1).padStart(4, "0")}`;
}

async function hydrateCertificates(records: StoredCertificateRecord[]) {
  if (!records.length) return [];
  const empIds = Array.from(new Set(records.map((r) => r.employeeId)));
  const employees = await prisma.employee.findMany({
    where: { id: { in: empIds }, deletedAt: null },
    select: {
      id: true,
      employeeNumber: true,
      fullNameAr: true,
      fullNameEn: true,
      jobTitle: true,
      jobTitleEn: true,
      iqamaNumber: true,
      branchId: true,
      branch: { select: { id: true, name: true, nameEn: true, logoFileId: true } },
    },
  });
  const empMap = new Map(employees.map((e) => [e.id, e]));
  return records
    .map((r) => {
      const employee = empMap.get(r.employeeId);
      if (!employee) return null;
      const totalSalary =
        r.kind === "SALARY"
          ? Math.round(((r.basic ?? 0) + (r.housing ?? 0) + (r.transport ?? 0) + (r.others ?? []).reduce((a, p) => a + p.amount, 0)) * 100) / 100
          : 0;
      return {
        ...r,
        totalSalary,
        employee,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

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

/** List saved certificates (SALARY or EXPERIENCE). */
export const listSaved = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListSavedCertificatesQuery;
  const all = await readStoredCertificates();
  const filteredByKind = query.kind ? all.filter((r) => r.kind === query.kind) : all;
  const filteredByEmp = query.employeeId ? filteredByKind.filter((r) => r.employeeId === query.employeeId) : filteredByKind;
  const hydrated = await hydrateCertificates(filteredByEmp);
  const q = query.q?.trim().toLowerCase();
  const result = q
    ? hydrated.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.employee.fullNameAr.toLowerCase().includes(q) ||
          (r.employee.fullNameEn ?? "").toLowerCase().includes(q) ||
          r.employee.employeeNumber.toLowerCase().includes(q) ||
          (r.jobTitle ?? "").toLowerCase().includes(q) ||
          (r.estName ?? "").toLowerCase().includes(q) ||
          (r.recipient ?? "").toLowerCase().includes(q)
      )
    : hydrated;
  result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ data: result });
});

/** Create/save an experience certificate. */
export const createExperience = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as SaveExperienceInput;
  const emp = await prisma.employee.findFirst({ where: { id: input.employeeId, deletedAt: null }, select: { id: true } });
  if (!emp) throw ApiError.notFound("Employee not found");
  const all = await readStoredCertificates();
  const issueDate = input.issueDate ?? todayRiyadh();
  const now = new Date().toISOString();
  const record: StoredCertificateRecord = {
    id: crypto.randomUUID(),
    kind: "EXPERIENCE",
    number: nextCertNumber("EXPERIENCE", issueDate, all),
    employeeId: input.employeeId,
    establishment: input.establishment,
    estName: input.estName ?? null,
    estNameEn: input.estNameEn ?? null,
    estCr: input.estCr ?? null,
    estCity: input.estCity ?? null,
    jobTitle: input.jobTitle ?? null,
    startDate: input.startDate ?? null,
    endDate: input.stillWorking ? null : input.endDate ?? null,
    stillWorking: input.stillWorking,
    conduct: input.conduct,
    note: input.note ?? null,
    names: input.names ?? [],
    issueDate,
    createdAt: now,
    updatedAt: now,
  };
  all.unshift(record);
  await writeStoredCertificates(all);
  const [hydrated] = await hydrateCertificates([record]);
  res.status(201).json({ data: hydrated });
});

/** Update a saved experience certificate. */
export const updateExperience = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = req.body as SaveExperienceInput;
  const emp = await prisma.employee.findFirst({ where: { id: input.employeeId, deletedAt: null }, select: { id: true } });
  if (!emp) throw ApiError.notFound("Employee not found");
  const all = await readStoredCertificates();
  const idx = all.findIndex((r) => r.id === id && r.kind === "EXPERIENCE");
  if (idx === -1) throw ApiError.notFound("Certificate not found");
  const updated: StoredCertificateRecord = {
    ...all[idx],
    employeeId: input.employeeId,
    establishment: input.establishment,
    estName: input.estName ?? null,
    estNameEn: input.estNameEn ?? null,
    estCr: input.estCr ?? null,
    estCity: input.estCity ?? null,
    jobTitle: input.jobTitle ?? null,
    startDate: input.startDate ?? null,
    endDate: input.stillWorking ? null : input.endDate ?? null,
    stillWorking: input.stillWorking,
    conduct: input.conduct,
    note: input.note ?? null,
    names: input.names ?? [],
    issueDate: input.issueDate ?? all[idx].issueDate,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  await writeStoredCertificates(all);
  const [hydrated] = await hydrateCertificates([updated]);
  res.json({ data: hydrated });
});

/** Create/save a salary certificate. */
export const createSalary = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as SaveSalaryInput;
  const emp = await prisma.employee.findFirst({ where: { id: input.employeeId, deletedAt: null }, select: { id: true } });
  if (!emp) throw ApiError.notFound("Employee not found");
  const all = await readStoredCertificates();
  const issueDate = input.issueDate ?? todayRiyadh();
  const now = new Date().toISOString();
  const record: StoredCertificateRecord = {
    id: crypto.randomUUID(),
    kind: "SALARY",
    number: nextCertNumber("SALARY", issueDate, all),
    employeeId: input.employeeId,
    establishment: input.establishment,
    estName: input.estName ?? null,
    estNameEn: input.estNameEn ?? null,
    estCr: input.estCr ?? null,
    estCity: input.estCity ?? null,
    jobTitle: input.jobTitle ?? null,
    startDate: input.startDate ?? null,
    recipient: input.recipient ?? null,
    basic: input.basic ?? 0,
    housing: input.housing ?? 0,
    transport: input.transport ?? 0,
    others: input.others ?? [],
    toBank: input.toBank,
    bankName: input.toBank ? input.bankName ?? null : null,
    iban: input.toBank ? input.iban ?? null : null,
    note: input.note ?? null,
    names: input.names ?? [],
    issueDate,
    createdAt: now,
    updatedAt: now,
  };
  all.unshift(record);
  await writeStoredCertificates(all);
  const [hydrated] = await hydrateCertificates([record]);
  res.status(201).json({ data: hydrated });
});

/** Update a saved salary certificate. */
export const updateSalary = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = req.body as SaveSalaryInput;
  const emp = await prisma.employee.findFirst({ where: { id: input.employeeId, deletedAt: null }, select: { id: true } });
  if (!emp) throw ApiError.notFound("Employee not found");
  const all = await readStoredCertificates();
  const idx = all.findIndex((r) => r.id === id && r.kind === "SALARY");
  if (idx === -1) throw ApiError.notFound("Certificate not found");
  const updated: StoredCertificateRecord = {
    ...all[idx],
    employeeId: input.employeeId,
    establishment: input.establishment,
    estName: input.estName ?? null,
    estNameEn: input.estNameEn ?? null,
    estCr: input.estCr ?? null,
    estCity: input.estCity ?? null,
    jobTitle: input.jobTitle ?? null,
    startDate: input.startDate ?? null,
    recipient: input.recipient ?? null,
    basic: input.basic ?? 0,
    housing: input.housing ?? 0,
    transport: input.transport ?? 0,
    others: input.others ?? [],
    toBank: input.toBank,
    bankName: input.toBank ? input.bankName ?? null : null,
    iban: input.toBank ? input.iban ?? null : null,
    note: input.note ?? null,
    names: input.names ?? [],
    issueDate: input.issueDate ?? all[idx].issueDate,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  await writeStoredCertificates(all);
  const [hydrated] = await hydrateCertificates([updated]);
  res.json({ data: hydrated });
});

/** Delete a saved certificate. */
export const removeSaved = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const all = await readStoredCertificates();
  const next = all.filter((r) => r.id !== id);
  if (next.length === all.length) throw ApiError.notFound("Certificate not found");
  await writeStoredCertificates(next);
  res.json({ data: { id } });
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
  const number = q.number || `EXP-${p.day}-${p.employee.employeeNumber}`;
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
  const number = q.number || `SAL-${p.day}-${p.employee.employeeNumber}`;
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
