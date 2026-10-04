import { describe, expect, it } from "vitest";
import { collectReportPages, buildReportDocument } from "../src/pages/reports/print-report-utils";
describe("complete printable reports", () => {
  it("includes every page rather than truncating the first hundred records", async () => {
    const result = await collectReportPages(async page => ({ data: Array.from({ length: page === 3 ? 5 : 100 }, (_, i) => (page - 1) * 100 + i), meta: { totalPages: 3, total: 205 } }));
    expect(result).toHaveLength(205); expect(result[204]).toBe(204);
  });
  it("rejects a partial report when a later page fails", async () => {
    await expect(collectReportPages(async page => { if (page === 2) throw new Error("offline"); return { data: [1], meta: { totalPages: 2, total: 2 } }; })).rejects.toThrow("offline");
  });
  it("rejects changed record counts rather than printing an incomplete report", async () => {
    await expect(collectReportPages(async () => ({ data: [1], meta: { totalPages: 1, total: 2 } }))).rejects.toThrow("changed");
  });
  it("escapes business data in the preview and print document", () => {
    const html = buildReportDocument({ title: "<img src=x onerror=alert(1)>", subtitle: "<script>alert(1)</script>", headers: ["Name"], rows: [["</td><script>alert(1)</script>"]], total: "100", isAr: true });
    expect(html).not.toContain("<script>"); expect(html).not.toContain("<img"); expect(html).toContain("&lt;script&gt;"); expect(html).toContain('dir="rtl"');
  });
});
