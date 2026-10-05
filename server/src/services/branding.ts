import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { getPrintThemeSetting, getPrintSignatures } from "@/services/settingsStore";
import type { SignatureDocument } from "@/services/settingsStore";
import { PRINT_NAME_IMAGE_MODULES } from "@/modules/files/files.access";

const logoCache = new Map<string, Promise<{ buffer: Buffer; mimeType: string } | null>>();
async function readPrintLogo(company: { printLogoFileId: string | null; logoFileId: string | null } | null) {
  // A dedicated print logo wins; otherwise the light-mode logo (prints are on white paper).
  const printLogoId = company?.printLogoFileId || company?.logoFileId;
  if (!printLogoId) return null;
  let pending = logoCache.get(printLogoId);
  if (!pending) {
    if (logoCache.size >= 32) logoCache.clear();
    pending = loadPrintLogo(printLogoId).catch(error => { logoCache.delete(printLogoId); throw error; });
    logoCache.set(printLogoId, pending);
  }
  return pending;
}
async function loadPrintLogo(printLogoId: string) {
  const logoFile = await prisma.file.findUnique({ where: { id: printLogoId } });
  if (!logoFile || logoFile.module !== "company-logo" || !["image/png", "image/jpeg"].includes(logoFile.mimeType)) return null;
  const raw = await storage.read(logoFile.storedName);
  const buffer = await sharp(raw).resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  return { buffer, mimeType: "image/png" };
}

// Stamp/signature images, shrunk once per file and kept: they print about
// 3cm wide, and embedding a multi-megabyte photo made every PDF slow and heavy.
const printAssetCache = new Map<string, string>();

async function fileDataUrl(fileId: string | null | undefined, modules: readonly string[] = ["company-stamp", "company-signature"]) {
  if (!fileId) return null;
  const cacheKey = `${modules.join(",")}:${fileId}`;
  const cached = printAssetCache.get(cacheKey);
  if (cached) return cached;
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || !modules.includes(file.module ?? "") || !["image/png", "image/jpeg"].includes(file.mimeType)) return null;
  try {
    const raw = await storage.read(file.storedName);
    let url = `data:${file.mimeType};base64,${raw.toString("base64")}`;
    if (file.mimeType.startsWith("image/") && file.mimeType !== "image/svg+xml") {
      const png = await sharp(raw).resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true }).png().toBuffer();
      url = `data:image/png;base64,${png.toString("base64")}`;
    }
    if (printAssetCache.size >= 128) printAssetCache.clear();
    printAssetCache.set(cacheKey, url);
    return url;
  } catch (err) {
    logger.warn({ err, fileId }, "Could not read a print asset");
    return null;
  }
}

// The logo's brand colour, worked out once per logo file.
const brandColorCache = new Map<string, string | null>();

/**
 * The logo's most characteristic colour: of its clearly coloured pixels
 * (white, black and greys left out), the hue that covers the most, weighted
 * by how vivid it is — averaged into one colour. Null for a logo with no real
 * colour, so designs keep their own.
 */
export async function logoBrandColor(buffer: Buffer): Promise<string | null> {
  const { data, info } = await sharp(buffer).resize(64, 64, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = Array.from({ length: 24 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  let pixels = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128) continue;
    pixels++;
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (s < 0.28 || l < 0.12 || l > 0.9) continue;
    let h = 0;
    const [rf, gf, bf] = [r / 255, g / 255, b / 255];
    if (max === rf) h = ((gf - bf) / d) % 6;
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h = (h * 60 + 360) % 360;
    const w = s * (1 - Math.abs(l - 0.5));
    const k = buckets[Math.floor(h / 15) % 24];
    k.w += w;
    k.r += r * w;
    k.g += g * w;
    k.b += b * w;
  }
  const best = buckets.reduce((x, y) => (y.w > x.w ? y : x));
  // Too little colour to call it the brand's (a stray pixel on a black logo).
  if (!pixels || best.w < pixels * 0.02) return null;
  const hex = (v: number) => Math.round(v / best.w).toString(16).padStart(2, "0");
  return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`;
}

async function brandColorOf(fileId: string | null | undefined, buffer: Buffer | undefined) {
  if (!fileId || !buffer) return null;
  if (brandColorCache.has(fileId)) return brandColorCache.get(fileId)!;
  const color = await logoBrandColor(buffer).catch((err) => {
    logger.warn({ err }, "Could not read the logo's colour");
    return null;
  });
  if (brandColorCache.size >= 32) brandColorCache.clear();
  brandColorCache.set(fileId, color);
  return color;
}

/** Company identity + logo (as a data: URL) for embedding into PDF/print
 * templates (§28/§33/§54) — logo/stamp/signature always come from whatever
 * the admin uploaded in Settings → Company, never hard-coded. */
export async function getBrandingContext(kind?: SignatureDocument) {
  const company = await prisma.companySettings.findUnique({ where: { id: 1 } });
  const logo = await readPrintLogo(company);
  const logoDataUrl = logo ? `data:${logo.mimeType};base64,${logo.buffer.toString("base64")}` : null;
  const [printTheme, signatures, stampDataUrl, brandColor] = await Promise.all([
    getPrintThemeSetting(),
    getPrintSignatures(),
    fileDataUrl(company?.stampFileId),
    brandColorOf(company?.printLogoFileId || company?.logoFileId, logo?.buffer),
  ]);
  // Name images of every signature box, by file id.
  const documents = kind ? [signatures[kind]] : [signatures.report, signatures.voucher, signatures.profile];
  const nameIds = [...new Set(documents.flatMap((d) => d.boxes.map((b) => b.nameFileId)).filter(Boolean))] as string[];
  const nameImages: Record<string, string> = {};
  await Promise.all(
    nameIds.map(async (id) => {
      const url = await fileDataUrl(id, PRINT_NAME_IMAGE_MODULES);
      if (url) nameImages[id] = url;
    })
  );
  return { company, logoDataUrl, printTheme, signatures, stampDataUrl, nameImages, brandColor };
}

export async function getSpreadsheetBranding() {
  const company = await prisma.companySettings.findUnique({ where: { id: 1 } });
  return { company, logo: await getPrintLogoPng() };
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
