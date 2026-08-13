import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "./supabase";
import "./NotificationPage.css";


/*
|--------------------------------------------------------------------------
| Notification visual configuration
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| type is used ONLY for:
|   - icon
|   - category
|   - visual style
|
| The actual button/action comes from:
|
|   notification.action_type
|   notification.action_data
|
| Therefore action_data is the source of truth for action information.
|
*/


const NOTIFICATION_CONFIG = {

  /* =========================================================
     RENTAL
     ========================================================= */

  RENTAL_REQUEST_RECEIVED: {
    icon: "🚲",
    category: "Rental",
    style: "action",
  },

  RENTAL_REQUEST_ACCEPTED: {
    icon: "✓",
    category: "Rental",
    style: "success",
  },

  RENTAL_REQUEST_REJECTED: {
    icon: "✕",
    category: "Rental",
    style: "danger",
  },

  RENTAL_REQUEST_CANCELLED: {
    icon: "↩",
    category: "Rental",
    style: "warning",
  },

  RENTAL_REQUEST_EXPIRED: {
    icon: "⌛",
    category: "Rental",
    style: "warning",
  },


  /* =========================================================
     OTP / RENTAL START
     ========================================================= */

  RENTAL_OTP_GENERATED: {
    icon: "🔐",
    category: "Rental",
    style: "otp",
  },

  RENTAL_OTP_EXPIRED_OWNER_ABSENT: {
    icon: "⏰",
    category: "Rental",
    style: "danger",
  },

  RENTAL_STARTED: {
    icon: "🚲",
    category: "Rental",
    style: "success",
  },

  // RENTAL_START_FAILED: {
  //   icon: "⚠",
  //   category: "Rental",
  //   style: "danger",
  // },


  /* =========================================================
     ACTIVE RENTAL
     ========================================================= */

  RENTAL_ENDING_SOON: {
    icon: "⏰",
    category: "Rental",
    style: "warning",
  },

  RENTAL_EXPIRED: {
    icon: "⌛",
    category: "Rental",
    style: "danger",
  },


  /* =========================================================
     EXTENSION
     ========================================================= */

  RENTAL_EXTENSION_REQUESTED: {
    icon: "↗",
    category: "Rental",
    style: "action",
  },

  RENTAL_EXTENSION_ACCEPTED: {
    icon: "✓",
    category: "Rental",
    style: "success",
  },

  RENTAL_EXTENSION_REJECTED: {
    icon: "✕",
    category: "Rental",
    style: "danger",
  },


  /* =========================================================
     RETURN
     ========================================================= */

  RETURN_REQUIRED: {
    icon: "↩",
    category: "Return",
    style: "warning",
  },

  RETURN_COMPLETED: {
    icon: "✓",
    category: "Return",
    style: "success",
  },

  RETURN_PROBLEM_REPORTED: {
    icon: "🚨",
    category: "Return",
    style: "action",
  },

  RETURN_ASSISTANCE_REQUIRED: {
    icon: "🔑",
    category: "Admin",
    style: "urgent",
  },

  RETURN_ISSUE_RESOLVED: {
    icon: "✓",
    category: "Return",
    style: "success",
  },


  /* =========================================================
     CYCLE VERIFICATION
     ========================================================= */

  CYCLE_VERIFICATION_ASSIGNED: {
    icon: "🔎",
    category: "Verification",
    style: "action",
  },

  CYCLE_APPROVED: {
    icon: "✓",
    category: "Verification",
    style: "success",
  },

  CYCLE_REJECTED: {
    icon: "✕",
    category: "Verification",
    style: "danger",
  },

  CYCLE_LISTING_ACTIVATED: {
    icon: "🚲",
    category: "Cycle",
    style: "success",
  },

  CYCLE_LISTING_SUSPENDED: {
    icon: "⚠",
    category: "Cycle",
    style: "warning",
  },

  CYCLE_LISTING_REMOVED: {
    icon: "✕",
    category: "Cycle",
    style: "danger",
  },

  CYCLE_REVERIFICATION_REQUIRED: {
    icon: "🔎",
    category: "Verification",
    style: "action",
  },


  /* =========================================================
     REPORTS
     ========================================================= */

  // USER_REPORTED: {
  //   icon: "🚨",
  //   category: "Report",
  //   style: "action",
  // },

  OWNER_REPORTED: {
    icon: "🚨",
    category: "Report",
    style: "action",
  },

  RENTER_REPORTED: {
    icon: "🚨",
    category: "Report",
    style: "action",
  },

  CYCLE_REPORTED: {
    icon: "🚨",
    category: "Report",
    style: "action",
  },

  REPORT_RESOLVED: {
    icon: "✓",
    category: "Report",
    style: "success",
  },

  REPORT_DISMISSED: {
    icon: "—",
    category: "Report",
    style: "neutral",
  },


  /* =========================================================
     ACCOUNT / MODERATION
     ========================================================= */

  ACCOUNT_BLOCKED: {
    icon: "⛔",
    category: "Account",
    style: "urgent",
  },

  ACCOUNT_UNBLOCKED: {
    icon: "✓",
    category: "Account",
    style: "success",
  },

  ACCOUNT_WARNING: {
    icon: "⚠",
    category: "Account",
    style: "warning",
  },

  ACCOUNT_REVIEW_REQUIRED: {
    icon: "🔎",
    category: "Account",
    style: "action",
  },


  /* =========================================================
     PAYMENT
     ========================================================= */

  PAYMENT_SUCCESS: {
    icon: "₹",
    category: "Payment",
    style: "success",
  },

  PAYMENT_FAILED: {
    icon: "₹",
    category: "Payment",
    style: "danger",
  },

  REFUND_INITIATED: {
    icon: "↩",
    category: "Payment",
    style: "neutral",
  },

  REFUND_COMPLETED: {
    icon: "₹",
    category: "Payment",
    style: "success",
  },

  REFUND_FAILED: {
    icon: "⚠",
    category: "Payment",
    style: "danger",
  },

  // PAYMENT_DISPUTE_OPENED: {
  //   icon: "⚖",
  //   category: "Payment",
  //   style: "action",
  // },

  // PAYMENT_DISPUTE_RESOLVED: {
  //   icon: "✓",
  //   category: "Payment",
  //   style: "success",
  // },


  /* =========================================================
     SECURITY
     ========================================================= */

  NEW_LOGIN_DETECTED: {
    icon: "🔐",
    category: "Security",
    style: "warning",
  },

  SECURITY_ALERT: {
    icon: "🚨",
    category: "Security",
    style: "urgent",
  },

  PASSWORD_CHANGED: {
    icon: "🔐",
    category: "Security",
    style: "success",
  },


  /* =========================================================
     SYSTEM
     ========================================================= */

  SYSTEM_ANNOUNCEMENT: {
    icon: "📢",
    category: "System",
    style: "neutral",
  },

  SYSTEM_MAINTENANCE: {
    icon: "🔧",
    category: "System",
    style: "warning",
  },

  TERMS_UPDATED: {
    icon: "📄",
    category: "System",
    style: "neutral",
  },

  PRIVACY_POLICY_UPDATED: {
    icon: "📄",
    category: "System",
    style: "neutral",
  },
};


