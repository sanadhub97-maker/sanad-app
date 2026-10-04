import { Prisma, ViolationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { paginationMeta, skipTake } from "@/utils/pagination";
import { getTrackableItems } from "@/services/expiringItems";
import { daysUntil } from "@/services/expiration";
import { riyadhNow } from "@/services/push";
import { authorityName } from "@/constants/violations";
import { isEn } from "@/services/lang";
import { canViewSource, hasPermission } from "@/lib/security";
import type { AuthContext } from "@/types/express";
import * as paymentsService from "@/modules/payments/payments.service";
import type { CreateViolationInput, ListViolationsQuery, UpdateViolationInput } from "@/modules/violations/violations.schemas";

// A violation's dates are calendar days (no time zone): stored as midnight UTC.
const toDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const toDay = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const today = () => toDate(riyadhNow().date);

const OPEN_AUTHORITY: ViolationStatus[] = ["NEW", "OBJECTION", "REJECTED"];
const UNPAID: ViolationStatus[] = ["NEW", "REJECTED"];
const DONE: ViolationStatus[] = ["PAID", "ACCEPTED", "APPLIED"];

const include = {
  branch: { select: { id: true, name: true, nameEn: true } },
  employee: { select: { id: true, fullNameAr: true, fullNameEn: true, employeeNumber: true } },
  payment: { select: { id: true, paymentNumber: true, paymentDate: true, total: true } },
  file: { select: { id: true, originalName: true, mimeType: true, size: true } },
  assignee: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
} as const;

type Row = Prisma.ViolationGetPayload<{ include: typeof include }>;

/** The status as shown: an unpaid one past its payment deadline is overdue. */
export function displayState(v: { kind: string; status: ViolationStatus; payDeadline: Date | null }) {
  if (UNPAID.includes(v.status) && v.payDeadline && v.payDeadline < today()) return "OVERDUE";
  return v.status;
}

function shape(v: Row) {
  const open = v.kind === "AUTHORITY" ? OPEN_AUTHORITY.includes(v.status) : v.status === "OPEN";
  return {
    ...v,
    amount: Number(v.amount),
    date: toDay(v.date)!,
    payDeadline: toDay(v.payDeadline),
    objectionDeadline: toDay(v.objectionDeadline),
    authorityLabel: v.kind === "AUTHORITY" ? authorityName(v.authority, v.authorityName, isEn()) : null,
    state: displayState(v),
    open,
    daysToPay: open && v.payDeadline ? daysUntil(v.payDeadline, today()) : null,
    daysToObject: v.status === "NEW" && v.objectionDeadline ? daysUntil(v.objectionDeadline, today()) : null,
    payment: v.payment ? { ...v.payment, total: Number(v.payment.total) } : null,
  };
}

function whereOf(query: Partial<ListViolationsQuery>): Prisma.ViolationWhereInput {
  const { kind, state, authority, branchId, employeeId, q, dateFrom, dateTo } = query;
  const t = today();
  const byState: Record<string, Prisma.ViolationWhereInput> = {
    all: {},
    open: { OR: [{ kind: "AUTHORITY", status: { in: OPEN_AUTHORITY } }, { kind: "STAFF", status: "OPEN" }] },
    overdue: { status: { in: UNPAID }, payDeadline: { lt: t } },
    objection: { status: "OBJECTION" },
    done: { status: { in: DONE } },
  };
  return {
    deletedAt: null,
    ...(kind ? { kind } : {}),
    ...byState[state ?? "all"],
    ...(authority ? { authority } : {}),
    ...(branchId ? { branchId } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(dateFrom || dateTo ? { date: { ...(dateFrom ? { gte: toDate(dateFrom) } : {}), ...(dateTo ? { lte: toDate(dateTo) } : {}) } } : {}),
    ...(q
      ? {
          AND: [
            {
              OR: [
                { number: { contains: q, mode: "insensitive" } },
                { reason: { contains: q, mode: "insensitive" } },
                { authorityName: { contains: q, mode: "insensitive" } },
                { penalty: { contains: q, mode: "insensitive" } },
                { branch: { name: { contains: q, mode: "insensitive" } } },
                { employee: { fullNameAr: { contains: q, mode: "insensitive" } } },
                { employee: { fullNameEn: { contains: q, mode: "insensitive" } } },
              ],
            },
          ],
        }
      : {}),
  };
}

export async function list(query: ListViolationsQuery) {
  const where = whereOf(query);
  const [rows, total] = await Promise.all([
    prisma.violation.findMany({
      where,
      include,
      // The ones still needing action first, by the nearest deadline.
      orderBy: [{ payDeadline: { sort: "asc", nulls: "last" } }, { date: "desc" }],
      ...skipTake(query.page, query.pageSize),
    }),
    prisma.violation.count({ where }),
  ]);
  const data = rows.map(shape).sort((a, b) => Number(b.open) - Number(a.open));
  return { data, meta: paginationMeta(query.page, query.pageSize, total) };
}

/** Every violation matching the filters, for exports. */
export async function listAll(query: Partial<ListViolationsQuery>) {
  const rows = await prisma.violation.findMany({ where: whereOf(query), include, orderBy: [{ date: "desc" }], take: 2000 });
  return rows.map(shape);
}

/** The figures on top of the page. */
export async function stats() {
  const t = today();
  const in14 = new Date(t.getTime() + 14 * 86_400_000);
  const since = new Date(t.getTime() - 60 * 86_400_000);
  const base = { deletedAt: null, kind: "AUTHORITY" as const };
  const [open, overdue, unpaid, dueSoon, paid, staffOpen, authorityTotal, staffTotal] = await Promise.all([
    prisma.violation.count({ where: { ...base, status: { in: OPEN_AUTHORITY } } }),
    prisma.violation.count({ where: { ...base, status: { in: UNPAID }, payDeadline: { lt: t } } }),
    prisma.violation.aggregate({ where: { ...base, status: { in: OPEN_AUTHORITY } }, _sum: { amount: true } }),
    prisma.violation.count({
      where: {
        ...base,
        OR: [
          { status: { in: UNPAID }, payDeadline: { gte: t, lte: in14 } },
          { status: "NEW", objectionDeadline: { gte: t, lte: in14 } },
        ],
      },
    }),
    prisma.violation.aggregate({ where: { ...base, status: "PAID", payment: { paymentDate: { gte: since } } }, _sum: { amount: true }, _count: true }),
    prisma.violation.count({ where: { deletedAt: null, kind: "STAFF", status: "OPEN" } }),
    prisma.violation.count({ where: base }),
    prisma.violation.count({ where: { deletedAt: null, kind: "STAFF" } }),
  ]);
  return {
    open,
    overdue,
    unpaidAmount: Number(unpaid._sum.amount ?? 0),
    dueSoon,
    paidAmount: Number(paid._sum.amount ?? 0),
    paidCount: paid._count,
    staffOpen,
    authorityTotal,
    staffTotal,
  };
}

export async function getById(id: string) {
  const v = await prisma.violation.findFirst({ where: { id, deletedAt: null }, include });
  if (!v) throw ApiError.notFound("Violation not found");
  const events = await prisma.violationEvent.findMany({
    where: { violationId: id },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: { user: { select: { id: true, fullName: true } } },
  });
  return { ...shape(v), events: events.map((e) => ({ ...e, date: toDay(e.date)! })) };
}

function event(violationId: string, type: string, date: string, note: string | null | undefined, userId?: string) {
  return prisma.violationEvent.create({ data: { violationId, type, date: toDate(date), note: note || null, userId: userId ?? null } });
}

const dataOf = (input: Partial<CreateViolationInput>) => ({
  ...(input.authority !== undefined ? { authority: input.authority } : {}),
  ...(input.authorityName !== undefined ? { authorityName: input.authorityName ?? null } : {}),
  ...(input.number !== undefined ? { number: input.number ?? null } : {}),
  ...(input.date ? { date: toDate(input.date) } : {}),
  ...(input.branchId !== undefined ? { branchId: input.branchId ?? null } : {}),
  ...(input.employeeId !== undefined ? { employeeId: input.employeeId ?? null } : {}),
  ...(input.reason !== undefined ? { reason: input.reason } : {}),
  ...(input.penalty !== undefined ? { penalty: input.penalty ?? null } : {}),
  ...(input.amount !== undefined ? { amount: new Prisma.Decimal(input.amount) } : {}),
  ...(input.payDeadline !== undefined ? { payDeadline: input.payDeadline ? toDate(input.payDeadline) : null } : {}),
  ...(input.objectionDeadline !== undefined ? { objectionDeadline: input.objectionDeadline ? toDate(input.objectionDeadline) : null } : {}),
  ...(input.relatedType !== undefined ? { relatedType: input.relatedType ?? null } : {}),
  ...(input.relatedId !== undefined ? { relatedId: input.relatedId ?? null } : {}),
  ...(input.relatedLabel !== undefined ? { relatedLabel: input.relatedLabel ?? null } : {}),
  ...(input.fileId !== undefined ? { fileId: input.fileId ?? null } : {}),
  ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId ?? null } : {}),
  ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
});

