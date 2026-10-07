import { z } from "zod";
export const idSchema = z.string().min(1).max(150);
export const scheduleSchema = z.object({
  name: z.string().trim().min(1).max(100), kind: z.enum(["employees", "documents", "payments", "activity"]),
  frequency: z.enum(["daily", "weekly", "monthly"]), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  weekday: z.number().int().min(0).max(6).default(0), monthday: z.number().int().min(1).max(28).default(1),
  language: z.enum(["ar", "en"]).default("ar"), enabled: z.boolean().default(true),
});
export const bulkSchema = z.object({ ids: z.array(idSchema).min(1).max(100).refine(v => new Set(v).size === v.length),
  changes: z.object({ branchId: idSchema.optional(), employmentStatus: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]).optional(), department: z.string().trim().min(1).max(100).optional(), jobTitle: z.string().trim().min(1).max(150).optional(), onSponsorship: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0),
});
export const ONBOARDING_STEPS = ["orientation", "equipment", "account", "training"] as const;
export const onboardingSchema = z.object({ step: z.enum(ONBOARDING_STEPS), done: z.boolean() });
