import crypto from "node:crypto";
import { env } from "@/config/env";
import { renderHtmlToPng } from "@/services/pdf";
import { CARD_FONTS_HREF } from "@/services/whatsappCards";

/*
 * The picture under a push notification on Android, Windows and macOS Chrome:
 * the same document card the site shows, drawn as a 1024×512 PNG (2:1 is the
 * shape Android's big picture keeps whole). iPhones and iPads show no images.
 *
 * The card's content travels in its own signed URL, so a sleeping or restarted
 * server can still draw it when a phone asks for it hours later.
 */

export interface PushCard {
  /** Accent colour. */
  k: string;
  ic: "id" | "clock" | "sun" | "check" | "receipt";
  kind: string;
  who: string;
  tag: string;
  no: string;
  date: string;
  ring: [string, string];
  /** How much of the ring is filled, 0–100. */
  pct: number;
  /** How far along its life the document is, 0–100. */
  used: number;
  life: string;
}

const ICONS: Record<PushCard["ic"], string> = {
  id: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="12" r="2.2"/><path d="M14 10h4M14 14h3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="m8 12.3 2.7 2.7L16 9.6"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const clamp = (n: number) => Math.max(0, Math.min(100, Number(n) || 0));
const colour = (k: string) => (/^#[0-9a-f]{3,8}$/i.test(k) ? k : "#2f5fe0");

export function pushCardHtml(c: PushCard, iconUrl: string): string {
  const k = colour(c.k);
  const r = 40;
  const C = 2 * Math.PI * r;
  const used = clamp(c.used);
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${CARD_FONTS_HREF}"><style>
*{box-sizing:border-box;margin:0}
html,body{width:1024px;height:512px;background:#eef1f8}
body{font-family:"IBM Plex Sans Arabic",Tahoma,sans-serif;color:#121a2e;padding:28px;-webkit-font-smoothing:antialiased}
.c{--k:${k};direction:rtl;position:relative;height:100%;border-radius:36px;overflow:hidden;background:#fff;box-shadow:0 0 0 2px #e3e7f0,0 18px 40px -18px rgba(20,30,70,.35);display:grid;grid-template-rows:auto auto 1fr auto}
.c::before{content:"";position:absolute;inset-inline:0;top:0;height:10px;background:var(--k)}
.h{display:flex;align-items:center;gap:20px;padding:34px 38px 20px;background:linear-gradient(180deg,color-mix(in srgb,var(--k) 9%,#fff),#fff)}
.ti{width:72px;height:72px;border-radius:22px;display:grid;place-items:center;color:#fff;background:linear-gradient(160deg,color-mix(in srgb,var(--k) 68%,#fff),var(--k));flex:none}
.ti svg{width:38px;height:38px}
.h b{font-weight:700;font-size:30px;line-height:1.25;display:block}
.h small{font-size:22px;opacity:.62;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:560px}
.st{margin-inline-start:auto;font-size:21px;font-weight:700;padding:7px 20px;border-radius:99px;color:var(--k);background:color-mix(in srgb,var(--k) 12%,#fff);border:2px solid color-mix(in srgb,var(--k) 30%,#fff);transform:rotate(-4deg)}
.perf{border-top:3px dashed #e1e6f1;margin:0 38px}
.m{display:grid;grid-template-columns:150px minmax(0,1fr);gap:34px;align-items:center;padding:18px 38px}
.rg{position:relative;width:150px;height:150px}
.rg svg{width:100%;height:100%;transform:rotate(-90deg)}
.rg div{position:absolute;inset:0;display:grid;place-content:center;text-align:center}
.rg b{font-weight:800;font-size:${c.ring[0].length > 3 ? 30 : 46}px;line-height:1;color:var(--k)}
.rg small{font-size:17px;opacity:.62;margin-top:4px}
.fx{display:grid;grid-template-columns:1fr 1fr;gap:14px 26px}
.fx span{font-size:19px;opacity:.55;display:block}
.fx b{font-size:25px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lf{padding:0 38px 34px}
.tr{position:relative;height:12px;border-radius:8px;background:#edf0f7}
.tr i{position:absolute;inset-block:0;inset-inline-start:0;width:${used}%;border-radius:inherit;background:linear-gradient(90deg,color-mix(in srgb,var(--k) 55%,#fff),var(--k))}
.tr u{position:absolute;top:50%;inset-inline-start:${Math.min(used, 97)}%;width:22px;height:22px;margin-inline-start:-11px;border-radius:50%;background:#fff;border:6px solid var(--k);translate:0 -50%}
.brand{position:absolute;bottom:64px;inset-inline-end:38px;display:flex;align-items:center;gap:8px;font-weight:700;font-size:18px;opacity:.5}
.brand img{width:26px;height:26px;border-radius:7px}
</style></head><body><div class="c">
<div class="h"><span class="ti"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.ic] ?? ICONS.id}</svg></span><div style="min-width:0"><b>${esc(c.kind)}</b><small>${esc(c.who)}</small></div><span class="st">${esc(c.tag)}</span></div>
<div class="perf"></div>
<div class="m"><div class="rg"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" fill="none" stroke="#edf0f7" stroke-width="9"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${k}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${((C * clamp(c.pct)) / 100).toFixed(1)} ${C.toFixed(1)}"/></svg><div><b>${esc(c.ring[0])}</b><small>${esc(c.ring[1])}</small></div></div>
<div class="fx"><div><span>الرقم</span><b>${esc(c.no)}</b></div><div><span>التاريخ</span><b>${esc(c.date)}</b></div><div style="grid-column:1/-1"><span>الحالة</span><b style="color:${k}">${esc(c.life)}</b></div></div></div>
<div class="lf"><div class="tr"><i></i><u></u></div></div>
<span class="brand"><img src="${esc(iconUrl)}" alt="">SanaD</span>
</div></body></html>`;
}

/* ---------- signed links ---------- */

const sign = (data: string) => crypto.createHmac("sha256", env.JWT_ACCESS_SECRET).update("push:" + data).digest("base64url").slice(0, 22);

/** A short token that carries `value` and can't be forged or altered. */
export function sealToken(value: unknown): string {
  const data = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function openToken<T>(token: string): T | null {
  const [data, sig] = String(token).split(".");
  if (!data || !sig) return null;
  const expected = sign(data);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

/* ---------- drawing, with a small cache ---------- */

const cache = new Map<string, { at: number; png: Promise<Buffer> }>();
const KEEP_MS = 3 * 24 * 3600_000;

export function drawCard(token: string, card: PushCard, iconUrl: string): Promise<Buffer> {
  const hit = cache.get(token);
  if (hit && Date.now() - hit.at < KEEP_MS) return hit.png;
  const png = renderHtmlToPng(pushCardHtml(card, iconUrl), 1024, 512);
  png.catch(() => cache.delete(token));
  cache.set(token, { at: Date.now(), png });
  // Keep the cache small: drop the oldest beyond 120 cards.
  if (cache.size > 120) cache.delete(cache.keys().next().value!);
  return png;
}
