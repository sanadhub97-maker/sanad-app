import { describe, expect, it } from "vitest";
import { cardDocument, cardMarkup, isWhatsappCardSetting, WHATSAPP_CARD_IDS } from "@/services/whatsappCards";
import type { AlertContext } from "@/services/whatsappTemplates";

const assets = { logo: "data:image/png;base64,AAAA", mark: null };
const employee: AlertContext = {
  company: "سمو",
  employeeAr: "أحمد <علي>",
  employeeEn: "Ahmed Ali",
  documentAr: "الإقامة",
  documentEn: "Iqama",
  number: "2431473152",
  branch: "الرياض",
  expiryDate: new Date(Date.now() + 7 * 86_400_000),
  daysLeft: 7,
};

describe("WhatsApp alert cards", () => {
  it("draws every design with the employee name, escaped", () => {
    for (const id of WHATSAPP_CARD_IDS) {
      const html = cardMarkup(id, employee, "Sumou", assets);
      expect(html).toContain("أحمد &lt;علي&gt;");
      expect(html).not.toContain("<علي>");
    }
  });

  it("names the document, not an employee, for company documents", () => {
    const companyDoc: AlertContext = { ...employee, employeeAr: undefined, employeeEn: undefined, documentAr: "السجل التجاري", number: null, branch: null };
    const html = cardMarkup("ios", companyDoc, "Sumou", assets);
    expect(html).toContain("السجل التجاري");
    expect(html).not.toContain("الموظف");
    expect(html).toContain("—");
  });

  it("falls back to the whole logo when there is no separate symbol", () => {
    expect(cardMarkup("bento", employee, "Sumou", assets)).toContain(assets.logo);
  });

  it("wraps a card in a page sized for WhatsApp", () => {
    expect(cardDocument("pass", employee, "Sumou", assets)).toMatch(/\.cardbox \{ width: 1080px; \}/);
  });

  it("accepts only known designs, or none", () => {
    expect(isWhatsappCardSetting("titanium")).toBe(true);
    expect(isWhatsappCardSetting("none")).toBe(true);
    expect(isWhatsappCardSetting("gold")).toBe(false);
  });
});
