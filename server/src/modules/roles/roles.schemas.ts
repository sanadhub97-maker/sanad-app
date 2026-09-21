import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  permissionKeys: z.array(z.string()).default([]),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(300).optional(),
  permissionKeys: z.array(z.string()).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
