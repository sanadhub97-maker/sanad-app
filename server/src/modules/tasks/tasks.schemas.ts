import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");
export const TASK_CATEGORIES = ["employees", "documents", "branches", "payments", "general"] as const;

export const idParamSchema = z.object({ id: z.string().min(1) });
export const dayQuerySchema = z.object({ date: day });
export const rangeQuerySchema = z
  .object({ from: day, to: day, today: day.optional() })
  .refine((v) => v.from <= v.to, "from must not be after to")
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86_400_000 <= 62, "Ask for 62 days at most");
export const exportQuerySchema = z.object({ from: day, to: day, format: z.enum(["pdf", "xlsx"]) });

const fields = {
  title: z.string().trim().min(1).max(200),
  category: z.enum(TASK_CATEGORIES).default("general"),
  priority: z.enum(["URGENT", "HIGH", "NORMAL"]).default("NORMAL"),
  assigneeId: z.string().min(1).nullable().optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
};

export const createTaskSchema = z.object({ date: day, ...fields, sourceKey: z.string().max(200).nullable().optional() });

export const updateTaskSchema = z
  .object({
    date: day.optional(),
    title: fields.title.optional(),
    category: z.enum(TASK_CATEGORIES).optional(),
    priority: z.enum(["URGENT", "HIGH", "NORMAL"]).optional(),
    assigneeId: fields.assigneeId,
    time: fields.time,
    notes: fields.notes,
    done: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const carrySchema = z.object({ from: day, to: day });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
