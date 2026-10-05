import { beforeEach, expect, it, vi } from "vitest";
import sharp from "sharp";
const mocks = vi.hoisted(() => ({ file: vi.fn(), company: vi.fn(), read: vi.fn(), signatures: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { file: { findUnique: mocks.file }, companySettings: { findUnique: mocks.company } } }));
vi.mock("@/lib/storage", () => ({ storage: { read: mocks.read } }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn() } }));
vi.mock("@/services/settingsStore", () => ({ getPrintThemeSetting: async () => "crimson", getPrintSignatures: mocks.signatures }));
import { getBrandingContext } from "@/services/branding";
import { assertBrandFile, isPublicBrandAsset, PRINT_NAME_IMAGE_MODULES } from "@/modules/files/files.access";

beforeEach(async () => {
  vi.resetAllMocks(); mocks.company.mockResolvedValue(null);
  mocks.read.mockResolvedValue(await sharp({ create: { width: 8, height: 4, channels: 4, background: "black" } }).png().toBuffer());
});
it("loads saved legacy name plates for each document without mixing approvers", async () => {
  const kinds = ["report", "voucher", "profile"] as const;
  mocks.signatures.mockResolvedValue(Object.fromEntries(kinds.map(kind => [kind, { boxes: [{ ar: kind, en: kind, nameFileId: `legacy-${kind}` }] }])));
  mocks.file.mockImplementation(async ({ where }) => ({ module: "signature-name", mimeType: "image/png", storedName: `${where.id}.png` }));
  for (const kind of kinds) {
    const b = await getBrandingContext(kind);
    expect(Object.keys(b.nameImages)).toEqual([`legacy-${kind}`]);
    expect(b.nameImages[`legacy-${kind}`]).toMatch(/^data:image\/png;base64,/);
  }
  expect(mocks.read).toHaveBeenCalledTimes(3);
});
it("accepts legacy name plates for settings but never exposes them publicly or as logos", async () => {
  mocks.file.mockResolvedValue({ module: "signature-name", mimeType: "image/png" });
  await expect(assertBrandFile("legacy", PRINT_NAME_IMAGE_MODULES)).resolves.toBeUndefined();
  await expect(assertBrandFile("legacy", ["company-logo"])).rejects.toThrow();
  expect(await isPublicBrandAsset({ id: "legacy", module: "signature-name", mimeType: "image/png" })).toBe(false);
});
it("does not embed a private employee file or non-image file as a name plate", async () => {
  mocks.signatures.mockResolvedValue({ report: { boxes: [{ nameFileId: "private-name" }, { nameFileId: "invalid-name" }] } });
  mocks.file.mockImplementation(async ({ where }) => where.id === "private-name"
    ? { module: "employee", mimeType: "image/png" }
    : { module: "signature-name", mimeType: "application/pdf" });
  expect((await getBrandingContext("report")).nameImages).toEqual({});
  expect(mocks.read).not.toHaveBeenCalled();
});
