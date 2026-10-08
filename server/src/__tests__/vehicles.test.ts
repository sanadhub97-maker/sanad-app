import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { matchesState, withDays } from "@/modules/vehicles/vehicles.service";
import { vehicleSchema, renewSchema } from "@/modules/vehicles/vehicles.schemas";
import { inSponsoredScope } from "@/modules/reports/reports.service";
import { isEstablishmentSource } from "@/services/expiringItems";

const at = (days: number) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + days); return d; };
const car = (inspect: number, insure: number, reg: number | null) =>
  withDays({ inspectionExpiry: at(inspect), insuranceExpiry: at(insure), registrationExpiry: reg === null ? null : at(reg) } as never);

describe("vehicle dates", () => {
  it("takes the nearest of the three dates, ignoring a missing registration", () => {
    expect(car(40, 200, 10).nearestDays).toBe(10);
    expect(car(40, 200, null).nearestDays).toBe(40);
  });

  it("files a car under the right filter", () => {
    const expired = car(-3, 100, 400);
    const soon = car(20, 100, 400);
    const fine = car(100, 200, 400);
    expect(matchesState(expired, "expired")).toBe(true);
    expect(matchesState(soon, "expired")).toBe(false);
    expect(matchesState(soon, "soon")).toBe(true);
    expect(matchesState(fine, "soon")).toBe(false);
    expect(matchesState(soon, "INSPECTION")).toBe(true);
    expect(matchesState(fine, "INSURANCE")).toBe(false);
    expect(matchesState(car(100, 200, null), "REGISTRATION")).toBe(false);
  });
});

describe("vehicle forms", () => {
  const ok = { plateLetters: "أ ب ج", plateNumber: "1234", make: "تويوتا هايلكس", inspectionExpiry: "2026-12-01", insuranceExpiry: "2027-01-01" };
  it("needs the plate, the car and the two dates; the establishment is optional", () => {
    expect(vehicleSchema.safeParse(ok).success).toBe(true);
    expect(vehicleSchema.parse({ ...ok, branchId: "" }).branchId).toBeUndefined();
    expect(vehicleSchema.safeParse({ ...ok, plateNumber: "12345" }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...ok, inspectionExpiry: "" }).success).toBe(false);
    expect(vehicleSchema.parse({ ...ok, year: "" }).year).toBeNull();
  });
  it("renews only the three known dates", () => {
    expect(renewSchema.safeParse({ kind: "INSURANCE", date: "2027-05-01" }).success).toBe(true);
    expect(renewSchema.safeParse({ kind: "OIL", date: "2027-05-01" }).success).toBe(false);
  });
});

describe("vehicles in the document reports", () => {
  it("count as the establishment's, like company documents", () => {
    expect(isEstablishmentSource("VEHICLE")).toBe(true);
    expect(inSponsoredScope({ sourceType: "VEHICLE" })).toBe(true);
  });
});
