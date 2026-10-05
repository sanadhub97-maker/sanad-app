import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ get: vi.fn(), click: vi.fn(), open: vi.fn(), info: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { get: mock.get }, extractErrorMessage: async (error: Error) => error.message }));
vi.mock("@/i18n", () => ({ default: { language: "en" }, tr: (_ar: string, en: string) => en, isRtlLanguage: () => false }));
vi.mock("sonner", () => ({ toast: { loading: () => "loading", info: mock.info, success: mock.success, error: mock.error } }));
import { usePdfPreviewStore } from "@/stores/pdfPreviewStore";
import { downloadFile, openPdfInNewTab } from "@/lib/download";
const response = () => ({ data: new Blob(["%PDF-1.7 synthetic"], { type: "application/pdf" }), headers: { "content-disposition": 'inline; filename="report.pdf"' } });
beforeEach(() => {
  usePdfPreviewStore.getState().close();
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
    expect(mock.get).toHaveBeenCalledOnce(); expect(mock.open).not.toHaveBeenCalled(); expect(mock.info).toHaveBeenCalledOnce();
    resolve(response()); await first;
  });
  it("keeps preview inside the site even when popups are blocked", async () => {
    mock.get.mockResolvedValue(response()); await openPdfInNewTab("/employees/fixture/pdf");
    expect(mock.click).not.toHaveBeenCalled(); expect(mock.open).not.toHaveBeenCalled();
    expect(usePdfPreviewStore.getState().request?.blob).toBeDefined();
  });
  it("replaces an earlier preview without retaining its document", async () => {
    mock.get.mockResolvedValue(response()); await openPdfInNewTab("/employees/first/pdf");
    const earlier = usePdfPreviewStore.getState().request!;
    await openPdfInNewTab("/employees/other/pdf");
    expect(earlier.controller.signal.aborted).toBe(true);
    expect(usePdfPreviewStore.getState().request?.url).toBe("/employees/other/pdf");
    expect(mock.click).not.toHaveBeenCalled();
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
