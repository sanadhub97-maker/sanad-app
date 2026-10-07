import sharp from "sharp";
import { Prisma } from "@prisma/client";
import { prisma, type TransactionClient } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { paginationMeta, skipTake } from "@/utils/pagination";
import { riyadhNow } from "@/services/push";
import { getEstablishmentBranding } from "@/services/branding";
import { L } from "@/services/lang";
import { CLEARANCE_DEPARTMENTS } from "./custody.schemas";
import type { CreateClearanceInput, CreateHandoverInput, DepartmentSignOff, ListQuery, ReturnItemsInput, UpdateClearanceInput, UpdateHandoverInput } from "./custody.schemas";
import type { PrintEmployee, PrintEstablishment } from "./custody.print";

const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const today = () => toDate(riyadhNow().date);

const employeeSelect = {
  id: true, employeeNumber: true, fullNameAr: true, fullNameEn: true, jobTitle: true, jobTitleEn: true,
  nationality: true, nationalityEn: true, iqamaNumber: true, branchId: true,
  branch: { select: { id: true, name: true, nameEn: true, logoFileId: true } },
} satisfies Prisma.EmployeeSelect;

/** The next HO-2026-0001 / CL-2026-0001 number of the year. */
export function nextNumber(prefix: string, year: number, last: string | null | undefined) {
  const seq = last ? Number(last.split("-").pop()) || 0 : 0;
  return `${prefix}-${year}-${String(seq + 1).padStart(4, "0")}`;
}

/** Retries a create whose number another save took a moment earlier. */
async function withFreshNumber<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt < 4 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
}

async function assertEmployee(id: string) {
  const employee = await prisma.employee.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!employee) throw ApiError.badRequest("Employee not found.");
}

const money = (v: Prisma.Decimal | number | null | undefined) => Number(v ?? 0);

/* ---------------- handovers ---------------- */

const handoverInclude = { employee: { select: employeeSelect }, items: { orderBy: { id: "asc" } }, createdBy: { select: { id: true, fullName: true } } } satisfies Prisma.CustodyHandoverInclude;
type HandoverRow = Prisma.CustodyHandoverGetPayload<{ include: typeof handoverInclude }>;

function presentHandover(h: HandoverRow) {
  const items = h.items.map((i) => ({ ...i, value: money(i.value) }));
  const out = items.filter((i) => !i.returnedAt);
  return { ...h, items, itemCount: items.length, itemsOut: out.length, totalValue: items.reduce((a, i) => a + i.value, 0), valueOut: out.reduce((a, i) => a + i.value, 0) };
}

export async function listHandovers(query: ListQuery) {
  const where: Prisma.CustodyHandoverWhereInput = { deletedAt: null, employee: { deletedAt: null } };
  if (query.employeeId) where.employeeId = query.employeeId;
  if (query.branchId) where.employee = { deletedAt: null, branchId: query.branchId };
  if (query.state === "open") where.items = { some: { returnedAt: null } };
  if (query.state === "returned") where.items = { every: { returnedAt: { not: null } } };
  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { employee: { fullNameAr: { contains: q, mode: "insensitive" } } },
      { employee: { fullNameEn: { contains: q, mode: "insensitive" } } },
      { employee: { employeeNumber: { contains: q, mode: "insensitive" } } },
      { items: { some: { OR: [{ kind: { contains: q, mode: "insensitive" } }, { serialNumber: { contains: q, mode: "insensitive" } }] } } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.custodyHandover.count({ where }),
    prisma.custodyHandover.findMany({ where, include: handoverInclude, orderBy: [{ date: "desc" }, { number: "desc" }], ...skipTake(query.page, query.pageSize) }),
  ]);
  return { data: rows.map(presentHandover), meta: paginationMeta(query.page, query.pageSize, total) };
}

export async function getHandover(id: string) {
  const row = await prisma.custodyHandover.findFirst({ where: { id, deletedAt: null }, include: handoverInclude });
  if (!row) throw ApiError.notFound("Custody handover not found.");
  return presentHandover(row);
}

export async function createHandover(input: CreateHandoverInput, userId?: string) {
  await assertEmployee(input.employeeId);
  const date = toDate(input.date);
  const year = date.getUTCFullYear();
  const created = await withFreshNumber(async () => {
    const last = await prisma.custodyHandover.findFirst({ where: { number: { startsWith: `HO-${year}-` } }, orderBy: { number: "desc" }, select: { number: true } });
    return prisma.custodyHandover.create({
      data: {
        number: nextNumber("HO", year, last?.number),
        employeeId: input.employeeId,
        date,
        deliveredBy: input.deliveredBy ?? null,
        notes: input.notes ?? null,
        signedFileId: input.signedFileId ?? null,
        createdById: userId,
        items: { create: input.items.map(({ id: _id, ...i }) => ({ ...i, description: i.description ?? null, serialNumber: i.serialNumber ?? null })) },
      },
    });
  });
  return getHandover(created.id);
}

