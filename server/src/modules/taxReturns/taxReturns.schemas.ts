import { z } from "zod";

export const listTaxReturnsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  kind: z.enum(["VAT", "ZAKAT"]).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  status: z.enum(["DRAFT", "FILED", "PAID"]).optional(),
  branchId: z.string().optional(),
  search: z.string().optional(),
});

export const createTaxReturnSchema = z.object({
  kind: z.enum(["VAT", "ZAKAT"]),
  branchId: z.string().nullable().optional(),
  year: z.coerce.number().int().min(2000).max(2100),
  quarter: z.coerce.number().int().min(1).max(4).nullable().optional(),
  dueDate: z.string().min(1),
  status: z.enum(["DRAFT", "FILED", "PAID"]).default("DRAFT"),
  salesStandard: z.coerce.number().default(0),
  salesZero: z.coerce.number().default(0),
  salesExports: z.coerce.number().default(0),
  salesExempt: z.coerce.number().default(0),
  purchasesStandard: z.coerce.number().default(0),
  purchasesImports: z.coerce.number().default(0),
  purchasesZero: z.coerce.number().default(0),
  purchasesExempt: z.coerce.number().default(0),
  outputVat: z.coerce.number().default(0),
  inputVat: z.coerce.number().default(0),
  corrections: z.coerce.number().default(0),
  zakatBase: z.coerce.number().nullable().optional(),
  amount: z.coerce.number().default(0),
  penalty: z.coerce.number().default(0),
  filedDate: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  sadadNumber: z.string().nullable().optional(),
  fileId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateTaxReturnSchema = createTaxReturnSchema.partial();

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const statsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  branchId: z.string().optional(),
});

export type ListTaxReturnsQuery = z.infer<typeof listTaxReturnsQuerySchema>;
export type CreateTaxReturnInput = z.infer<typeof createTaxReturnSchema>;
export type UpdateTaxReturnInput = z.infer<typeof updateTaxReturnSchema>;
