import { describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ items: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/services/settingsStore", () => ({ getExpirationRules: async () => ({ expiringSoonThresholdDays: 30 }) }));
vi.mock("@/services/expiringItems", () => ({ getTrackableItems: fixture.items }));
import { documentsReportQuerySchema } from "@/modules/reports/reports.schemas";
import { documentsReport } from "@/modules/reports/reports.service";
import { pdfContentDisposition } from "@/utils/pdfHeaders";
import { exportQuerySchema } from "@/modules/tasks/tasks.schemas";
const items = ["EMPLOYEE_IQAMA", "EMPLOYEE_PASSPORT", "EMPLOYEE_DOCUMENT", "COMPANY_DOCUMENT"].map((sourceType, i) => ({ sourceType, kind: ["IQAMA", "PASSPORT", "HEALTH_CERTIFICATE", "COMMERCIAL_REGISTRATION"][i], recordId: String(i), expiryDate: new Date("2027-01-01"), label: "Synthetic", labelAr: "تجريبي" }));
describe("Report source filters", () => {
  it("keeps Arabic record numbers in valid HTTP filenames", () => {
    const header = pdfContentDisposition('employee-١٢٣"\r\n.pdf');
    expect(header).not.toMatch(/[^\x20-\x7e]/);
    const encoded = header.split("UTF-8''")[1];
    expect(decodeURIComponent(encoded)).toBe('employee-١٢٣"__.pdf');
  });
  it("rejects invalid dates, reversed ranges and excessive task exports", () => {
    const parse = (from: string, to: string) => exportQuerySchema.safeParse({ from, to, format: "pdf" }).success;
    expect(parse("2026-02-30", "2026-03-01")).toBe(false);
    expect(parse("2026-10-03", "2026-10-02")).toBe(false);
    expect(parse("2026-01-01", "2026-10-01")).toBe(false);
    expect(parse("2026-10-01", "2026-10-02")).toBe(true);
  });
  it("exports only employee documents for the aggregate employee filter", async () => {
    fixture.items.mockResolvedValue(items);
    const query = documentsReportQuerySchema.parse({ sourceType: "EMPLOYEE", format: "pdf" });
    const rows = await documentsReport(query, { isSuperAdmin: true } as any);
    expect(rows.map(r => r.sourceType)).toEqual(["EMPLOYEE_IQAMA", "EMPLOYEE_PASSPORT", "EMPLOYEE_DOCUMENT"]);
  });
  it("continues to enforce source permissions inside an aggregate report", async () => {
    fixture.items.mockResolvedValue(items);
    const rows = await documentsReport({ sourceType: "EMPLOYEE", format: "json" }, { isSuperAdmin: false, permissions: new Set(["employees.view"]) } as any);
    expect(rows.map(r => r.sourceType)).toEqual(["EMPLOYEE_IQAMA", "EMPLOYEE_PASSPORT"]);
  });
  it("keeps company and individual employee source filters distinct", async () => {
    fixture.items.mockResolvedValue(items);
    const rows = await documentsReport({ sourceType: "COMPANY_DOCUMENT", format: "pdf" }, { isSuperAdmin: true } as any);
    expect(rows.map(r => r.sourceType)).toEqual(["COMPANY_DOCUMENT"]);
  });
});
