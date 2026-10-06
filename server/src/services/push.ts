import { assertPushEndpoint } from "@/lib/security";
import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { readSetting, writeSetting } from "@/services/settingsStore";
import { drawCard, sealToken, type PushCard } from "@/services/pushCard";

/*
 * Push notifications: alerts that reach a phone, tablet, iPad or computer
 * even with SanaD closed. Each device subscribes once (Web Push, VAPID); the
 * server then sends to every device of a user.
 *
 * iPhones and iPads only receive them in SanaD added to the Home Screen
 * (iOS 16.4+), and show neither the picture nor the buttons.
 */

export type PushKind = "exp" | "soon" | "brief" | "task" | "pay" | "test";

/** Computers, and phones/tablets/iPads: each has its own settings. */
export type DeviceGroup = "desktop" | "mobile";

export interface GroupPrefs {
  kinds: Record<Exclude<PushKind, "test">, boolean>;
  quiet: { on: boolean; from: string; to: string };
}
export type PushPrefs = Record<DeviceGroup, GroupPrefs>;

const DEFAULT_GROUP_PREFS: GroupPrefs = {
  kinds: { exp: true, soon: true, brief: true, task: true, pay: true },
  quiet: { on: true, from: "23:00", to: "07:00" },
};

/** A device's group from its browser's description, for devices that didn't say. */
export function groupOfAgent(userAgent?: string | null): DeviceGroup {
  return /iPhone|iPad|iPod|Android|Mobile|Tablet/i.test(userAgent || "") ? "mobile" : "desktop";
}

export interface PushMessage {
  kind: PushKind;
  title: string;
  body: string;
  /** Where a tap on the notification goes, as a path in the app. */
  url: string;
  /** A new notification with the same tag replaces the old one. */
  tag: string;
  card?: PushCard;
  /** Buttons under the notification (two at most are shown). */
  actions?: { action: string; title: string; url?: string; call?: string }[];
  /** Urgent ones keep ringing through quiet hours and stay on screen. */
  urgent?: boolean;
}

/** The address the app is served at — for the icon, the picture and the buttons. */
export const appOrigin = () => env.CLIENT_URL.replace(/\/+$/, "");

/* ---------- keys and preferences ---------- */

let keys: Promise<{ publicKey: string; privateKey: string }> | null = null;

/** The server's VAPID keys: made once, kept in Settings. */
export function vapidKeys() {
  keys ??= (async () => {
    const stored = await readSetting<{ publicKey: string; privateKey: string } | null>("push.vapid", null);
    if (stored?.publicKey && stored.privateKey) return stored;
    const { default: webpush } = await import("web-push");
    const made = webpush.generateVAPIDKeys();
    await writeSetting("push.vapid", made);
    return made;
  })().catch((err) => {
    keys = null;
    throw err;
  });
  return keys;
}

export async function getPushPrefs(userId: string): Promise<PushPrefs> {
  const p = await readSetting<(Partial<PushPrefs> & Partial<GroupPrefs>) | null>(`push.prefs.${userId}`, null);
  const groupOf = (g?: Partial<GroupPrefs>): GroupPrefs => ({
    kinds: { ...DEFAULT_GROUP_PREFS.kinds, ...(g?.kinds ?? {}) },
    quiet: { ...DEFAULT_GROUP_PREFS.quiet, ...(g?.quiet ?? {}) },
  });
  // Saved before devices were split in two: one set of settings for both.
  const shared = p?.kinds || p?.quiet ? { kinds: p.kinds, quiet: p.quiet } : undefined;
  return { desktop: groupOf(p?.desktop ?? shared), mobile: groupOf(p?.mobile ?? shared) };
}

export function setPushPrefs(userId: string, prefs: PushPrefs) {
  return writeSetting(`push.prefs.${userId}`, prefs);
}

/* ---------- Saudi time (UTC+3 all year) ---------- */

export function riyadhNow(at = new Date()) {
  const d = new Date(at.getTime() + 3 * 3600_000);
  const hm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return { date: d.toISOString().slice(0, 10), hm, weekday: d.getUTCDay() };
}

function inQuietHours(q: GroupPrefs["quiet"], hm: string) {
  if (!q.on || q.from === q.to) return false;
  return q.from < q.to ? hm >= q.from && hm < q.to : hm >= q.from || hm < q.to;
}

/* ---------- devices ---------- */

