import type { QueryClient } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard";
import { employeesApi } from "@/api/employees";
import { paymentsApi } from "@/api/payments";
import { tasksApi } from "@/api/tasks";
import { fetchReportSummary } from "@/api/reports";
import { listActiveBranches, branchesApi } from "@/api/branches";
import { workforceDocumentsApi } from "@/api/workforceDocuments";
import { companyDocumentsApi } from "@/api/companyDocuments";
import { preloadPage } from "@/lib/page-preload";
import { warmPrintingFor } from "@/lib/print-warm";

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
  "/branches": () => [
    { key: ["branches", { page: 1, search: "" }], fn: () => branchesApi.list({ page: 1, pageSize: 24, q: undefined }), needs: "branches.view" },
    { key: ["workforce-documents-unified", { page: 1, pageSize: 200 }], fn: () => workforceDocumentsApi.listUnified({ page: 1, pageSize: 200 }), needs: "employees.view" },
    { key: ["companyDocuments", { page: 1, pageSize: 200 }], fn: () => companyDocumentsApi.list({ page: 1, pageSize: 200 }), needs: "companyDocuments.view" },
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

/* Once signed in and the first page has settled, the main pages' code and
   first data load quietly one after another, so opening any of them is instant.
   The server is far (each request ~½ s), so this hides that wait. */
const WARM_PATHS = ["/", "/employees", "/payments", "/daily-tasks", "/reports", "/employee-documents", "/company-documents", "/branches"];
const EXTRA: Entry[] = [
  { key: ["reports", "summary"], fn: fetchReportSummary },
  { key: ["active-branches"], fn: listActiveBranches, needs: "branches.view" },
];
export function warmUpPages(client: QueryClient, can: (permission: string) => boolean) {
  let cancelled = false;
  const steps: (() => void)[] = [];
  for (const path of WARM_PATHS) steps.push(() => { preloadPage(path); prefetchPageData(client, path, can); });
  // The print browser and print pictures on the server, so the first print after sign-in does not wait for them.
  steps.unshift(() => warmPrintingFor("/reports"));
  // The print preview viewer (PDF.js and its worker, ~0.5 MB), so the first preview opens without fetching it.
  steps.push(() => {
    void import("@/components/pdf-preview-document").catch(() => undefined);
    void import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => fetch(m.default)).catch(() => undefined);
  });
  for (const e of EXTRA) steps.push(() => { if (!e.needs || can(e.needs)) void client.prefetchQuery({ queryKey: e.key, queryFn: e.fn, staleTime: 60_000 }); });
  const run = (i: number) => {
    if (cancelled || i >= steps.length) return;
    steps[i]();
    setTimeout(() => run(i + 1), 350);
  };
  const start = setTimeout(() => run(0), 1500);
  return () => { cancelled = true; clearTimeout(start); };
}
