import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/modules/productivity/productivity.service", () => ({ requireAccess: vi.fn() }));
import { requirementInput, satisfiesRequirement } from "@/modules/operations/requirements.service";
const today = new Date("2026-01-01"), strict = { requireFile: true, requireValid: true };
describe("Required document rules", () => {
  it("rejects document categories from a different scope", () => {
    expect(requirementInput.safeParse({ name: "Contract", scope: "EMPLOYEE", type: "EMPLOYMENT_CONTRACT" }).success).toBe(true);
    expect(requirementInput.safeParse({ name: "License", scope: "EMPLOYEE", type: "MUNICIPAL_LICENSE" }).success).toBe(false);
    expect(requirementInput.safeParse({ name: "Passport", scope: "BRANCH", type: "PASSPORT" }).success).toBe(false);
  });
  it("reports expired, absent and unattached documents as missing when required", () => {
    expect(satisfiesRequirement(strict, [], today)).toBe(false);
    expect(satisfiesRequirement(strict, [{ fileId: "file", expiryDate: new Date("2025-01-01") }], today)).toBe(false);
    expect(satisfiesRequirement(strict, [{ fileId: null, expiryDate: new Date("2027-01-01") }], today)).toBe(false);
  });
  it("accepts nonexpiring documents and the expiry day itself", () => {
    expect(satisfiesRequirement(strict, [{ fileId: "file", expiryDate: null }], today)).toBe(true);
    expect(satisfiesRequirement(strict, [{ fileId: "file", expiryDate: today }], today)).toBe(true);
  });
  it("honors optional attachment and validity requirements", () => {
    expect(satisfiesRequirement({ requireFile: false, requireValid: false }, [{ fileId: null, expiryDate: new Date("2025-01-01") }], today)).toBe(true);
  });
});
