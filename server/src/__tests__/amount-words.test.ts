import { describe, expect, it } from "vitest";
import { riyalsInWords } from "@/modules/pdf/templates";

describe("the voucher's amount in Arabic words", () => {
  it("writes riyals with their grammar", () => {
    expect(riyalsInWords(1)).toBe("ريال سعودي واحد فقط لا غير");
    expect(riyalsInWords(2)).toBe("ريالان سعوديان فقط لا غير");
    expect(riyalsInWords(5)).toBe("خمسة ريالات سعودية فقط لا غير");
    expect(riyalsInWords(25)).toBe("خمسة وعشرون ريالًا سعوديًا فقط لا غير");
    expect(riyalsInWords(1000)).toBe("ألف ريال سعودي فقط لا غير");
    expect(riyalsInWords(1490)).toBe("ألف وأربعمائة وتسعون ريالًا سعوديًا فقط لا غير");
    expect(riyalsInWords(12500)).toBe("اثنا عشر ألفًا وخمسمائة ريال سعودي فقط لا غير");
  });
  it("adds the halalas", () => {
    expect(riyalsInWords(1490.5)).toBe("ألف وأربعمائة وتسعون ريالًا سعوديًا وخمسون هللة فقط لا غير");
    expect(riyalsInWords(3000.05)).toBe("ثلاثة آلاف ريال سعودي وخمسة هللات فقط لا غير");
  });
});
