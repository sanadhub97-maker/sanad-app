import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ wheres: [] as any[], send: vi.fn(), rows: new Map<string, any>() }));
const agg = (sum: Record<string, number>, count = 0) => ({ _sum: sum, _count: count });
vi.mock("@/lib/prisma", () => ({ prisma: {
  payment: {
    aggregate: vi.fn(async ({ where }: any) => { mock.wheres.push(where); return +where.paymentDate.gte === +new Date("2026-09-30T21:00:00Z") ? agg({ total: 2490 }, 2) : agg({ total: 2000 }); }),
    groupBy: vi.fn(async () => [{ category: "IQAMA", _sum: { total: 1490 } }]),
  },
  dailyTask: { count: vi.fn(async ({ where }: any) => (where.done ? 3 : 4)) },
  violation: { aggregate: vi.fn(async () => agg({ amount: 500 }, 1)) },
  employee: { count: vi.fn(async ({ where }: any) => (where.employmentStatus ? 28 : 1)) },
  whatsappSettings: { findUnique: vi.fn(async () => ({ enabled: true })) },
  user: { findMany: vi.fn(async () => []) },
  notificationLog: {
    findUnique: vi.fn(async ({ where }: any) => mock.rows.get(where.dedupeKey) ?? null),
    upsert: vi.fn(async ({ where, create, update }: any) => { const row = mock.rows.has(where.dedupeKey) ? { ...mock.rows.get(where.dedupeKey), ...update } : create; mock.rows.set(where.dedupeKey, row); return row; }),
  },
} }));
vi.mock("@/services/expiringItems", () => ({ getTrackableItems: async () => [
  { expiryDate: new Date("2026-10-10T00:00:00Z") }, // ended during October
  { expiryDate: new Date("2026-11-15T00:00:00Z") }, // ends in November
  { expiryDate: new Date("2027-03-01T00:00:00Z") },
] }));
vi.mock("@/services/branding", () => ({ getBrandingContext: async () => ({ company: { nameAr: "شركة سمو" } }) }));
vi.mock("@/services/settingsStore", () => ({ getWhatsappScheduleSetting: async () => ({ language: "ar" }) }));
vi.mock("@/services/whatsapp", () => ({ sendWhatsapp: mock.send }));
vi.mock("@/services/whatsappRecipients", () => ({ getActiveRecipients: async () => [{ phone: "966500000001" }], normalizePhone: (p: string) => p }));
vi.mock("@/services/email", () => ({ sendMail: vi.fn(async () => ({ sent: false, reason: "EMAIL_NOT_CONFIGURED" })) }));
vi.mock("@/constants/paymentCategories", () => ({ paymentCategoryLabel: () => "إقامة" }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
import { monthlyFigures, monthlyText, runMonthlyReport } from "@/services/monthlyReport";
import { withLang } from "@/services/lang";

const NOV1 = new Date("2026-11-01T06:00:00Z");
beforeEach(() => { mock.wheres = []; mock.rows.clear(); mock.send.mockReset().mockResolvedValue({ sent: true }); });

describe("the monthly report", () => {
  it("covers last month by the Riyadh calendar, against the month before", async () => {
    const f = await withLang("ar", () => monthlyFigures(NOV1));
    expect(f.month).toBe("2026-10");
    // October in Riyadh: from 1 October 00:00 (+03:00) up to 1 November.
    expect(mock.wheres[0].paymentDate.gte.toISOString()).toBe("2026-09-30T21:00:00.000Z");
    expect(mock.wheres[0].paymentDate.lt.toISOString()).toBe("2026-10-31T21:00:00.000Z");
    expect(f.payments).toMatchObject({ total: 2490, count: 2, previous: 2000 });
    expect(f.documents).toMatchObject({ endedInMonth: 1, endingNextMonth: 1, tracked: 3 });
    expect(f.tasks).toEqual({ total: 4, done: 3 });
  });
  it("reads as one message with the month's change", async () => {
    const text = await withLang("ar", async () => monthlyText(await monthlyFigures(NOV1)));
    expect(text).toContain("التقرير الشهري");
    expect(text).toContain("أكتوبر 2026");
    expect(text).toContain("2,490 ر.س");
    expect(text).toContain("▲ 25%");
    expect(text).toContain("أُنجز 3 من 4 مهمة");
  });
  it("goes once in the first days of a month, and not later in it", async () => {
    await runMonthlyReport(NOV1);
    await runMonthlyReport(new Date("2026-11-02T06:00:00Z"));
    expect(mock.send).toHaveBeenCalledTimes(1);
    mock.rows.clear();
    await runMonthlyReport(new Date("2026-11-13T06:00:00Z"));
    expect(mock.send).toHaveBeenCalledTimes(1);
  });
});
