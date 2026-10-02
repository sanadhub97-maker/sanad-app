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
import { acknowledge, alertCenter, bulkUpdate, dataQuality, detectDuplicates, onboarding, setOnboarding } from "@/modules/productivity/productivity.service";
import { assertReportAccess, createSchedule, dueSlot, generateReport, ownedSchedule, reportSourcePermissions, runScheduledReports } from "@/modules/productivity/scheduled-reports.service";
import { bulkSchema, scheduleSchema } from "@/modules/productivity/productivity.schemas";
import { assertFileAccess } from "@/modules/files/files.access";
const auth = (...permissions: string[]) => ({ userId: "u1", permissions: new Set(permissions), isSuperAdmin: false } as any);
beforeEach(() => {
  vi.clearAllMocks();
  for (const model of Object.values(mocks.db) as any[]) if (model && typeof model === "object") {
    model.findMany?.mockResolvedValue([]); model.findFirst?.mockResolvedValue(null); model.findUnique?.mockResolvedValue(null); model.count?.mockResolvedValue(0);
    model.updateMany?.mockResolvedValue({ count: 1 }); model.deleteMany?.mockResolvedValue({ count: 1 }); model.create?.mockResolvedValue({ id: "r1", createdAt: new Date() }); model.update?.mockResolvedValue({}); model.upsert?.mockResolvedValue({}); model.createMany?.mockResolvedValue({ count: 1 });
  }
  mocks.db.$transaction.mockImplementation((fn: any) => fn(mocks.db)); mocks.items.mockResolvedValue([]);
});
describe("Data quality and bulk actions", () => {
  it("normalizes identifiers but ignores empty values and repeated IDs", () => {
    const row = (id: string, value: string) => ({ id, name: id, href: `/employees/${id}`, values: { iqama: value } });
    expect(detectDuplicates([row("1", "ＡＢ-１２"), row("2", "ab12"), row("3", "")])).toHaveLength(1);
    expect(detectDuplicates([row("1", "ab12"), row("1", "AB12")])).toHaveLength(0);
  });
  it("does not query data outside the user's permissions", async () => {
    expect((await dataQuality(auth())).scanned).toBe(0);
    expect(mocks.db.employee.findMany).not.toHaveBeenCalled(); expect(mocks.db.companyDocument.findMany).not.toHaveBeenCalled(); expect(mocks.db.employeeDocument.findMany).not.toHaveBeenCalled();
  });
  it("flags incomplete active sponsored employee records", async () => {
    mocks.db.employee.findMany.mockResolvedValue([{ id: "e1", fullNameAr: "تجريبي", employmentStatus: "ACTIVE", onSponsorship: true }]);
    expect((await dataQuality(auth("employees.view"))).issues[0].title).toContain("الإقامة");
  });
  it("rejects empty changes, duplicate IDs, unknown fields and excessive selections", () => {
    const valid = { ids: ["e1"], changes: { onSponsorship: false } };
    expect(bulkSchema.safeParse(valid).success).toBe(true);
    for (const input of [{ ids: ["e1"], changes: {} }, { ...valid, ids: ["e1", "e1"] }, { ...valid, changes: { iqamaNumber: "duplicate" } }, { ...valid, ids: Array.from({ length: 101 }, (_, i) => String(i)) }]) expect(bulkSchema.safeParse(input).success).toBe(false);
  });
  it("requires both employee view and edit permissions", async () => {
    await expect(bulkUpdate(auth("employees.view"), { ids: ["e1"], changes: { department: "HR" } })).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.db.employee.updateMany).not.toHaveBeenCalled();
  });
  it("rejects deleted selections before any update", async () => {
    await expect(bulkUpdate(auth("employees.view", "employees.edit"), { ids: ["missing"], changes: { department: "HR" } })).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.db.employee.updateMany).not.toHaveBeenCalled();
  });
  it("rejects missing or inactive branches before updates", async () => {
    mocks.db.employee.findMany.mockResolvedValue([{ id: "e1", employeeNumber: "EMP1" }]);
    await expect(bulkUpdate(auth("employees.view", "employees.edit"), { ids: ["e1"], changes: { branchId: "gone" } })).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.db.employee.updateMany).not.toHaveBeenCalled();
  });
  it("updates the selected set and audits every affected record atomically", async () => {
    mocks.db.employee.findMany.mockResolvedValue([{ id: "e1", employeeNumber: "EMP1" }, { id: "e2", employeeNumber: "EMP2" }]);
    await bulkUpdate(auth("employees.view", "employees.edit"), { ids: ["e1", "e2"], changes: { onSponsorship: false } });
    expect(mocks.db.employee.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["e1", "e2"] }, deletedAt: null }, data: { onSponsorship: false } });
    expect(mocks.db.auditLog.createMany.mock.calls[0][0].data).toHaveLength(2);
    expect(mocks.db.$transaction.mock.calls[0][1]).toMatchObject({ isolationLevel: "Serializable" });
  });
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
describe("Onboarding", () => {
  it("does not expose employment-contract status without document permission", async () => {
    mocks.db.employee.findMany.mockResolvedValue([{ id: "e1", fullNameAr: "Test", employeeNumber: "1", onSponsorship: false, onboarding: { steps: { training: true } } }]);
    const rows = await onboarding(auth("employees.view"));
    expect(rows.rows[0].steps.some(s => s.key === "contract")).toBe(false);
    expect(rows.rows[0].steps.find(s => s.key === "training")?.done).toBe(true);
    expect(mocks.db.employee.findMany.mock.calls[0][0].include.documents).toBeUndefined();
  });
  it("preserves other checklist steps and audits changes", async () => {
    mocks.db.employee.findFirst.mockResolvedValue({ id: "e1" }); mocks.db.employeeOnboarding.findUnique.mockResolvedValue({ steps: { orientation: true } });
    await setOnboarding(auth("employees.view", "employees.edit"), "e1", "training", true);
    expect(mocks.db.employeeOnboarding.upsert.mock.calls[0][0].update.steps).toEqual({ orientation: true, training: true });
    expect(mocks.db.$queryRaw).toHaveBeenCalled(); expect(mocks.db.auditLog.create).toHaveBeenCalled();
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
describe("Report scheduling", () => {
  it("uses Riyadh dates and only returns due daily/weekly/monthly slots", () => {
    const schedule = { frequency: "daily", time: "09:00", weekday: 5, monthday: 2 };
    expect(dueSlot(schedule, new Date("2026-10-02T05:59:00Z"))).toBeNull();
    expect(dueSlot(schedule, new Date("2026-10-02T06:00:00Z"))).toBe("2026-10-02");
    expect(dueSlot({ ...schedule, frequency: "weekly", weekday: 4 }, new Date("2026-10-02T06:00:00Z"))).toBeNull();
    expect(dueSlot({ ...schedule, frequency: "weekly" }, new Date("2026-10-02T06:00:00Z"))).toBe("2026-10-02");
    expect(dueSlot({ ...schedule, frequency: "monthly", monthday: 3 }, new Date("2026-10-02T06:00:00Z"))).toBeNull();
    expect(dueSlot({ ...schedule, frequency: "monthly" }, new Date("2026-10-02T06:00:00Z"))).toBe("2026-10-02");
    expect(dueSlot({ ...schedule, time: "00:00" }, new Date("2026-10-01T21:01:00Z"))).toBe("2026-10-02");
  });
  it("validates times, dates, frequency and language", () => {
    const input = { name: "Test", kind: "documents", frequency: "monthly", time: "09:00", monthday: 28 };
    expect(scheduleSchema.safeParse(input).success).toBe(true);
    for (const bad of [{ ...input, time: "24:00" }, { ...input, monthday: 31 }, { ...input, weekday: 7 }, { ...input, language: "x" }]) expect(scheduleSchema.safeParse(bad).success).toBe(false);
  });
  it("requires source and export permissions", () => {
    expect(() => assertReportAccess(auth("reports.view", "reports.export"), "employees")).toThrow();
    expect(() => assertReportAccess(auth("reports.view", "employees.view"), "employees")).toThrow();
    expect(() => assertReportAccess(auth("reports.view", "reports.export", "companyDocuments.view"), "documents")).not.toThrow();
  });
  it("records every source permission used by a mixed document report", () => {
    expect(reportSourcePermissions(auth("employees.view", "companyDocuments.view"), "documents")).toEqual(["employees.view", "companyDocuments.view"]);
    expect(reportSourcePermissions(auth("payments.view"), "payments")).toEqual(["payments.view"]);
  });
  it("scopes schedule ownership and limits number of schedules", async () => {
    await expect(ownedSchedule(auth(), "other-user-schedule")).rejects.toMatchObject({ statusCode: 404 });
    mocks.db.reportSchedule.count.mockResolvedValue(20);
    await expect(createSchedule(auth("reports.view", "reports.export", "employees.view"), scheduleSchema.parse({ name: "Test", kind: "employees", frequency: "daily", time: "09:00" }))).rejects.toMatchObject({ statusCode: 400 });
  });
  it("does not render or upload duplicate daily runs", async () => {
    mocks.db.generatedReport.create.mockRejectedValue({ code: "P2002" });
    expect(await generateReport({ id: "s1", userId: "u1" } as any, "2026-10-02")).toBeNull();
    expect(mocks.pdf).not.toHaveBeenCalled(); expect(mocks.storage.save).not.toHaveBeenCalled();
  });
  it("rechecks current permissions before report generation", async () => {
    mocks.auth.mockResolvedValue(auth("reports.view", "reports.export"));
    await generateReport({ id: "s1", userId: "u1", kind: "employees", language: "ar" } as any, "day");
    expect(mocks.pdf).not.toHaveBeenCalled();
    expect(mocks.db.generatedReport.update.mock.calls[0][0].data.status).toBe("FAILED");
  });
  it("does not save a PDF if permissions are revoked during rendering", async () => {
    mocks.auth.mockResolvedValueOnce(auth("reports.view", "reports.export", "employees.view")).mockResolvedValueOnce(auth()); mocks.pdf.mockResolvedValue(Buffer.from("%PDF-test"));
    await generateReport({ id: "s1", userId: "u1", kind: "employees", language: "ar" } as any, "day");
    expect(mocks.storage.save).not.toHaveBeenCalled();
    expect(mocks.db.generatedReport.update.mock.calls[0][0].data.status).toBe("FAILED");
  });
  it("marks interrupted runs as failed and releases the scheduler lease", async () => {
    await runScheduledReports();
    expect(mocks.db.generatedReport.updateMany.mock.calls[0][0].data.status).toBe("FAILED");
    expect(mocks.db.maintenanceLease.deleteMany).toHaveBeenCalled();
  });
  it("blocks generic file routes from bypassing schedule ownership", () => {
    expect(() => assertFileAccess({ module: "scheduled-report", uploadedById: "u1", relatedId: "s1" }, auth("files.view", "reports.view", "reports.export"))).toThrow();
  });
});
