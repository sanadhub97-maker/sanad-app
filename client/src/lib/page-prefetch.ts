import type { QueryClient } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard";
import { employeesApi } from "@/api/employees";
import { paymentsApi } from "@/api/payments";
import { tasksApi } from "@/api/tasks";

/* A page's first data, fetched when the pointer reaches its menu item, so the
   page opens on it instead of waiting. Each entry uses the same key and call
   as the page itself (the page's defaults: first page, no filter), otherwise
   it would only fetch twice. Already-fresh data is not fetched again. */

const localIso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Entry = { key: unknown[]; fn: () => Promise<unknown>; needs?: string };
const ENTRIES: Record<string, () => Entry[]> = {
  "/": () => [
    { key: ["dashboard", "summary"], fn: dashboardApi.summary },
    { key: ["dashboard", "charts"], fn: dashboardApi.charts },
    { key: ["dashboard", "overview"], fn: dashboardApi.overview },
  ],
  "/employees": () => [{ key: ["employees", { page: 1, pageSize: 20 }], fn: () => employeesApi.list({ page: 1, pageSize: 20 }), needs: "employees.view" }],
  "/payments": () => [
    { key: ["payments", { page: 1, search: "", category: "" }], fn: () => paymentsApi.list({ page: 1, pageSize: 30, q: undefined, category: undefined, sortBy: "paymentDate", sortDir: "desc" }), needs: "payments.view" },
    { key: ["dashboard", "charts"], fn: dashboardApi.charts },
  ],
  "/daily-tasks": () => [
    { key: ["tasks", "day", localIso()], fn: () => tasksApi.day(localIso()), needs: "tasks.view" },
    { key: ["tasks", "all"], fn: tasksApi.all, needs: "tasks.view" },
  ],
};

export function prefetchPageData(client: QueryClient, path: string, can: (permission: string) => boolean) {
  for (const e of ENTRIES[path]?.() ?? []) {
    if (e.needs && !can(e.needs)) continue;
    void client.prefetchQuery({ queryKey: e.key, queryFn: e.fn, staleTime: 30_000 });
  }
}
