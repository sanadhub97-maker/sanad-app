import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/settingsStore", () => ({ readSetting: vi.fn(async (_key: string, fallback: unknown) => fallback), writeSetting: vi.fn(async () => undefined) }));

import { domesticMatcher, insuranceFollowsIqama, linkedInsuranceIds, normalizeProfession } from "@/services/domesticInsurance";

describe("domestic workers' insurance follows the iqama", () => {
  it("compares professions however they are spelled", () => {
    expect(normalizeProfession("عاملة منزلية")).toBe(normalizeProfession("عامله منزليه"));
    expect(normalizeProfession("مربية أطفال")).toBe(normalizeProfession("مربيه اطفال"));
    expect(normalizeProfession("  السائق   الخاص ")).toBe(normalizeProfession("سائق خاص"));
    expect(normalizeProfession("• مزارع منزلي")).toBe(normalizeProfession("مزارع منزلي"));
    expect(normalizeProfession("Private Driver")).toBe(normalizeProfession("private driver"));
  });

  it("recognises the listed professions, in Arabic or English, and nothing else", async () => {
    const isDomestic = await domesticMatcher();
    for (const title of ["سائق خاص", "عامل منزلي", "عاملة منزلية", "مربية أطفال", "طباخ", "طباخة منزلية", "حارس منزلي", "مزارع منزلي", "ممرض منزلي"]) expect(isDomestic(title)).toBe(true);
    expect(isDomestic(null, "Housemaid")).toBe(true);
    expect(isDomestic("شيف")).toBe(false);
    expect(isDomestic("معلم شيشة")).toBe(false);
    expect(isDomestic("سائق")).toBe(false);
    expect(isDomestic("طباخ مطعم")).toBe(false);
    expect(isDomestic(null, null)).toBe(false);
  });

  it("keeps the insurance separate for the exceptions", async () => {
    const isDomestic = await domesticMatcher();
    expect(insuranceFollowsIqama({ jobTitle: "مربية أطفال" }, isDomestic)).toBe(true);
    expect(insuranceFollowsIqama({ jobTitle: "مربية أطفال", insuranceSeparate: true }, isDomestic)).toBe(false);
    const ids = await linkedInsuranceIds([
      { id: "a", jobTitle: "سائق خاص" },
      { id: "b", jobTitle: "سائق خاص", insuranceSeparate: true },
      { id: "c", jobTitle: "مدير عمليات" },
    ]);
    expect([...ids]).toEqual(["a"]);
  });
});
