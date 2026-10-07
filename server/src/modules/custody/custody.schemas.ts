import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import { emptyToUndefined } from "@/utils/zodHelpers";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");
const optText = (max: number) => emptyToUndefined(z.string().trim().max(max).optional());

export const ITEM_CONDITIONS = ["new", "good", "used", "damaged"] as const;
export const RETURN_CONDITIONS = ["good", "damaged", "lost"] as const;
/** The departments that sign a clearance off, in print order. */
export const CLEARANCE_DEPARTMENTS = ["hr", "fin", "it", "store", "mgr"] as const;
export const CLEARANCE_REASONS = ["resignation", "contractEnd", "termination", "transfer", "retirement", "other"] as const;

export const idParamSchema = z.object({ id: z.string().min(1) });
export const employeeParamSchema = z.object({ employeeId: z.string().min(1) });

export const listQuerySchema = paginationSchema.extend({
  employeeId: z.string().optional(),
  branchId: z.string().optional(),
  /** Handovers: "open" still has items out, "returned" has all back. Clearances: OPEN / ISSUED. */
  state: z.enum(["all", "open", "returned", "issued"]).default("all"),
});

const itemSchema = z.object({
  id: z.string().optional(),
  kind: z.string().trim().min(1).max(100),
  description: optText(300),
  serialNumber: optText(120),
  condition: z.enum(ITEM_CONDITIONS).default("good"),
  value: z.coerce.number().min(0).max(100_000_000).default(0),
});

export const createHandoverSchema = z.object({
  employeeId: z.string().min(1),
  date: day,
  deliveredBy: optText(150),
  notes: optText(2000),
  signedFileId: emptyToUndefined(z.string().optional()),
  items: z.array(itemSchema).min(1).max(100),
});
/** The whole form again: blank text clears the field. */
export const updateHandoverSchema = createHandoverSchema.omit({ employeeId: true });

export const returnItemsSchema = z.object({
  date: day,
  items: z.array(z.object({ id: z.string().min(1), condition: z.enum(RETURN_CONDITIONS) })).min(1).max(100),
});

const departmentSchema = z.object({ done: z.boolean(), by: optText(150), note: optText(300) });
const departmentsSchema = z.object(Object.fromEntries(CLEARANCE_DEPARTMENTS.map((k) => [k, departmentSchema.optional()])) as Record<(typeof CLEARANCE_DEPARTMENTS)[number], z.ZodOptional<typeof departmentSchema>>);

export const createClearanceSchema = z.object({
  employeeId: z.string().min(1),
  lastWorkingDay: day,
  reason: z.enum(CLEARANCE_REASONS),
  dues: z.coerce.number().min(-100_000_000).max(100_000_000).default(0),
  notes: optText(2000),
  departments: departmentsSchema.default({}),
  /** The employee's open items checked back in on this clearance (null condition = still out). */
  returns: z.array(z.object({ id: z.string().min(1), condition: z.enum(RETURN_CONDITIONS).nullable() })).max(200).default([]),
});
export const updateClearanceSchema = createClearanceSchema.omit({ employeeId: true });

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateHandoverInput = z.infer<typeof createHandoverSchema>;
export type UpdateHandoverInput = z.infer<typeof updateHandoverSchema>;
export type ReturnItemsInput = z.infer<typeof returnItemsSchema>;
export type CreateClearanceInput = z.infer<typeof createClearanceSchema>;
export type UpdateClearanceInput = z.infer<typeof updateClearanceSchema>;
export type DepartmentSignOff = { done: boolean; by?: string; note?: string; at?: string };
