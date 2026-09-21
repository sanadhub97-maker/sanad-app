import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";

export const importQuerySchema = z.object({
  dryRun: z.coerce.boolean().default(false),
});

export const listImportJobsQuerySchema = paginationSchema.extend({
  module: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
