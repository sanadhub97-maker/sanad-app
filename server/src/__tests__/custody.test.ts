import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  clearance: { findFirst: vi.fn(), update: vi.fn() },
  custodyItem: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/services/branding", () => ({ getEstablishmentBranding: vi.fn() }));

import { issueBlockers, issueClearance, nextNumber, readDepartments } from "@/modules/custody/custody.service";
import { createClearanceSchema, createHandoverSchema } from "@/modules/custody/custody.schemas";
import { clearanceHtml, handoverHtml, hijri, shade } from "@/modules/custody/custody.print";

const allSigned = { hr: { done: true }, fin: { done: true }, it: { done: true }, store: { done: true }, mgr: { done: true } };
const clearanceRow = (departments: unknown) => ({
  id: "c1", number: "CL-2026-0001", employeeId: "e1", status: "OPEN", dues: 0, departments, items: [],
  employee: { id: "e1", employeeNumber: "1", fullNameAr: "موظف", fullNameEn: null, jobTitle: null, jobTitleEn: null, nationality: null, nationalityEn: null, iqamaNumber: null, branchId: null, branch: null },
});

describe("custody numbering", () => {
  it("counts up within the year and starts each year at 0001", () => {
    expect(nextNumber("HO", 2026, null)).toBe("HO-2026-0001");
    expect(nextNumber("HO", 2026, "HO-2026-0009")).toBe("HO-2026-0010");
    expect(nextNumber("CL", 2027, undefined)).toBe("CL-2027-0001");
  });
});

describe("clearance sign-off", () => {
  it("reads every department, missing ones as not signed", () => {
    const d = readDepartments({ hr: { done: true, by: "سارة" }, junk: { done: true } });
    expect(Object.keys(d)).toEqual(["hr", "fin", "it", "store", "mgr"]);
    expect(d.hr).toMatchObject({ done: true, by: "سارة" });
    expect(d.fin.done).toBe(false);
    expect(issueBlockers(0, d).departmentsPending).toEqual(["fin", "it", "store", "mgr"]);
  });

  beforeEach(() => vi.clearAllMocks());

  it("refuses to issue while an item is still out", async () => {
    db.clearance.findFirst.mockResolvedValue(clearanceRow(allSigned));
    db.custodyItem.findMany.mockResolvedValue([{ id: "i1", value: 10, returnedAt: null }]);
    await expect(issueClearance("c1")).rejects.toThrow(/returned/);
    expect(db.clearance.update).not.toHaveBeenCalled();
  });

  it("refuses to issue while a department has not signed", async () => {
    db.clearance.findFirst.mockResolvedValue(clearanceRow({ ...allSigned, mgr: { done: false } }));
    db.custodyItem.findMany.mockResolvedValue([{ id: "i1", value: 10, returnedAt: new Date() }]);
    await expect(issueClearance("c1")).rejects.toThrow(/department/);
    expect(db.clearance.update).not.toHaveBeenCalled();
  });

  it("issues once everything is back and signed", async () => {
    db.clearance.findFirst.mockResolvedValue(clearanceRow(allSigned));
    db.custodyItem.findMany.mockResolvedValue([{ id: "i1", value: 10, returnedAt: new Date() }]);
    await issueClearance("c1");
    expect(db.clearance.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ISSUED" }) }));
  });
});

describe("custody forms", () => {
  it("needs at least one item and a valid date", () => {
    expect(createHandoverSchema.safeParse({ employeeId: "e", date: "2026-10-07", items: [] }).success).toBe(false);
    expect(createHandoverSchema.safeParse({ employeeId: "e", date: "7/10/2026", items: [{ kind: "لابتوب" }] }).success).toBe(false);
    const ok = createHandoverSchema.parse({ employeeId: "e", date: "2026-10-07", deliveredBy: "", items: [{ kind: "لابتوب", value: "1500" }] });
    expect(ok.items[0]).toMatchObject({ condition: "good", value: 1500 });
    expect(ok.deliveredBy).toBeUndefined();
  });

  it("accepts only the known reasons and return conditions", () => {
    expect(createClearanceSchema.safeParse({ employeeId: "e", lastWorkingDay: "2026-10-07", reason: "vacation" }).success).toBe(false);
    expect(createClearanceSchema.safeParse({ employeeId: "e", lastWorkingDay: "2026-10-07", reason: "resignation", returns: [{ id: "i", condition: "broken" }] }).success).toBe(false);
    expect(createClearanceSchema.parse({ employeeId: "e", lastWorkingDay: "2026-10-07", reason: "resignation", returns: [{ id: "i", condition: null }] }).returns[0].condition).toBeNull();
  });
});

describe("the royal print", () => {
  const est = { name: "مؤسسة <الاختبار>", nameEn: "Test Est.", cr: "1010", vat: null, city: "الرياض", phone: null, logoDataUrl: "data:image/png;base64,AAAA", brandColor: "#1e40af" };
  const emp = { name: "موظف", number: "E-1", iqama: "2400000000", job: null, nationality: null };

  it("darkens the brand colour for the header band", () => {
    expect(shade("#ffffff", 0.5)).toBe("#808080");
    expect(shade("#1e40af", 0.38)).toBe("#0b1843");
  });

  it("dates in the Umm al-Qura calendar", () => {
    expect(hijri(new Date("2026-10-07T00:00:00Z"))).toMatch(/١٤٤٨/);
  });

  it("prints the establishment's logo and escapes what users typed", async () => {
    const html = await handoverHtml({ est, emp, number: "HO-2026-0001", date: new Date("2026-10-07T00:00:00Z"), deliveredBy: null, notes: "<b>x</b>", items: [{ kind: "لابتوب", description: null, serialNumber: null, condition: "good", value: 10 }] });
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain("--deep:#0b1843");
    expect(html).not.toContain("<الاختبار>");
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("سليمة");
  });

  it("marks an unissued clearance as a draft", async () => {
    const html = await clearanceHtml({ est, emp, number: "CL-2026-0001", lastWorkingDay: new Date("2026-10-07T00:00:00Z"), reason: "resignation", dues: 0, notes: null, issued: false, departments: {}, items: [] });
    expect(html).toContain("مسودة");
    expect(html).not.toContain("إخلاء طرف نهائي");
  });
});
