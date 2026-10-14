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
    expect(insuranceFollowsIqama({ profession: "مربية أطفال" }, isDomestic)).toBe(true);
    expect(insuranceFollowsIqama({ profession: "مربية أطفال", insuranceSeparate: true }, isDomestic)).toBe(false);
    const ids = await linkedInsuranceIds([
      { id: "a", profession: "سائق خاص" },
      { id: "b", profession: "سائق خاص", insuranceSeparate: true },
      { id: "c", profession: "مدير عمليات" },
    ]);
    expect([...ids]).toEqual(["a"]);
  });

  it("goes by the profession on the iqama, not the job title", async () => {
    const isDomestic = await domesticMatcher();
    // A housemaid on the iqama working as a chef: the insurance follows the iqama.
    expect(insuranceFollowsIqama({ profession: "عامل منزلي", jobTitle: "شيف" } as never, isDomestic)).toBe(true);
    // A private driver by job title only: it does not.
    expect(insuranceFollowsIqama({ profession: null, jobTitle: "سائق خاص" } as never, isDomestic)).toBe(false);
    expect(insuranceFollowsIqama({ profession: "عامل تربية مواشي" }, isDomestic)).toBe(true);
    expect(insuranceFollowsIqama({ profession: "راعي" }, isDomestic)).toBe(true);
  });
});
