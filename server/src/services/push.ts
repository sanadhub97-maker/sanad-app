import webpush from "web-push";
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

export interface PushPrefs {
  kinds: Record<Exclude<PushKind, "test">, boolean>;
  quiet: { on: boolean; from: string; to: string };
}

export const DEFAULT_PUSH_PREFS: PushPrefs = {
  kinds: { exp: true, soon: true, brief: true, task: true, pay: true },
  quiet: { on: true, from: "23:00", to: "07:00" },
};

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
  const p = await readSetting<Partial<PushPrefs> | null>(`push.prefs.${userId}`, null);
  return {
    kinds: { ...DEFAULT_PUSH_PREFS.kinds, ...(p?.kinds ?? {}) },
    quiet: { ...DEFAULT_PUSH_PREFS.quiet, ...(p?.quiet ?? {}) },
  };
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

function inQuietHours(q: PushPrefs["quiet"], hm: string) {
  if (!q.on || q.from === q.to) return false;
  return q.from < q.to ? hm >= q.from && hm < q.to : hm >= q.from || hm < q.to;
}

/* ---------- devices ---------- */

export interface SubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function subscribe(userId: string, sub: SubscriptionInput, via: "app" | "sept", userAgent?: string) {
  // A device belongs to whoever signed in on it last.
  return prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, via, userAgent: userAgent?.slice(0, 300) },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, via, userAgent: userAgent?.slice(0, 300) },
  });
}

export function unsubscribe(userId: string, endpoint: string) {
  return prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export function devicesOf(userId: string) {
  return prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, via: true, userAgent: true, createdAt: true, lastSentAt: true },
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
 * Sends to every device of a user, unless they turned this kind off or it's
 * their quiet time. Devices the push service no longer knows are dropped.
 */
export async function sendToUser(userId: string, m: PushMessage, opts: { force?: boolean } = {}): Promise<{ sent: number; skipped?: string; failures?: string[] }> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return { sent: 0, skipped: "no-devices" };
  if (!opts.force && m.kind !== "test") {
    const prefs = await getPushPrefs(userId);
    if (!prefs.kinds[m.kind]) return { sent: 0, skipped: "kind-off" };
    if (!m.urgent && inQuietHours(prefs.quiet, riyadhNow().hm)) return { sent: 0, skipped: "quiet" };
  }

  const { publicKey, privateKey } = await vapidKeys();
  const body = JSON.stringify(payloadOf(m));
  let sent = 0;
  const failures: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          vapidDetails: { subject: "https://sanad-hr.sept.cloud", publicKey, privateKey },
          TTL: m.urgent ? 3 * 24 * 3600 : 24 * 3600,
          urgency: m.urgent ? "high" : "normal",
          topic: m.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined,
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
