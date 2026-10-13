import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

const calls = vi.hoisted(() => ({ list: vi.fn(async () => ({ rows: [] })), pay: vi.fn(async () => ({ rows: [] })), day: vi.fn(async () => []) }));
vi.mock("../src/api/dashboard", () => ({ dashboardApi: { summary: vi.fn(async () => ({})), charts: vi.fn(async () => ({})), overview: vi.fn(async () => ({})) } }));
vi.mock("../src/api/employees", () => ({ employeesApi: { list: calls.list } }));
vi.mock("../src/api/payments", () => ({ paymentsApi: { list: calls.pay } }));
vi.mock("../src/api/tasks", () => ({ tasksApi: { day: calls.day, all: vi.fn(async () => []) } }));
import { prefetchPageData } from "../src/lib/page-prefetch";
import { migrateUiPrefs } from "../src/stores/uiStore";

const flush = () => new Promise((r) => setTimeout(r, 0));
beforeEach(() => Object.values(calls).forEach((f) => f.mockClear()));

describe("data fetched on the way to a page", () => {
  it("lands under the key the page reads, so the page opens on it", async () => {
    const client = new QueryClient();
    prefetchPageData(client, "/employees", () => true);
    await flush();
    // The employees page asks for ["employees", { page, pageSize, ...filters left undefined }].
    expect(client.getQueryData(["employees", { page: 1, pageSize: 20, q: undefined, branchId: undefined, employmentStatus: undefined, expiryStatus: undefined }])).toEqual({ rows: [] });
    expect(calls.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });
  it("is not fetched again while fresh", async () => {
    const client = new QueryClient();
    prefetchPageData(client, "/payments", () => true);
    await flush();
    prefetchPageData(client, "/payments", () => true);
    await flush();
    expect(calls.pay).toHaveBeenCalledTimes(1);
  });
  it("is skipped without the page's permission", async () => {
    const client = new QueryClient();
    prefetchPageData(client, "/daily-tasks", (p) => p !== "tasks.view");
    await flush();
    expect(calls.day).not.toHaveBeenCalled();
  });
  it("does nothing for a page it does not know", () => {
    expect(() => prefetchPageData(new QueryClient(), "/nowhere", () => true)).not.toThrow();
  });
});

describe("saved display preferences", () => {
  it("drop an old saved theme, so the site starts dark, and keep the rest", () => {
    expect(migrateUiPrefs({ themeMode: "light", accent: "#fff", sidebarCollapsed: true }, 1)).toEqual({ accent: "#fff", sidebarCollapsed: true });
  });
  it("open the side menu once for the oldest version", () => {
    expect(migrateUiPrefs({ sidebarCollapsed: true }, 0)).toEqual({ sidebarCollapsed: false });
  });
  it("keep the light or dark choice made since", () => {
    expect(migrateUiPrefs({ themeMode: "light" }, 2)).toEqual({ themeMode: "light" });
  });
});
