import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";

export const listAuditLogsQuerySchema = paginationSchema.extend({
  module: z.string().optional(),
  userId: z.string().optional(),
  action: z.enum(["CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT", "DOWNLOAD", "LOGIN", "LOGOUT"]).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
