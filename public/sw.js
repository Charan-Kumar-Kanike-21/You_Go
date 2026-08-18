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

// ============================================================
// PUSH NOTIFICATION
// ============================================================

self.addEventListener("push", (event) => {
  console.log("UGO Service Worker: PUSH RECEIVED");

  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error("Failed to parse push data:", error);

    data = {
      title: "UGO",
      body: "You have a new notification.",
    };
  }

  const title = data.title || "UGO";

  const options = {
    body: data.body || "You have a new notification.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});


// ============================================================
// NOTIFICATION CLICK
// ============================================================

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const actionData = event.notification.data || {};

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {

      // If UGO is already open, focus it
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      // Otherwise open UGO
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});