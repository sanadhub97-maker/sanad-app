import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";

// Canonical header -> field mapping. Matching is case-insensitive and tries
// every alias so the bundled template (see employeesTemplate.ts) always
// round-trips, while still tolerating minor header edits by end users (§25).
const HEADER_ALIASES: Record<string, string> = {
  "employee number": "employeeNumber",
  "full name (arabic)": "fullNameAr",
  "full name ar": "fullNameAr",
  "full name (english)": "fullNameEn",
  "full name en": "fullNameEn",
  nationality: "nationality",
  gender: "gender",
  "date of birth": "dateOfBirth",
  mobile: "mobile",
  email: "email",
  "job title": "jobTitle",
  department: "department",
  "branch code": "branchCode",
  "joining date": "joiningDate",
  "employment status": "employmentStatus",
  "iqama number": "iqamaNumber",
  "iqama issue date": "iqamaIssueDate",
  "iqama expiry date": "iqamaExpiryDate",
  "passport number": "passportNumber",
  "passport country": "passportCountry",
  "passport issue date": "passportIssueDate",
  "passport expiry date": "passportExpiryDate",
  notes: "notes",
};

const REQUIRED_FIELDS = ["employeeNumber", "fullNameAr"];
const GENDER_VALUES = new Set(["MALE", "FEMALE"]);
const EMPLOYMENT_STATUS_VALUES = new Set(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_FIELDS = ["dateOfBirth", "joiningDate", "iqamaIssueDate", "iqamaExpiryDate", "passportIssueDate", "passportExpiryDate"];

export interface RowError {
  rowNumber: number;
  field?: string;
  message: string;
  rawData?: Record<string, unknown>;
}

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, unknown>;
}

function excelDateToJs(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30).
    return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}

export async function parseWorkbook(buffer: Buffer): Promise<{ rows: ParsedRow[]; parseErrors: RowError[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw ApiError.badRequest("The uploaded file has no worksheets.");

  const headerRow = sheet.getRow(1);
  const fieldByColumn = new Map<number, string>();
  headerRow.eachCell((cell, colNumber) => {
    const raw = String(cell.value ?? "").trim().toLowerCase();
    const field = HEADER_ALIASES[raw];
    if (field) fieldByColumn.set(colNumber, field);
  });

  if (fieldByColumn.size === 0) {
    throw ApiError.badRequest("Could not recognize any columns. Please use the provided template.");
  }

  const rows: ParsedRow[] = [];
  const parseErrors: RowError[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const data: Record<string, unknown> = {};
    let isEmpty = true;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const field = fieldByColumn.get(colNumber);
      if (!field) return;
      let value: unknown = cell.value;
      if (value && typeof value === "object" && "result" in value) value = (value as { result: unknown }).result;
      if (value !== null && value !== undefined && value !== "") isEmpty = false;
      data[field] = DATE_FIELDS.includes(field) ? excelDateToJs(value) ?? value : value;
    });

    if (!isEmpty) rows.push({ rowNumber, data });
  });

  return { rows, parseErrors };
}

export function validateRow(row: ParsedRow, seenEmployeeNumbers: Set<string>): RowError[] {
  const errors: RowError[] = [];
  const { data, rowNumber } = row;

  for (const field of REQUIRED_FIELDS) {
    if (!data[field]) errors.push({ rowNumber, field, message: `${field} is required`, rawData: data });
  }

  const employeeNumber = String(data.employeeNumber ?? "").trim();
  if (employeeNumber) {
    if (seenEmployeeNumbers.has(employeeNumber)) {
      errors.push({ rowNumber, field: "employeeNumber", message: `Duplicate employee number "${employeeNumber}" within this file`, rawData: data });
    }
    seenEmployeeNumbers.add(employeeNumber);
  }

  if (data.gender && !GENDER_VALUES.has(String(data.gender).toUpperCase())) {
    errors.push({ rowNumber, field: "gender", message: `Invalid gender "${data.gender}" (expected MALE or FEMALE)`, rawData: data });
  }
  if (data.employmentStatus && !EMPLOYMENT_STATUS_VALUES.has(String(data.employmentStatus).toUpperCase())) {
    errors.push({ rowNumber, field: "employmentStatus", message: `Invalid employment status "${data.employmentStatus}"`, rawData: data });
  }
  if (data.email && !EMAIL_RE.test(String(data.email))) {
    errors.push({ rowNumber, field: "email", message: `Invalid email address "${data.email}"`, rawData: data });
  }
  for (const field of DATE_FIELDS) {
    if (data[field] !== undefined && !(data[field] instanceof Date)) {
      errors.push({ rowNumber, field, message: `Invalid date value for ${field}: "${data[field]}"`, rawData: data });
    }
  }

  return errors;
}

