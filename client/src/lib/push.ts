import { api } from "@/lib/api";

/* Push notifications on this device (server: services/push.ts).

   Opened directly, SanaD's own service worker (public/sw.js) holds the
   subscription. Opened inside sanad-hr.sept.cloud, a frame can't ask for
   notification permission, so the outer page subscribes with its own worker
   and hands the subscription over by postMessage. */

export type PushKindKey = "exp" | "soon" | "brief" | "task" | "pay";
export interface PushPrefs {
  kinds: Record<PushKindKey, boolean>;
  quiet: { on: boolean; from: string; to: string };
}
export interface PushDevice {
  id: string;
  via: "app" | "sept";
  userAgent: string | null;
  createdAt: string;
  lastSentAt: string | null;
  endpointTail: string;
}

export type PushSupport =
  | "ok"
  /** iPhone/iPad in Safari: works only once SanaD is on the Home Screen. */
  | "ios-install"
  | "unsupported";

export interface PushState {
  support: PushSupport;
  permission: NotificationPermission | "unknown";
  /** This device's subscription endpoint, when it has one. */
  endpoint: string | null;
}

const PARENTS = ["https://sanad-hr.sept.cloud", "https://sept.cloud"];
const framed = typeof window !== "undefined" && window.top !== window.self;

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const standaloneHere = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/* ---------- the outer page (sept.cloud) ---------- */

let parentOrigin: string | null = null;
const waiting = new Map<string, (data: Record<string, unknown>) => void>();

if (framed) {
  window.addEventListener("message", (e) => {
    if (!PARENTS.includes(e.origin) || !e.data || typeof e.data.type !== "string") return;
    parentOrigin = e.origin;
    const { type } = e.data as { type: string };
    if (type === "sanad:go" && typeof e.data.path === "string") goTo(e.data.path);
    const done = waiting.get(type);
    if (done) {
      waiting.delete(type);
      done(e.data);
    }
  });
}

function askParent(type: string, reply: string, data: Record<string, unknown> = {}, timeout = 8000): Promise<Record<string, unknown> | null> {
  if (!framed) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      waiting.delete(reply);
      resolve(null);
    }, timeout);
    waiting.set(reply, (d) => {
      window.clearTimeout(timer);
      resolve(d);
    });
    // Delivered only to the origin the parent is really on.
    for (const origin of parentOrigin ? [parentOrigin] : PARENTS) window.parent.postMessage({ type, ...data }, origin);
  });
}

/* ---------- opening a path from a notification ---------- */

function goTo(path: string) {
  if (!path.startsWith("/")) return;
  window.dispatchEvent(new CustomEvent("sanad:go", { detail: path }));
}
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "sanad:go" && typeof e.data.path === "string") goTo(e.data.path);
  });
}
// The sept.cloud page opens the app at #go=/path after a tap on a notification.
if (typeof window !== "undefined") {
  const m = /[#&]go=([^&]+)/.exec(window.location.hash);
  if (m) {
    const path = decodeURIComponent(m[1]);
    history.replaceState(null, "", window.location.pathname + window.location.search);
    window.setTimeout(() => goTo(path), 0);
  }
}

/* ---------- this device ---------- */

function urlB64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const ownSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function ownRegistration() {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register("/sw.js");
}

export async function pushState(): Promise<PushState> {
  if (framed) {
    const r = await askParent("sanad:push-state", "sanad:push-state");
    if (r) {
      return {
        support: r.supported ? "ok" : r.ios ? "ios-install" : "unsupported",
        permission: (r.permission as NotificationPermission) ?? "unknown",
        endpoint: (r.endpoint as string) || null,
      };
    }
  }
  if (!ownSupported()) return { support: isIos() && !standaloneHere() ? "ios-install" : "unsupported", permission: "unknown", endpoint: null };
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return { support: "ok", permission: Notification.permission, endpoint: sub?.endpoint ?? null };
}

/** Asks for permission (call from a tap), subscribes this device and tells the server. */
export async function enablePush(): Promise<PushState> {
  const { data } = await api.get<{ data: { publicKey: string } }>("/push/key");
  const key = data.data.publicKey;

  if (framed) {
    const r = await askParent("sanad:push-subscribe", "sanad:push-sub", { key }, 120_000);
    if (r) {
      if (!r.ok || !r.subscription) throw new Error(String(r.error || "denied"));
      await api.post("/push/subscribe", { subscription: r.subscription, via: "sept" });
      return pushState();
    }
  }

  if (!ownSupported()) throw new Error(isIos() ? "ios-install" : "unsupported");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("denied");
  const reg = await ownRegistration();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  // A subscription made with an older key would be refused by the push service.
  const current = sub?.options.applicationServerKey;
  if (sub && current && btoa(String.fromCharCode(...new Uint8Array(current))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") !== key) {
    await sub.unsubscribe().catch(() => undefined);
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(key) });
  await api.post("/push/subscribe", { subscription: sub.toJSON(), via: "app" });
  return pushState();
}

export async function disablePush(): Promise<PushState> {
  if (framed) {
    const r = await askParent("sanad:push-unsubscribe", "sanad:push-unsub");
    if (r) {
      if (r.endpoint) await api.post("/push/unsubscribe", { endpoint: r.endpoint }).catch(() => undefined);
      return pushState();
    }
  }
  const reg = ownSupported() ? await navigator.serviceWorker.getRegistration() : undefined;
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api.post("/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => undefined);
    await sub.unsubscribe().catch(() => undefined);
  }
  return pushState();
}

/**
 * On sign-in: a device that already has a subscription is tied to whoever is
 * signed in now (the server keeps one owner per device).
 */
export async function syncPush() {
  try {
    if (framed) {
      const r = await askParent("sanad:push-state", "sanad:push-state");
      if (r?.subscription && r.permission === "granted") await api.post("/push/subscribe", { subscription: r.subscription, via: "sept" });
      return;
    }
    if (!ownSupported() || Notification.permission !== "granted") return;
    const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
    if (sub) await api.post("/push/subscribe", { subscription: sub.toJSON(), via: "app" });
  } catch {
    // best effort
  }
}

export const pushApi = {
  status: async () => (await api.get<{ data: { prefs: PushPrefs; devices: PushDevice[] } }>("/push/status")).data.data,
  savePrefs: async (prefs: PushPrefs) => (await api.put<{ data: PushPrefs }>("/push/prefs", prefs)).data.data,
  test: async (kind: PushKindKey) => (await api.post<{ data: { sent: number } }>("/push/test", { kind })).data.data,
  removeDevice: async (id: string) => api.delete(`/push/devices/${id}`),
};
