import { z } from "zod";

export const formatQuerySchema = z.object({ format: z.enum(["json", "xlsx", "pdf", "csv"]).default("json") });

export const employeeReportQuerySchema = formatQuerySchema.extend({
  branchId: z.string().optional(),
  department: z.string().optional(),
  employmentStatus: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]).optional(),
});

export const documentsReportQuerySchema = formatQuerySchema.extend({
  status: z.enum(["VALID", "EXPIRING_SOON", "EXPIRED"]).optional(),
  sourceType: z.enum(["EMPLOYEE", "EMPLOYEE_IQAMA", "EMPLOYEE_PASSPORT", "EMPLOYEE_DOCUMENT", "COMPANY_DOCUMENT", "VEHICLE"]).optional(),
  /** One kind of document: IQAMA, PASSPORT, HEALTH_CERTIFICATE, COMMERCIAL_REGISTRATION… */
  category: z.string().max(60).optional(),
  /** "sponsored": every establishment document, and only the documents of employees on the company's sponsorship. */
  scope: z.enum(["all", "sponsored"]).optional(),
});

export const paymentsReportQuerySchema = formatQuerySchema.extend({
  branchId: z.string().optional(),
  category: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const activityReportQuerySchema = formatQuerySchema.extend({
  module: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const taxReportQuerySchema = formatQuerySchema.extend({
  year: z.coerce.number().int().min(2000).max(2100),
  kind: z.enum(["VAT", "ZAKAT"]).optional(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  ownerName: z.string().trim().max(200).optional(),
});
export const violationReportQuerySchema = formatQuerySchema.extend({
  state: z.enum(["all", "overdue", "open", "objection", "done"]).default("all"),
});
