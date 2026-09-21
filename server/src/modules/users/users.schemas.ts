import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import { emptyToUndefined } from "@/utils/zodHelpers";

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a number");

export const createUserSchema = z.object({
  fullName: z.string().min(2).max(150),
  email: z.string().email(),
  phone: emptyToUndefined(z.string().max(30).optional()),
  password: passwordSchema,
  roleIds: z.array(z.string()).min(1, "Assign at least one role"),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(150).optional(),
  phone: emptyToUndefined(z.string().max(30).optional()),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string()).min(1).optional(),
});

export const listUsersQuerySchema = paginationSchema.extend({
  isActive: z.coerce.boolean().optional(),
  roleId: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
