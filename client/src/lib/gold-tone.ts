import { GOLD_TOKENS } from "@/lib/gold-tokens";

/* The system's metal: every gold tone in the stylesheets is a variable (see
   gold-tokens), and a tone moves them all together — the hue, how rich the
   colour is, and how light — so the design keeps its contrast in any metal. */
export type GoldTone = "royal" | "champagne" | "rose" | "bronze" | "platinum" | "emerald";

export const GOLD_TONES: { id: GoldTone; ar: string; en: string; hue: number; sat: number; light: number }[] = [
  { id: "royal", ar: "ذهبي ملكي", en: "Royal gold", hue: 0, sat: 1, light: 0 },
  { id: "champagne", ar: "شامبانيا", en: "Champagne", hue: 6, sat: 0.38, light: 8 },
  { id: "rose", ar: "ذهب وردي", en: "Rose gold", hue: -22, sat: 0.95, light: 1 },
  { id: "bronze", ar: "برونزي", en: "Bronze", hue: -8, sat: 1.05, light: -7 },
  { id: "platinum", ar: "بلاتيني", en: "Platinum", hue: 170, sat: 0.12, light: 3 },
  { id: "emerald", ar: "زمردي", en: "Emerald", hue: 105, sat: 0.7, light: -2 },
];

function toHsl(hex: string) {
  const r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l] as const;
}
function toRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
}

/** Sets (or, for the royal gold, clears) every gold variable on the page. */
export function applyGoldTone(id: GoldTone | undefined | null) {
  setShownTone(id);
  const root = document.documentElement.style;
  const tone = GOLD_TONES.find((t) => t.id === id);
  for (const k of GOLD_TOKENS) {
    if (!tone || tone.id === "royal") {
      root.removeProperty(`--g-${k}`);
      continue;
    }
    const [h, s, l] = toHsl(k);
    const [r, g, b] = toRgb((h + tone.hue + 360) % 360, Math.min(1, s * tone.sat), Math.max(0, Math.min(1, l + tone.light / 100)));
    root.setProperty(`--g-${k}`, `${r} ${g} ${b}`);
  }
}

/** A swatch of a tone, for the picker: its own foil. */
export function toneSwatch(id: GoldTone) {
  const tone = GOLD_TONES.find((t) => t.id === id)!;
  const stops = ["7d5d27", "f3dfae", "c9a464", "fff3d6", "a5803f", "e8cc8e"].map((k) => {
    const [h, s, l] = toHsl(k);
    const [r, g, b] = toRgb((h + tone.hue + 360) % 360, Math.min(1, s * tone.sat), Math.max(0, Math.min(1, l + tone.light / 100)));
    return `rgb(${r} ${g} ${b})`;
  });
  return `linear-gradient(115deg, ${stops.join(", ")})`;
}

/* The tone on show now (saved or being tried), for the parts drawn in script: the shell's accent and charts. */
let shown: GoldTone = "royal";
const listeners = new Set<() => void>();
export function setShownTone(id: GoldTone | undefined | null) {
  const next = (id ?? "royal") as GoldTone;
  if (next === shown) return;
  shown = next;
  listeners.forEach((l) => l());
}
export const shownTone = {
  subscribe: (l: () => void) => (listeners.add(l), () => void listeners.delete(l)),
  get: () => shown,
};

/** One gold colour in a tone, as a hex. */
export function tonedHex(hex: string, id: GoldTone) {
  const tone = GOLD_TONES.find((t) => t.id === id);
  const k = hex.replace("#", "").toLowerCase();
  if (!tone || tone.id === "royal") return `#${k}`;
  const [h, s, l] = toHsl(k);
  const [r, g, b] = toRgb((h + tone.hue + 360) % 360, Math.min(1, s * tone.sat), Math.max(0, Math.min(1, l + tone.light / 100)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
