// Offline cache so the installed app works without a connection, and starts fast on a weak one.
// The page is fetched fresh when the network answers quickly (so updates show up right away);
// if it takes longer than a couple of seconds, or there is no connection, the saved copy opens
// instead and the fresh one is kept for next time. Icons and other files come from the cache
// and are refreshed in the background.
const CACHE = "purrzle-v5";
const FILES = ["./", "./index.html", "./privacy.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const PAGE_WAIT = 2500;

self.addEventListener("install", e => {
  self.skipWaiting();
  // Cache what exists; one missing file must not block the update. "reload" skips the browser's HTTP cache.
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: "reload" })).catch(() => {})))));
});
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));

function keep(req, res) {
  if (res && res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
  return res;
}
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  // Only this site's own files; anything else (store pages, ads) goes straight to the network.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    const fresh = fetch(req).then(res => keep(req, res));
    e.waitUntil(fresh.catch(() => {}));
    const saved = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./index.html"));
    e.respondWith(new Promise(resolve => {
      let done = false;
      const finish = r => { if (!done && r) { done = true; resolve(r); } };
      // Slow network: open the saved copy rather than keep the player waiting.
      const timer = setTimeout(() => saved().then(finish), PAGE_WAIT);
      // A server error page is no better than being offline: prefer the saved copy then too.
      fresh.then(res => { clearTimeout(timer); if (res.ok) finish(res); else saved().then(r => finish(r || res)); }, () => {
        clearTimeout(timer);
        saved().then(r => { if (r) finish(r); else if (!done) { done = true; resolve(Response.error()); } });
      });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const fresh = fetch(req).then(res => keep(req, res));
    if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
    return fresh;
  }));
});
