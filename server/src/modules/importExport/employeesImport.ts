import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";

// Canonical header -> field mapping. Matching is case-insensitive and tries
// every alias (Arabic, English, Bilingual) so the bundled template always
// round-trips smoothly, while tolerating minor header edits by end users.
const HEADER_ALIASES: Record<string, string> = {
  // English
  "employee number": "employeeNumber",
  "employee no": "employeeNumber",
  "full name (arabic)": "fullNameAr",
  "full name ar": "fullNameAr",
  "full name (english)": "fullNameEn",
  "full name en": "fullNameEn",
  nationality: "nationality",
  gender: "gender",
  "date of birth": "dateOfBirth",
  mobile: "mobile",
  "mobile number": "mobile",
  email: "email",
  "email address": "email",
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

  // Arabic
  "رقم الموظف": "employeeNumber",
  "الاسم الكامل (عربي)": "fullNameAr",
  "الاسم الكامل عربي": "fullNameAr",
  "الاسم الكامل بالعربي": "fullNameAr",
  "الاسم بالعربي": "fullNameAr",
  "الاسم الكامل (إنجليزي)": "fullNameEn",
  "الاسم الكامل انجليزي": "fullNameEn",
  "الاسم الكامل بالإنجليزي": "fullNameEn",
  "الاسم بالإنجليزي": "fullNameEn",
  "الجنسية": "nationality",
  "الجنس": "gender",
  "تاريخ الميلاد": "dateOfBirth",
  "رقم الجوال": "mobile",
  "الجوال": "mobile",
  "البريد الإلكتروني": "email",
  "البريد الالكتروني": "email",
  "المسمى الوظيفي": "jobTitle",
  "القسم": "department",
  "القسم / الإدارة": "department",
  "القسم / الادارة": "department",
  "الإدارة": "department",
  "الادارة": "department",
  "رمز الفرع": "branchCode",
  "كود الفرع": "branchCode",
  "تاريخ الالتحاق": "joiningDate",
  "تاريخ التعيين": "joiningDate",
  "تاريخ المباشرة": "joiningDate",
  "الحالة الوظيفية": "employmentStatus",
  "حالة الموظف": "employmentStatus",
  "رقم الإقامة": "iqamaNumber",
  "رقم الاقامة": "iqamaNumber",
  "رقم الإقامة / الهوية": "iqamaNumber",
  "رقم الاقامة / الهوية": "iqamaNumber",
  "رقم الهوية": "iqamaNumber",
  "تاريخ إصدار الإقامة": "iqamaIssueDate",
  "تاريخ اصدار الاقامة": "iqamaIssueDate",
  "تاريخ انتهاء الإقامة": "iqamaExpiryDate",
  "تاريخ انتهاء الاقامة": "iqamaExpiryDate",
  "رقم جواز السفر": "passportNumber",
  "رقم الجواز": "passportNumber",
  "دولة إصدار الجواز": "passportCountry",
  "دولة اصدار الجواز": "passportCountry",
  "بلد الإصدار": "passportCountry",
  "بلد الاصدار": "passportCountry",
  "تاريخ إصدار الجواز": "passportIssueDate",
  "تاريخ اصدار الجواز": "passportIssueDate",
  "تاريخ انتهاء الجواز": "passportExpiryDate",
  "ملاحظات إضافية": "notes",
  "ملاحظات": "notes",
};

