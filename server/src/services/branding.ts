import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

/** Company identity + logo (as a data: URL) for embedding into PDF/print
 * templates (§28/§33/§54) — logo/stamp/signature always come from whatever
 * the admin uploaded in Settings → Company, never hard-coded. */
export async function getBrandingContext() {
  const company = await prisma.companySettings.findUnique({ where: { id: 1 } });
  let logoDataUrl: string | null = null;

  if (company?.logoFileId) {
    const logoFile = await prisma.file.findUnique({ where: { id: company.logoFileId } });
    if (logoFile) {
      const buffer = await storage.read(logoFile.storedName);
      logoDataUrl = `data:${logoFile.mimeType};base64,${buffer.toString("base64")}`;
    }
  }

  return { company, logoDataUrl };
}
