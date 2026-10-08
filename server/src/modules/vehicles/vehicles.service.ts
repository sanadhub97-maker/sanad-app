import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { daysUntil } from "@/services/expiration";
import * as paymentsService from "@/modules/payments/payments.service";
import { createPaymentSchema } from "@/modules/payments/payments.schemas";
import type { ListQuery, RenewInput, VehicleDate, VehicleInput } from "./vehicles.schemas";

const toDate = (d: string) => new Date(`${d}T00:00:00Z`);
const FIELD: Record<VehicleDate, "inspectionExpiry" | "insuranceExpiry" | "registrationExpiry"> = {
  INSPECTION: "inspectionExpiry",
  INSURANCE: "insuranceExpiry",
  REGISTRATION: "registrationExpiry",
};
export const DATE_LABELS: Record<VehicleDate, [string, string]> = {
  INSPECTION: ["الفحص الدوري", "Periodic inspection"],
  INSURANCE: ["التأمين", "Insurance"],
  REGISTRATION: ["الاستمارة", "Registration"],
};

const include = {
  branch: { select: { id: true, name: true, nameEn: true, logoFileId: true } },
  driver: { select: { id: true, fullNameAr: true, fullNameEn: true, employeeNumber: true } },
} satisfies Prisma.VehicleInclude;
type Row = Prisma.VehicleGetPayload<{ include: typeof include }>;

/** Days left on each date and on the nearest one (registration may be unknown). */
export function withDays(v: Row) {
  const inspectionDays = daysUntil(v.inspectionExpiry);
  const insuranceDays = daysUntil(v.insuranceExpiry);
  const registrationDays = v.registrationExpiry ? daysUntil(v.registrationExpiry) : null;
  const nearestDays = Math.min(inspectionDays, insuranceDays, registrationDays ?? Infinity);
  return { ...v, inspectionDays, insuranceDays, registrationDays, nearestDays };
}

/** Whether a car belongs in a list filter; "soon" is 1..30 days, "expired" is today or past. */
export function matchesState(v: ReturnType<typeof withDays>, state: ListQuery["state"]) {
  if (state === "expired") return v.nearestDays <= 0;
  if (state === "soon") return v.nearestDays > 0 && v.nearestDays <= 30;
  if (state === "INSPECTION") return v.inspectionDays <= 30;
  if (state === "INSURANCE") return v.insuranceDays <= 30;
  if (state === "REGISTRATION") return v.registrationDays !== null && v.registrationDays <= 30;
  return true;
}

async function all(branchId?: string) {
  const rows = await prisma.vehicle.findMany({ where: { deletedAt: null, ...(branchId === "none" ? { branchId: null } : branchId ? { branchId } : {}) }, include, take: 5000 });
  return rows.map(withDays);
}

export async function list(query: ListQuery) {
  const q = query.q?.trim().replace(/\s+/g, "").toLowerCase();
  const rows = (await all(query.branchId))
    .filter((v) => matchesState(v, query.state))
    .filter((v) => !q || [v.plateLetters + v.plateNumber, v.plateNumber, v.serialNumber, v.ownerName, v.make, v.driver?.fullNameAr, v.driver?.fullNameEn].some((x) => x?.replace(/\s+/g, "").toLowerCase().includes(q)))
    .sort((a, b) => a.nearestDays - b.nearestDays);
  const start = (query.page - 1) * query.pageSize;
  return { data: rows.slice(start, start + query.pageSize), meta: { page: query.page, pageSize: query.pageSize, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / query.pageSize)) } };
}

export async function stats() {
  const rows = await all();
  return {
    total: rows.length,
    allValid: rows.filter((v) => v.nearestDays > 30).length,
    expired: rows.filter((v) => v.nearestDays <= 0).length,
    soon: rows.filter((v) => v.nearestDays > 0 && v.nearestDays <= 30).length,
    inspection: rows.filter((v) => v.inspectionDays <= 30).length,
    insurance: rows.filter((v) => v.insuranceDays <= 30).length,
    registration: rows.filter((v) => v.registrationDays !== null && v.registrationDays <= 30).length,
  };
}

