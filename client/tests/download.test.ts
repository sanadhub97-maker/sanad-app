import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocked = vi.hoisted(() => ({ get: vi.fn(), loading: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: mocked }));
vi.mock("@/lib/api", () => ({ api: { get: mocked.get }, extractErrorMessage: async (error: Error) => error.message }));
vi.mock("@/i18n", () => ({ tr: (_ar: string, en: string) => en, isRtlLanguage: () => false, default: { language: "en" } }));
import { usePdfPreviewStore } from "@/stores/pdfPreviewStore";
import { downloadFile, openPdfInNewTab } from "@/lib/download";
let anchor: { href: string; download: string; click: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
let newTab: { closed: boolean; document: { write: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }; location: { replace: ReturnType<typeof vi.fn> }; close: ReturnType<typeof vi.fn> };
const open = vi.fn(), revoke = vi.fn(), create = vi.fn();
beforeEach(() => {
  usePdfPreviewStore.getState().close();
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
    expect(open).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
    expect(usePdfPreviewStore.getState().request?.error).toContain("invalid");
  });
  it("shows the PDF inside the application without a popup or download", async () => {
    await openPdfInNewTab("/report");
    expect(open).not.toHaveBeenCalled(); expect(anchor.click).not.toHaveBeenCalled();
    expect(usePdfPreviewStore.getState().request?.blob?.type).toBe("application/pdf");
    expect(usePdfPreviewStore.getState().request?.filename).toBe("report.pdf");
  });
  it("opens the loading state before the response arrives", async () => {
    let resolve!: (value: unknown) => void;
    mocked.get.mockImplementation(() => new Promise(r => { resolve = r; }));
    const pending = openPdfInNewTab("/report");
    expect(usePdfPreviewStore.getState().request?.url).toBe("/report");
    expect(usePdfPreviewStore.getState().request?.blob).toBeUndefined();
    resolve({ data: new Blob(["%PDF-1.7"]), headers: {} }); await pending;
    expect(usePdfPreviewStore.getState().request?.blob).toBeDefined();
  });
  it("aborts a closed preview and ignores a late response", async () => {
    let resolve!: (value: unknown) => void;
    mocked.get.mockImplementation(() => new Promise(r => { resolve = r; }));
    const pending = openPdfInNewTab("/report");
    const signal = mocked.get.mock.calls[0][1].signal;
    usePdfPreviewStore.getState().close(); expect(signal.aborted).toBe(true);
    resolve({ data: new Blob(["%PDF-1.7"]), headers: {} }); await pending;
    expect(usePdfPreviewStore.getState().request).toBeNull();
  });
  it("normalizes an octet-stream PDF for preview", async () => {
    mocked.get.mockResolvedValue({ data: new Blob(["%PDF-1.7"], { type: "application/octet-stream" }), headers: {} });
    await openPdfInNewTab("/report");
    expect(usePdfPreviewStore.getState().request?.blob?.type).toBe("application/pdf");
  });
  it("keeps the server error visible and never downloads an error", async () => {
    mocked.get.mockRejectedValue(new Error("Print service is busy"));
    await expect(openPdfInNewTab("/report")).rejects.toThrow("busy");
    expect(usePdfPreviewStore.getState().request?.error).toBe("Print service is busy");
    expect(mocked.error).toHaveBeenCalled(); expect(anchor.click).not.toHaveBeenCalled();
  });
});

it("does not save a JSON error response as a corrupted Excel file", async () => {
  mocked.get.mockResolvedValue({data:new Blob(['{"error":"failed"}'],{type:"application/json"}),headers:{}});
  await expect(downloadFile("/reports/tax-declarations",{format:"xlsx"},"report.xlsx")).rejects.toThrow("Excel file is invalid");
  expect(anchor.click).not.toHaveBeenCalled();
});
it("downloads a ZIP-based Excel response", async () => {
  mocked.get.mockResolvedValue({data:new Blob([new Uint8Array([0x50,0x4b,0x03,0x04,1])]),headers:{"content-disposition":'attachment; filename="report.xlsx"'}});
  await downloadFile("/reports/tax-declarations",{format:"xlsx"},"report.xlsx");
  expect(anchor.click).toHaveBeenCalledOnce();
});
