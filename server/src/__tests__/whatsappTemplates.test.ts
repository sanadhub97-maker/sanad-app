import { describe, expect, it } from "vitest";
import { alertContext, daysAr, type TaskLine } from "@/services/whatsappTemplates";
import { renderDailyEntry, renderDailyHeader, renderDailyTail } from "@/services/dailySummary";
import { dailyMessageParts } from "@/services/whatsappDigest";
import type { TrackableItem } from "@/services/expiringItems";

function addDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

const iqama = (days: number, overrides: Partial<TrackableItem> = {}): TrackableItem => ({
  key: "employee-iqama-1",
  sourceType: "EMPLOYEE_IQAMA",
  label: "Ahmed — Iqama",
  labelAr: "أحمد — إقامة",
  expiryDate: addDays(days),
  employeeName: "Ahmed",
  employeeNameAr: "أحمد",
  recordId: "1",
  documentAr: "الإقامة",
  documentEn: "Iqama",
  kind: "IQAMA",
  kindAr: "إقامة",
  kindEn: "Iqama",
  ...overrides,
});

describe("WhatsApp daily summary", () => {
  it("makes the Arabic day count agree with the number", () => {
    expect(daysAr(1)).toBe("يوم واحد");
    expect(daysAr(2)).toBe("يومان");
    expect(daysAr(7)).toBe("7 أيام");
    expect(daysAr(30)).toBe("30 يومًا");
  });



  it("builds the daily summary: counts, documents most urgent first, open tasks and the signature", () => {
    const tasks: TaskLine[] = [
      { title: "تجديد السجل", priority: "URGENT", time: "10:00", assignee: "سامح", daysLate: 2 },
      { title: "مراجعة الإقامات", priority: "NORMAL", time: null, assignee: null, daysLate: 0 },
    ];
    const docs = [-3, 7].map((d) => { const item = iqama(d); return { item, context: alertContext(item, "سمو") }; });
    const header = renderDailyHeader("سمو", docs, tasks);
    expect(header).toContain("> 🔴 منتهية: *1*");
    expect(header).toContain("> 📌 المهام المطلوب إنجازها: *2*");
    expect(renderDailyEntry(docs[0])).toContain("🪪 *الإقامة — أحمد*");
    expect(renderDailyEntry(docs[0])).toContain("منتهية منذ 3 أيام");
    const tail = renderDailyTail(tasks);
    // A task line is its title, time and priority: no lateness or assignee.
    expect(tail).not.toContain("متأخرة يومان");
    expect(tail).not.toContain("👤");
    expect(renderDailyTail([])).toContain("SanaD");
    const parts = dailyMessageParts(Array.from({ length: 40 }, () => "x".repeat(300)), header, "empty", tail);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= 3500 && (p.startsWith(header) || p === tail))).toBe(true);
    expect(dailyMessageParts([], header, "✅ all clear")[0]).toContain("✅ all clear");
  });

});

describe("the urgency groups", () => {
  it("splits this calendar month from next month", async () => {
    const { urgency } = await import("@/services/urgency");
    const oct13 = new Date("2026-10-13T06:00:00Z");
    expect(urgency(-1, oct13)).toBe(0);
    expect(urgency(5, oct13)).toBe(1);
    expect(urgency(18, oct13)).toBe(2); // 31 October
    expect(urgency(19, oct13)).toBe(3); // 1 November
  });
  it("renders every text design, with this month and next month named", async () => {
    const { DAILY_TEXT_IDS, dailyTextMessages } = await import("@/services/dailyText");
    const { alertContext } = await import("@/services/whatsappTemplates");
    const oct13 = new Date("2026-10-13T06:00:00Z");
    const at = (days: number) => new Date(oct13.getTime() + days * 86_400_000);
    const docs = [-3, 18, 25].map((d) => { const item = { ...iqama(d), expiryDate: at(d) }; return { item, context: { ...alertContext(item, "سمو"), daysLeft: d } }; });
    const tasks = [{ title: "مهمة", priority: "URGENT" as const, time: null, assignee: null, daysLate: 2 }];
    for (const id of DAILY_TEXT_IDS) {
      const text = dailyTextMessages(id, "سمو", docs, tasks, oct13).join("\n");
      expect(text).toContain("أحمد");
      expect(text).not.toContain("خلال شهر");
    }
    expect(dailyTextMessages("grouped", "سمو", docs, tasks, oct13).join("\n")).toContain("تنتهي خلال هذا الشهر");
    expect(dailyTextMessages("grouped", "سمو", docs, tasks, oct13).join("\n")).toContain("تنتهي الشهر القادم");
  });
});
