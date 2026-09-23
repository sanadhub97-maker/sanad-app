import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import { emptyToUndefined } from "@/utils/zodHelpers";
import { PaymentCategory } from "@prisma/client";

export const paymentMethodEnum = z.enum(["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER"]);
export const paymentCategoryEnum = z.nativeEnum(PaymentCategory);

export const createPaymentSchema = z.object({
  paymentNumber: emptyToUndefined(z.string().max(50).optional()),
  paymentDate: z.coerce.date(),
  type: emptyToUndefined(z.string().max(100).optional()),
  category: paymentCategoryEnum,
  description: emptyToUndefined(z.string().max(500).optional()),
  amount: z.coerce.number().positive(),
  vat: z.coerce.number().min(0).default(0),
  method: paymentMethodEnum,
  paidBy: emptyToUndefined(z.string().max(150).optional()),
  branchId: emptyToUndefined(z.string().optional()),
  employeeId: emptyToUndefined(z.string().optional()),
  supplierName: emptyToUndefined(z.string().max(150).optional()),
  referenceNumber: emptyToUndefined(z.string().max(100).optional()),
  fileId: emptyToUndefined(z.string().optional()),
  notes: emptyToUndefined(z.string().max(2000).optional()),
});

export const updatePaymentSchema = createPaymentSchema.partial();

export const listPaymentsQuerySchema = paginationSchema.extend({
  category: paymentCategoryEnum.optional(),
  method: paymentMethodEnum.optional(),
  branchId: z.string().optional(),
  employeeId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