export interface SubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function subscribe(userId: string, sub: SubscriptionInput, via: "app" | "sept", userAgent?: string, device?: DeviceGroup) {
  assertPushEndpoint(sub.endpoint);
  // A device belongs to whoever signed in on it last. An iPad's browser calls
  // itself a Mac, so the page says which kind of device it is.
  const data = { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, via, userAgent: userAgent?.slice(0, 300), device: device ?? groupOfAgent(userAgent) };
  return prisma.pushSubscription.upsert({ where: { endpoint: sub.endpoint }, update: data, create: { ...data, endpoint: sub.endpoint } });
}

export function unsubscribe(userId: string, endpoint: string) {
  return prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export function devicesOf(userId: string) {
  return prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, via: true, device: true, userAgent: true, createdAt: true, lastSentAt: true },
    orderBy: { createdAt: "desc" },
  });
}

/* ---------- sending ---------- */

/** The JSON the service workers read (client/public/sw.js and the sept.cloud page's). */
export function payloadOf(m: PushMessage) {
  const origin = appOrigin();
  let image: string | undefined;
  if (m.card) {
    const token = sealToken(m.card);
    image = `${origin}/api/push/card/${token}.png`;
    // Draw it now, so it's ready the moment the device asks.
    drawCard(token, m.card, `${origin}/pwa/icon-192.png`).catch((err) => logger.warn({ err }, "Push card draw failed"));
  }
  return {
    kind: m.kind,
    title: m.title,
    body: m.body,
    url: m.url,
    tag: m.tag,
    image,
    icon: `${origin}/pwa/icon-192.png`,
    badge: `${origin}/pwa/badge-96.png`,
    origin,
    urgent: !!m.urgent,
    actions: (m.actions ?? []).slice(0, 2),
    ts: Date.now(),
  };
}

/**
 * Sends to every device of a user. Computers and phones/tablets each follow
 * their own settings: a kind turned off there, or its quiet time, skips that
 * group only. Devices the push service no longer knows are dropped.
 */
export async function sendToUser(
  userId: string,
  m: PushMessage,
  opts: { force?: boolean; group?: DeviceGroup } = {}
): Promise<{ sent: number; skipped?: string; failures?: string[] }> {
  const all = await prisma.pushSubscription.findMany({ where: { userId, ...(opts.group ? { device: opts.group } : {}) } });
  if (all.length === 0) return { sent: 0, skipped: "no-devices" };
  let subs = all;
  if (!opts.force && m.kind !== "test") {
    const prefs = await getPushPrefs(userId);
    const hm = riyadhNow().hm;
    const kind = m.kind;
    const open = (g: DeviceGroup) => prefs[g].kinds[kind] && (m.urgent || !inQuietHours(prefs[g].quiet, hm));
    subs = all.filter((s) => open(s.device === "mobile" ? "mobile" : "desktop"));
    if (subs.length === 0) return { sent: 0, skipped: "off-or-quiet" };
  }

  const { publicKey, privateKey } = await vapidKeys();
  // Loaded on first send, not at startup: the host's memory is small.
  const { default: webpush } = await import("web-push");
  const body = JSON.stringify(payloadOf(m));
  let sent = 0;
  const failures: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      const send = () => {
        assertPushEndpoint(s.endpoint);
        return webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          vapidDetails: { subject: "https://sanad-hr.sept.cloud", publicKey, privateKey },
          timeout: 10000,
          TTL: m.urgent ? 3 * 24 * 3600 : 24 * 3600,
          urgency: m.urgent ? "high" : "normal",
          topic: m.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined,
        });
      };
      try {
        // A push service sometimes refuses for a moment (a brand-new device,
        // a busy server): try once more before giving up on it.
        await send().catch(async (err) => {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) throw err;
          await new Promise((r) => setTimeout(r, 2500));
          return send();
        });
        sent++;
        await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastSentAt: new Date() } }).catch(() => undefined);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        failures.push(`${status ?? ""} ${(err as { body?: string }).body ?? (err as Error).message}`.trim().slice(0, 200));
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
        } else {
          logger.warn({ status, body: (err as { body?: string }).body, endpoint: s.endpoint.slice(0, 60) }, "Push send failed");
        }
      }
    })
  );
  return { sent, failures };
}

/** Users who have at least one device subscribed, of those given. */
export async function withDevices(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } }, select: { userId: true }, distinct: ["userId"] });
  return new Set(rows.map((r) => r.userId));
}
