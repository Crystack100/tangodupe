// The phone app loads its files straight from the device, so it needs no offline cache.
// Earlier builds registered a caching worker that could keep serving an old version of the game
// after an update; this one replaces it, clears the cache, removes itself and reloads the game.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(
  self.clients.claim()
    .then(() => caches.keys()).then(ks => Promise.all(ks.map(k => caches.delete(k))))
    .then(() => self.registration.unregister())
    .then(() => self.clients.matchAll({ type: "window" }))
    .then(cs => cs.forEach(c => c.navigate(c.url)))));
