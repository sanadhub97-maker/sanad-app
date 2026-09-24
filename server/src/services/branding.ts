import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { getPrintThemeSetting, getPrintSignatures } from "@/services/settingsStore";

async function readPrintLogo(company: { printLogoFileId: string | null; logoFileId: string | null } | null) {
  // A dedicated print logo wins; otherwise the light-mode logo (prints are on white paper).
  const printLogoId = company?.printLogoFileId || company?.logoFileId;
  if (!printLogoId) return null;
  const logoFile = await prisma.file.findUnique({ where: { id: printLogoId } });
  if (!logoFile) return null;
  return { buffer: await storage.read(logoFile.storedName), mimeType: logoFile.mimeType };
}

// Stamp/signature images, shrunk once per file and kept: they print about
// 3cm wide, and embedding a multi-megabyte photo made every PDF slow and heavy.
const printAssetCache = new Map<string, string>();

async function fileDataUrl(fileId: string | null | undefined) {
  if (!fileId) return null;
  const cached = printAssetCache.get(fileId);
  if (cached) return cached;
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) return null;
  try {
    const raw = await storage.read(file.storedName);
    let url = `data:${file.mimeType};base64,${raw.toString("base64")}`;
    if (file.mimeType.startsWith("image/") && file.mimeType !== "image/svg+xml") {
      const png = await sharp(raw).resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true }).png().toBuffer();
      url = `data:image/png;base64,${png.toString("base64")}`;
    }
    printAssetCache.set(fileId, url);
    return url;
  } catch (err) {
    logger.warn({ err, fileId }, "Could not read a print asset");
    return null;
  }
}

/** Company identity + logo (as a data: URL) for embedding into PDF/print
 * templates (§28/§33/§54) — logo/stamp/signature always come from whatever
 * the admin uploaded in Settings → Company, never hard-coded. */
export async function getBrandingContext() {
  const company = await prisma.companySettings.findUnique({ where: { id: 1 } });
  const logo = await readPrintLogo(company);
  const logoDataUrl = logo ? `data:${logo.mimeType};base64,${logo.buffer.toString("base64")}` : null;
  const [printTheme, signatures, stampDataUrl] = await Promise.all([
    getPrintThemeSetting(),
    getPrintSignatures(),
    fileDataUrl(company?.stampFileId),
  ]);
  // Name images of every signature box, by file id.
  const nameIds = [...new Set([signatures.report, signatures.voucher, signatures.profile].flatMap((d) => d.boxes.map((b) => b.nameFileId)).filter(Boolean))] as string[];
  const nameImages: Record<string, string> = {};
  await Promise.all(
    nameIds.map(async (id) => {
      const url = await fileDataUrl(id);
      if (url) nameImages[id] = url;
    })
  );
  return { company, logoDataUrl, printTheme, signatures, stampDataUrl, nameImages };
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
