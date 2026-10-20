import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ saved: null as any, tasks: [] as any[], items: [] as any[], viol: [] as any[], tax: [] as any[] }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  setting: { findUnique: vi.fn(async () => (mock.saved ? { value: mock.saved } : null)), upsert: vi.fn(async ({ create }: any) => { mock.saved = create.value; }) },
  dailyTask: { findMany: vi.fn(async () => mock.tasks) },
  violation: { findMany: vi.fn(async () => mock.viol) },
  taxReturn: { findMany: vi.fn(async () => mock.tax) },
} }));
vi.mock("@/lib/security", () => ({ canViewSource: () => true, hasPermission: (a: any, p: string) => a.permissions.has(p) }));
vi.mock("@/services/expiringItems", () => ({ getTrackableItems: async () => mock.items }));
vi.mock("@/services/settingsStore", () => ({ getExpirationRules: async () => ({}) }));
vi.mock("@/services/expiration", () => ({
  computeStatus: (d: Date) => (d.getTime() < Date.parse("2026-10-20") ? "EXPIRED" : d.getTime() < Date.parse("2026-11-20") ? "EXPIRING_SOON" : "VALID"),
  daysUntil: (d: Date) => Math.round((d.getTime() - Date.parse("2026-10-20")) / 86_400_000),
}));
vi.mock("@/services/whatsappDigest", () => ({ riyadhDay: () => "2026-10-20" }));
import { alertsRibbonSchema, DEFAULT_ALERTS_RIBBON, getAlertsRibbon, ribbonItems, saveAlertsRibbon } from "@/services/alertsRibbon";

const doc = (key: string, expiry: string) => ({ key, sourceType: "EMPLOYEE_DOCUMENT", labelAr: key, kindAr: "إقامة", expiryDate: new Date(expiry), recordId: key, employeeId: "e1" });
const auth = (...perms: string[]) => ({ permissions: new Set(perms) }) as any;
beforeEach(() => { mock.saved = null; mock.tasks = []; mock.items = []; mock.viol = []; mock.tax = []; });

describe("alerts ribbon settings", () => {
  it("uses the defaults until something is saved, and fills gaps in older saves", async () => {
    expect(await getAlertsRibbon()).toEqual(DEFAULT_ALERTS_RIBBON);
    mock.saved = { speed: 40, categories: { tax: true } };
    const s = await getAlertsRibbon();
    expect(s.speed).toBe(40);
    expect(s.categories).toEqual({ ...DEFAULT_ALERTS_RIBBON.categories, tax: true });
  });
  it("falls back to the defaults when a saved value is no longer valid", async () => {
    mock.saved = { speed: 9999 };
    expect(await getAlertsRibbon()).toEqual(DEFAULT_ALERTS_RIBBON);
  });
  it("rejects values outside the allowed ranges and round-trips a save", async () => {
    expect(alertsRibbonSchema.safeParse({ ...DEFAULT_ALERTS_RIBBON, speed: 5 }).success).toBe(false);
    expect(alertsRibbonSchema.safeParse({ ...DEFAULT_ALERTS_RIBBON, skin: "pink" }).success).toBe(false);
    await saveAlertsRibbon({ ...DEFAULT_ALERTS_RIBBON, skin: "ivory" });
    expect((await getAlertsRibbon()).skin).toBe("ivory");
  });
});

describe("what the ribbon carries", () => {
  it("puts what is past due first, then the nearest date, and honours the switches and the cap", async () => {
    mock.items = [doc("soon-doc", "2026-10-30"), doc("old-doc", "2026-10-08"), doc("valid-doc", "2027-03-01")];
    mock.tasks = [{ id: "t1", title: "مهمة", date: new Date("2026-10-20T00:00:00Z"), time: "12:00" }];
    const all = await ribbonItems(auth("tasks.view"), { ...DEFAULT_ALERTS_RIBBON });
    expect(all.map((i) => i.cat)).toEqual(["expired", "tasks", "soon"]);
    expect(all[0].days).toBe(-12);
    const noSoon = await ribbonItems(auth("tasks.view"), { ...DEFAULT_ALERTS_RIBBON, categories: { ...DEFAULT_ALERTS_RIBBON.categories, soon: false } });
    expect(noSoon.map((i) => i.cat)).toEqual(["expired", "tasks"]);
    const capped = await ribbonItems(auth("tasks.view"), { ...DEFAULT_ALERTS_RIBBON, maxItems: 3 });
    expect(capped).toHaveLength(3);
  });
  it("leaves out tasks, violations and tax returns the user may not see", async () => {
    mock.tasks = [{ id: "t1", title: "مهمة", date: new Date("2026-10-20T00:00:00Z"), time: null }];
    mock.viol = [{ id: "v1", number: "55", reason: "تأخر", payDeadline: new Date("2026-10-24T00:00:00Z"), objectionDeadline: null }];
    mock.tax = [{ id: "x1", kind: "VAT", year: 2026, quarter: 3, dueDate: new Date("2026-10-28T00:00:00Z") }];
    const cats = { expired: true, soon: true, tasks: true, violations: true, tax: true };
    expect(await ribbonItems(auth(), { ...DEFAULT_ALERTS_RIBBON, categories: cats })).toEqual([]);
    const full = await ribbonItems(auth("tasks.view", "violations.view", "taxReturns.view"), { ...DEFAULT_ALERTS_RIBBON, categories: cats });
    expect(full.map((i) => i.cat).sort()).toEqual(["tasks", "tax", "violations"]);
    expect(full.find((i) => i.cat === "violations")?.days).toBe(4);
  });
});
