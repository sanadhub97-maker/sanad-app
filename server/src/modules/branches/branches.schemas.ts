import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import { emptyToUndefined } from "@/utils/zodHelpers";

export const branchStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);

export const createBranchSchema = z.object({
  name: z.string().min(2).max(150),
  code: z.string().min(1).max(30),
  city: emptyToUndefined(z.string().max(100).optional()),
  address: emptyToUndefined(z.string().max(255).optional()),
  phone: emptyToUndefined(z.string().max(30).optional()),
  email: emptyToUndefined(z.string().email().optional()),
  managerId: emptyToUndefined(z.string().optional()),
  status: branchStatusEnum.default("ACTIVE"),
  notes: emptyToUndefined(z.string().max(2000).optional()),
});

export const updateBranchSchema = createBranchSchema.partial();

export const listBranchesQuerySchema = paginationSchema.extend({
  status: branchStatusEnum.optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
