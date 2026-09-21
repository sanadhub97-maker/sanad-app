import { z } from "zod";

export const formatQuerySchema = z.object({ format: z.enum(["json", "xlsx", "pdf", "csv"]).default("json") });

export const employeeReportQuerySchema = formatQuerySchema.extend({
  branchId: z.string().optional(),
  department: z.string().optional(),
  employmentStatus: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]).optional(),
});

export const documentsReportQuerySchema = formatQuerySchema.extend({
  status: z.enum(["VALID", "EXPIRING_SOON", "EXPIRED"]).optional(),
  sourceType: z.enum(["EMPLOYEE_IQAMA", "EMPLOYEE_PASSPORT", "EMPLOYEE_DOCUMENT", "COMPANY_DOCUMENT"]).optional(),
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
