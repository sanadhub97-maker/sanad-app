declare module "subset-font" {
  /** Cuts a font down to the glyphs needed for `text` (with their shaping closure). */
  export default function subsetFont(
    font: Buffer,
    text: string,
    options?: { targetFormat?: "sfnt" | "truetype" | "woff" | "woff2"; preserveNameIds?: number[]; variationAxes?: Record<string, number | { min: number; max: number; default?: number }> }
  ): Promise<Buffer>;
}
