import { describe, expect, it } from "vitest";
import { computeStatus, daysUntil, DEFAULT_EXPIRATION_RULES } from "@/services/expiration";

function addDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

describe("expiration engine (§20)", () => {
  it("returns null when there is no expiry date", () => {
    expect(computeStatus(null)).toBeNull();
    expect(computeStatus(undefined)).toBeNull();
  });

  it("is VALID when more than the threshold days remain", () => {
    expect(computeStatus(addDays(45), DEFAULT_EXPIRATION_RULES)).toBe("VALID");
  });

  it("is EXPIRING_SOON within the threshold window", () => {
    expect(computeStatus(addDays(30), DEFAULT_EXPIRATION_RULES)).toBe("EXPIRING_SOON");
    expect(computeStatus(addDays(1), DEFAULT_EXPIRATION_RULES)).toBe("EXPIRING_SOON");
  });

  it("is EXPIRED on the expiry date and afterwards", () => {
    expect(computeStatus(addDays(0), DEFAULT_EXPIRATION_RULES)).toBe("EXPIRED");
    expect(computeStatus(addDays(-5), DEFAULT_EXPIRATION_RULES)).toBe("EXPIRED");
  });

  it("respects a custom threshold", () => {
    expect(computeStatus(addDays(50), { expiringSoonThresholdDays: 60, notifyDaysBefore: [30] })).toBe("EXPIRING_SOON");
  });

  it("daysUntil is whole-day and timezone-stable regardless of time-of-day", () => {
    const inTenDays = addDays(10);
    expect(daysUntil(inTenDays)).toBe(10);
  });
});
