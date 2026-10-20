import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ docs: [] as any[], payments: [] as any[] }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  payment: { findFirst: vi.fn(async () => null), count: vi.fn(async () => 0), create: vi.fn((args: any) => { mock.payments.push(args.data); return Promise.resolve({ id: "p1", ...args.data }); }) },
  employeeDocument: { create: vi.fn((args: any) => { mock.docs.push(args.data); return Promise.resolve({ id: "d1", ...args.data }); }) },
  $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
} }));
vi.mock("@/services/settingsStore", () => ({ getExpirationRules: async () => ({ expiringSoonThresholdDays: 30, notifyDaysBefore: [30] }) }));
import { create, workPermitMonths } from "@/modules/payments/payments.service";

beforeEach(() => { mock.docs = []; mock.payments = []; });

describe("a work permit voucher", () => {
  it("reads the permit's length", () => {
    expect(workPermitMonths("MONTHS_6")).toBe(6);
    expect(workPermitMonths("MONTHS_12")).toBe(12);
    expect(workPermitMonths("RENEWAL")).toBeNull();
  });
  it("records the permit on the employee, ending its length after the payment date", async () => {
    await create({ category: "WORK_PERMIT", type: "MONTHS_6", employeeId: "e1", amount: 9700, vat: 0, method: "CASH", paymentDate: new Date("2026-10-21T00:00:00Z"), paymentNumber: "PAY-1" } as never, "u1");
    expect(mock.payments).toHaveLength(1);
    expect(mock.docs).toHaveLength(1);
    expect(mock.docs[0]).toMatchObject({ employeeId: "e1", type: "WORK_PERMIT" });
    expect(mock.docs[0].expiryDate.toISOString().slice(0, 10)).toBe("2027-04-21");
  });
  it("records nothing more for other vouchers", async () => {
    await create({ category: "IQAMA", type: "RENEWAL", employeeId: "e1", amount: 650, vat: 0, method: "CASH", paymentDate: new Date("2026-10-21T00:00:00Z"), paymentNumber: "PAY-2" } as never, "u1");
    expect(mock.docs).toHaveLength(0);
  });
});