export async function create(input: CreateViolationInput, userId?: string) {
  const v = await prisma.violation.create({
    data: {
      ...dataOf(input),
      kind: input.kind,
      date: toDate(input.date),
      reason: input.reason,
      status: input.kind === "AUTHORITY" ? "NEW" : "OPEN",
      authority: input.kind === "AUTHORITY" ? input.authority : null,
      createdById: userId ?? null,
    },
  });
  await event(v.id, "created", input.date, null, userId);
  return getById(v.id);
}

async function load(id: string) {
  const v = await prisma.violation.findFirst({ where: { id, deletedAt: null } });
  if (!v) throw ApiError.notFound("Violation not found");
  return v;
}

export async function update(id: string, input: UpdateViolationInput, userId?: string) {
  await load(id);
  await prisma.violation.update({ where: { id }, data: dataOf(input) });
  await event(id, "edited", riyadhNow().date, null, userId);
  return getById(id);
}

export async function softDelete(id: string) {
  await load(id);
  await prisma.violation.update({ where: { id }, data: { deletedAt: new Date() } });
}

/** Pays an authority violation with a payment voucher in Payments ("government fines"). */
export async function pay(id: string, input: { date: string; method: "CASH" | "BANK_TRANSFER" | "CARD" | "ONLINE" | "OTHER"; referenceNumber?: string; paidBy?: string; fileId?: string }, userId: string) {
  const v = await load(id);
  if (v.kind !== "AUTHORITY" || !OPEN_AUTHORITY.includes(v.status)) throw ApiError.badRequest("This violation can't be paid.");
  if (Number(v.amount) <= 0) throw ApiError.badRequest("Enter the fine's amount before paying it.");
  const who = authorityName(v.authority, v.authorityName, false);
  const payment = await paymentsService.create(
    {
      paymentDate: toDate(input.date),
      category: "GOVERNMENT_FINES",
      amount: Number(v.amount),
      vat: 0,
      method: input.method,
      paidBy: input.paidBy,
      branchId: v.branchId ?? undefined,
      employeeId: v.employeeId ?? undefined,
      supplierName: who,
      referenceNumber: input.referenceNumber,
      fileId: input.fileId,
      description: `${v.reason}${v.number ? ` — مخالفة رقم ${v.number}` : ""}`,
    } as never,
    userId
  );
  await prisma.violation.update({ where: { id }, data: { status: "PAID", paymentId: payment.id } });
  await event(id, "paid", input.date, `سند صرف ${payment.paymentNumber}`, userId);
  return getById(id);
}