export async function updateHandover(id: string, input: UpdateHandoverInput) {
  const current = await getHandover(id);
  const keep = new Set(input.items.map((i) => i.id).filter(Boolean));
  const unknown = input.items.find((i) => i.id && !current.items.some((c) => c.id === i.id));
  if (unknown) throw ApiError.badRequest("A custody item does not belong to this handover.");
  // Items already back are history: they stay as they are.
  if (current.items.some((c) => c.returnedAt && !keep.has(c.id))) throw ApiError.badRequest("Returned custody items cannot be removed.");
  await prisma.$transaction(async (tx) => {
    await tx.custodyHandover.update({
      where: { id },
      data: { date: toDate(input.date), deliveredBy: input.deliveredBy ?? null, notes: input.notes ?? null, signedFileId: input.signedFileId ?? null },
    });
    await tx.custodyItem.deleteMany({ where: { handoverId: id, returnedAt: null, id: { notIn: [...keep] as string[] } } });
    for (const { id: itemId, ...item } of input.items) {
      const data = { ...item, description: item.description ?? null, serialNumber: item.serialNumber ?? null };
      if (itemId) {
        const existing = current.items.find((c) => c.id === itemId)!;
        if (!existing.returnedAt) await tx.custodyItem.update({ where: { id: itemId }, data });
      } else {
        await tx.custodyItem.create({ data: { ...data, handoverId: id } });
      }
    }
  });
  return getHandover(id);
}

/** Items checked back in on their own (not with a clearance). */
export async function returnItems(id: string, input: ReturnItemsInput) {
  const current = await getHandover(id);
  for (const r of input.items) {
    const item = current.items.find((i) => i.id === r.id);
    if (!item) throw ApiError.badRequest("A custody item does not belong to this handover.");
    if (item.returnedAt) throw ApiError.badRequest("This custody item was already returned.");
  }
  await prisma.$transaction(input.items.map((r) => prisma.custodyItem.update({ where: { id: r.id }, data: { returnedAt: toDate(input.date), returnCondition: r.condition } })));
  return getHandover(id);
}

export async function removeHandover(id: string) {
  const current = await getHandover(id);
  if (current.items.some((i) => i.clearanceId)) throw ApiError.badRequest("This handover is part of a clearance and cannot be deleted.");
  await prisma.custodyHandover.update({ where: { id }, data: { deletedAt: new Date() } });
}

/** What the employee still holds, plus (for an open clearance) what came back with it. */
export async function employeeItems(employeeId: string, clearanceId?: string) {
  const items = await prisma.custodyItem.findMany({
    where: { handover: { employeeId, deletedAt: null }, OR: [{ returnedAt: null }, ...(clearanceId ? [{ clearanceId }] : [])] },
    include: { handover: { select: { id: true, number: true, date: true } } },
    orderBy: [{ handover: { date: "asc" } }, { id: "asc" }],
  });
  return items.map((i) => ({ ...i, value: money(i.value) }));
}

export async function stats() {
  const [handovers, out, openClearances, issuedClearances] = await Promise.all([
    prisma.custodyHandover.count({ where: { deletedAt: null, employee: { deletedAt: null } } }),
    prisma.custodyItem.aggregate({ where: { returnedAt: null, handover: { deletedAt: null, employee: { deletedAt: null } } }, _count: true, _sum: { value: true } }),
    prisma.clearance.count({ where: { deletedAt: null, status: "OPEN", employee: { deletedAt: null } } }),
    prisma.clearance.count({ where: { deletedAt: null, status: "ISSUED", employee: { deletedAt: null } } }),
  ]);
  return { handovers, itemsOut: out._count, valueOut: money(out._sum.value), openClearances, issuedClearances };
}

/* ---------------- clearances ---------------- */

const clearanceInclude = { employee: { select: employeeSelect }, items: { include: { handover: { select: { id: true, number: true, date: true } } }, orderBy: { id: "asc" } }, createdBy: { select: { id: true, fullName: true } } } satisfies Prisma.ClearanceInclude;
type ClearanceRow = Prisma.ClearanceGetPayload<{ include: typeof clearanceInclude }>;

