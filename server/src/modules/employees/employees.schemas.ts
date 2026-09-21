import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import { emptyToUndefined } from "@/utils/zodHelpers";

export const genderEnum = z.enum(["MALE", "FEMALE"]);
export const employmentStatusEnum = z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]);

const dateField = z
  .union([z.string(), z.date()])
  .optional()
  .transform((v) => (v ? new Date(v) : undefined));

const optStr = (max: number) => emptyToUndefined(z.string().max(max).optional());

export const createEmployeeSchema = z.object({
  employeeNumber: optStr(50),
  fullNameAr: z.string().min(2).max(150),
  fullNameEn: optStr(150),
  nationality: optStr(80),
  gender: emptyToUndefined(genderEnum.optional()),
  dateOfBirth: dateField,
  mobile: optStr(30),
  email: emptyToUndefined(z.string().email().optional()),
  address: optStr(255),
  city: optStr(100),
  jobTitle: optStr(150),
  department: optStr(150),
  branchId: emptyToUndefined(z.string().optional()),
  joiningDate: dateField,
  employmentStatus: employmentStatusEnum.default("ACTIVE"),
  notes: optStr(2000),

  iqamaNumber: optStr(50),
  iqamaIssueDate: dateField,
  iqamaExpiryDate: dateField,
  iqamaFileId: emptyToUndefined(z.string().optional()),

  passportNumber: optStr(50),
  passportCountry: optStr(80),
  passportIssueDate: dateField,
  passportExpiryDate: dateField,
  passportFileId: emptyToUndefined(z.string().optional()),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const listEmployeesQuerySchema = paginationSchema.extend({
  branchId: z.string().optional(),
  employmentStatus: employmentStatusEnum.optional(),
  department: z.string().optional(),
  expiryStatus: z.enum(["VALID", "EXPIRING_SOON", "EXPIRED"]).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
