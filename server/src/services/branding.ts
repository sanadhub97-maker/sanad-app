import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

/** Company identity + logo (as a data: URL) for embedding into PDF/print
 * templates (§28/§33/§54) — logo/stamp/signature always come from whatever
 * the admin uploaded in Settings → Company, never hard-coded. */
export async function getBrandingContext() {
  const company = await prisma.companySettings.findUnique({ where: { id: 1 } });
  let logoDataUrl: string | null = null;

  // A dedicated print logo wins; otherwise the light-mode logo (prints are on white paper).
  const printLogoId = company?.printLogoFileId || company?.logoFileId;
  if (printLogoId) {
    const logoFile = await prisma.file.findUnique({ where: { id: printLogoId } });
    if (logoFile) {
      const buffer = await storage.read(logoFile.storedName);
      logoDataUrl = `data:${logoFile.mimeType};base64,${buffer.toString("base64")}`;
    }
  }

  return { company, logoDataUrl };
}
