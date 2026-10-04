import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import { emptyToUndefined } from "@/utils/zodHelpers";
import { AUTHORITY_KEYS } from "@/constants/violations";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");
const optDay = z.union([day, z.literal(""), z.null()]).optional().transform((v) => (v ? v : null));
const optText = (max: number) => emptyToUndefined(z.string().trim().max(max).optional());

export const idParamSchema = z.object({ id: z.string().min(1) });

/** "open" = still needs action, "overdue" = payment deadline passed, "done" = paid, cancelled or applied. */
export const listViolationsQuerySchema = paginationSchema.extend({
  kind: z.enum(["AUTHORITY", "STAFF"]).optional(),
  state: z.enum(["all", "open", "overdue", "objection", "done"]).default("all"),
  authority: z.string().optional(),
  branchId: z.string().optional(),
  employeeId: z.string().optional(),
  dateFrom: optDay,
  dateTo: optDay,
});

const fields = {
  authority: z.enum(AUTHORITY_KEYS as [string, ...string[]]).optional(),
  authorityName: optText(150),
  number: optText(80),
  date: day,
  branchId: emptyToUndefined(z.string().optional()),
  employeeId: emptyToUndefined(z.string().optional()),
  reason: z.string().trim().min(1).max(1000),
  penalty: optText(100),
  amount: z.coerce.number().min(0).max(100_000_000).default(0),
  payDeadline: optDay,
  objectionDeadline: optDay,
  relatedType: optText(40),
  relatedId: optText(80),
  relatedLabel: optText(250),
  fileId: emptyToUndefined(z.string().optional()),
  assigneeId: emptyToUndefined(z.string().optional()),
  notes: optText(2000),
};

export const createViolationSchema = z
  .object({ kind: z.enum(["AUTHORITY", "STAFF"]), ...fields })
  .superRefine((v, ctx) => {
    if (v.kind === "AUTHORITY" && !v.authority) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["authority"], message: "Choose the authority" });
    if (v.kind === "STAFF" && !v.employeeId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["employeeId"], message: "Choose the employee" });
    if (v.kind === "STAFF" && !v.penalty) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["penalty"], message: "Choose the penalty" });
  });
export const updateViolationSchema = z.object(fields).partial();

export const paySchema = z.object({
  date: day,
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER"]),
  referenceNumber: optText(100),
  paidBy: optText(150),
  fileId: emptyToUndefined(z.string().optional()),
});
export const objectionSchema = z.object({ date: day, reference: optText(100), note: optText(1000), fileId: emptyToUndefined(z.string().optional()) });
export const objectionResultSchema = z.object({ accepted: z.boolean(), date: day, note: optText(1000) });
export const applySchema = z.object({ date: day, note: optText(1000) });
export const exportQuerySchema = listViolationsQuerySchema.extend({ format: z.enum(["pdf", "xlsx"]) });
export const relatedQuerySchema = z.object({ employeeId: z.string().optional(), branchId: z.string().optional() });

export type CreateViolationInput = z.infer<typeof createViolationSchema>;
export type UpdateViolationInput = z.infer<typeof updateViolationSchema>;
export type ListViolationsQuery = z.infer<typeof listViolationsQuerySchema>;
