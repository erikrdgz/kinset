const CACHE = "kinset-shell-v4";
const SHELL = ["./", "./icon.svg", "./kinset-wordmark.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./manifest.webmanifest"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Never touch auth or database traffic; only this app's own files.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // Video seeks use partial responses. Let the browser stream them directly;
  // Cache API entries must contain a complete response, never an HTTP 206 slice.
  if (req.headers.has("range")) return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(async (res) => {
          if (res.status === 200) {
            const copy = res.clone();
            await caches.open(CACHE).then((c) => c.put("./", copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match("./")),
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then(async (res) => {
          if (res.status === 200) {
            const copy = res.clone();
            await caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
      e.waitUntil(net.then(() => {}));
      return hit || net;
    }),
  );
});