/** The departments with a done flag for each, as stored. */
export function readDepartments(value: Prisma.JsonValue): Record<string, DepartmentSignOff> {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const out: Record<string, DepartmentSignOff> = {};
  for (const key of CLEARANCE_DEPARTMENTS) {
    const d = raw[key] as Partial<DepartmentSignOff> | undefined;
    out[key] = { done: Boolean(d?.done), by: typeof d?.by === "string" ? d.by : undefined, note: typeof d?.note === "string" ? d.note : undefined, at: typeof d?.at === "string" ? d.at : undefined };
  }
  return out;
}

/** What still stands between a clearance and its certificate. */
export function issueBlockers(itemsOut: number, departments: Record<string, DepartmentSignOff>) {
  return { itemsOut, departmentsPending: CLEARANCE_DEPARTMENTS.filter((k) => !departments[k]?.done) };
}

async function presentClearance(c: ClearanceRow) {
  const departments = readDepartments(c.departments);
  const items = await employeeItems(c.employeeId, c.status === "OPEN" ? c.id : undefined);
  const shown = c.status === "OPEN" ? items : c.items.map((i) => ({ ...i, value: money(i.value) }));
  const itemsOut = c.status === "OPEN" ? items.filter((i) => !i.returnedAt).length : 0;
  return { ...c, dues: money(c.dues), departments, items: shown, blockers: issueBlockers(itemsOut, departments) };
}

export async function listClearances(query: ListQuery) {
  const where: Prisma.ClearanceWhereInput = { deletedAt: null, employee: { deletedAt: null } };
  if (query.employeeId) where.employeeId = query.employeeId;
  if (query.branchId) where.employee = { deletedAt: null, branchId: query.branchId };
  if (query.state === "open") where.status = "OPEN";
  if (query.state === "issued") where.status = "ISSUED";
  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { employee: { fullNameAr: { contains: q, mode: "insensitive" } } },
      { employee: { fullNameEn: { contains: q, mode: "insensitive" } } },
      { employee: { employeeNumber: { contains: q, mode: "insensitive" } } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.clearance.count({ where }),
    prisma.clearance.findMany({ where, include: clearanceInclude, orderBy: [{ createdAt: "desc" }], ...skipTake(query.page, query.pageSize) }),
  ]);
  return { data: await Promise.all(rows.map(presentClearance)), meta: paginationMeta(query.page, query.pageSize, total) };
}

async function findClearance(id: string) {
  const row = await prisma.clearance.findFirst({ where: { id, deletedAt: null }, include: clearanceInclude });
  if (!row) throw ApiError.notFound("Clearance not found.");
  return row;
}
export async function getClearance(id: string) {
  return presentClearance(await findClearance(id));
}

/** Keeps when each department signed; a department signing now is stamped now. */
function mergeDepartments(previous: Record<string, DepartmentSignOff>, next: CreateClearanceInput["departments"]) {
  const out: Record<string, DepartmentSignOff> = {};
  for (const key of CLEARANCE_DEPARTMENTS) {
    const d = next[key];
    if (!d?.done) { out[key] = { done: false, note: d?.note }; continue; }
    out[key] = { done: true, by: d.by, note: d.note, at: previous[key]?.done ? previous[key].at : new Date().toISOString() };
  }
  return out;
}

async function applyReturns(tx: TransactionClient, clearanceId: string, employeeId: string, returns: CreateClearanceInput["returns"]) {
  if (!returns.length) return;
  const items = await tx.custodyItem.findMany({ where: { id: { in: returns.map((r) => r.id) }, handover: { employeeId, deletedAt: null } } });
  for (const r of returns) {
    const item = items.find((i) => i.id === r.id);
    if (!item) throw ApiError.badRequest("A custody item does not belong to this employee.");
    if (item.returnedAt && item.clearanceId !== clearanceId) continue; // came back earlier on its own
    if (r.condition) {
      await tx.custodyItem.update({ where: { id: r.id }, data: { returnedAt: item.returnedAt ?? today(), returnCondition: r.condition, clearanceId } });
    } else if (item.clearanceId === clearanceId) {
      await tx.custodyItem.update({ where: { id: r.id }, data: { returnedAt: null, returnCondition: null, clearanceId: null } });
    }
  }
}

