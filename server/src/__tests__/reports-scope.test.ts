import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { inSponsoredScope } from "@/modules/reports/reports.service";
import { documentsReportQuerySchema } from "@/modules/reports/reports.schemas";

describe("expired and ending-soon reports", () => {
  it("keep every establishment document and only sponsored employees' documents", () => {
    expect(inSponsoredScope({ sourceType: "COMPANY_DOCUMENT" })).toBe(true);
    expect(inSponsoredScope({ sourceType: "EMPLOYEE_IQAMA", onSponsorship: true })).toBe(true);
    expect(inSponsoredScope({ sourceType: "EMPLOYEE_DOCUMENT", onSponsorship: false })).toBe(false);
    expect(inSponsoredScope({ sourceType: "EMPLOYEE_PASSPORT", onSponsorship: null })).toBe(false);
    expect(inSponsoredScope({ sourceType: "EMPLOYEE_IQAMA" })).toBe(false);
  });

  it("accept the scope only as all or sponsored", () => {
    expect(documentsReportQuerySchema.safeParse({ scope: "sponsored" }).success).toBe(true);
    expect(documentsReportQuerySchema.safeParse({ scope: "mine" }).success).toBe(false);
  });
});
