import { beforeEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError } from "axios";
vi.mock("@/i18n", () => ({ default: { language: "en" }, tr: (_ar: string, en: string) => en, isRtlLanguage: () => false }));
vi.mock("@/lib/server-messages", () => ({ localizeServerMessage: (message: string) => message }));
import { api, getErrorMessage, extractErrorMessage, refreshAccessToken } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
const user = { id: "fixture", fullName: "Test", email: "test@example.invalid", roles: [], permissions: [], isSuperAdmin: false };
beforeEach(() => { vi.restoreAllMocks(); useAuthStore.getState().setAuth("existing-token", user); });
function failed(status?: number) { return new AxiosError("failure", status ? undefined : "ERR_NETWORK", undefined, undefined, status ? { status, data: {}, headers: {}, config: {} } as any : undefined); }
describe("Request and session recovery", () => {
  it("reports gateway failures for HTML blobs and preserves structured PDF errors", async () => {
    const gateway = failed(504);
    gateway.response!.data = new Blob(["<html>Gateway timeout</html>"]);
    expect(await extractErrorMessage(gateway)).toContain("timed out preparing");
    const busy = failed(429);
    busy.response!.data = new Blob([JSON.stringify({ error: { message: "PDF renderer is busy" } })]);
    expect(await extractErrorMessage(busy)).toBe("PDF renderer is busy");
    expect(getErrorMessage(failed(503))).toContain("temporarily unavailable");
  });
  it.each([undefined, 500, 503])("preserves authentication on transient refresh failure %s", async status => {
    vi.spyOn(axios, "post").mockRejectedValue(failed(status));
    await expect(refreshAccessToken()).rejects.toBeInstanceOf(AxiosError);
    expect(useAuthStore.getState().accessToken).toBe("existing-token");
  });
  it.each([401, 403])("clears authentication on rejected refresh %s", async status => {
    vi.spyOn(axios, "post").mockRejectedValue(failed(status));
    expect(await refreshAccessToken()).toBeNull(); expect(useAuthStore.getState().user).toBeNull();
  });
  it("shares concurrent refresh attempts and can retry after a connection failure", async () => {
    const post = vi.spyOn(axios, "post").mockRejectedValueOnce(failed()).mockResolvedValueOnce({ data: { data: { accessToken: "new-token", user } } });
    const results = await Promise.allSettled([refreshAccessToken(), refreshAccessToken()]);
    expect(results.every(r => r.status === "rejected")).toBe(true); expect(post).toHaveBeenCalledTimes(1);
    expect(await refreshAccessToken()).toBe("new-token"); expect(post).toHaveBeenCalledTimes(2);
  });
  it("bounds page requests while allowing longer exports and backup operations", async () => {
    const times: number[] = [];
    const adapter = async (config: any) => { times.push(config.timeout); return { data: {}, status: 200, statusText: "OK", headers: {}, config }; };
    await api.get("/employees", { adapter }); await api.get("/reports", { adapter, responseType: "blob" }); await api.post("/maintenance/backups/create", {}, { adapter }); await api.get("/custom", { adapter, timeout: 123 });
    expect(times).toEqual([60000, 180000, 600000, 123]);
  });
  it("distinguishes connection and timeout failures from expired sessions", () => {
    expect(getErrorMessage(failed())).toContain("connect");
    expect(getErrorMessage(new AxiosError("timeout", "ECONNABORTED"))).toContain("check the record");
  });
});
