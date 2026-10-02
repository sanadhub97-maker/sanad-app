import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ launch: vi.fn(), pdf: vi.fn(), closePage: vi.fn() }));
vi.mock("puppeteer", () => ({ default: { launch: mock.launch } }));
vi.mock("@/config/env", () => ({ env: { CLIENT_URL: "https://example.invalid", PDF_DISABLE_SANDBOX: false } }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
import { closePdfBrowser, renderHtmlToPdf } from "@/services/pdf";
function browser() {
  const instance = { connected: true, close: vi.fn(async () => { instance.connected = false; }), newPage: vi.fn(async () => ({ setJavaScriptEnabled: vi.fn(), setRequestInterception: vi.fn(), on: vi.fn(), setViewport: vi.fn(), setContent: vi.fn(), evaluateHandle: vi.fn(), pdf: mock.pdf, close: mock.closePage })) };
  return instance;
}
beforeEach(() => { vi.resetAllMocks(); mock.pdf.mockResolvedValue(Buffer.from("%PDF-1.7")); mock.closePage.mockResolvedValue(undefined); });
afterEach(async () => { await closePdfBrowser(); });
describe("PDF browser recovery and resource limits", () => {
  it("retries a failed page without leaking a second healthy browser", async () => {
    mock.launch.mockResolvedValue(browser()); mock.pdf.mockRejectedValueOnce(new Error("Page closed"));
    expect((await renderHtmlToPdf("<html>synthetic</html>")).subarray(0, 5).toString()).toBe("%PDF-");
    expect(mock.launch).toHaveBeenCalledOnce(); expect(mock.closePage).toHaveBeenCalledTimes(2);
    expect(mock.launch.mock.calls[0][0].args).not.toContain("--no-sandbox");
  });
  it("relaunches after a disconnected browser", async () => {
    const first = browser(); mock.launch.mockResolvedValueOnce(first).mockResolvedValueOnce(browser());
    await renderHtmlToPdf("<html>synthetic</html>"); first.connected = false;
    await renderHtmlToPdf("<html>synthetic</html>"); expect(mock.launch).toHaveBeenCalledTimes(2);
  });
  it("recovers from a rejected launch instead of caching the rejection", async () => {
    mock.launch.mockRejectedValueOnce(new Error("Temporary launch failure")).mockResolvedValueOnce(browser());
    await renderHtmlToPdf("<html>synthetic</html>"); expect(mock.launch).toHaveBeenCalledTimes(2);
  });
  it("shares one replacement browser across concurrent requests after a crash", async () => {
    const first = browser(); mock.launch.mockResolvedValueOnce(first).mockResolvedValue(browser());
    await renderHtmlToPdf("<html>synthetic</html>"); first.connected = false;
    await Promise.all([renderHtmlToPdf("<html>one</html>"), renderHtmlToPdf("<html>two</html>")]);
    expect(mock.launch).toHaveBeenCalledTimes(2);
  });
});
