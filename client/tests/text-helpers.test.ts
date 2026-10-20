import { describe, expect, it } from "vitest";
import { amountInWords, arabicNumber, englishNumber } from "../src/lib/money-words";
import { fileTypeLabel, nameInitials, pickLang } from "../src/lib/names";
import { normalizeProfession } from "../src/lib/domestic";
import { socialLabel, socialList } from "../src/lib/socials";

describe("money in words", () => {
  it("spells Arabic numbers", () => {
    expect(arabicNumber(0)).toBe("صفر");
    expect(arabicNumber(15)).toBe("خمسة عشر");
    expect(arabicNumber(2500)).toBe("ألفان وخمسمائة");
  });
  it("spells English numbers", () => {
    expect(englishNumber(0)).toBe("zero");
    expect(englishNumber(21)).toBe("twenty-one");
    expect(englishNumber(1500)).toBe("one thousand five hundred");
  });
  it("writes riyals and halalas", () => {
    expect(amountInWords(1250.5, false)).toBe("فقط ألف ومائتان وخمسون ريال سعودي وخمسون هللة لا غير");
    expect(amountInWords(1250.5, true)).toBe("One thousand two hundred fifty Saudi riyals and fifty halalas only");
    expect(amountInWords(0, false)).toBe("فقط صفر ريال سعودي لا غير");
  });
});

describe("names and labels", () => {
  it("builds initials", () => {
    expect(nameInitials("محمد أحمد")).toBe("مأ");
    expect(nameInitials("John Smith")).toBe("JS");
    expect(nameInitials("")).toBe("?");
  });
  it("falls back to the other language", () => {
    expect(pickLang("ع", "e", true)).toBe("ع");
    expect(pickLang(null, "e", true)).toBe("e");
    expect(pickLang("ع", null, false)).toBe("ع");
  });
  it("labels file types", () => {
    expect(fileTypeLabel("application/pdf")).toBe("PDF");
    expect(fileTypeLabel(null)).toBe("—");
  });
  it("trims professions", () => {
    expect(normalizeProfession("  سائق  ")).toBe("سائق");
    expect(normalizeProfession(null)).toBe("");
  });
});

describe("socials", () => {
  it("formats handles and ignores empty lists", () => {
    expect(socialLabel("x", "https://x.com/abc")).toBe("@abc");
    expect(socialList({ x: "abc" })).toHaveLength(1);
    expect(socialList(null)).toEqual([]);
  });
});
