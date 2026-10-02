import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ get: vi.fn(), click: vi.fn(), open: vi.fn(), info: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { get: mock.get }, extractErrorMessage: async (error: Error) => error.message }));
vi.mock("@/i18n", () => ({ default: { language: "en" }, tr: (_ar: string, en: string) => en, isRtlLanguage: () => false }));
vi.mock("sonner", () => ({ toast: { loading: () => "loading", info: mock.info, success: mock.success, error: mock.error } }));
import { downloadFile, openPdfInNewTab } from "@/lib/download";
const response = () => ({ data: new Blob(["%PDF-1.7 synthetic"], { type: "application/pdf" }), headers: { "content-disposition": 'inline; filename="report.pdf"' } });
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers();
  vi.stubGlobal("window", { open: mock.open, URL: { createObjectURL: () => "blob:synthetic", revokeObjectURL: vi.fn() } });
  vi.stubGlobal("document", { createElement: () => ({ click: mock.click, remove: vi.fn() }), body: { appendChild: vi.fn() } });
  mock.open.mockReturnValue(null);
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("PDF download and print interactions", () => {
  it("does not send another render request or open another window for repeated clicks", async () => {
    let resolve!: (value: unknown) => void; mock.get.mockReturnValue(new Promise(r => { resolve = r; }));
    const first = openPdfInNewTab("/reports/documents", { format: "pdf", status: "EXPIRED" });
    await openPdfInNewTab("/reports/documents", { status: "EXPIRED", format: "pdf" });
    expect(mock.get).toHaveBeenCalledOnce(); expect(mock.open).toHaveBeenCalledOnce(); expect(mock.info).toHaveBeenCalledOnce();
    resolve(response()); await first;
  });
  it("downloads the valid PDF and explains what happened when the popup is blocked", async () => {
    mock.get.mockResolvedValue(response()); await openPdfInNewTab("/employees/fixture/pdf");
    expect(mock.click).toHaveBeenCalledOnce(); expect(mock.success.mock.calls[0][0]).toContain("preview window did not open");
  });
  it("falls back to download if navigating the opened window is blocked", async () => {
    const close = vi.fn(); mock.open.mockReturnValue({ closed: false, document: { write: vi.fn(), close: vi.fn() }, location: { replace: () => { throw new Error("Blocked"); } }, close });
    mock.get.mockResolvedValue(response()); await openPdfInNewTab("/employees/other/pdf");
    expect(mock.click).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce();
  });
  it("releases the pending operation after an error so a deliberate retry works", async () => {
    mock.get.mockRejectedValueOnce(new Error("Temporary connection failure")).mockResolvedValueOnce(response());
    await expect(downloadFile("/retry", { format: "pdf" })).rejects.toThrow("Temporary connection");
    await downloadFile("/retry", { format: "pdf" }); expect(mock.get).toHaveBeenCalledTimes(2); expect(mock.click).toHaveBeenCalledOnce();
  });
  it("does not save an HTML error response as a PDF", async () => {
    mock.get.mockResolvedValue({ data: new Blob(["<html>Error</html>"]), headers: {} });
    await expect(openPdfInNewTab("/invalid/pdf")).rejects.toThrow("invalid"); expect(mock.click).not.toHaveBeenCalled();
  });
});