function matchHeader(raw: string): string | undefined {
  if (!raw) return undefined;
  // 1. Direct or normalized match (removing punctuation, asterisks, brackets)
  const norm = raw
    .toLowerCase()
    .replace(/[*()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (HEADER_ALIASES[norm]) return HEADER_ALIASES[norm];
  if (HEADER_ALIASES[raw.trim().toLowerCase()]) return HEADER_ALIASES[raw.trim().toLowerCase()];

  // 2. Split by newline (for bilingual headers like "رقم الموظف\n(Employee Number)")
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const lineNorm = line
      .toLowerCase()
      .replace(/[*()]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (HEADER_ALIASES[lineNorm]) return HEADER_ALIASES[lineNorm];
  }

  return undefined;
}

const REQUIRED_FIELDS = ["employeeNumber", "fullNameAr"];
const GENDER_VALUES = new Set(["MALE", "FEMALE"]);
const EMPLOYMENT_STATUS_VALUES = new Set(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_FIELDS = [
  "dateOfBirth",
  "joiningDate",
  "iqamaIssueDate",
  "iqamaExpiryDate",
  "passportIssueDate",
  "passportExpiryDate",
];

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
  if (!sheet) throw ApiError.badRequest("الملف المرفوع لا يحتوي على أوراق عمل صالحة.");

  let headerRowNumber = 1;
  const fieldByColumn = new Map<number, string>();

  // Scan rows 1 through 10 to locate the true header row
  for (let r = 1; r <= 10; r++) {
    const candidateRow = sheet.getRow(r);
    const candidateMatches = new Map<number, string>();

    candidateRow.eachCell((cell, colNumber) => {
      const val = String(cell.value ?? "");
      const field = matchHeader(val);
      if (field) candidateMatches.set(colNumber, field);
    });

    // If we recognize at least 2 distinct valid fields, this is the header row
    if (candidateMatches.size >= 2) {
      headerRowNumber = r;
      candidateMatches.forEach((f, c) => fieldByColumn.set(c, f));
      break;
    }
  }

  if (fieldByColumn.size === 0) {
    throw ApiError.badRequest(
      "لم يتم التعرف على أعمدة الجدول. يرجى استخدام قالب استيراد الموظفين المعتمد من النظام."
    );
  }

  const rows: ParsedRow[] = [];
  const parseErrors: RowError[] = [];

  sheet.eachRow((row, rowNumber) => {
    // Skip header and any banner rows above it
    if (rowNumber <= headerRowNumber) return;

    const data: Record<string, unknown> = {};
    let isEmpty = true;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const field = fieldByColumn.get(colNumber);
      if (!field) return;

      let value: unknown = cell.value;
      if (value && typeof value === "object" && "result" in value) {
        value = (value as { result: unknown }).result;
      }
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        isEmpty = false;
      }
      data[field] = DATE_FIELDS.includes(field) ? excelDateToJs(value) ?? value : value;
    });

    if (isEmpty) return;

    // Check and skip the example row if not removed by user
    const empNum = String(data.employeeNumber ?? "").trim();
    const notes = String(data.notes ?? "").trim().toLowerCase();
    if (
      empNum === "EMP-0001" &&
      (notes.includes("مثال") || notes.includes("example") || notes.includes("استرشادي") || notes.includes("حذف"))
    ) {
      return;
    }

    // Normalize Arabic Enums -> English canonical database enums
    if (data.gender) {
      const g = String(data.gender).trim().toUpperCase();
      if (g === "ذكر" || g === "MALE") data.gender = "MALE";
      else if (g === "أنثى" || g === "انثى" || g === "FEMALE") data.gender = "FEMALE";
    }

    if (data.employmentStatus) {
      const s = String(data.employmentStatus).trim();
      if (s === "نشط" || s.toUpperCase() === "ACTIVE") data.employmentStatus = "ACTIVE";
      else if (s === "غير نشط" || s.toUpperCase() === "INACTIVE") data.employmentStatus = "INACTIVE";
      else if (s.includes("إجازة") || s.includes("اجازة") || s.toUpperCase() === "ON_LEAVE") {
        data.employmentStatus = "ON_LEAVE";
      } else if (
        s.includes("منتهي") ||
        s.includes("مفصول") ||
        s.includes("مستقيل") ||
        s.toUpperCase() === "TERMINATED"
      ) {
        data.employmentStatus = "TERMINATED";
      }
    }

    rows.push({ rowNumber, data });
  });

  return { rows, parseErrors };
}