export async function objection(id: string, input: { date: string; reference?: string; note?: string }, userId?: string) {
  const v = await load(id);
  if (v.kind !== "AUTHORITY" || v.status !== "NEW") throw ApiError.badRequest("An objection can only be filed on a new violation.");
  await prisma.violation.update({ where: { id }, data: { status: "OBJECTION" } });
  await event(id, "objection", input.date, [input.reference ? `رقم الطلب ${input.reference}` : "", input.note ?? ""].filter(Boolean).join(" — "), userId);
  return getById(id);
}

export async function objectionResult(id: string, input: { accepted: boolean; date: string; note?: string }, userId?: string) {
  const v = await load(id);
  if (v.status !== "OBJECTION") throw ApiError.badRequest("This violation has no objection pending.");
  await prisma.violation.update({ where: { id }, data: { status: input.accepted ? "ACCEPTED" : "REJECTED" } });
  await event(id, input.accepted ? "accepted" : "rejected", input.date, input.note, userId);
  return getById(id);
}

/** A staff penalty carried out (the warning given, the deduction made). */
export async function apply(id: string, input: { date: string; note?: string }, userId?: string) {
  const v = await load(id);
  if (v.kind !== "STAFF" || v.status !== "OPEN") throw ApiError.badRequest("This penalty is already applied.");
  await prisma.violation.update({ where: { id }, data: { status: "APPLIED" } });
  await event(id, "applied", input.date, input.note, userId);
  return getById(id);
}

/** Documents a violation may be about: the employee's, or the establishment's. */
export async function relatedOptions(employeeId: string | undefined, branchId: string | undefined, auth: AuthContext) {
  const out: { type: string; id: string; label: string; expiry: string | null; expired: boolean }[] = [];
  if (employeeId) {
    const items = (await getTrackableItems()).filter((i) => i.employeeId === employeeId && canViewSource(auth, i.sourceType));
    for (const i of items)
      out.push({ type: i.sourceType, id: i.recordId, label: `${i.documentAr || i.kindAr} — ${(i.employeeNameAr || i.labelAr || "").trim()}`, expiry: toDay(i.expiryDate), expired: daysUntil(i.expiryDate) <= 0 });
  }
  if (branchId && hasPermission(auth, "companyDocuments.view")) {
    const docs = await prisma.companyDocument.findMany({ where: { deletedAt: null, branchId }, select: { id: true, name: true, category: true, expiryDate: true }, orderBy: { expiryDate: "asc" }, take: 60 });
    for (const d of docs) out.push({ type: "COMPANY_DOCUMENT", id: d.id, label: d.name, expiry: toDay(d.expiryDate), expired: !!d.expiryDate && daysUntil(d.expiryDate) <= 0 });
  }
  return out;
}
