import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import { emptyToUndefined } from "@/utils/zodHelpers";
import { SOCIALS } from "@/services/socials";

// The social accounts: each a handle, a link or (WhatsApp) a number; empty ones are dropped, an empty set clears them.
const socialsSchema = z
  .object(Object.fromEntries(SOCIALS.map((s) => [s.key, z.string().trim().max(200).optional()])) as Record<string, z.ZodOptional<z.ZodString>>)
  .nullable()
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    const kept = Object.fromEntries(Object.entries(v ?? {}).filter(([, x]) => typeof x === "string" && x.trim()));
    return Object.keys(kept).length ? kept : null;
  });

export const branchStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);

export const createBranchSchema = z.object({
  name: z.string().min(2).max(150),
  ownerName: z.string().trim().max(200).nullable().optional().transform(value => value === "" ? null : value),
  vatRegistrationNumber: z.string().trim().regex(/^$|^3[0-9]{13}3$/).nullable().optional().transform(value => value === "" ? null : value),
  // The establishment's own logo (an uploaded "branch-logo" image); null removes it.
  logoFileId: z.string().max(150).nullable().optional().transform(value => value === "" ? null : value),
  // Its own stamp (an uploaded "branch-stamp" image); null removes it.
  stampFileId: z.string().max(150).nullable().optional().transform(value => value === "" ? null : value),
  socials: socialsSchema,
  nameEn: emptyToUndefined(z.string().max(150).optional()),
  code: z.string().min(1).max(30),
  city: emptyToUndefined(z.string().max(100).optional()),
  cityEn: emptyToUndefined(z.string().max(100).optional()),
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