export interface ImportSummary {
  importJobId: string;
  totalRows: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: RowError[];
}

export async function importEmployees(buffer: Buffer, fileName: string, createdById: string, dryRun: boolean): Promise<ImportSummary> {
  const { rows, parseErrors } = await parseWorkbook(buffer);

  const seen = new Set<string>();
  const rowErrors = new Map<number, RowError[]>();
  for (const row of rows) {
    const errs = validateRow(row, seen);
    if (errs.length) rowErrors.set(row.rowNumber, errs);
  }

  const branches = await prisma.branch.findMany({ select: { id: true, code: true } });
  const branchIdByCode = new Map(branches.map((b) => [b.code.toUpperCase(), b.id]));

  const existing = await prisma.employee.findMany({
    where: { employeeNumber: { in: rows.map((r) => String(r.data.employeeNumber ?? "")) } },
    select: { id: true, employeeNumber: true },
  });
  const existingByNumber = new Map(existing.map((e) => [e.employeeNumber, e.id]));

  const importJob = await prisma.importJob.create({
    data: { module: "employees", fileName, status: "PROCESSING", totalRows: rows.length, createdById },
  });

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const allErrors: RowError[] = [...parseErrors];

  for (const row of rows) {
    const errs = rowErrors.get(row.rowNumber);
    if (errs?.length) {
      allErrors.push(...errs);
      skippedCount++;
      continue;
    }

    const { branchCode, ...rest } = row.data as Record<string, unknown> & { branchCode?: string };
    const branchId = branchCode ? branchIdByCode.get(String(branchCode).toUpperCase()) : undefined;
    if (branchCode && !branchId) {
      allErrors.push({ rowNumber: row.rowNumber, field: "branchCode", message: `Unknown branch code "${branchCode}"`, rawData: row.data });
      skippedCount++;
      continue;
    }

    const employeeNumber = String(rest.employeeNumber);
    const payload = {
      ...rest,
      employeeNumber,
      gender: rest.gender ? String(rest.gender).toUpperCase() : undefined,
      employmentStatus: rest.employmentStatus ? String(rest.employmentStatus).toUpperCase() : "ACTIVE",
      branchId,
    };

    if (dryRun) {
      existingByNumber.has(employeeNumber) ? updatedCount++ : importedCount++;
      continue;
    }

    try {
      const existingId = existingByNumber.get(employeeNumber);
      if (existingId) {
        await prisma.employee.update({ where: { id: existingId }, data: payload as never });
        updatedCount++;
      } else {
        await prisma.employee.create({ data: payload as never });
        importedCount++;
      }
    } catch (err) {
      allErrors.push({ rowNumber: row.rowNumber, message: `Database error: ${(err as Error).message}`, rawData: row.data });
      skippedCount++;
    }
  }

  if (!dryRun) {
    await prisma.$transaction([
      prisma.importJob.update({
        where: { id: importJob.id },
        data: {
          status: "COMPLETED",
          importedCount,
          updatedCount,
          skippedCount,
          failedCount: allErrors.length,
          completedAt: new Date(),
        },
      }),
      ...(allErrors.length
        ? [
            prisma.importError.createMany({
              data: allErrors.map((e) => ({
                importJobId: importJob.id,
                rowNumber: e.rowNumber,
                field: e.field,
                message: e.message,
                rawData: (e.rawData ?? {}) as never,
              })),
            }),
          ]
        : []),
    ]);
  }

  return {
    importJobId: importJob.id,
    totalRows: rows.length,
    importedCount,
    updatedCount,
    skippedCount,
    failedCount: allErrors.length,
    errors: allErrors,
  };
}