export async function createClearance(input: CreateClearanceInput, userId?: string) {
  await assertEmployee(input.employeeId);
  const open = await prisma.clearance.findFirst({ where: { employeeId: input.employeeId, deletedAt: null, status: "OPEN" }, select: { id: true } });
  if (open) throw ApiError.badRequest("This employee already has an open clearance.");
  const last = toDate(input.lastWorkingDay);
  const year = last.getUTCFullYear();
  const created = await withFreshNumber(() =>
    prisma.$transaction(async (tx) => {
      const prev = await tx.clearance.findFirst({ where: { number: { startsWith: `CL-${year}-` } }, orderBy: { number: "desc" }, select: { number: true } });
      const row = await tx.clearance.create({
        data: {
          number: nextNumber("CL", year, prev?.number),
          employeeId: input.employeeId,
          lastWorkingDay: last,
          reason: input.reason,
          dues: input.dues,
          notes: input.notes ?? null,
          departments: mergeDepartments({}, input.departments) as Prisma.InputJsonValue,
          createdById: userId,
        },
      });
      await applyReturns(tx, row.id, input.employeeId, input.returns);
      return row;
    })
  );
  return getClearance(created.id);
}

export async function updateClearance(id: string, input: UpdateClearanceInput) {
  const current = await findClearance(id);
  if (current.status !== "OPEN") throw ApiError.badRequest("An issued clearance cannot be changed.");
  await prisma.$transaction(async (tx) => {
    await tx.clearance.update({
      where: { id },
      data: {
        lastWorkingDay: toDate(input.lastWorkingDay),
        reason: input.reason,
        dues: input.dues,
        notes: input.notes ?? null,
        departments: mergeDepartments(readDepartments(current.departments), input.departments) as Prisma.InputJsonValue,
      },
    });
    await applyReturns(tx, id, current.employeeId, input.returns);
  });
  return getClearance(id);
}

/** Issues the certificate: only once every item is back and every department signed. */
export async function issueClearance(id: string) {
  const current = await getClearance(id);
  if (current.status !== "OPEN") throw ApiError.badRequest("This clearance was already issued.");
  if (current.blockers.itemsOut > 0) throw ApiError.badRequest("Every custody item must be returned before the clearance is issued.");
  if (current.blockers.departmentsPending.length) throw ApiError.badRequest("Every department must sign the clearance off before it is issued.");
  await prisma.clearance.update({ where: { id }, data: { status: "ISSUED", issuedAt: new Date() } });
  return getClearance(id);
}

export async function removeClearance(id: string) {
  const current = await findClearance(id);
  await prisma.$transaction(async (tx) => {
    // An open clearance's returns were only provisional; an issued one's are history.
    if (current.status === "OPEN") await tx.custodyItem.updateMany({ where: { clearanceId: id }, data: { returnedAt: null, returnCondition: null, clearanceId: null } });
    await tx.clearance.update({ where: { id }, data: { deletedAt: new Date() } });
  });
}

/* ---------------- printing ---------------- */

async function hasTransparency(dataUrl: string) {
  const stats = await sharp(Buffer.from(dataUrl.split(",")[1] ?? "", "base64")).stats().catch(() => null);
  return stats ? !stats.isOpaque : false;
}

type EmployeeSummary = Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>;

/** The letterhead of the establishment the employee is on (the company's when none). */
export async function printParty(employee: EmployeeSummary): Promise<{ est: PrintEstablishment; emp: PrintEmployee }> {
  const { company, branch, logoDataUrl, brandColor } = await getEstablishmentBranding(employee.branchId);
  const cr = branch
    ? await prisma.companyDocument.findFirst({ where: { branchId: branch.id, deletedAt: null, category: "COMMERCIAL_REGISTRATION" }, orderBy: { expiryDate: "desc" }, select: { documentNumber: true, licenseNumber: true } })
    : null;
  const est: PrintEstablishment = {
    name: (branch ? L(branch.name, branch.nameEn || branch.name) : L(company?.nameAr || company?.nameEn || "", company?.nameEn || company?.nameAr || "")) || L("المنشأة", "Establishment"),
    nameEn: branch ? branch.nameEn : company?.nameEn ?? null,
    cr: (branch ? cr?.documentNumber || cr?.licenseNumber : company?.crNumber) || null,
    vat: branch?.vatRegistrationNumber || company?.vatNumber || null,
    city: (branch ? L(branch.city || "", branch.cityEn || branch.city || "") : company?.city) || null,
    phone: branch?.phone || company?.phone || null,
    logoDataUrl,
    brandColor,
    logoTransparent: logoDataUrl ? await hasTransparency(logoDataUrl) : false,
  };
  const emp: PrintEmployee = {
    name: L(employee.fullNameAr, employee.fullNameEn || employee.fullNameAr),
    number: employee.employeeNumber,
    iqama: employee.iqamaNumber,
    job: L(employee.jobTitle || "", employee.jobTitleEn || employee.jobTitle || "") || null,
    nationality: L(employee.nationality || "", employee.nationalityEn || employee.nationality || "") || null,
  };
  return { est, emp };
}
