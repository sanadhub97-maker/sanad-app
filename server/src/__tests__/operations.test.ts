import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  managedAsset: { findFirst: vi.fn(), update: vi.fn() },
  assetHandover: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), count: vi.fn(), update: vi.fn() },
  employee: { findFirst: vi.fn(), update: vi.fn() },
  employeeOffboarding: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  renewalCase: { findUnique: vi.fn(), update: vi.fn() },
  dailyTask: { updateMany: vi.fn() }, auditLog: { create: vi.fn() }, $queryRaw: vi.fn(), $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/modules/productivity/productivity.service", () => ({ requireAccess: (auth: any, permission: string) => { if (!auth.isSuperAdmin && !auth.permissions.has(permission)) throw new Error("Forbidden"); } }));
vi.mock("@/modules/maintenance/revisions.service", () => ({ applyTrackedDocumentUpdate: vi.fn() }));
import { assignAsset, finishOffboarding, finishRenewal, updateClearance, returnAsset } from "@/modules/operations/operations.service";
import * as schema from "@/modules/operations/operations.schemas";
const auth: any = { userId: "admin", isSuperAdmin: true, permissions: new Set(), roles: [] };
beforeEach(() => { vi.resetAllMocks(); db.$transaction.mockImplementation(async (fn: any) => fn(db)); });
describe("Operations workflow safeguards", () => {
  it("rejects impossible dates and fractional currency", () => {
    expect(schema.date.safeParse("2026-02-30").success).toBe(false);
    expect(schema.date.safeParse("2028-02-29").success).toBe(true);
    expect(schema.money.safeParse(1.001).success).toBe(false);
    expect(schema.money.safeParse(1.01).success).toBe(true);
  });
  it("does not let read-only staff issue assets", async () => {
    await expect(assignAsset({ ...auth, isSuperAdmin: false, permissions: new Set(["employees.view"]) }, "asset", { employeeId: "employee", issuedCondition: "New" })).rejects.toThrow("Forbidden");
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("rejects an already assigned asset before creating another handover", async () => {
    db.managedAsset.findFirst.mockResolvedValue({ state: "ASSIGNED" });
    await expect(assignAsset(auth, "asset", { employeeId: "employee", issuedCondition: "New" })).rejects.toThrow("unavailable");
    expect(db.assetHandover.create).not.toHaveBeenCalled(); expect(db.$queryRaw).toHaveBeenCalled();
  });
  it("blocks new handovers during clearance", async () => {
    db.managedAsset.findFirst.mockResolvedValue({ state: "AVAILABLE" }); db.employee.findFirst.mockResolvedValue({ id: "employee" });
    db.employeeOffboarding.findFirst.mockResolvedValue({ status: "OPEN" });
    await expect(assignAsset(auth, "asset", { employeeId: "employee", issuedCondition: "New" })).rejects.toThrow("offboarding");
    expect(db.assetHandover.create).not.toHaveBeenCalled();
  });
  it("rejects repeated returns without changing inventory", async () => {
    db.assetHandover.findUnique.mockResolvedValue({ assetId: "asset", returnedAt: new Date() });
    await expect(returnAsset(auth, "receipt", { returnedCondition: "Good", state: "AVAILABLE" })).rejects.toThrow("already been returned");
    expect(db.managedAsset.update).not.toHaveBeenCalled();
  });
  it("preserves other clearance steps when changing one", async () => {
    db.employeeOffboarding.findFirst.mockResolvedValue({ status: "OPEN", employeeId: "employee", steps: { documents: true, access: false } });
    await updateClearance(auth, "case", "handover", true);
    expect(db.employeeOffboarding.update).toHaveBeenCalledWith({ where: { id: "case" }, data: { steps: { documents: true, access: false, handover: true } } });
  });
  it("does not terminate an employee with outstanding assets", async () => {
    db.employeeOffboarding.findUnique.mockResolvedValue({ employeeId: "employee" });
    db.employeeOffboarding.findFirst.mockResolvedValue({ employeeId: "employee", status: "OPEN", steps: { documents: true, settlement: true, access: true, handover: true } });
    db.assetHandover.count.mockResolvedValue(1);
    await expect(finishOffboarding(auth, "case")).rejects.toThrow("Return all"); expect(db.employee.update).not.toHaveBeenCalled();
  });
  it("does not reopen a completed renewal", async () => {
    db.renewalCase.findUnique.mockResolvedValue({ status: "COMPLETED" });
    await expect(finishRenewal(auth, "case", { expiryDate: "2030-01-01" })).rejects.toThrow("closed"); expect(db.renewalCase.update).not.toHaveBeenCalled();
  });
  it("rechecks expiry after locking the actual document", async () => {
    db.renewalCase.findUnique.mockResolvedValue({ status: "OPEN", sourceType: "EMPLOYEE_IQAMA", sourceId: "employee" });
    db.employee.findFirst.mockResolvedValueOnce({ iqamaExpiryDate: new Date("2028-01-01"), fullNameAr: "Test" }).mockResolvedValueOnce({ iqamaExpiryDate: new Date("2031-01-01"), fullNameAr: "Test" });
    await expect(finishRenewal(auth, "case", { expiryDate: "2030-01-01" })).rejects.toThrow("later than");
    expect(db.employee.findFirst).toHaveBeenCalledTimes(2); expect(db.$queryRaw).toHaveBeenCalledTimes(2); expect(db.renewalCase.update).not.toHaveBeenCalled();
  });
});
