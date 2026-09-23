import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import { emptyToUndefined } from "@/utils/zodHelpers";
import { PaymentCategory } from "@prisma/client";
import { PAYMENT_SUBTYPES } from "@/constants/paymentCategories";

export const paymentMethodEnum = z.enum(["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER"]);
export const paymentCategoryEnum = z.nativeEnum(PaymentCategory);

// Categories that are always about a specific employee.
const EMPLOYEE_CATEGORIES: string[] = ["IQAMA", "SPONSORSHIP_TRANSFER", "PROFESSION_CHANGE", "VISA"];

const basePaymentSchema = z.object({
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

type PaymentFields = Partial<z.infer<typeof basePaymentSchema>>;

/** Categories with sub-types (issue/renewal, visa kinds…) need a valid one;
 * employee-related payments need the employee (except a work visa, often
 * issued before the person is hired). */
function checkCategoryFields(p: PaymentFields, ctx: z.RefinementCtx) {
  if (!p.category) return;
  const subtypes = PAYMENT_SUBTYPES[p.category];
  if (subtypes && !subtypes.includes(p.type ?? "")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["type"], message: "Choose the transaction type" });
  }
  const needsEmployee = EMPLOYEE_CATEGORIES.includes(p.category) && !(p.category === "VISA" && p.type === "WORK_VISA");
  if (needsEmployee && !p.employeeId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["employeeId"], message: "Choose the employee" });
  }
}

export const createPaymentSchema = basePaymentSchema.superRefine(checkCategoryFields);
// On update the rules apply once the category is part of the change.
export const updatePaymentSchema = basePaymentSchema.partial().superRefine(checkCategoryFields);

export const listPaymentsQuerySchema = paginationSchema.extend({
  category: paymentCategoryEnum.optional(),
  method: paymentMethodEnum.optional(),
  branchId: z.string().optional(),
  employeeId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
