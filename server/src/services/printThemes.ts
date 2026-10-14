import { malaki, zumurrudi, aqiq } from "@/services/printThemeMalaki";

// Print designs for every server-rendered PDF (reports, payment voucher,
// employee profile): the three house designs of services/printThemeMalaki,
// picked in Settings → Print.
//
// Layout model: the PDF has no left/right page margin, so a design draws
// full-bleed side rules; the body's own side padding keeps the content in.
// Per-page decoration comes from Puppeteer's header/footer templates (the
// running letterhead and the footer) and the page background (the frame's
// sides), which together repeat on every page.

export const PRINT_THEME_IDS = ["malaki", "zumurrudi", "aqiq"] as const;
export type PrintThemeId = (typeof PRINT_THEME_IDS)[number];
export const DEFAULT_PRINT_THEME: PrintThemeId = "malaki";

export function isPrintThemeId(v: unknown): v is PrintThemeId {
  return typeof v === "string" && (PRINT_THEME_IDS as readonly string[]).includes(v);
}

export interface ShellContext {
  title: string;
  titleEn?: string;
  companyNameAr: string;
  companyNameEn: string;
  logoDataUrl?: string | null;
  referenceNumber?: string;
  classification: string;
  dateStr: string;
  timeStr: string;
  /** A headline figure some designs show large, e.g. a report's row count. */
  highlight?: { value: string; label: string };
}

export interface PrintTheme {
  id: PrintThemeId;
  margin: { top: string; bottom: string };
  /** CSS appended after the shared base styles. */
  css: string;
  /** The first page's letterhead (replaces the classic header and title banner). */
  letterhead: (ctx: ShellContext) => string;
  /** position:fixed decoration, repeated on every page between the margins. */
  decor: string;
  headerTemplate: string;
  /** A letterhead repeated at the top of every page (a Puppeteer header built from the document), with its height; replaces headerTemplate and margin.top. */
  runningHeader?: (ctx: ShellContext) => { html: string; height: string };
  /** CSS custom properties (a ":root{...}" rule) from the company's brand colour; also given to the page header and footer. */
  palette?: (brandColor?: string | null) => string;
  /** Report status tally as a dashboard (ring, bars, share valid) instead of four number tiles. */
  dashboard?: boolean;
  footerTemplate: (label: string) => string;
}

const THEMES: Record<PrintThemeId, PrintTheme> = { malaki, zumurrudi, aqiq };

/** The design by id; a removed one (or none) prints in the default. */
export function getPrintTheme(id: string | null | undefined): PrintTheme {
  return isPrintThemeId(id) ? THEMES[id] : THEMES[DEFAULT_PRINT_THEME];
}

/** Per-document decoration (fixed elements on every page, e.g. the watermark). */
export function themeDecor(theme: PrintTheme, _ctx: ShellContext): string {
  return theme.decor;
}

export const PRINT_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;900&family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Reem+Kufi:wght@500;600;700&family=Cormorant+Garamond:wght@600;700&family=Alexandria:wght@500;600;700&family=Zain:wght@200;300;400;700;800;900&display=swap";
