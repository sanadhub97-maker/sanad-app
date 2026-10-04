import { z } from "zod";

const id = z.string().trim().min(1).max(80);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Use a valid calendar date");
const money = z.coerce.number().finite().min(0).max(999_999_999_999.99);
const signedMoney = z.coerce.number().finite().min(-999_999_999_999.99).max(999_999_999_999.99);

export const listTaxReturnsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  kind: z.enum(["VAT", "ZAKAT"]).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  status: z.enum(["DRAFT", "FILED", "PAID"]).optional(),
  branchId: id.optional(),
  search: z.string().trim().max(200).optional(),
});

export const createTaxReturnSchema = z.object({
  kind: z.enum(["VAT", "ZAKAT"]),
  branchId: id.nullable().optional(),
  year: z.coerce.number().int().min(2000).max(2100),
  quarter: z.coerce.number().int().min(1).max(4).nullable().optional(),
  dueDate: day,
  status: z.enum(["DRAFT", "FILED", "PAID"]).default("DRAFT"),
  salesStandard: money.default(0),
  salesZero: money.default(0),
  salesExports: money.default(0),
  salesExempt: money.default(0),
  purchasesStandard: money.default(0),
  purchasesImports: money.default(0),
  purchasesZero: money.default(0),
  purchasesExempt: money.default(0),
  outputVat: money.default(0),
  inputVat: money.default(0),
  corrections: signedMoney.default(0),
  zakatBase: money.nullable().optional(),
  amount: signedMoney.default(0),
  penalty: money.default(0),
  filedDate: day.nullable().optional(),
  reference: z.string().max(150).nullable().optional(),
  ownerName: z.string().trim().max(200).nullable().optional(),
  sadadNumber: z.string().max(100).nullable().optional(),
  fileId: id.nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

export const updateTaxReturnSchema = createTaxReturnSchema.partial();

export const idParamSchema = z.object({
  id,
});

export const statsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  branchId: id.optional(),
});

export type ListTaxReturnsQuery = z.infer<typeof listTaxReturnsQuerySchema>;
export type CreateTaxReturnInput = z.infer<typeof createTaxReturnSchema>;
export type UpdateTaxReturnInput = z.infer<typeof updateTaxReturnSchema>;