/*
|--------------------------------------------------------------------------
| Default configuration
|--------------------------------------------------------------------------
*/

const DEFAULT_NOTIFICATION_CONFIG = {
  icon: "🔔",
  category: "General",
  style: "neutral",
};


/*
|--------------------------------------------------------------------------
| Action button labels
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| The label is determined by action_type.
|
| The backend does NOT need to store action_label unless you
| specifically want custom labels in the future.
|
*/


const ACTION_LABELS = {

  ENTER_RENTAL_OTP:
    "Enter OTP",

  REPORT_OWNER:
    "Report Owner",

  // VIEW_RENTAL:
  //   "View Rental",

  VIEW_EXTENSION:
    "Review Request",

  RETURN_CYCLE:
    "Return Cycle",

  VIEW_REPORT:
    "View Report",

  // HANDLE_RETURN_ASSISTANCE:
  //   "Handle",

  VIEW_CYCLE:
  "View Cycle",

  // VERIFY_CYCLE:
  //   "Verify Cycle",
  
  // VIEW_ACCOUNT:
  //   "View Account",

  RETRY_PAYMENT:
    "Retry Payment",

  // VIEW_DISPUTE:
  //   "View Dispute",

  VIEW_SECURITY:
    "Review",

};


/*
|--------------------------------------------------------------------------
| Notification Page
|--------------------------------------------------------------------------
*/

