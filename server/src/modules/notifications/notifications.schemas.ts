import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";

export const listNotificationsQuerySchema = paginationSchema.extend({
  isRead: z.coerce.boolean().optional(),
  severity: z.enum(["CRITICAL", "WARNING", "INFO"]).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
