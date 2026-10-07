import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => {
  const delegate = () => ({ findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(), count: vi.fn(), createMany: vi.fn() });
  const db: any = { employee: delegate(), employeeDocument: delegate(), companyDocument: delegate(), dailyTask: delegate(), employeeOnboarding: delegate(), alertAcknowledgement: delegate(), auditLog: delegate(), branch: delegate(), reportSchedule: delegate(), generatedReport: delegate(), maintenanceLease: delegate(), file: delegate(), $transaction: vi.fn(), $queryRaw: vi.fn() };
  return { db, items: vi.fn(), auth: vi.fn(), storage: { save: vi.fn(), read: vi.fn(), delete: vi.fn() }, pdf: vi.fn() };
});
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("@/services/expiringItems", () => ({ getTrackableItems: mocks.items }));
vi.mock("@/services/settingsStore", () => ({ getExpirationRules: async () => ({ expiringSoonThresholdDays: 30 }) }));
vi.mock("@/middleware/auth", () => ({ loadAuthContext: mocks.auth }));
vi.mock("@/lib/storage", () => ({ storage: mocks.storage }));
vi.mock("@/services/branding", () => ({ getBrandingContext: async () => ({}) }));
vi.mock("@/services/pdf", () => ({ renderHtmlToPdf: mocks.pdf }));
vi.mock("@/modules/pdf/templates", () => ({ tableReportPdf: () => "<html></html>" }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/modules/maintenance/backups.service", () => ({ restoringSystem: false }));
vi.mock("@/modules/reports/reports.service", () => ({ employeesReport: async () => [], documentsReport: async () => [], paymentsReport: async () => [], activityReport: async () => [] }));
import { globalSearch } from "@/modules/search/search.service";
import { acknowledge, alertCenter } from "@/modules/alerts/alerts.service";
const auth = (...permissions: string[]) => ({ userId: "u1", permissions: new Set(permissions), isSuperAdmin: false } as any);
beforeEach(() => {
  vi.clearAllMocks();
  for (const model of Object.values(mocks.db) as any[]) if (model && typeof model === "object") {
    model.findMany?.mockResolvedValue([]); model.findFirst?.mockResolvedValue(null); model.findUnique?.mockResolvedValue(null); model.count?.mockResolvedValue(0);
    model.updateMany?.mockResolvedValue({ count: 1 }); model.deleteMany?.mockResolvedValue({ count: 1 }); model.create?.mockResolvedValue({ id: "r1", createdAt: new Date() }); model.update?.mockResolvedValue({}); model.upsert?.mockResolvedValue({}); model.createMany?.mockResolvedValue({ count: 1 });
  }
  mocks.db.$transaction.mockImplementation((fn: any) => fn(mocks.db)); mocks.items.mockResolvedValue([]);
});
describe("Live alert center", () => {
  it("filters protected documents and tasks, keeps reviewed state tied to expiry", async () => {
    mocks.items.mockResolvedValue([{ key: "iq", sourceType: "EMPLOYEE_IQAMA", recordId: "e1", employeeId: "e1", label: "Fixture", labelAr: "تجريبي", expiryDate: new Date("2020-01-01") }, { key: "co", sourceType: "COMPANY_DOCUMENT", recordId: "d1", label: "Protected", labelAr: "محمي", expiryDate: new Date("2020-01-01") }]);
    mocks.db.alertAcknowledgement.findMany.mockResolvedValue([{ key: "iq:2020-01-01T00:00:00.000Z" }]);
    const rows = await alertCenter(auth("employees.view"));
    expect(rows).toHaveLength(1); expect(rows[0].acknowledged).toBe(true); expect(rows[0].href).toBe("/employees/e1"); expect(mocks.db.dailyTask.findMany).not.toHaveBeenCalled();
  });
  it("does not allow acknowledging hidden or disappeared alerts", async () => {
    await expect(acknowledge(auth(), "other-user-alert", true)).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.db.alertAcknowledgement.upsert).not.toHaveBeenCalled();
  });
});
describe("Search permissions", () => {
  it("searches tasks and employee documents in their correct categories", async () => {
    mocks.db.employeeDocument.findMany.mockResolvedValue([{ id: "doc1", employeeId: "e1", name: "Contract", employee: { fullNameAr: "Test" } }]);
    mocks.db.dailyTask.findMany.mockResolvedValue([{ id: "t1", title: "Task", date: new Date("2026-10-02") }]);
    const rows = await globalSearch("test", auth("employees.view", "employeeDocuments.view", "tasks.view"));
    expect(rows.map(r => r.type)).toEqual(["employeeDocument", "task"]); expect(rows[0].href).toBe("/employee-documents/e1/doc1"); expect(rows[1].href).toContain("date=2026-10-02");
    expect(mocks.db.companyDocument.findMany).not.toHaveBeenCalled();
  });
  it("does not query employee documents with only one required permission", async () => {
    await globalSearch("test", auth("employeeDocuments.view")); expect(mocks.db.employeeDocument.findMany).not.toHaveBeenCalled();
  });
});
