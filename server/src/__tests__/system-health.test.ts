import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  settings: new Map<string, any>(),
  backups: [] as { status: string; createdAt: Date; error?: string | null }[],
  logs: [] as { dedupeKey: string; status: string; errorMessage?: string | null }[],
  claimed: new Set<string>(),
  notes: [] as any[],
  mail: vi.fn(async () => ({ sent: true })),
  provider: "WHATSAPP_WEB" as string | undefined,
  linked: true,
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  setting: { findUnique: vi.fn(async ({ where }: any) => (mock.settings.has(where.key) ? { value: mock.settings.get(where.key) } : null)) },
  backupSnapshot: { findFirst: vi.fn(async ({ where }: any) => [...mock.backups].sort((a, b) => +b.createdAt - +a.createdAt).find((b) => !where?.status || b.status === where.status) ?? null) },
  notificationLog: {
    findMany: vi.fn(async ({ where }: any) => mock.logs.filter((l) => l.dedupeKey.startsWith(where.dedupeKey.startsWith))),
    create: vi.fn(async ({ data }: any) => { if (mock.claimed.has(data.dedupeKey)) throw new Error("unique"); mock.claimed.add(data.dedupeKey); return data; }),
  },
  user: { findMany: vi.fn(async () => [{ id: "u1", email: "admin@example.com" }]) },
  notification: { createMany: vi.fn(async ({ data }: any) => { mock.notes.push(...data); return { count: data.length }; }) },
} }));
vi.mock("@/services/email", () => ({ sendMail: mock.mail }));
vi.mock("@/services/whatsapp", () => ({ getWhatsappProvider: async () => mock.provider }));
vi.mock("@/services/whatsappRecipients", () => ({ getActiveRecipients: async () => [{ phone: "966500000001" }, { phone: "966500000002" }], normalizePhone: (p: string) => p }));
vi.mock("@/services/whatsappWeb", () => ({ WHATSAPP_WEB_PROVIDER: "WHATSAPP_WEB", hasStoredSession: async () => mock.linked }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
import { alertSystemHealth, checkSystemHealth } from "@/services/systemHealth";

// 10:00 Riyadh on 13 October: the morning round's results are due.
const NOW = new Date("2026-10-13T07:00:00Z");
const ago = (h: number) => new Date(NOW.getTime() - h * 3600_000);
beforeEach(() => {
  mock.settings.clear();
  mock.settings.set("jobs.cron.morning", { finishedAt: ago(2).toISOString() });
  mock.backups = [{ status: "READY", createdAt: ago(2) }];
  mock.logs = [
    { dedupeKey: "whatsapp-daily:2026-10-13:966500000001:0", status: "SENT" },
    { dedupeKey: "whatsapp-daily:2026-10-13:966500000002:picture", status: "SENT" },
  ];
  mock.claimed.clear();
  mock.notes = [];
  mock.mail.mockClear();
  mock.provider = "WHATSAPP_WEB";
  mock.linked = true;
});

describe("the daily rounds' health check", () => {
  it("finds nothing wrong on a good day", async () => {
    expect(await checkSystemHealth(NOW)).toEqual([]);
  });
  it("sees a morning round that did not run", async () => {
    mock.settings.set("jobs.cron.morning", { finishedAt: ago(30).toISOString() });
    expect((await checkSystemHealth(NOW)).map((p) => p.code)).toContain("cron");
  });
  it("sees a backup that failed or is too old", async () => {
    mock.backups = [{ status: "READY", createdAt: ago(40) }, { status: "FAILED", createdAt: ago(2), error: "disk full" }];
    const backup = (await checkSystemHealth(NOW)).find((p) => p.code === "backup");
    expect(backup?.detailAr).toContain("disk full");
  });
  it("leaves the backup alone when automatic backups are off", async () => {
    mock.settings.set("automaticBackups", { enabled: false });
    mock.backups = [];
    expect((await checkSystemHealth(NOW)).map((p) => p.code)).not.toContain("backup");
  });
  it("sees a number the morning message did not reach, with the reason", async () => {
    mock.logs = [
      { dedupeKey: "whatsapp-daily:2026-10-13:966500000001:0", status: "SENT" },
      { dedupeKey: "whatsapp-daily:2026-10-13:966500000002:0", status: "FAILED", errorMessage: "not linked" },
    ];
    const wa = (await checkSystemHealth(NOW)).find((p) => p.code === "whatsapp");
    expect(wa?.detailAr).toContain("1 من 2");
    expect(wa?.detailAr).toContain("not linked");
  });
  it("does not count a failed picture when its text went out", async () => {
    mock.logs.push({ dedupeKey: "whatsapp-daily:2026-10-13:966500000001:picture", status: "FAILED" });
    expect(await checkSystemHealth(NOW)).toEqual([]);
  });
  it("expects nothing of the morning message before 09:00 Riyadh", async () => {
    mock.logs = [];
    expect((await checkSystemHealth(new Date("2026-10-13T05:30:00Z"))).map((p) => p.code)).not.toContain("whatsapp");
  });
  it("sees the linked number signed out", async () => {
    mock.linked = false;
    expect((await checkSystemHealth(NOW)).map((p) => p.code)).toContain("whatsappLink");
  });
  it("checks no WhatsApp when it is off", async () => {
    mock.provider = undefined;
    mock.logs = [];
    expect(await checkSystemHealth(NOW)).toEqual([]);
  });
  it("tells the admins in the bell and by email, once a day for each problem", async () => {
    mock.backups = [];
    const problems = await checkSystemHealth(NOW);
    expect(await alertSystemHealth(problems, NOW)).toBe(1);
    expect(mock.notes).toHaveLength(1);
    expect(mock.notes[0]).toMatchObject({ userId: "u1", severity: "CRITICAL", relatedType: "SYSTEM_HEALTH" });
    expect(mock.mail).toHaveBeenCalledTimes(1);
    expect(await alertSystemHealth(problems, NOW)).toBe(0);
    expect(mock.mail).toHaveBeenCalledTimes(1);
  });
});
