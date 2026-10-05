import { expect, it, vi } from "vitest";
vi.mock("@/config/env", () => ({ env: { CLIENT_URL: "https://example.invalid", PDF_DISABLE_SANDBOX: false } }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
import { employeeProfilePdf, paymentReceiptPdf } from "@/modules/pdf/templates";
import { DEFAULT_PRINT_SIGNATURES } from "@/services/settingsStore";
import { withLang } from "@/services/lang";

const branding = () => {
  const signatures = structuredClone(DEFAULT_PRINT_SIGNATURES);
  signatures.voucher.boxes[0] = { ar: "اعتماد مالي", en: "Finance approval", nameAr: "المعتمد المالي", nameEn: "Finance Approver" };
  signatures.profile.boxes[0] = { ar: "شؤون الموظفين", en: "HR", nameAr: "معتمد الموظفين", nameEn: "HR Approver" };
  return { company: null, logoDataUrl: null, signatures };
};
const voucher = (b: ReturnType<typeof branding>) => paymentReceiptPdf({ paymentNumber: "PAY-TEST", paymentDate: new Date(), amount: 10, vat: 0, total: 10, category: "SUBSCRIPTION", method: "CASH" } as any, b);
it("prints separate names for voucher and employee profile in both languages", () => {
  const b = branding();
  expect(withLang("ar", () => voucher(b))).toContain("المعتمد المالي");
  expect(withLang("en", () => voucher(b))).toContain("Finance Approver");
  const html = employeeProfilePdf({ employeeNumber: "TEST", fullNameAr: "تجريبي", documents: [] } as any, b);
  expect(html).toContain("معتمد الموظفين");
  expect(html).not.toContain("المعتمد المالي");
});
it("escapes approver names and retains name-image support", () => {
  const b = branding();
  b.signatures.voucher.boxes[0].nameAr = "<script>unsafe</script>";
  expect(voucher(b)).toContain("&lt;script&gt;unsafe&lt;/script&gt;");
  b.signatures.voucher.boxes[0].nameAr = "";
  b.signatures.voucher.boxes[0].nameEn = "";
  b.signatures.voucher.boxes[0].nameFileId = "image";
  expect(voucher({ ...b, nameImages: { image: "data:image/png;base64,synthetic" } } as any)).toContain('src="data:image/png;base64,synthetic"');
});
