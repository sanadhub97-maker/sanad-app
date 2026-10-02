import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rows: new Map<string, any>(), send: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  notificationLog: {
    findMany: vi.fn(async ({ where }: any) => [...mock.rows.values()].filter(r => where.dedupeKey.in.includes(r.dedupeKey) && r.status === where.status)),
    findUnique: vi.fn(async ({ where }: any) => mock.rows.get(where.dedupeKey)),
    upsert: vi.fn(async ({ where, create, update }: any) => { const row = mock.rows.has(where.dedupeKey) ? { ...mock.rows.get(where.dedupeKey), ...update } : create; mock.rows.set(where.dedupeKey, row); return row; }),
  }, $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
} }));
vi.mock("@/services/whatsapp", () => ({ sendWhatsapp: mock.send }));
vi.mock("@/services/whatsappRecipients", () => ({ normalizePhone: (p: string) => p.replace(/[\s()-]/g, "") }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
import { digestParts, sendWhatsappDigests, whatsappEligible, type DigestEntry } from "@/services/whatsappDigest";
import type { TrackableItem } from "@/services/expiringItems";
function entry(key: string, onSponsorship: boolean | null = true, sourceType: TrackableItem["sourceType"] = "EMPLOYEE_IQAMA"): DigestEntry {
  return { dedupeBase: `${key}:expired`, text: `Expired ${key}`, item: { key, sourceType, onSponsorship, recordId: key, label: key, labelAr: key, expiryDate: new Date("2026-01-01"), kind: "IQAMA", kindAr: "إقامة", kindEn: "Iqama" } };
}
beforeEach(() => { mock.rows.clear(); mock.send.mockReset().mockResolvedValue({ sent: true }); });
describe("WhatsApp sponsorship and grouped delivery", () => {
  it("excludes false, null and missing sponsorship across employee sources, but includes company documents", () => {
    for (const type of ["EMPLOYEE_IQAMA", "EMPLOYEE_PASSPORT", "EMPLOYEE_DOCUMENT"] as const) {
      for (const flag of [false, null, undefined]) expect(whatsappEligible({ ...entry("a", true, type).item, onSponsorship: flag })).toBe(false);
      expect(whatsappEligible(entry("a", true, type).item)).toBe(true);
    }
    expect(whatsappEligible(entry("company", null, "COMPANY_DOCUMENT").item)).toBe(true);
  });
  it("sends eligible employee and company items together once to equivalent numbers", async () => {
    const entries = [entry("sponsored"), entry("excluded", false), entry("unknown", null), entry("company", null, "COMPANY_DOCUMENT")];
    await sendWhatsappDigests(new Map([["+966 50", entries], ["+96650", entries]]), "Summary");
    expect(mock.send).toHaveBeenCalledTimes(1);
    const text = mock.send.mock.calls[0][1];
    expect(text).toContain("sponsored"); expect(text).toContain("company");
    expect(text).not.toContain("excluded"); expect(text).not.toContain("unknown");
  });
  it("honors legacy per-item delivery and avoids repeat sends on the next scan", async () => {
    mock.rows.set("old:expired:WHATSAPP:+96650", { dedupeKey: "old:expired:WHATSAPP:+96650", status: "SENT" });
    const group = new Map([["+96650", [entry("old"), entry("new")]]]);
    await sendWhatsappDigests(group, "Summary"); await sendWhatsappDigests(group, "Summary");
    expect(mock.send).toHaveBeenCalledTimes(1); expect(mock.send.mock.calls[0][1]).not.toContain("Expired old");
  });
  it("retries failed recipients without resending recipients that succeeded", async () => {
    mock.send.mockResolvedValueOnce({ sent: false, reason: "offline" }).mockResolvedValue({ sent: true });
    const group = new Map([["+96650", [entry("a")]], ["+96651", [entry("a")]]]);
    await sendWhatsappDigests(group, "Summary"); await sendWhatsappDigests(group, "Summary");
    expect(mock.send.mock.calls.map(c => c[0])).toEqual(["+96650", "+96651", "+96650"]);
  });
  it("splits large digests without dropping entries and respects the bounded message size", () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({ ...entry(String(i)), text: "x".repeat(700) }));
    const parts = digestParts(entries, "Summary");
    expect(parts.length).toBeGreaterThan(1); expect(parts.every(p => p.text.length <= 3500)).toBe(true);
    expect(parts.flatMap(p => p.entries)).toEqual(entries);
  });
  it("sends nothing if no eligible or pending items exist", async () => {
    await sendWhatsappDigests(new Map([["+96650", [entry("no", false)]]]), "Summary");
    expect(mock.send).not.toHaveBeenCalled();
  });
});
