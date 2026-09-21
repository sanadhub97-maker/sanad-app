import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import { emptyToUndefined } from "@/utils/zodHelpers";

export const companyDocumentCategoryEnum = z.enum([
  "COMMERCIAL_REGISTRATION",
  "MUNICIPAL_LICENSE",
  "CIVIL_DEFENSE_LICENSE",
  "CIVIL_DEFENSE_REPORT",
  "CLEANING_CONTRACT",
  "LEASE_CONTRACT",
  "TWENTY_FOUR_HOUR_PERMIT",
  "ENTERTAINMENT_AUTHORITY_PERMIT",
  "TOBACCO_LICENSE",
  "OTHER",
]);

const dateField = z
  .union([z.string(), z.date()])
  .optional()
  .transform((v) => (v ? new Date(v) : undefined));

export const createCompanyDocumentSchema = z.object({
  category: companyDocumentCategoryEnum,
  name: z.string().min(2).max(150),
  documentNumber: emptyToUndefined(z.string().max(100).optional()),
  licenseNumber: emptyToUndefined(z.string().max(100).optional()),
  issuingAuthority: emptyToUndefined(z.string().max(150).optional()),
  branchId: emptyToUndefined(z.string().optional()),
  city: emptyToUndefined(z.string().max(100).optional()),
  issueDate: dateField,
  startDate: dateField,
  expiryDate: dateField,
  fileId: emptyToUndefined(z.string().optional()),
  notes: emptyToUndefined(z.string().max(2000).optional()),
});

export const updateCompanyDocumentSchema = createCompanyDocumentSchema.partial();

export const listCompanyDocumentsQuerySchema = paginationSchema.extend({
  category: companyDocumentCategoryEnum.optional(),
  branchId: z.string().optional(),
  expiryStatus: z.enum(["VALID", "EXPIRING_SOON", "EXPIRED"]).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
