/*
 * Print colours taken from the company logo. getBrandingContext() reads the
 * logo's brand colour; a design that uses these variables gets a palette
 * built from it (or its own default when the logo has no real colour).
 * The variables are defined on the page and in its header and footer.
 */

/** The defaults: deep green, teal and lime. */
const DEFAULT_PALETTE: Record<string, string> = {
  deep: "#00473f", mid: "#00a389", accent: "#c4d600", ink: "#10302b", mute: "#5f7672", line: "#e4ece9",
  soft: "#eef6f3", soft2: "#cfeae2", "on-sub": "#cfe6e0", "on-border": "#4f8a80", faint: "#9db1ad", line2: "#cfdcd8",
};

function hexToHsl(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}
const hsl = (h: number, s: number, l: number) => `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(1)}%)`;

/**
 * A ":root{...}" rule of --sg-* variables from the brand colour: a deep shade
 * (dark enough for white type), a mid one and a bright accent, pale tints for
 * table heads and backgrounds.
 */
export function brandPalette(brand?: string | null): string {
  let p = DEFAULT_PALETTE;
  if (brand && /^#[0-9a-f]{6}$/i.test(brand)) {
    const { h, s, l } = hexToHsl(brand);
    const sat = Math.min(Math.max(s, 0.5), 0.9);
    p = {
      deep: hsl(h, sat * 0.95, 0.19), mid: hsl(h, sat * 0.85, 0.38),
      accent: l > 0.42 && l < 0.68 ? brand : hsl(h, sat, 0.56),
      ink: hsl(h, 0.45, 0.13), mute: hsl(h, 0.12, 0.42), line: hsl(h, 0.22, 0.91),
      soft: hsl(h, 0.45, 0.955), soft2: hsl(h, 0.42, 0.85), "on-sub": hsl(h, 0.32, 0.85), "on-border": hsl(h, 0.3, 0.45),
      faint: hsl(h, 0.14, 0.66), line2: hsl(h, 0.18, 0.84),
    };
  }
  return `:root{${Object.entries(p).map(([k, v]) => `--sg-${k}:${v};`).join("")}}`;
}
