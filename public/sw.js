/*
============================================================
UGO SERVICE WORKER
============================================================
*/

/*
 * Keep your existing CACHE_NAME,
 * APP_FILES, install and activate code here.
 */


/*
============================================================
PUSH
============================================================
*/

self.addEventListener(
  "push",
  (event) => {
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

    const title =
      data.title ||
      "UGO";

    const message =
      data.message ||
      data.body ||
      "You have a new notification.";

    const actionType =
      data.action_type ||
      "NONE";

    const actionData =
      data.action_data ||
      data.data ||
      {};

    const notificationId =
      data.notification_id ||
      null;

    const isIncomingCall =
      actionType ===
      "INCOMING_CALL";

    /*
    ----------------------------------------------------------
    NOTIFICATION DATA
    ----------------------------------------------------------
    */

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

    /*
    ----------------------------------------------------------
    NORMAL NOTIFICATION OPTIONS
    ----------------------------------------------------------
    */

    const options = {
      body: message,

      icon:
        "/icons/icon-192.png",

      badge:
        "/icons/icon-192.png",

      data:
        notificationData,

      /*
       * Normal notifications behave normally.
       *
       * Calls stay visible until the user interacts.
       */

      requireInteraction:
        isIncomingCall,

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

        actions: [
          {
            action:
              "accept_call",

            title:
              "Answer",
          },

          {
            action:
              "reject_call",

            title:
              "Reject",
          },
        ],
      }),
    };

    /*
    ----------------------------------------------------------
    SHOW NOTIFICATION
    ----------------------------------------------------------
    */

    event.waitUntil(
      self.registration.showNotification(
        title,
        options
      )
    );
  }
);


/*
============================================================
NOTIFICATION CLICK
============================================================
*/

self.addEventListener(
  "notificationclick",
  (event) => {
    console.log(
      "UGO Service Worker: NOTIFICATION CLICKED"
    );

    event.notification.close();

    const notificationData =
      event.notification.data ||
      {};

    const actionType =
      notificationData.action_type ||
      "NONE";

    const actionData =
      notificationData.action_data ||
      {};

    /*
    ==========================================================
    INCOMING CALL
    ==========================================================
    */

    if (
      actionType ===
      "INCOMING_CALL"
    ) {
      const callId =
        actionData.call_id ||
        "";

      const bookingId =
        actionData.booking_id ||
        "";

      /*
      --------------------------------------------------------
      DETERMINE ACTION
      --------------------------------------------------------
      */

      let callAction =
        "";

      if (
        event.action ===
        "accept_call"
      ) {
        callAction =
          "answer";
      }

      if (
        event.action ===
        "reject_call"
      ) {
        callAction =
          "reject";
      }

      /*
      --------------------------------------------------------
      BUILD URL
      --------------------------------------------------------
      */

      const params =
        new URLSearchParams();

      if (callId) {
        params.set(
          "incoming_call",
          callId
        );
      }

      if (bookingId) {
        params.set(
          "booking_id",
          bookingId
        );
      }

      if (callAction) {
        params.set(
          "call_action",
          callAction
        );
      }

      const callUrl =
        params.toString()
          ? `/?${params.toString()}`
          : "/";

      console.log(
        "Opening UgO call:",
        callUrl
      );

      event.waitUntil(
        clients
          .matchAll({
            type:
              "window",

            includeUncontrolled:
              true,
          })
          .then(
            async (
              clientList
            ) => {

              /*
              ================================================
              EXISTING UGO WINDOW
              ================================================
              */

              for (
                const client
                of clientList
              ) {
                try {

                  if (
                    "navigate" in
                    client
                  ) {
                    await client.navigate(
                      callUrl
                    );
                  }

                  if (
                    "focus" in
                    client
                  ) {
                    await client.focus();
                  }

                  /*
                  --------------------------------------------
                  SEND DIRECT MESSAGE
                  --------------------------------------------
                  */

                  client.postMessage({
                    type:
                      "INCOMING_CALL_NOTIFICATION",

                    call_id:
                      callId,

                    booking_id:
                      bookingId,

                    call_action:
                      callAction,

                    action_data:
                      actionData,
                  });

                  return;

                } catch (
                  error
                ) {
                  console.error(
                    "Failed to focus UgO:",
                    error
                  );
                }
              }

              /*
              ================================================
              UGO IS COMPLETELY CLOSED
              ================================================
              */

              if (
                clients.openWindow
              ) {
                return clients.openWindow(
                  callUrl
                );
              }
            }
          )
      );

      return;
    }

    /*
    ==========================================================
    NORMAL NOTIFICATION
    ==========================================================
    */

    event.waitUntil(
      clients
        .matchAll({
          type:
            "window",

          includeUncontrolled:
            true,
        })
        .then(
          (clientList) => {

            for (
              const client
              of clientList
            ) {
              if (
                "focus" in
                client
              ) {
                return client.focus();
              }
            }

            if (
              clients.openWindow
            ) {
              return clients.openWindow(
                "/"
              );
            }
          }
        )
    );
  }
);