import { describe, expect, it } from "vitest";
import { paymentsTextMessages, type PaymentLine } from "@/services/paymentsMessage";

const line = (over: Partial<PaymentLine>): PaymentLine => ({ id: "1", category: "OTHER", label: "أخرى", amount: 100, who: null, est: null, supplier: "شركة الوادي", people: [], peopleKind: "employees", method: "نقدًا", number: "PAY-000011", description: null, ...over });

describe("the royal payments text", () => {
  it("titles each payment with its amount, then whom and how it was paid, and ends with the total", () => {
    const [msg] = paymentsTextMessages("royal", "شركة سمو", "2026-10-18", [line({}), line({ id: "2", label: "باقة جوال", amount: 115, number: "PAY-000012", method: "بطاقة" })]);
    expect(msg).toContain("*مدفوعات اليوم*");
    expect(msg).toContain("شركة سمو");
    expect(msg).toContain("▫️ *أخرى* — 100.00 ر.س");
    expect(msg).toContain("إلى شركة الوادي");
    expect(msg).toContain("نقدًا · PAY-000011");
    expect(msg).toContain("*الإجمالي: 215.00 ر.س*");
    expect(msg).not.toContain("💡");
  });
});
