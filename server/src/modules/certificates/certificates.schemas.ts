import { z } from "zod";
import { emptyToUndefined } from "@/utils/zodHelpers";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");
const optText = (max: number) => emptyToUndefined(z.string().trim().max(max).optional());
const flag = z.enum(["true", "false"]).transform((v) => v === "true");
const money = emptyToUndefined(z.coerce.number().min(0).max(10_000_000).optional());

/** Who the letter is about and whose letterhead it prints on: the employee's establishment or a name typed by hand. */
const base = {
  employeeId: z.string().min(1),
  establishment: z.enum(["employee", "manual"]).default("employee"),
  estName: optText(160),
  estNameEn: optText(160),
  estCr: optText(40),
  estCity: optText(80),
  jobTitle: optText(120),
  startDate: emptyToUndefined(day.optional()),
  note: optText(600),
  /** This print's names, box by box (JSON); an empty one keeps the name saved in Settings. */
  names: emptyToUndefined(
    z
      .string()
      .max(1200)
      .optional()
      .transform((v, ctx) => {
        if (!v) return [];
        try {
          return z.array(z.string().trim().max(120)).max(3).parse(JSON.parse(v));
        } catch {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid names" });
          return z.NEVER;
        }
      })
  ),
  issueDate: emptyToUndefined(day.optional()),
};
const needsName = { message: "Type the establishment's name", path: ["estName"] };

/** An experience certificate. Nothing is stored. */
export const experienceQuerySchema = z
  .object({
    ...base,
    endDate: emptyToUndefined(day.optional()),
    /** Still on the job: the certificate says so instead of an end date. */
    stillWorking: flag.default("false"),
    /** The line on the employee's conduct. */
    conduct: flag.default("true"),
  })
  .refine((q) => q.establishment !== "manual" || !!q.estName, needsName)
  .refine((q) => !q.startDate || !q.endDate || q.stillWorking || q.endDate >= q.startDate, { message: "The end date is before the start date", path: ["endDate"] });

/** The other allowances, sent as JSON: [{ "label": "بدل طبيعة عمل", "amount": 500 }]. */
const otherParts = emptyToUndefined(
  z
    .string()
    .max(4000)
    .optional()
    .transform((v, ctx) => {
      if (!v) return [];
      try {
        return z.array(z.object({ label: z.string().trim().min(1).max(80), amount: z.coerce.number().min(0).max(10_000_000) })).max(8).parse(JSON.parse(v));
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid allowances" });
        return z.NEVER;
      }
    })
);

/** A salary certificate (تعريف بالراتب). Nothing is stored. */
export const salaryQuerySchema = z
  .object({
    ...base,
    recipient: optText(160),
    basic: money,
    housing: money,
    transport: money,
    others: otherParts,
    bankName: optText(120),
    iban: emptyToUndefined(z.string().trim().toUpperCase().regex(/^[A-Z]{2}\d{2}[A-Z0-9 ]{10,32}$/, "Invalid IBAN").optional()),
  })
  .refine((q) => q.establishment !== "manual" || !!q.estName, needsName)
  .refine((q) => (q.basic ?? 0) + (q.housing ?? 0) + (q.transport ?? 0) + (q.others ?? []).reduce((a, p) => a + p.amount, 0) > 0, { message: "Enter the salary", path: ["basic"] });

export type ExperienceQuery = z.infer<typeof experienceQuerySchema>;
export type SalaryQuery = z.infer<typeof salaryQuerySchema>;
