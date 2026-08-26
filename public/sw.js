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
  console.log(
    "UGO Service Worker: PUSH RECEIVED"
  );

  let data = {};

  try {
    data = event.data
      ? event.data.json()
      : {};
  } catch (error) {
    console.error(
      "Failed to parse push data:",
      error
    );

    data = {
      title: "UGO",
      message:
        "You have a new notification.",
      action_type: "NONE",
      action_data: {},
    };
  }

  // ----------------------------------------------------------
  // DATA FROM EDGE FUNCTION
  // ----------------------------------------------------------
  //
  // Normal notification:
  //
  // {
  //   title,
  //   message,
  //   action_type,
  //   action_data,
  //   notification_id
  // }
  //
  // Incoming call:
  //
  // {
  //   title: "Incoming UgO Call",
  //   message: "You have an incoming UgO call.",
  //   action_type: "INCOMING_CALL",
  //   action_data: {
  //      call_id,
  //      booking_id,
  //      caller_id,
  //      renter_id,
  //      owner_id
  //   },
  //   notification_id
  // }
  // ----------------------------------------------------------

  const title =
    data.title || "UGO";

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

  // ----------------------------------------------------------
  // DETECT INCOMING CALL
  // ----------------------------------------------------------

  const isIncomingCall =
    actionType === "INCOMING_CALL";

  console.log(
    "UGO notification type:",
    actionType
  );

  // ----------------------------------------------------------
  // COMMON NOTIFICATION DATA
  // ----------------------------------------------------------

  const notificationData = {
    notification_id:
      notificationId,

    action_type:
      actionType,

    action_data:
      actionData,

    is_incoming_call:
      isIncomingCall,
  };

  // ----------------------------------------------------------
  // NOTIFICATION OPTIONS
  // ----------------------------------------------------------

  const options = {
    body: message,

    icon: "/icons/icon-192.png",

    badge: "/icons/icon-192.png",

    data: notificationData,

    /*
     * Normal notifications:
     * behave exactly like your existing notifications.
     *
     * Incoming calls:
     * remain visible until the user interacts with them.
     */

    requireInteraction:
      isIncomingCall,

    /*
     * --------------------------------------------------------
     * SPECIAL CALL OPTIONS
     * --------------------------------------------------------
     */

    ...(isIncomingCall && {
      tag:
        "ugo-incoming-call-" +
        (
          actionData.call_id ||
          notificationId ||
          "unknown"
        ),

      renotify: true,

      vibrate: [
        200,
        100,
        200,
        100,
        200,
      ],
    }),
  };

  // ----------------------------------------------------------
  // SHOW NOTIFICATION
  // ----------------------------------------------------------

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

self.addEventListener(
  "notificationclick",
  (event) => {
    console.log(
      "UGO Service Worker: NOTIFICATION CLICKED"
    );

    event.notification.close();

    const notificationData =
      event.notification.data || {};

    const actionType =
      notificationData.action_type ||
      "NONE";

    const actionData =
      notificationData.action_data ||
      {};

    console.log(
      "UGO notification action:",
      actionType
    );

    console.log(
      "UGO notification action data:",
      actionData
    );

    // ========================================================
    // INCOMING CALL CLICK
    // ========================================================

    if (
      actionType === "INCOMING_CALL"
    ) {
      const callId =
        actionData.call_id ||
        null;

      const bookingId =
        actionData.booking_id ||
        null;

      // ------------------------------------------------------
      // Build the URL that opens the incoming call.
      //
      // Example:
      //
      // /?incoming_call=CALL_ID&booking_id=BOOKING_ID
      // ------------------------------------------------------

      const callUrl =
        new URL(
          "/",
          self.location.origin
        );

      if (callId) {
        callUrl.searchParams.set(
          "incoming_call",
          callId
        );
      }

      if (bookingId) {
        callUrl.searchParams.set(
          "booking_id",
          bookingId
        );
      }

      console.log(
        "Opening UgO for incoming call:",
        callUrl.href
      );

      event.waitUntil(
        clients
          .matchAll({
            type: "window",
            includeUncontrolled: true,
          })
          .then(
            async (clientList) => {

              // ------------------------------------------------
              // UGO IS ALREADY OPEN
              // ------------------------------------------------

              for (
                const client of clientList
              ) {
                if (
                  "focus" in client
                ) {
                  try {
                    /*
                     * Navigate the existing UgO window
                     * to the incoming call URL.
                     */

                    if (
                      "navigate" in client
                    ) {
                      await client.navigate(
                        callUrl.href
                      );
                    }

                    await client.focus();

                    /*
                     * Also send the call information
                     * directly to the React application.
                     *
                     * This provides a second way for the
                     * currently running application to
                     * receive the call.
                     */

                    client.postMessage({
                      type:
                        "INCOMING_CALL_NOTIFICATION",

                      call_id:
                        callId,

                      booking_id:
                        bookingId,

                      action_data:
                        actionData,
                    });

                    return;
                  } catch (error) {
                    console.error(
                      "Failed to focus existing UgO window:",
                      error
                    );
                  }
                }
              }

              // ------------------------------------------------
              // UGO IS COMPLETELY CLOSED
              // ------------------------------------------------

              if (
                clients.openWindow
              ) {
                return clients.openWindow(
                  callUrl.href
                );
              }
            }
          )
      );

      return;
    }

    // ========================================================
    // EXISTING NORMAL NOTIFICATION CLICK BEHAVIOR
    // ========================================================
    //
    // This section intentionally remains the same behavior
    // as your original service worker.
    // ========================================================

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {

          // --------------------------------------------------
          // If UGO is already open, focus it.
          // --------------------------------------------------

          for (
            const client of clientList
          ) {
            if ("focus" in client) {
              return client.focus();
            }
          }

          // --------------------------------------------------
          // Otherwise open UGO.
          // --------------------------------------------------

          if (clients.openWindow) {
            return clients.openWindow("/");
          }
        })
    );
  }
);