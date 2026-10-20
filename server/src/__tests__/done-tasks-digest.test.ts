import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rows: new Map<string, any>(), tasks: [] as any[], send: vi.fn(), push: vi.fn(), where: null as any }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  dailyTask: { findMany: vi.fn(async (args: any) => { mock.where = args.where; return mock.tasks; }) },
  user: { findMany: vi.fn(async () => [{ id: "u1" }, { id: "u2" }]) },
  whatsappSettings: { findUnique: vi.fn(async () => ({ enabled: true })) },
  notificationLog: {
    findUnique: vi.fn(async ({ where }: any) => mock.rows.get(where.dedupeKey) ?? null),
    upsert: vi.fn(async ({ where, create, update }: any) => { const row = mock.rows.has(where.dedupeKey) ? { ...mock.rows.get(where.dedupeKey), ...update } : create; mock.rows.set(where.dedupeKey, row); return row; }),
  },
} }));
vi.mock("@/middleware/auth", () => ({ loadAuthContext: async (id: string) => ({ id }) }));
vi.mock("@/lib/security", () => ({ hasPermission: (auth: any) => auth?.id === "u1" }));
vi.mock("@/services/push", () => ({
  riyadhNow: (at = new Date()) => { const d = new Date(at.getTime() + 3 * 3600_000); return { date: d.toISOString().slice(0, 10), hm: d.toISOString().slice(11, 16) }; },
  withDevices: async (ids: string[]) => new Set(ids),
  sendToUser: mock.push,
}));
vi.mock("@/services/whatsapp", () => ({ sendWhatsapp: mock.send }));
vi.mock("@/services/whatsappRecipients", () => ({ normalizePhone: (p: string) => p.replace(/\s/g, ""), getActiveRecipients: async () => [{ phone: "+966 50" }] }));
vi.mock("@/services/settingsStore", () => ({ getWhatsappScheduleSetting: async () => ({ language: "ar" }) }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
import { runDoneTasksDigest } from "@/services/doneTasksDigest";

const task = (title: string, doneAt: string) => ({ title, doneAt: new Date(doneAt), assignee: { fullName: "سارة" } });
beforeEach(() => { mock.rows.clear(); mock.tasks = []; mock.push.mockReset().mockResolvedValue({ sent: 1 }); mock.send.mockReset().mockResolvedValue({ sent: true }); });

describe("the evening summary of finished tasks", () => {
  it("says nothing when no task was finished that day", async () => {
    const r = await runDoneTasksDigest(new Date("2026-10-20T18:05:00Z"));
    expect(r).toEqual({ push: 0, whatsapp: 0, tasks: 0 });
    expect(mock.push).not.toHaveBeenCalled();
    expect(mock.send).not.toHaveBeenCalled();
  });
  it("looks only at the Riyadh day, pushes to users who may see tasks, and messages WhatsApp", async () => {
    mock.tasks = [task("تجديد إقامة", "2026-10-20T07:30:00Z"), task("سداد فاتورة", "2026-10-20T11:00:00Z")];
    const r = await runDoneTasksDigest(new Date("2026-10-20T18:05:00Z"));
    expect(mock.where.doneAt.gte.toISOString()).toBe("2026-10-19T21:00:00.000Z");
    expect(mock.where.doneAt.lt.toISOString()).toBe("2026-10-20T21:00:00.000Z");
    expect(r).toEqual({ push: 1, whatsapp: 1, tasks: 2 });
    expect(mock.push).toHaveBeenCalledTimes(1);
    expect(mock.push.mock.calls[0][0]).toBe("u1");
    const text = mock.send.mock.calls[0][1] as string;
    expect(text).toContain("المهام المنجزة");
    expect(text).toContain("تجديد إقامة");
    expect(text).toContain("(10:30)");
  });
  it("never sends the same day twice", async () => {
    mock.tasks = [task("تجديد إقامة", "2026-10-20T07:30:00Z")];
    await runDoneTasksDigest(new Date("2026-10-20T18:05:00Z"));
    const again = await runDoneTasksDigest(new Date("2026-10-20T18:20:00Z"));
    expect(again).toEqual({ push: 0, whatsapp: 0, tasks: 1 });
    expect(mock.push).toHaveBeenCalledTimes(1);
    expect(mock.send).toHaveBeenCalledTimes(1);
  });
});
