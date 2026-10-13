import { describe, expect, it } from "vitest";
import { alertContext, daysAr, renderWhatsappAlert, renderWhatsappDigestHeader, renderWhatsappTasks, WHATSAPP_TEMPLATE_IDS, type TaskLine } from "@/services/whatsappTemplates";
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

describe("WhatsApp alert templates", () => {
  it("makes the Arabic day count agree with the number", () => {
    expect(daysAr(1)).toBe("يوم واحد");
    expect(daysAr(2)).toBe("يومان");
    expect(daysAr(7)).toBe("7 أيام");
    expect(daysAr(30)).toBe("30 يومًا");
  });

  it("trims names so a trailing space doesn't break WhatsApp bold", () => {
    const text = renderWhatsappAlert("classic", alertContext(iqama(7, { employeeNameAr: "أحمد " }), "سمو"));
    expect(text).toContain("*أحمد*");
    expect(text).not.toContain(" *\n");
  });

  it("names the document, not an employee, for company documents", () => {
    const item = iqama(30, { sourceType: "COMPANY_DOCUMENT", employeeName: undefined, employeeNameAr: undefined, documentAr: "السجل التجاري" });
    for (const id of WHATSAPP_TEMPLATE_IDS) {
      const text = renderWhatsappAlert(id, alertContext(item, "سمو"));
      expect(text).toContain("السجل التجاري");
      expect(text).not.toContain("الموظف");
    }
  });

  it("lists open tasks in every design, with how late the carried ones are", () => {
    const tasks: TaskLine[] = [
      { title: "تجديد السجل", priority: "URGENT", time: "10:00", assignee: "سامح", daysLate: 2 },
      { title: "مراجعة الإقامات", priority: "NORMAL", time: null, assignee: null, daysLate: 0 },
    ];
    for (const id of WHATSAPP_TEMPLATE_IDS) {
      const text = renderWhatsappTasks(id, tasks);
      expect(text).toContain("تجديد السجل");
      expect(text).toContain("مراجعة الإقامات");
      expect(text).toContain("متأخرة يومان");
    }
    expect(renderWhatsappTasks("classic", [])).toBe("");
    expect(renderWhatsappTasks("classic", Array.from({ length: 35 }, (_, i) => ({ ...tasks[1], title: `t${i}` })))).toContain("و5 مهام أخرى");
    expect(renderWhatsappDigestHeader("classic", "سمو", [{ daysLeft: -1 }], new Date(), 2)).toContain("📌 2 مهام مفتوحة");
  });

  it("says expired, with how long ago, once the date has passed", () => {
    const text = renderWhatsappAlert("classic", alertContext(iqama(-3), "سمو"));
    expect(text).toContain("منتهية منذ 3 أيام");
    expect(text).toContain("🔴");
  });
});
