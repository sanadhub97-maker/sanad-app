import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rows: new Map<string, any>(), send: vi.fn(), payments: [] as any[] }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  whatsappSettings: { findUnique: vi.fn(async () => ({ enabled: true })) },
  payment: { findMany: vi.fn(async () => mock.payments) },
  notificationLog: {
    findMany: vi.fn(async ({ where }: any) => [...mock.rows.values()].filter((r) => where.dedupeKey.in.includes(r.dedupeKey) && r.status === where.status)),
    upsert: vi.fn(async ({ where, create, update }: any) => { const row = mock.rows.has(where.dedupeKey) ? { ...mock.rows.get(where.dedupeKey), ...update } : create; mock.rows.set(where.dedupeKey, row); return row; }),
  },
  $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
} }));
vi.mock("@/services/whatsapp", () => ({ sendWhatsapp: mock.send }));
vi.mock("@/services/whatsappRecipients", () => ({ normalizePhone: (p: string) => p.replace(/[\s()-]/g, ""), getActiveRecipients: async () => [{ phone: "+966 50" }] }));
vi.mock("@/services/settingsStore", () => ({ getWhatsappScheduleSetting: async () => ({ language: "ar" }) }));
vi.mock("@/services/branding", () => ({ getBrandingContext: async () => ({ company: { nameAr: "شركة سمو" } }) }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
import { runDailyPaymentsDigest } from "@/services/paymentsDigest";

const payment = (id: string, total: number) => ({ id, paymentNumber: `PAY-${id}`, category: "IQAMA", type: "RENEWAL", total, method: "CASH", supplierName: "الجوازات", description: null, employee: null, branch: null });
beforeEach(() => { mock.rows.clear(); mock.payments = []; mock.send.mockReset().mockResolvedValue({ sent: true }); });

describe("the evening payments message", () => {
  it("sends the day's payments with their total, and never the same payment twice", async () => {
    mock.payments = [payment("1", 100), payment("2", 50.5)];
    await runDailyPaymentsDigest(new Date("2026-10-12T18:00:00Z"));
    expect(mock.send).toHaveBeenCalledTimes(1);
    const text = mock.send.mock.calls[0][1] as string;
    expect(text).toContain("مدفوعات اليوم");
    expect(text).toContain("PAY-1");
    expect(text).toContain("150.50");
    mock.payments = [payment("1", 100), payment("2", 50.5), payment("3", 20)];
    await runDailyPaymentsDigest(new Date("2026-10-12T19:00:00Z"));
    expect(mock.send).toHaveBeenCalledTimes(2);
    const second = mock.send.mock.calls[1][1] as string;
    expect(second).toContain("PAY-3");
    expect(second).not.toContain("PAY-1");
  });
  it("sends nothing on a day without payments", async () => {
    await runDailyPaymentsDigest(new Date("2026-10-12T18:00:00Z"));
    expect(mock.send).not.toHaveBeenCalled();
  });
});
