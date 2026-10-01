/* SanaD service worker: makes the site installable and opens fast.
   - Built files (/assets, hashed names) come from the cache once fetched.
   - Pages always ask the network first, so a new deploy shows at once;
     the last page seen is kept for when the connection drops.
   - The API is never cached. */
const CACHE = "sanad-v3";
const SHELL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([SHELL, "/pwa/icon-192.png", "/brand/sanad-logo.webp"]))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(SHELL).then((r) => r || Response.error()))
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/pwa/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
            }
            return res;
          })
      )
    );
  }
});

/* ---------- push notifications (server: services/push.ts) ----------
   Arrive even with SanaD closed. The same handlers live in the
   sanad-hr.sept.cloud page's worker, which opens paths through its frame. */

const pathUrl = (path) => new URL(path || "/", self.location.origin).href;

async function refreshBadge() {
  try {
    const open = await self.registration.getNotifications();
    if (open.length) await self.navigator.setAppBadge?.(open.length);
    else await self.navigator.clearAppBadge?.();
  } catch (e) {}
}

self.addEventListener("push", (event) => {
  let m = {};
  try {
    m = event.data ? event.data.json() : {};
  } catch (e) {
    m = { title: "SanaD", body: event.data ? event.data.text() : "" };
  }
  const actions = (m.actions || []).map((a) => ({ action: a.action, title: a.title }));
  event.waitUntil(
    self.registration
      .showNotification(m.title || "SanaD", {
        body: m.body || "",
        icon: m.icon || "/pwa/icon-192.png",
        badge: m.badge || "/pwa/badge-96.png",
        image: m.image,
        tag: m.tag,
        renotify: !!m.tag,
        requireInteraction: !!m.urgent,
        timestamp: m.ts || Date.now(),
        dir: "rtl",
        lang: "ar",
        vibrate: m.urgent ? [80, 40, 80] : [50],
        actions,
        data: m,
      })
      .then(refreshBadge)
  );
});

self.addEventListener("notificationclose", (event) => event.waitUntil(refreshBadge()));

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const m = n.data || {};
  const act = (m.actions || []).find((a) => a.action === event.action);
  n.close();
  event.waitUntil(
    (async () => {
      // A button that does its job in place ("تم", "تأجيل ساعة").
      if (act && act.call) {
        await fetch((m.origin || self.location.origin) + act.call, { method: "POST", mode: "no-cors" }).catch(() => undefined);
        return refreshBadge();
      }
      const path = (act && act.url) || m.url || "/dashboard";
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (win) {
        await win.focus().catch(() => undefined);
        win.postMessage({ type: "sanad:go", path });
      } else {
        await self.clients.openWindow(pathUrl(path));
      }
      return refreshBadge();
    })()
  );
});
