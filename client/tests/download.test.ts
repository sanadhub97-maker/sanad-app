import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocked = vi.hoisted(() => ({ get: vi.fn(), loading: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: mocked }));
vi.mock("@/lib/api", () => ({ api: { get: mocked.get }, extractErrorMessage: async (error: Error) => error.message }));
vi.mock("@/i18n", () => ({ tr: (_ar: string, en: string) => en, isRtlLanguage: () => false, default: { language: "en" } }));
import { downloadFile, openPdfInNewTab } from "@/lib/download";
let anchor: { href: string; download: string; click: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
let newTab: { closed: boolean; document: { write: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }; location: { replace: ReturnType<typeof vi.fn> }; close: ReturnType<typeof vi.fn> };
const open = vi.fn(), revoke = vi.fn(), create = vi.fn();
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers();
  anchor = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
  newTab = { closed: false, document: { write: vi.fn(), close: vi.fn() }, location: { replace: vi.fn() }, close: vi.fn() };
  open.mockReturnValue(newTab); create.mockReturnValue("blob:synthetic-pdf");
  vi.stubGlobal("window", { open, URL: { createObjectURL: create, revokeObjectURL: revoke } });
  vi.stubGlobal("document", { createElement: () => anchor, body: { appendChild: vi.fn() } });
  mocked.get.mockResolvedValue({ data: new Blob(["%PDF-1.7\nSynthetic PDF"], { type: "application/pdf" }), headers: { "content-disposition": 'inline; filename="report.pdf"' } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("PDF download and preview", () => {
  it("downloads the returned file and keeps its URL alive long enough to save", async () => {
    await downloadFile("/reports/employees", { format: "pdf" }, "fallback.pdf");
    expect(anchor.download).toBe("report.pdf"); expect(anchor.click).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1000); expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(59000); expect(revoke).toHaveBeenCalledWith("blob:synthetic-pdf");
  });
  it("decodes UTF-8 filenames without letting headers introduce a directory", async () => {
    mocked.get.mockResolvedValue({ data: new Blob(["%PDF-1.7"]), headers: { "content-disposition": "attachment; filename*=UTF-8''%D8%AA%D9%82%D8%B1%D9%8A%D8%B1.pdf" } });
    await downloadFile("/report", { format: "pdf" }); expect(anchor.download).toBe("تقرير.pdf");
    mocked.get.mockResolvedValue({ data: new Blob(["%PDF-1.7"]), headers: { "content-disposition": 'attachment; filename="../private/report.pdf"' } });
    await downloadFile("/report", { format: "pdf" }); expect(anchor.download).toBe("report.pdf");
  });
  it("rejects JSON or HTML masquerading as a successful PDF", async () => {
    mocked.get.mockResolvedValue({ data: new Blob(['{"error":"failed"}'], { type: "application/json" }), headers: {} });
    await expect(openPdfInNewTab("/report")).rejects.toThrow("invalid");
    expect(newTab.close).toHaveBeenCalledOnce(); expect(create).not.toHaveBeenCalled(); expect(mocked.success).not.toHaveBeenCalled();
  });
  it("opens the loading tab before fetching and releases bytes when it closes", async () => {
    await openPdfInNewTab("/report");
    expect(open.mock.invocationCallOrder[0]).toBeLessThan(mocked.get.mock.invocationCallOrder[0]);
    expect(newTab.document.close).toHaveBeenCalled(); expect(newTab.location.replace).toHaveBeenCalledWith("blob:synthetic-pdf");
    newTab.closed = true; vi.advanceTimersByTime(1000); expect(revoke).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(15 * 60_000); expect(revoke).toHaveBeenCalledOnce();
  });
  it("falls back to downloading when a popup is blocked", async () => {
    open.mockReturnValue(null); await openPdfInNewTab("/report");
    expect(anchor.click).toHaveBeenCalledOnce(); vi.advanceTimersByTime(60000); expect(revoke).toHaveBeenCalled();
  });
  it("keeps an open preview usable for a later print or save", async () => {
    await openPdfInNewTab("/report");
    vi.advanceTimersByTime(30 * 60_000); expect(revoke).not.toHaveBeenCalled();
    newTab.closed = true; vi.advanceTimersByTime(1000); expect(revoke).toHaveBeenCalledOnce();
  });
  it("normalizes an octet-stream PDF for browser preview", async () => {
    mocked.get.mockResolvedValue({ data: new Blob(["%PDF-1.7"], { type: "application/octet-stream" }), headers: {} });
    await openPdfInNewTab("/report"); expect(create.mock.calls[0][0].type).toBe("application/pdf");
  });
  it("closes an unused loading tab if navigating to the PDF is blocked", async () => {
    newTab.location.replace.mockImplementation(() => { throw new Error("blocked"); });
    await openPdfInNewTab("/report"); expect(anchor.click).toHaveBeenCalled(); expect(newTab.close).toHaveBeenCalled();
  });
  it("cleans up the loading tab and reports server errors", async () => {
    mocked.get.mockRejectedValue(new Error("Print service is busy"));
    await expect(openPdfInNewTab("/report")).rejects.toThrow("busy");
    expect(newTab.close).toHaveBeenCalled(); expect(mocked.error).toHaveBeenCalled(); expect(anchor.click).not.toHaveBeenCalled();
  });
});