export function validateRow(row: ParsedRow, seenEmployeeNumbers: Set<string>): RowError[] {
  const errors: RowError[] = [];
  const { data, rowNumber } = row;

  for (const field of REQUIRED_FIELDS) {
    if (!data[field]) {
      const fieldAr = field === "employeeNumber" ? "رقم الموظف" : "الاسم الكامل (عربي)";
      errors.push({
        rowNumber,
        field,
        message: `حقل (${fieldAr}) مطلوب ولا يمكن تركه فارغاً`,
        rawData: data,
      });
    }
  }

  const employeeNumber = String(data.employeeNumber ?? "").trim();
  if (employeeNumber) {
    if (seenEmployeeNumbers.has(employeeNumber)) {
      errors.push({
        rowNumber,
        field: "employeeNumber",
        message: `رقم الموظف "${employeeNumber}" مكرر داخل هذا الملف`,
        rawData: data,
      });
    }
    seenEmployeeNumbers.add(employeeNumber);
  }

  if (data.gender && !GENDER_VALUES.has(String(data.gender).toUpperCase())) {
    errors.push({
      rowNumber,
      field: "gender",
      message: `قيمة الجنس غير صحيحة "${data.gender}" (المقبول: MALE أو FEMALE أو ذكر / أنثى)`,
      rawData: data,
    });
  }

  if (data.employmentStatus && !EMPLOYMENT_STATUS_VALUES.has(String(data.employmentStatus).toUpperCase())) {
    errors.push({
      rowNumber,
      field: "employmentStatus",
      message: `الحالة الوظيفية غير صحيحة "${data.employmentStatus}"`,
      rawData: data,
    });
  }

  if (data.email && !EMAIL_RE.test(String(data.email))) {
    errors.push({
      rowNumber,
      field: "email",
      message: `صيغة البريد الإلكتروني غير صحيحة "${data.email}"`,
      rawData: data,
    });
  }

  for (const field of DATE_FIELDS) {
    if (data[field] !== undefined && !(data[field] instanceof Date)) {
      errors.push({
        rowNumber,
        field,
        message: `صيغة التاريخ غير صحيحة في ${field}: "${data[field]}" (المطلوب YYYY-MM-DD)`,
        rawData: data,
      });
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

export async function importEmployees(
  buffer: Buffer,
  fileName: string,
  createdById: string,
  dryRun: boolean
): Promise<ImportSummary> {
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
    data: {
      module: "employees",
      fileName,
      status: "PROCESSING",
      totalRows: rows.length,
      createdById,
    },
  });

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const allErrors: RowError[] = [...parseErrors];

  for (const row of rows) {
    const errs = rowErrors.get(row.rowNumber);
    if (errs && errs.length) {
      allErrors.push(...errs);
      continue;
    }

    const { data } = row;
    const employeeNumber = String(data.employeeNumber).trim();
    const existingId = existingByNumber.get(employeeNumber);

    let branchId: string | undefined;
    if (data.branchCode) {
      const code = String(data.branchCode).trim().toUpperCase();
      branchId = branchIdByCode.get(code);
      if (!branchId) {
        allErrors.push({
          rowNumber: row.rowNumber,
          field: "branchCode",
          message: `كود الفرع "${data.branchCode}" غير موجود بالنظام`,
          rawData: data,
        });
        continue;
      }
    }

    const payload = {
      employeeNumber,
      fullNameAr: String(data.fullNameAr).trim(),
      fullNameEn: data.fullNameEn ? String(data.fullNameEn).trim() : undefined,
      nationality: data.nationality ? String(data.nationality).trim() : undefined,
      gender: data.gender as "MALE" | "FEMALE" | undefined,
      dateOfBirth: data.dateOfBirth as Date | undefined,
      mobile: data.mobile ? String(data.mobile).trim() : undefined,
      email: data.email ? String(data.email).trim() : undefined,
      jobTitle: data.jobTitle ? String(data.jobTitle).trim() : undefined,
      department: data.department ? String(data.department).trim() : undefined,
      branchId,
      joiningDate: data.joiningDate as Date | undefined,
      employmentStatus: (data.employmentStatus as "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED") ?? "ACTIVE",
      notes: data.notes ? String(data.notes).trim() : undefined,
      iqamaNumber: data.iqamaNumber ? String(data.iqamaNumber).trim() : undefined,
      iqamaIssueDate: data.iqamaIssueDate as Date | undefined,
      iqamaExpiryDate: data.iqamaExpiryDate as Date | undefined,
      passportNumber: data.passportNumber ? String(data.passportNumber).trim() : undefined,
      passportCountry: data.passportCountry ? String(data.passportCountry).trim() : undefined,
      passportIssueDate: data.passportIssueDate as Date | undefined,
      passportExpiryDate: data.passportExpiryDate as Date | undefined,
    };

    if (!dryRun) {
      try {
        if (existingId) {
          await prisma.employee.update({ where: { id: existingId }, data: payload });
          updatedCount++;
        } else {
          await prisma.employee.create({ data: payload });
          importedCount++;
        }
      } catch (err) {
        allErrors.push({
          rowNumber: row.rowNumber,
          message: (err as Error).message,
          rawData: data,
        });
      }
    } else {
      if (existingId) updatedCount++;
      else importedCount++;
    }
  }

  const failedCount = allErrors.length;
  const status: "COMPLETED" | "FAILED" = failedCount === rows.length && rows.length > 0 ? "FAILED" : "COMPLETED";

  await prisma.importJob.update({
    where: { id: importJob.id },
    data: {
      status,
      importedCount,
      updatedCount,
      skippedCount,
      failedCount,
      completedAt: new Date(),
      errors: allErrors.length
        ? {
            create: allErrors.map((e) => ({
              rowNumber: e.rowNumber,
              field: e.field,
              message: e.message,
              rawData: e.rawData as never,
            })),
          }
        : undefined,
    },
  });

  return {
    importJobId: importJob.id,
    totalRows: rows.length,
    importedCount,
    updatedCount,
    skippedCount,
    failedCount,
    errors: allErrors,
  };
}
