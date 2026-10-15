import { describe, expect, it } from "vitest";
import { amountInWords, arabicNumber, englishNumber } from "@/modules/certificates/money-words";
import { serviceLength } from "@/modules/certificates/certificates.print";
import { salaryQuerySchema } from "@/modules/certificates/certificates.schemas";

describe("amounts in words", () => {
  it("writes Arabic numbers as Saudi letters do", () => {
    expect(arabicNumber(1)).toBe("واحد");
    expect(arabicNumber(11)).toBe("أحد عشر");
    expect(arabicNumber(25)).toBe("خمسة وعشرون");
    expect(arabicNumber(200)).toBe("مائتان");
    expect(arabicNumber(1000)).toBe("ألف");
    expect(arabicNumber(2000)).toBe("ألفان");
    expect(arabicNumber(8500)).toBe("ثمانية آلاف وخمسمائة");
    expect(arabicNumber(15000)).toBe("خمسة عشر ألفًا");
    expect(arabicNumber(100000)).toBe("مائة ألف");
    expect(arabicNumber(1250000)).toBe("مليون ومائتان وخمسون ألفًا");
  });
  it("adds the currency and the halalas", () => {
    expect(amountInWords(8500, false)).toBe("فقط ثمانية آلاف وخمسمائة ريال سعودي لا غير");
    expect(amountInWords(3200.5, false)).toBe("فقط ثلاثة آلاف ومائتان ريال سعودي وخمسون هللة لا غير");
    expect(amountInWords(8500, true)).toBe("Eight thousand five hundred Saudi riyals only");
    expect(englishNumber(1234)).toBe("one thousand two hundred thirty-four");
  });
});

describe("length of service", () => {
  it("counts the last day as worked", () => {
    expect(serviceLength(new Date("2024-01-01T00:00:00Z"), new Date("2025-12-31T00:00:00Z"))).toEqual({ y: 2, m: 0, d: 0 });
    expect(serviceLength(new Date("2024-01-15T00:00:00Z"), new Date("2024-03-14T00:00:00Z"))).toEqual({ y: 0, m: 2, d: 0 });
  });
});

describe("salary certificate input", () => {
  it("reads the other allowances and needs some salary", () => {
    const ok = salaryQuerySchema.parse({ employeeId: "e1", basic: "5000", others: JSON.stringify([{ label: "بدل طبيعة عمل", amount: 500 }]) });
    expect(ok.others).toEqual([{ label: "بدل طبيعة عمل", amount: 500 }]);
    expect(() => salaryQuerySchema.parse({ employeeId: "e1" })).toThrow();
    expect(() => salaryQuerySchema.parse({ employeeId: "e1", basic: "100", others: "not json" })).toThrow();
    expect(() => salaryQuerySchema.parse({ employeeId: "e1", basic: "100", establishment: "manual" })).toThrow();
  });
});
