import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";
import { emptyToUndefined } from "@/utils/zodHelpers";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");
const optDay = z.union([day, z.literal(""), z.null()]).optional().transform((v) => (v ? v : null));
const optText = (max: number) => emptyToUndefined(z.string().trim().max(max).optional());

export const VEHICLE_DATES = ["INSPECTION", "INSURANCE", "REGISTRATION"] as const;
export type VehicleDate = (typeof VEHICLE_DATES)[number];
export const INSURANCE_TYPES = ["COMPREHENSIVE", "THIRD_PARTY"] as const;

export const idParamSchema = z.object({ id: z.string().min(1) });

/** "expired": something on the car has expired; "soon": the nearest ends within 30 days; a date kind: that date within 30 days or past. */
export const listQuerySchema = paginationSchema.extend({
  state: z.enum(["all", "expired", "soon", "INSPECTION", "INSURANCE", "REGISTRATION"]).default("all"),
  branchId: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(500).default(200),
});

export const exportQuerySchema = listQuerySchema.extend({ format: z.enum(["pdf", "xlsx"]).default("pdf") });

export const vehicleSchema = z.object({
  plateLetters: z.string().trim().min(1).max(12),
  plateNumber: z.string().trim().regex(/^[0-9٠-٩]{1,4}$/, "Up to four digits"),
  serialNumber: optText(30),
  ownerName: optText(200),
  make: z.string().trim().min(1).max(120),
  year: z.union([z.coerce.number().int().min(1950).max(2100), z.literal(""), z.null()]).optional().transform((v) => (typeof v === "number" ? v : null)),
  color: optText(40),
  branchId: emptyToUndefined(z.string().optional()),
  driverId: emptyToUndefined(z.string().optional()),
  inspectionExpiry: day,
  insuranceExpiry: day,
  registrationExpiry: optDay,
  insurer: optText(120),
  insuranceType: z.enum(INSURANCE_TYPES).optional().nullable(),
  inspectionFileId: emptyToUndefined(z.string().optional()),
  insuranceFileId: emptyToUndefined(z.string().optional()),
  registrationFileId: emptyToUndefined(z.string().optional()),
  notes: optText(2000),
});

export const renewSchema = z.object({
  kind: z.enum(VEHICLE_DATES),
  date: day,
  /** A payment voucher for the renewal, when an amount is given. */
  amount: z.coerce.number().min(0).max(10_000_000).optional(),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER"]).default("CASH"),
  fileId: emptyToUndefined(z.string().optional()),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type RenewInput = z.infer<typeof renewSchema>;
