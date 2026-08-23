const CACHE_NAME = "ugo-cache-v1";

const APP_FILES = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
];

// ============================================================
// INSTALL SERVICE WORKER
// ============================================================

self.addEventListener("install", (event) => {
  console.log("UGO Service Worker: INSTALL");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_FILES);
    })
  );

  self.skipWaiting();
});

// ============================================================
// ACTIVATE SERVICE WORKER
// ============================================================

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

// ============================================================
// FETCH HANDLER
// ============================================================

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
      message: "You have a new notification.",
      action_type: "NONE",
      action_data: {},
    };
  }

  // ----------------------------------------------------------
  // Data sent by the Edge Function:
  //
  // {
  //   title,
  //   message,
  //   action_type,
  //   action_data,
  //   notification_id
  // }
  // ----------------------------------------------------------

  const title = data.title || "UGO";

  const message =
    data.message ||
    data.body ||
    "You have a new notification.";

  const actionType =
    data.action_type || "NONE";

  const actionData =
    data.action_data ||
    data.data ||
    {};

  const notificationId =
    data.notification_id || null;

  const options = {
    body: message,

    icon: "/icons/icon-192.png",

    badge: "/icons/icon-192.png",

    // Keep all information required when
    // the notification is clicked.
    data: {
      notification_id: notificationId,
      action_type: actionType,
      action_data: actionData,
    },

    // Makes the notification behave like a normal
    // user-visible notification.
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

// ============================================================
// NOTIFICATION CLICK
// ============================================================

self.addEventListener("notificationclick", (event) => {
  console.log("UGO Service Worker: NOTIFICATION CLICKED");

  event.notification.close();

  const notificationData =
    event.notification.data || {};

  const actionType =
    notificationData.action_type || "NONE";

  const actionData =
    notificationData.action_data || {};

  console.log(
    "UGO notification action:",
    actionType
  );

  console.log(
    "UGO notification action data:",
    actionData
  );

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {

      // ------------------------------------------------------
      // If UGO is already open, focus it.
      // ------------------------------------------------------

      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      // ------------------------------------------------------
      // Otherwise open UGO.
      // ------------------------------------------------------

      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});