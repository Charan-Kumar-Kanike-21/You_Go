const CACHE_NAME = "ugo-cache-v1";

const APP_FILES = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
];

// Install Service Worker
self.addEventListener("install", (event) => {
  console.log("UGO Service Worker: INSTALL");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_FILES);
    })
  );

  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener("activate", (event) => {
  console.log("UGO Service Worker: ACTIVATE");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );

  self.clients.claim();
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});