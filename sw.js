const CACHE_NAME = "tetris-v53";
const ASSETS = [
  "./",
  "./index.html",
  "./site.webmanifest",
  "./assets/NmCCQxVBfyM.mp3",
  "./assets/UMViM2tHrOk.mp3",
  "./assets/logo.png",
  "./assets/github.svg",
  "./assets/settings.svg",
  "./assets/report.svg",
  "./assets/apple-touch-icon.png",
  "./assets/favicon-32x32.png",
  "./assets/favicon-16x16.png",
  "./assets/android-chrome-192x192.png",
  "./assets/android-chrome-512x512.png",
  "./assets/favicon.ico",
  "./assets/thumbnail.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        ASSETS.map((asset) =>
          fetch(asset, { cache: "reload" }).then((response) => {
            if (!response.ok) throw new Error(`failed to cache ${asset}`);
            return cache.put(asset, response);
          }),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request, { cache: "reload" })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(e.request)
            .then((cached) => cached || caches.match("./")),
        ),
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request)),
  );
});
