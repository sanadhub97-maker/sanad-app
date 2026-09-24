import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { getPrintThemeSetting } from "@/services/settingsStore";

async function readPrintLogo(company: { printLogoFileId: string | null; logoFileId: string | null } | null) {
  // A dedicated print logo wins; otherwise the light-mode logo (prints are on white paper).
  const printLogoId = company?.printLogoFileId || company?.logoFileId;
  if (!printLogoId) return null;
  const logoFile = await prisma.file.findUnique({ where: { id: printLogoId } });
  if (!logoFile) return null;
  return { buffer: await storage.read(logoFile.storedName), mimeType: logoFile.mimeType };
}

/** Company identity + logo (as a data: URL) for embedding into PDF/print
 * templates (§28/§33/§54) — logo/stamp/signature always come from whatever
 * the admin uploaded in Settings → Company, never hard-coded. */
export async function getBrandingContext() {
  const company = await prisma.companySettings.findUnique({ where: { id: 1 } });
  const logo = await readPrintLogo(company);
  const logoDataUrl = logo ? `data:${logo.mimeType};base64,${logo.buffer.toString("base64")}` : null;
  const printTheme = await getPrintThemeSetting();
  return { company, logoDataUrl, printTheme };
}

/** The print logo as a PNG for Excel, which only embeds PNG/JPEG/GIF (the
 * upload may be SVG or WebP). Returns null if there's no logo or it can't be read. */
export async function getPrintLogoPng(): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  const company = await prisma.companySettings.findUnique({ where: { id: 1 } });
  const logo = await readPrintLogo(company);
  if (!logo) return null;
  try {
    const { data, info } = await sharp(logo.buffer, { density: 300 })
      .resize({ height: 160, withoutEnlargement: false })
      .png()
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: info.height };
  } catch (err) {
    logger.warn({ err }, "Could not convert the company logo for Excel");
    return null;
  }
}
