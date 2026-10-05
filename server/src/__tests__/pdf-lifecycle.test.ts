import { PRINT_FONTS_HREF } from "@/services/printThemes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ launch: vi.fn(), pdf: vi.fn(), closePage: vi.fn(), networkIdle: vi.fn(), evaluate: vi.fn() }));
vi.mock("puppeteer", () => ({ default: { launch: mock.launch } }));
vi.mock("@/config/env", () => ({ env: { CLIENT_URL: "https://example.invalid", PDF_DISABLE_SANDBOX: false } }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
import { bundledRenderResource, closePdfBrowser, renderHtmlToPdf, warmPdfBrowser } from "@/services/pdf";
function browser() {
  const instance = { connected: true, close: vi.fn(async () => { instance.connected = false; }), newPage: vi.fn(async () => ({ setJavaScriptEnabled: vi.fn(), setRequestInterception: vi.fn(), on: vi.fn(), setViewport: vi.fn(), emulateMediaType: vi.fn(), setContent: vi.fn(), waitForNetworkIdle: mock.networkIdle, evaluate: mock.evaluate, pdf: mock.pdf, close: mock.closePage })) };
  return instance;
}
beforeEach(() => { vi.resetAllMocks(); mock.pdf.mockResolvedValue(Buffer.from("%PDF-1.7")); mock.closePage.mockResolvedValue(undefined); mock.networkIdle.mockResolvedValue(undefined); mock.evaluate.mockResolvedValue(true); });
afterEach(async () => { await closePdfBrowser(); });
describe("PDF browser recovery and resource limits", () => {
  it("warms the renderer without opening a document, then reuses it for export", async () => {
    const instance = browser();
    mock.launch.mockResolvedValue(instance);
    await warmPdfBrowser();
    expect(instance.newPage).not.toHaveBeenCalled();
    await renderHtmlToPdf("<html>synthetic</html>");
    expect(mock.launch).toHaveBeenCalledOnce();
  });
  it("serves every declared print font from the local bundle", () => {
    const css=bundledRenderResource(PRINT_FONTS_HREF);
    expect(css?.contentType).toContain("text/css");
    const urls=[...css!.body.toString().matchAll(/https:\/\/fonts\.gstatic\.com\/[^)\s]+/g)].map(match=>match[0]);
    expect(urls.length).toBeGreaterThan(0);
    for(const url of urls) { const font=bundledRenderResource(url);expect(font?.body.length).toBeGreaterThan(1000);expect(font?.contentType).toMatch(/^font\//); }
    expect(bundledRenderResource("https://example.invalid/internal")).toBeNull();
  });

  it("stops stalled external resources before printing instead of retrying a stuck print command", async () => {
    mock.launch.mockResolvedValue(browser()); mock.networkIdle.mockRejectedValue(new Error("External fonts stalled"));
    expect((await renderHtmlToPdf("<html>synthetic</html>")).subarray(0, 5).toString()).toBe("%PDF-");
    expect(mock.evaluate).toHaveBeenCalledWith("window.stop()"); expect(mock.pdf).toHaveBeenCalledOnce();
  });
  it("does not perform an additional font wait after the bounded readiness check", async () => {
    mock.launch.mockResolvedValue(browser());
    await renderHtmlToPdf("<html>synthetic</html>");
    expect(mock.pdf).toHaveBeenCalledWith(expect.objectContaining({ waitForFonts: false, printBackground: true, format: "A4" }));
    const options = mock.pdf.mock.calls[0][0];
    for (const template of [options.headerTemplate, options.footerTemplate]) {
      expect(template).toContain("IBM Plex Sans Arabic");
      expect(template).toContain("Alexandria");
      expect(template).toContain("base64,");
    }
  });
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