export async function getById(id: string) {
  const row = await prisma.vehicle.findFirst({ where: { id, deletedAt: null }, include: { ...include, renewals: { orderBy: { createdAt: "desc" }, take: 50, include: { createdBy: { select: { fullName: true } } } } } });
  if (!row) throw ApiError.notFound("Vehicle not found.");
  return withDays(row);
}

async function assertLinks(input: Pick<VehicleInput, "branchId" | "driverId">) {
  if (input.branchId && !(await prisma.branch.findFirst({ where: { id: input.branchId, deletedAt: null }, select: { id: true } }))) throw ApiError.badRequest("Establishment not found.");
  if (input.driverId && !(await prisma.employee.findFirst({ where: { id: input.driverId, deletedAt: null }, select: { id: true } }))) throw ApiError.badRequest("Employee not found.");
}

const data = (input: VehicleInput) => ({
  plateLetters: input.plateLetters.replace(/\s+/g, " "),
  plateNumber: input.plateNumber,
  serialNumber: input.serialNumber ?? null,
  ownerName: input.ownerName ?? null,
  make: input.make,
  year: input.year,
  color: input.color ?? null,
  branchId: input.branchId ?? null,
  driverId: input.driverId ?? null,
  inspectionExpiry: toDate(input.inspectionExpiry),
  insuranceExpiry: toDate(input.insuranceExpiry),
  registrationExpiry: input.registrationExpiry ? toDate(input.registrationExpiry) : null,
  insurer: input.insurer ?? null,
  insuranceType: input.insuranceType ?? null,
  inspectionFileId: input.inspectionFileId ?? null,
  insuranceFileId: input.insuranceFileId ?? null,
  registrationFileId: input.registrationFileId ?? null,
  notes: input.notes ?? null,
});

async function assertPlateFree(input: VehicleInput, exceptId?: string) {
  const plateLetters = input.plateLetters.replace(/\s+/g, " ");
  const taken = await prisma.vehicle.findFirst({ where: { deletedAt: null, plateLetters, plateNumber: input.plateNumber, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
  if (taken) throw ApiError.badRequest("A vehicle with this plate is already registered.");
}

export async function create(input: VehicleInput, userId?: string) {
  await assertLinks(input);
  await assertPlateFree(input);
  const row = await prisma.vehicle.create({ data: { ...data(input), createdById: userId } });
  return getById(row.id);
}

export async function update(id: string, input: VehicleInput) {
  await getById(id);
  await assertLinks(input);
  await assertPlateFree(input, id);
  await prisma.vehicle.update({ where: { id }, data: data(input) });
  return getById(id);
}

export async function remove(id: string) {
  await getById(id);
  await prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date() } });
}

/** A new expiry date for one of the car's dates; the old one stays in the history, with an optional payment voucher. */
export async function renew(id: string, input: RenewInput, userId: string, canPay: boolean) {
  const car = await getById(id);
  const field = FIELD[input.kind];
  let paymentId: string | null = null;
  if (input.amount && input.amount > 0) {
    if (!canPay) throw ApiError.forbidden("Payment permission is required to record the renewal cost.");
    const [ar] = DATE_LABELS[input.kind];
    const payment = await paymentsService.create(
      createPaymentSchema.parse({
        paymentDate: new Date(),
        category: input.kind === "INSURANCE" ? "INSURANCE" : "GOVERNMENT_FEES",
        description: `تجديد ${ar} — ${car.make} (${car.plateLetters} ${car.plateNumber})`,
        amount: input.amount,
        method: input.method,
        branchId: car.branchId ?? undefined,
      }),
      userId
    );
    paymentId = payment.id;
  }
  const fileField = input.kind === "INSPECTION" ? "inspectionFileId" : input.kind === "INSURANCE" ? "insuranceFileId" : "registrationFileId";
  await prisma.$transaction([
    prisma.vehicleRenewal.create({ data: { vehicleId: id, kind: input.kind, previous: car[field], next: toDate(input.date), paymentId, createdById: userId } }),
    prisma.vehicle.update({ where: { id }, data: { [field]: toDate(input.date), ...(input.fileId ? { [fileField]: input.fileId } : {}) } }),
  ]);
  return getById(id);
}

export async function exportRows(query: ListQuery) {
  return (await list({ ...query, page: 1, pageSize: 5000 })).data;
}
