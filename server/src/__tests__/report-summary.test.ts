import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ employeeCount: vi.fn(), paymentAggregate: vi.fn(), auditCount: vi.fn(), items: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { employee: { count: mocks.employeeCount }, payment: { aggregate: mocks.paymentAggregate }, auditLog: { count: mocks.auditCount } } }));
vi.mock("@/services/expiringItems", () => ({ getTrackableItems: mocks.items }));
vi.mock("@/services/settingsStore", () => ({ getExpirationRules: async () => ({ expiringSoonThresholdDays: 30 }) }));
import { reportSummary } from "@/modules/reports/reports.service";
beforeEach(() => vi.resetAllMocks());
it("returns aggregates without fetching full employee/payment/activity records", async () => {
  mocks.employeeCount.mockResolvedValueOnce(1000).mockResolvedValueOnce(900);
  mocks.paymentAggregate.mockResolvedValue({ _sum: { total: 1234 }, _count: { _all: 20 } });
  mocks.auditCount.mockResolvedValue(8000);
  mocks.items.mockResolvedValue([{ sourceType: "COMPANY_DOCUMENT", expiryDate: new Date("2000-01-01") }]);
  const result = await reportSummary({ isSuperAdmin: true } as any);
  expect(result).toEqual({ documents: { total: 1, expired: 1, soon: 0 }, employees: { total: 1000, active: 900 }, payments: { total: 1234, count: 20 }, activity: 8000 });
  expect(JSON.stringify(result).length).toBeLessThan(300);
});
it("does not query or disclose modules outside the user's permissions", async () => {
  const result = await reportSummary({ permissions: new Set(["reports.view"]), isSuperAdmin: false } as any);
  expect(result).toEqual({ documents: null, employees: null, payments: null, activity: null });
  expect(mocks.employeeCount).not.toHaveBeenCalled();
  expect(mocks.paymentAggregate).not.toHaveBeenCalled();
  expect(mocks.auditCount).not.toHaveBeenCalled();
  expect(mocks.items).not.toHaveBeenCalled();
});
