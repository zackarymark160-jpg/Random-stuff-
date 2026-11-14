// Kicks app works without wifi: the app shell and pictures are cached on the device.
// Data comes from /api when online; when offline the app runs from its saved copy.
const CACHE = "kicks-202611141200", MEDIA = "kicks-media-v1";
const SHELL = ["/", "/index.html", "/app.js", "/portal.js", "/app.css", "/manifest.webmanifest", "/logo-light.png", "/logo-dark.png", "/mark-96.png", "/icon-192.png", "/icon-512.png", "/favicon-64.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== MEDIA).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // uploaded pictures never change: cache first
  if (u.origin === location.origin && u.pathname.startsWith("/api/media/")) {
    e.respondWith(caches.open(MEDIA).then((c) => c.match(e.request).then((m) => m || fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }))));
    return;
  }
  if (u.origin !== location.origin || u.pathname.startsWith("/api/")) {
    if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) e.respondWith(caches.open(CACHE).then((c) => c.match(e.request).then((m) => m || fetch(e.request).then((r) => { c.put(e.request, r.clone()); return r; }))));
    return;
  }
  // app files: network first, fall back to the saved copy
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || caches.match("/index.html"))));
});
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: "Kicks Unlimited", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Kicks Unlimited", { body: d.body || "", icon: "/icon-192.png", badge: "/icon-192.png", data: { url: d.url || "/" }, tag: d.url || undefined, renotify: true }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => { for (const c of list) if (new URL(c.url).origin === self.location.origin && "focus" in c) { c.navigate(url); return c.focus(); } return self.clients.openWindow(url); }));
});
