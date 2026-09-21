import { z } from "zod";
import { emptyToUndefined } from "@/utils/zodHelpers";

export const employeeDocumentTypeEnum = z.enum([
  "IQAMA",
  "PASSPORT",
  "HEALTH_CERTIFICATE",
  "MEDICAL_INSURANCE",
  "EMPLOYMENT_CONTRACT",
  "VISA",
  "EXIT_REENTRY_VISA",
  "FINAL_EXIT_VISA",
  "FLIGHT_TICKET",
  "DRIVING_LICENSE",
  "OTHER",
]);

const dateField = z
  .union([z.string(), z.date()])
  .optional()
  .transform((v) => (v ? new Date(v) : undefined));

export const createEmployeeDocumentSchema = z.object({
  type: employeeDocumentTypeEnum,
  name: emptyToUndefined(z.string().max(150).optional()),
  documentNumber: emptyToUndefined(z.string().max(100).optional()),
  issuingAuthority: emptyToUndefined(z.string().max(150).optional()),
  issueDate: dateField,
  startDate: dateField,
  expiryDate: dateField,
  fileId: emptyToUndefined(z.string().optional()),
  notes: emptyToUndefined(z.string().max(2000).optional()),
});

export const updateEmployeeDocumentSchema = createEmployeeDocumentSchema.partial();

export const paramsSchema = z.object({ employeeId: z.string().min(1), id: z.string().min(1).optional() });
