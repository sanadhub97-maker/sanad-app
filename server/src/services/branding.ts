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

// The WhatsApp alert cards use the logo twice: whole, and — for small round
// spots such as an app icon — just its symbol. Worked out once per logo file.
const cardAssetCache = new Map<string, { logo: string | null; mark: string | null }>();

/** Logo trimmed of empty margins, and its symbol: the part above the first
 * clear horizontal gap in the middle of the logo (a symbol over a name).
 * With no such gap the symbol is null and the whole logo is used everywhere. */
export async function getCardAssets(): Promise<{ logo: string | null; mark: string | null }> {
  const company = await prisma.companySettings.findUnique({ where: { id: 1 } });
  const fileId = company?.printLogoFileId || company?.logoFileId;
  if (!fileId) return { logo: null, mark: null };
  const cached = cardAssetCache.get(fileId);
  if (cached) return cached;
  const empty = { logo: null, mark: null };
  try {
    const logo = await readPrintLogo(company);
    if (!logo) return empty;
    const trimmed = await sharp(logo.buffer, { density: 300 }).resize({ height: 720, fit: "inside" }).trim().png().toBuffer();
    const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const rowHasInk = (y: number) => {
      for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 24) return true;
      return false;
    };
    let best: { start: number; length: number } | null = null;
    for (let y = Math.floor(info.height * 0.25), run = 0; y < info.height * 0.8; y++) {
      run = rowHasInk(y) ? 0 : run + 1;
      if (run > 0 && (!best || run > best.length)) best = { start: y - run + 1, length: run };
    }
    let mark: string | null = null;
    if (best && best.length >= Math.max(3, info.height * 0.008)) {
      const top = await sharp(trimmed).extract({ left: 0, top: 0, width: info.width, height: best.start }).png().toBuffer();
      const png = await sharp(top).trim().resize({ width: 320, fit: "inside" }).png().toBuffer();
      mark = `data:image/png;base64,${png.toString("base64")}`;
    }
    const logoPng = await sharp(trimmed).resize({ height: 440, fit: "inside" }).png().toBuffer();
    const assets = { logo: `data:image/png;base64,${logoPng.toString("base64")}`, mark };
    cardAssetCache.set(fileId, assets);
    return assets;
  } catch (err) {
    logger.warn({ err }, "Could not prepare the company logo for WhatsApp cards");
    return empty;
  }
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
