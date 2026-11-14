// Sun Prairie ALPR: offline support. Pages load fresh when online, from cache when not.
const CACHE = 'spalpr-v22';
const CORE = ['./', 'index.html', 'report.html', 'slides.html', 'resources.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'og-image.png', 'apple-touch-icon.png', 'post-image.png', 'sp-alpr-logo.png', 'logo-mark.png', '404.html', 'calendar.ics', 'feed.xml', 'search-index.json', 'changelog.json', 'site-facts.json', 'features.css', 'features-views.js', 'layouts.js', 'layouts.css', 'v3-core.js', 'v3-write.js', 'v3-meet.js', 'v3-docs.js', 'v3-make.js', 'data/cameras.json', 'data/poll.json', 'features.js', 'data/emails.json', 'data/tracker.json', 'data/f18.json', 'data/sections.json', 'data/answers.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  // network first so updates show right away; cache is the offline fallback. PDFs are cached after first view.
  e.respondWith(fetch(r).then(res => { if (res.ok && res.status === 200) { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); } return res; })
    .catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : undefined))));
});
