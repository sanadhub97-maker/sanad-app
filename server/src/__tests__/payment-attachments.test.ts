import { expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
const payment = vi.hoisted(() => ({ create: vi.fn(async (args: any) => args.data), update: vi.fn(async (args: any) => args.data), findFirst: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { payment } }));
import { create, update } from "@/modules/payments/payments.service";
import { createPaymentSchema } from "@/modules/payments/payments.schemas";
const input = { paymentNumber: "TEST", paymentDate: new Date(), category: "SUBSCRIPTION", method: "CASH", amount: 10, vat: 0 };

it("saves every attachment and preserves the primary attachment for older clients", async () => {
  payment.findFirst.mockResolvedValue(null);
  const result = await create(createPaymentSchema.parse({ ...input, fileIds: ["one", "two", "one"] }), "user");
  expect(result.fileIds).toEqual(["one", "two"]);
  expect(result.fileId).toBe("one");
  const legacy = await create(createPaymentSchema.parse({ ...input, fileId: "old" }), "user");
  expect(legacy.fileIds).toEqual(["old"]);
});

it("allows clearing all attachments without changing the payment amount", async () => {
  payment.findFirst.mockResolvedValue({ amount: new Prisma.Decimal(10), vat: new Prisma.Decimal(0), fileId: "old", fileIds: ["old"] });
  const result = await update("payment", { fileIds: [] });
  expect(result.fileIds).toEqual([]);
  expect(result.fileId).toBeNull();
  expect(Number(result.total)).toBe(10);
});

it("rejects excessive or empty attachment identifiers", () => {
  expect(createPaymentSchema.safeParse({ ...input, fileIds: Array.from({ length: 21 }, (_, i) => String(i)) }).success).toBe(false);
  expect(createPaymentSchema.safeParse({ ...input, fileIds: [""] }).success).toBe(false);
});