function NotificationPage({
  onBack,
  onNotificationAction,
}) {

  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [markingAll, setMarkingAll] =
    useState(false);


  /*
  |--------------------------------------------------------------------------
  | Fetch notifications
  |--------------------------------------------------------------------------
  */

  const fetchNotifications = async () => {

    try {

      setLoading(true);
      setError("");


      /*
       * Get currently authenticated user.
       */

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();
        console.log(user);
        console.log(userError);

      if (userError) {
        throw userError;
      }


      if (!user) {

        setError(
          "You must be logged in to view notifications."
        );

        return;
      }


      /*
       * Fetch ONLY this user's notifications.
       *
       * action_data is fetched directly from
       * the notifications table.
       */

      const { data, error: notificationError } = await supabase
  .from("notifications")
  .select(
    "id",
    "user_id",
    "title",
    "message",
    "type",
    "action_type",
    "action_data",
    "is_read",
          // priority,
          "created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
        ascending: false,
      });


      if (notificationError) {
        throw notificationError;
      }


      setNotifications(data || []);

    } catch (err) {

      console.error(
        "Notification fetch error:",
        err
      );

      setError(
        "Unable to load notifications."
      );

    } finally {

      setLoading(false);

    }

  };


  /*
  |--------------------------------------------------------------------------
  | Initial load + realtime
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    let channel = null;


    const initialize = async () => {

      await fetchNotifications();


      const {
        data: { user },
      } =
        await supabase.auth.getUser();


      if (!user) {
        return;
      }


      /*
       * Realtime INSERT listener.
       */

      channel =
        supabase
          .channel(
            `notifications-${user.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter:
                `user_id=eq.${user.id}`,
            },
            (payload) => {

              setNotifications(
                (current) => [
                  payload.new,
                  ...current,
                ]
              );

            }
          )
          .subscribe();

    };


    initialize();


    return () => {

      if (channel) {

        supabase.removeChannel(
          channel
        );

      }

    };

  }, []);


  /*
  |--------------------------------------------------------------------------
  | Mark one notification as read
  |--------------------------------------------------------------------------
  */

  const markAsRead = async (
    notification
  ) => {

    if (notification.is_read) {
      return;
    }


    /*
     * Optimistic UI update.
     */

    setNotifications(
      (current) =>
        current.map(
          (item) =>
            item.id === notification.id
              ? {
                  ...item,
                  is_read: true,
                }
              : item
        )
    );


    const { error } =
      await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq(
          "id",
          notification.id
        );


    if (error) {

      console.error(
        "Mark as read error:",
        error
      );


      /*
       * Revert UI if database update fails.
       */

      setNotifications(
        (current) =>
          current.map(
            (item) =>
              item.id === notification.id
                ? {
                    ...item,
                    is_read: false,
                  }
                : item
          )
      );

    }

  };


  /*
  |--------------------------------------------------------------------------
  | Mark all as read
  |--------------------------------------------------------------------------
  */

  const markAllAsRead = async () => {

    if (markingAll) {
      return;
    }


    try {

      setMarkingAll(true);


      const {
        data: { user },
      } =
        await supabase.auth.getUser();


      if (!user) {
        return;
      }


      const { error } =
        await supabase
          .from("notifications")
          .update({
            is_read: true,
          })
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "is_read",
            false
          );


      if (error) {
        throw error;
      }


      setNotifications(
        (current) =>
          current.map(
            (notification) => ({
              ...notification,
              is_read: true,
            })
          )
      );


    } catch (err) {

      console.error(
        "Mark all as read error:",
        err
      );

    } finally {

      setMarkingAll(false);

    }

  };


  /*
  |--------------------------------------------------------------------------
  | Relative time
  |--------------------------------------------------------------------------
  */

  const getRelativeTime = (
    date
  ) => {

    if (!date) {
      return "";
    }


    const now = new Date();

    const created =
      new Date(date);


    const seconds =
      Math.floor(
        (now - created) / 1000
      );


    if (seconds < 60) {
      return "Just now";
    }


    const minutes =
      Math.floor(
        seconds / 60
      );


    if (minutes < 60) {

      return `${minutes} minute${
        minutes !== 1
          ? "s"
          : ""
      } ago`;

    }


    const hours =
      Math.floor(
        minutes / 60
      );


    if (hours < 24) {

      return `${hours} hour${
        hours !== 1
          ? "s"
          : ""
      } ago`;

    }


    const days =
      Math.floor(
        hours / 24
      );


    if (days < 7) {

      return `${days} day${
        days !== 1
          ? "s"
          : ""
      } ago`;

    }


    return created.toLocaleDateString();

  };


  /*
  |--------------------------------------------------------------------------
  | Get visual configuration
  |--------------------------------------------------------------------------
  */

  const getConfig = (
    notification
  ) => {

    return (
      NOTIFICATION_CONFIG[
        notification.type
      ] ||
      DEFAULT_NOTIFICATION_CONFIG
    );

  };


  /*
  |--------------------------------------------------------------------------
  | Safely get action_data
  |--------------------------------------------------------------------------
  |
  | PostgreSQL JSONB normally comes into JavaScript as an object.
  |
  | This helper also protects the page if action_data happens
  | to be null or arrives as a JSON string.
  |
  */

  const getActionData = (
    notification
  ) => {

    const data =
      notification.action_data;


    if (!data) {
      return {};
    }


    if (
      typeof data === "object"
    ) {
      return data;
    }


    if (
      typeof data === "string"
    ) {

      try {

        return JSON.parse(data);

      } catch {

        console.error(
          "Invalid action_data JSON:",
          data
        );

        return {};

      }

    }


    return {};

  };


  /*
  |--------------------------------------------------------------------------
  | Get OTP
  |--------------------------------------------------------------------------
  |
  | OTP is now ONLY read from action_data.
  |
  */

  const getOtp = (
    notification
  ) => {

    const actionData =
      getActionData(
        notification
      );


    if (
      notification.type ===
      "RENTAL_OTP_GENERATED"
    ) {

      return actionData.otp ||
        null;

    }


    return null;

  };


  /*
  |--------------------------------------------------------------------------
  | Action handler
  |--------------------------------------------------------------------------
  |
  | action_type tells us what to do.
  |
  | action_data tells us what information to pass.
  |
  */

  const handleAction = async (
    notification
  ) => {

    await markAsRead(
      notification
    );


    const actionType =
      notification.action_type;


    const actionData =
      getActionData(
        notification
      );


    /*
     * No action.
     */

    if (
      !actionType ||
      actionType === "NONE"
    ) {

      return;

    }


    console.log(
      "Notification action:",
      {
        notificationId:
          notification.id,

        notificationType:
          notification.type,

        actionType,

        actionData,
      }
    );


    /*
     * ---------------------------------------------------------
     * ENTER RENTAL OTP
     * ---------------------------------------------------------
     *
     * Example action_data:
     *
     * {
     *   booking_id,
     *   cycle_id,
     *   owner_id,
     *   renter_id
     * }
     *
     */

    if (
      actionType ===
      "ENTER_RENTAL_OTP"
    ) {

      if (
        !actionData.booking_id
      ) {

        console.error(
          "ENTER_RENTAL_OTP requires booking_id"
        );

        return;

      }


      if (
        onNotificationAction
      ) {

        onNotificationAction(
          notification,
          actionType,
          actionData
        );

      }


      return;

    }


    /*
     * ---------------------------------------------------------
     * REPORT OWNER
     * ---------------------------------------------------------
     *
     * Specifically used when:
     *
     * OTP expired because owner was absent.
     *
     */

    if (
      actionType ===
      "REPORT_OWNER"
    ) {

      if (
        !actionData.booking_id ||
        !actionData.owner_id
      ) {

        console.error(
          "REPORT_OWNER requires booking_id and owner_id"
        );

        return;

      }


      if (
        onNotificationAction
      ) {

        onNotificationAction(
          notification,
          actionType,
          actionData
        );

      }


      return;

    }


    /*
     * ---------------------------------------------------------
     * VERIFY / VIEW CYCLE
     * ---------------------------------------------------------
     *
     * cycle_id comes ONLY from action_data.
     *
     */

    if (
      actionType ===
        "VERIFY_CYCLE" ||
      actionType ===
        "VIEW_CYCLE"
    ) {

      if (
        !actionData.cycle_id
      ) {

        console.error(
          `${actionType} requires cycle_id`
        );

        return;

      }


      try {

        const {
          data: cycle,
          error: cycleError,
        } =
          await supabase
            .from("cycles")
            .select("*")
            .eq(
              "id",
              actionData.cycle_id
            )
            .single();


        if (cycleError) {

          console.error(
            "Cycle fetch error:",
            cycleError
          );

          return;

        }


        if (
          onNotificationAction
        ) {

          onNotificationAction(
            notification,
            actionType,
            {
              ...actionData,
              cycle,
            }
          );

        }

      } catch (err) {

        console.error(
          "Cycle action error:",
          err
        );

      }


      return;

    }


    /*
     * ---------------------------------------------------------
     * ALL OTHER ACTIONS
     * ---------------------------------------------------------
     *
     * Pass action_data exactly as received from database.
     *
     */

    if (
      onNotificationAction
    ) {

      onNotificationAction(
        notification,
        actionType,
        actionData
      );

    }

  };


  /*
  |--------------------------------------------------------------------------
  | Unread count
  |--------------------------------------------------------------------------
  */

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (notification) =>
            !notification.is_read
        ).length,
      [notifications]
    );


  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {

    return (
      <div className="notification-page">

        <div className="notification-loading">

          <div className="loading-spinner">
            🔄
          </div>

          <h2>
            Loading notifications...
          </h2>

          <p>
            Please wait while we get
            your latest updates.
          </p>

        </div>

      </div>
    );

  }


  /*
  |--------------------------------------------------------------------------
  | Main page
  |--------------------------------------------------------------------------
  */

  return (

    <div className="notification-page">

      <main className="notification-container">


        {/* =====================================================
            HEADER
            ===================================================== */}

        <section className="notification-header">

          <div>

            {onBack && (

              <button
                className="back-button"
                onClick={onBack}
              >
                ← Back
              </button>

            )}

            <span className="notification-eyebrow">
              UGO · CAMPUS CYCLE EXCHANGE
            </span>

            <h1>
              Notifications
            </h1>

            <p>
              Stay updated with your rentals,
              cycle listings and important
              account activity.
            </p>

          </div>


          <div className="notification-header-right">

            {unreadCount > 0 && (

              <span className="unread-count">
                {unreadCount} unread
              </span>

            )}

            <button
              className="mark-all-button"
              onClick={markAllAsRead}
              disabled={
                markingAll ||
                unreadCount === 0
              }
            >

              {markingAll
                ? "Marking..."
                : "Mark all as read"}

            </button>

          </div>

        </section>


        {/* =====================================================
            ERROR
            ===================================================== */}

        {error && (

          <div className="notification-error">

            <div className="state-icon">
              ⚠
            </div>

            <div>

              <h2>
                Unable to load notifications
              </h2>

              <p>
                {error}
              </p>

              <button
                className="retry-button"
                onClick={
                  fetchNotifications
                }
              >
                Try Again
              </button>

            </div>

          </div>

        )}


        {/* =====================================================
            EMPTY
            ===================================================== */}

        {!error &&
          notifications.length === 0 && (

            <div className="notification-empty">

              <div className="empty-icon">
                🔔
              </div>

              <h2>
                You're all caught up
              </h2>

              <p>
                New rental activity,
                cycle updates and important
                announcements will appear here.
              </p>

            </div>

          )}


        {/* =====================================================
            NOTIFICATION LIST
            ===================================================== */}

        {!error &&
          notifications.length > 0 && (

            <section className="notification-list">

              {notifications.map(
                (notification) => {

                  const config =
                    getConfig(
                      notification
                    );


                  const actionData =
                    getActionData(
                      notification
                    );


                  const actionType =
                    notification.action_type;


                  const hasAction =
                    actionType &&
                    actionType !== "NONE";


                  const actionLabel =
                    ACTION_LABELS[
                      actionType
                    ] ||
                    "View";


                  const otp =
                    getOtp(
                      notification
                    );


                  return (

                    <article
                      key={
                        notification.id
                      }

                      className={`
                        notification-card
                        ${config.style}
                        ${
                          !notification.is_read
                            ? "unread"
                            : ""
                        }
                      `}

                      onClick={() =>
                        markAsRead(
                          notification
                        )
                      }
                    >


                      {/* =================================================
                          ICON
                          ================================================= */}

                      <div className="notification-icon">

                        {config.icon}

                      </div>


                      {/* =================================================
                          CONTENT
                          ================================================= */}

                      <div className="notification-content">

                        <div className="notification-title-row">

                          <div className="title-with-category">

                            <h3>
                              {
                                notification.title
                              }
                            </h3>

                            <span className="notification-category">

                              {
                                config.category
                              }

                            </span>

                          </div>


                          {!notification.is_read && (

                            <span className="unread-dot" />

                          )}

                        </div>


                        <p className="notification-message">

                          {
                            notification.message
                          }

                        </p>


                        {/* =================================================
                            OTP DISPLAY
                            ================================================= */}

                        {otp && (

                          <div className="otp-container">

                            <span className="otp-label">
                              RENTAL OTP
                            </span>

                            <strong>
                              {otp}
                            </strong>

                            {actionData.otp_expires_at && (

                              <span className="otp-info">

                                Valid until{" "}
                                {new Date(
                                  actionData
                                    .otp_expires_at
                                ).toLocaleString()}

                              </span>

                            )}

                            {!actionData
                              .otp_expires_at && (

                              <span className="otp-info">

                                Show this OTP
                                to the owner
                                to start the rental.

                              </span>

                            )}

                          </div>

                        )}


                        {/* =================================================
                            FOOTER
                            ================================================= */}

                        <div className="notification-footer">

                          <span className="notification-time">

                            {
                              getRelativeTime(
                                notification.created_at
                              )
                            }

                          </span>


                          {notification.priority && (

                            <span
                              className={`
                                notification-priority
                                ${notification.priority}
                              `}
                            >
                              {
                                notification.priority
                              }
                            </span>

                          )}

                        </div>


                        {/* =================================================
                            DEBUG-SAFE ACTION DATA INDICATOR
                            =================================================
                            
                            We intentionally DO NOT display action_data.
                            
                            It is internal data used by the button.
                            
                        */}

                      </div>


                      {/* =====================================================
                          ACTION BUTTON
                          ===================================================== */}

                      {hasAction && (

                        <button
                          className={`
                            notification-action
                            action-${actionType
                              .toLowerCase()
                              .replace(
                                /_/g,
                                "-"
                              )}
                          `}
                          onClick={(
                            event
                          ) => {

                            event.stopPropagation();

                            handleAction(
                              notification
                            );

                          }}
                        >

                          {actionLabel}

                          <span>
                            →
                          </span>

                        </button>

                      )}

                    </article>

                  );

                }
              )}

            </section>

          )}

      </main>

    </div>

  );

}


export default NotificationPage;