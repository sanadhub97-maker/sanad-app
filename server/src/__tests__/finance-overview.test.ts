import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/modules/productivity/productivity.service", () => ({ requireAccess: vi.fn() }));
import { duplicatePaymentGroups, financeQuery } from "@/modules/operations/finance.service";
const payment = { id: "one", paymentDate: new Date("2026-01-01"), total: "100", referenceNumber: null, supplierName: "Supplier", employeeId: null, branchId: "branch", category: "OTHER" };
describe("Financial comparisons", () => {
  it("limits the date window and rejects inverted periods", () => {
    expect(financeQuery.safeParse({ from: "2026-01-01", to: "2026-12-31" }).success).toBe(true);
    expect(financeQuery.safeParse({ from: "2026-12-31", to: "2026-01-01" }).success).toBe(false);
    expect(financeQuery.safeParse({ from: "2020-01-01", to: "2026-01-01" }).success).toBe(false);
  });
  it("finds equivalent supplier payments without merging or removing records", () => {
    const rows = [payment, { ...payment, id: "two", supplierName: " SUPPLIER " }];
    expect(duplicatePaymentGroups(rows)).toEqual([rows]); expect(rows).toHaveLength(2);
  });
  it("keeps different branches, employees and references separate", () => {
    expect(duplicatePaymentGroups([payment, { ...payment, id: "two", branchId: "other" }, { ...payment, id: "three", employeeId: "employee" }, { ...payment, id: "four", referenceNumber: "other" }])).toEqual([]);
  });
  it("does not flag unrelated anonymous payments just because date and amount match", () => {
    expect(duplicatePaymentGroups([{ ...payment, supplierName: null }, { ...payment, id: "two", supplierName: null }])).toEqual([]);
  });
});
