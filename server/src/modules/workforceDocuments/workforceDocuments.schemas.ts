import { z } from "zod";
import { EmployeeDocumentType, DocumentStatus } from "@prisma/client";
import { emptyToUndefined } from "@/utils/zodHelpers";

export const listWorkforceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  q: emptyToUndefined(z.string().optional()),
  branchId: emptyToUndefined(z.string().optional()),
  status: z.nativeEnum(DocumentStatus).optional(),
  category: emptyToUndefined(z.string().optional()),
});

export type ListWorkforceQuery = z.infer<typeof listWorkforceQuerySchema>;

export const createWorkforceDocSchema = z.object({
  employeeId: z.string().min(1),
  type: z.nativeEnum(EmployeeDocumentType),
  name: emptyToUndefined(z.string().optional()),
  documentNumber: emptyToUndefined(z.string().optional()),
  issuingAuthority: emptyToUndefined(z.string().optional()),
  issueDate: emptyToUndefined(z.coerce.date().optional()),
  startDate: emptyToUndefined(z.coerce.date().optional()),
  expiryDate: emptyToUndefined(z.coerce.date().optional()),
  fileId: emptyToUndefined(z.string().optional()),
  notes: emptyToUndefined(z.string().optional()),
});

export const updateWorkforceDocSchema = createWorkforceDocSchema.partial();

export const idParamSchema = z.object({
  id: z.string().min(1),
});

