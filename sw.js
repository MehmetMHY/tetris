const CACHE_NAME = "tetris-v39";
const ASSETS = [
  "./",
  "./index.html",
  "./site.webmanifest",
  "./assets/NmCCQxVBfyM.mp3",
  "./assets/UMViM2tHrOk.mp3",
  "./assets/logo.png",
  "./assets/github.svg",
  "./assets/settings.svg",
  "./assets/apple-touch-icon.png",
  "./assets/favicon-32x32.png",
  "./assets/favicon-16x16.png",
  "./assets/android-chrome-192x192.png",
  "./assets/android-chrome-512x512.png",
  "./assets/favicon.ico",
  "./assets/thumbnail.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
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
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request)),
  );
});
