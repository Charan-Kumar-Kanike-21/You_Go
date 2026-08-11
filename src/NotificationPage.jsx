// import React, { useEffect, useState } from "react";
// import { supabase } from "./supabase";
// import "./NotificationPage.css";

// const notificationIcons = {
//   booking: "🚲",
//   cancellation: "⚠️",
//   completion: "✅",
//   payment: "💰",
//   cycle: "🚲",
//   approval: "🔐",
//   report: "🚨",
//   general: "🔔",
// };

// function NotificationPage({ onBack }) {
//   const [notifications, setNotifications] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [markingAll, setMarkingAll] = useState(false);

//   /*
//    * -------------------------------------------------------
//    * Fetch notifications
//    * -------------------------------------------------------
//    */
//   const fetchNotifications = async () => {
//     try {
//       setLoading(true);
//       setError("");

//       const {
//         data: { user },
//         error: userError,
//       } = await supabase.auth.getUser();

//       if (userError) throw userError;

//       if (!user) {
//         setError("You must be logged in to view notifications.");
//         return;
//       }

//       const { data, error: notificationError } = await supabase
//         .from("notifications")
//         .select("*")
//         .eq("user_id", user.id)
//         .order("created_at", {
//           ascending: false,
//         });

//       if (notificationError) throw notificationError;

//       setNotifications(data || []);
//     } catch (err) {
//       console.error("Notification fetch error:", err);
//       setError("Unable to load notifications.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /*
//    * -------------------------------------------------------
//    * Initial load + realtime subscription
//    * -------------------------------------------------------
//    */
//   useEffect(() => {
//     let channel;

//     const initialize = async () => {
//       await fetchNotifications();

//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) return;

//       channel = supabase
//         .channel(`notifications-${user.id}`)
//         .on(
//           "postgres_changes",
//           {
//             event: "INSERT",
//             schema: "public",
//             table: "notifications",
//             filter: `user_id=eq.${user.id}`,
//           },
//           (payload) => {
//             setNotifications((current) => [
//               payload.new,
//               ...current,
//             ]);
//           }
//         )
//         .subscribe();
//     };

//     initialize();

//     return () => {
//       if (channel) {
//         supabase.removeChannel(channel);
//       }
//     };
//   }, []);

//   /*
//    * -------------------------------------------------------
//    * Mark single notification as read
//    * -------------------------------------------------------
//    */
//   const markAsRead = async (notification) => {
//     if (notification.is_read) return;

//     // Optimistic UI update
//     setNotifications((current) =>
//       current.map((item) =>
//         item.id === notification.id
//           ? { ...item, is_read: true }
//           : item
//       )
//     );

//     const { error } = await supabase
//       .from("notifications")
//       .update({ is_read: true })
//       .eq("id", notification.id);

//     if (error) {
//       console.error("Mark as read error:", error);

//       // Revert if database update failed
//       setNotifications((current) =>
//         current.map((item) =>
//           item.id === notification.id
//             ? { ...item, is_read: false }
//             : item
//         )
//       );
//     }
//   };

//   /*
//    * -------------------------------------------------------
//    * Mark all notifications as read
//    * -------------------------------------------------------
//    */
//   const markAllAsRead = async () => {
//     if (markingAll) return;

//     try {
//       setMarkingAll(true);

//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) return;

//       const { error } = await supabase
//         .from("notifications")
//         .update({ is_read: true })
//         .eq("user_id", user.id)
//         .eq("is_read", false);

//       if (error) throw error;

//       setNotifications((current) =>
//         current.map((notification) => ({
//           ...notification,
//           is_read: true,
//         }))
//       );
//     } catch (err) {
//       console.error("Mark all as read error:", err);
//     } finally {
//       setMarkingAll(false);
//     }
//   };

//   /*
//    * -------------------------------------------------------
//    * Relative time
//    * -------------------------------------------------------
//    */
//   const getRelativeTime = (date) => {
//     if (!date) return "";

//     const now = new Date();
//     const created = new Date(date);

//     const seconds = Math.floor(
//       (now - created) / 1000
//     );

//     if (seconds < 60) {
//       return "Just now";
//     }

//     const minutes = Math.floor(seconds / 60);

//     if (minutes < 60) {
//       return `${minutes} minute${
//         minutes !== 1 ? "s" : ""
//       } ago`;
//     }

//     const hours = Math.floor(minutes / 60);

//     if (hours < 24) {
//       return `${hours} hour${
//         hours !== 1 ? "s" : ""
//       } ago`;
//     }

//     const days = Math.floor(hours / 24);

//     if (days < 7) {
//       return `${days} day${days !== 1 ? "s" : ""} ago`;
//     }

//     return created.toLocaleDateString();
//   };

//   /*
//    * -------------------------------------------------------
//    * Notification action
//    * -------------------------------------------------------
//    *
//    * We don't perform navigation here.
//    *
//    * The parent/application can later decide what to do
//    * with related_id / action_type.
//    * -------------------------------------------------------
//    */
//   const handleAction = (notification) => {
//     markAsRead(notification);

//     console.log(
//       "Notification action:",
//       notification
//     );

//     /*
//      * Later your teammates can connect this to:
//      *
//      * booking page
//      * cycle page
//      * admin verification page
//      * report page
//      * etc.
//      */
//   };

//   const unreadCount = notifications.filter(
//     (notification) => !notification.is_read
//   ).length;

//   /*
//    * -------------------------------------------------------
//    * Loading
//    * -------------------------------------------------------
//    */
//   if (loading) {
//     return (
//       <div className="notification-page">
//         <div className="notification-loading">
//           <div className="loading-icon">🔄</div>

//           <h2>Loading notifications...</h2>

//           <p>
//             Please wait while we get your latest updates.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   /*
//    * -------------------------------------------------------
//    * Page
//    * -------------------------------------------------------
//    */
//   return (
//     <div className="notification-page">

//       <main className="notification-container">

//         {/* Header */}
//         <section className="notification-header">

//           <button
//             className="notification-back-button"
//             onClick={onBack}
//           >
//             ← Back
//           </button>

//           <div>
//             <span className="notification-eyebrow">
//               NITK CYCLE SHARING
//             </span>

//             <h1>
//               Notifications
//             </h1>

//             <p>
//               Stay updated with your latest activity
//               and important updates.
//             </p>
//           </div>

//           <div className="notification-header-right">

//             {unreadCount > 0 && (
//               <span className="unread-count">
//                 {unreadCount} unread
//               </span>
//             )}

//             <button
//               className="mark-all-button"
//               onClick={markAllAsRead}
//               disabled={
//                 markingAll || unreadCount === 0
//               }
//             >
//               {markingAll
//                 ? "Marking..."
//                 : "Mark all as read"}
//             </button>

//           </div>

//         </section>

//         {/* Error */}
//         {error && (
//           <div className="notification-error">

//             <div className="state-icon">
//               ⚠️
//             </div>

//             <h2>
//               Unable to load notifications
//             </h2>

//             <p>{error}</p>

//             <button
//               className="retry-button"
//               onClick={fetchNotifications}
//             >
//               Try Again
//             </button>

//           </div>
//         )}

//         {/* Empty */}
//         {!error && notifications.length === 0 && (
//           <div className="notification-empty">

//             <div className="empty-icon">
//               🔔
//             </div>

//             <h2>
//               No notifications
//             </h2>

//             <p>
//               You're all caught up!
//               <br />
//               New updates will appear here.
//             </p>

//           </div>
//         )}

//         {/* Notifications */}
//         {!error && notifications.length > 0 && (
//           <section className="notification-list">

//             {notifications.map((notification) => {

//               const icon =
//                 notificationIcons[
//                   notification.type
//                 ] || notificationIcons.general;

//               return (
//                 <article
//                   key={notification.id}
//                   className={`notification-card ${
//                     !notification.is_read
//                       ? "unread"
//                       : ""
//                   }`}
//                   onClick={() =>
//                     markAsRead(notification)
//                   }
//                 >

//                   <div className="notification-icon">
//                     {icon}
//                   </div>

//                   <div className="notification-content">

//                     <div className="notification-title-row">

//                       <h3>
//                         {notification.title}
//                       </h3>

//                       {!notification.is_read && (
//                         <span className="unread-dot" />
//                       )}

//                     </div>

//                     <p>
//                       {notification.message}
//                     </p>

//                     <div className="notification-footer">

//                       <span className="notification-time">
//                         {getRelativeTime(
//                           notification.created_at
//                         )}
//                       </span>

//                       {notification.type && (
//                         <span className="notification-type">
//                           {notification.type}
//                         </span>
//                       )}

//                     </div>

//                   </div>

//                   {/*
//                    * ------------------------------------------------
//                    * OPTIONAL ADMIN / USER ACTION
//                    *
//                    * If your database later contains:
//                    *
//                    * action_type
//                    * action_label
//                    *
//                    * this button automatically becomes available.
//                    * ------------------------------------------------
//                    */}

//                   {notification.action_type && (
//                     <button
//                       className="notification-action"
//                       onClick={(event) => {
//                         event.stopPropagation();
//                         handleAction(notification);
//                       }}
//                     >
//                       {notification.action_label ||
//                         "View"}
//                     </button>
//                   )}

//                 </article>
//               );
//             })}

//           </section>
//         )}

//       </main>
//     </div>
//   );
// }

// export default NotificationPage;







import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./NotificationPage.css";

/*
|--------------------------------------------------------------------------
| Notification configuration
|--------------------------------------------------------------------------
|
| IMPORTANT:
| notification.type from Supabase should exactly match these keys.
|
*/

const NOTIFICATION_CONFIG = {

  /* =========================================================
     RENTAL REQUESTS
     ========================================================= */

  RENTAL_REQUEST_RECEIVED: {
    icon: "🚲",
    category: "Rental",
    style: "action",
    defaultAction: "View Request",
    actionType: "VIEW_RENTAL",
  },

  RENTAL_REQUEST_ACCEPTED: {
    icon: "✓",
    category: "Rental",
    style: "success",
    defaultAction: "View Rental",
    actionType: "VIEW_RENTAL",
  },

  RENTAL_REQUEST_REJECTED: {
    icon: "✕",
    category: "Rental",
    style: "danger",
    actionType: "NONE",
  },

  RENTAL_REQUEST_CANCELLED: {
    icon: "↩",
    category: "Rental",
    style: "warning",
    actionType: "NONE",
  },

  RENTAL_REQUEST_EXPIRED: {
    icon: "⌛",
    category: "Rental",
    style: "warning",
    actionType: "NONE",
  },


  /* =========================================================
     RENTAL START
     ========================================================= */

  RENTAL_OTP_GENERATED: {
    icon: "🔐",
    category: "Rental",
    style: "otp",
    actionType: "NONE",
  },

  RENTAL_STARTED: {
    icon: "🚲",
    category: "Rental",
    style: "success",
    defaultAction: "View Rental",
    actionType: "VIEW_RENTAL",
  },

  RENTAL_START_FAILED: {
    icon: "⚠",
    category: "Rental",
    style: "danger",
    actionType: "NONE",
  },


  /* =========================================================
     ACTIVE RENTAL
     ========================================================= */

  RENTAL_ENDING_SOON: {
    icon: "⏰",
    category: "Rental",
    style: "warning",
    actionType: "NONE",
  },

  RENTAL_EXPIRED: {
    icon: "⌛",
    category: "Rental",
    style: "danger",
    actionType: "NONE",
  },


  /* =========================================================
     EXTENSIONS
     ========================================================= */

  RENTAL_EXTENSION_REQUESTED: {
    icon: "↗",
    category: "Rental",
    style: "action",
    defaultAction: "Review Request",
    actionType: "VIEW_EXTENSION",
  },

  RENTAL_EXTENSION_ACCEPTED: {
    icon: "✓",
    category: "Rental",
    style: "success",
    actionType: "NONE",
  },

  RENTAL_EXTENSION_REJECTED: {
    icon: "✕",
    category: "Rental",
    style: "danger",
    actionType: "NONE",
  },


  /* =========================================================
     RETURN
     ========================================================= */

  RETURN_REQUIRED: {
    icon: "↩",
    category: "Return",
    style: "warning",
    defaultAction: "Return Cycle",
    actionType: "RETURN_CYCLE",
  },

  RETURN_COMPLETED: {
    icon: "✓",
    category: "Return",
    style: "success",
    actionType: "NONE",
  },

  RETURN_PROBLEM_REPORTED: {
    icon: "🚨",
    category: "Return",
    style: "action",
    defaultAction: "View Report",
    actionType: "VIEW_REPORT",
  },

  RETURN_ASSISTANCE_REQUIRED: {
    icon: "🔑",
    category: "Admin",
    style: "urgent",
    defaultAction: "Handle",
    actionType: "VIEW_REPORT",
  },

  RETURN_ISSUE_RESOLVED: {
    icon: "✓",
    category: "Return",
    style: "success",
    actionType: "NONE",
  },


  /* =========================================================
     CYCLE VERIFICATION
     ========================================================= */

  CYCLE_VERIFICATION_ASSIGNED: {
    icon: "🔎",
    category: "Verification",
    style: "action",
    defaultAction: "View Details",
    actionType: "VIEW_CYCLE",
  },

  CYCLE_APPROVED: {
    icon: "✓",
    category: "Verification",
    style: "success",
    actionType: "NONE",
  },

  CYCLE_REJECTED: {
    icon: "✕",
    category: "Verification",
    style: "danger",
    actionType: "NONE",
  },

  CYCLE_LISTING_ACTIVATED: {
    icon: "🚲",
    category: "Cycle",
    style: "success",
    defaultAction: "View Cycle",
    actionType: "VIEW_CYCLE",
  },

  CYCLE_LISTING_SUSPENDED: {
    icon: "⚠",
    category: "Cycle",
    style: "warning",
    actionType: "NONE",
  },

  CYCLE_LISTING_REMOVED: {
    icon: "✕",
    category: "Cycle",
    style: "danger",
    actionType: "NONE",
  },

  CYCLE_REVERIFICATION_REQUIRED: {
    icon: "🔎",
    category: "Verification",
    style: "action",
    defaultAction: "Review Cycle",
    actionType: "VIEW_CYCLE",
  },


  /* =========================================================
     REPORTS
     ========================================================= */

  USER_REPORTED: {
    icon: "🚨",
    category: "Report",
    style: "action",
    defaultAction: "View Report",
    actionType: "VIEW_REPORT",
  },

  OWNER_REPORTED: {
    icon: "🚨",
    category: "Report",
    style: "action",
    defaultAction: "View Report",
    actionType: "VIEW_REPORT",
  },

  RENTER_REPORTED: {
    icon: "🚨",
    category: "Report",
    style: "action",
    defaultAction: "View Report",
    actionType: "VIEW_REPORT",
  },

  CYCLE_REPORTED: {
    icon: "🚨",
    category: "Report",
    style: "action",
    defaultAction: "View Report",
    actionType: "VIEW_REPORT",
  },

  REPORT_RESOLVED: {
    icon: "✓",
    category: "Report",
    style: "success",
    actionType: "NONE",
  },

  REPORT_DISMISSED: {
    icon: "—",
    category: "Report",
    style: "neutral",
    actionType: "NONE",
  },


  /* =========================================================
     ACCOUNT / MODERATION
     ========================================================= */

  ACCOUNT_BLOCKED: {
    icon: "⛔",
    category: "Account",
    style: "urgent",
    actionType: "NONE",
  },

  ACCOUNT_UNBLOCKED: {
    icon: "✓",
    category: "Account",
    style: "success",
    actionType: "NONE",
  },

  ACCOUNT_WARNING: {
    icon: "⚠",
    category: "Account",
    style: "warning",
    actionType: "NONE",
  },

  ACCOUNT_REVIEW_REQUIRED: {
    icon: "🔎",
    category: "Account",
    style: "action",
    defaultAction: "Review Account",
    actionType: "VIEW_ACCOUNT",
  },


  /* =========================================================
     PAYMENT
     ========================================================= */

  PAYMENT_SUCCESS: {
    icon: "₹",
    category: "Payment",
    style: "success",
    actionType: "NONE",
  },

  PAYMENT_FAILED: {
    icon: "₹",
    category: "Payment",
    style: "danger",
    defaultAction: "Retry Payment",
    actionType: "RETRY_PAYMENT",
  },

  REFUND_INITIATED: {
    icon: "↩",
    category: "Payment",
    style: "neutral",
    actionType: "NONE",
  },

  REFUND_COMPLETED: {
    icon: "₹",
    category: "Payment",
    style: "success",
    actionType: "NONE",
  },

  REFUND_FAILED: {
    icon: "⚠",
    category: "Payment",
    style: "danger",
    actionType: "NONE",
  },

  PAYMENT_DISPUTE_OPENED: {
    icon: "⚖",
    category: "Payment",
    style: "action",
    defaultAction: "View Dispute",
    actionType: "VIEW_DISPUTE",
  },

  PAYMENT_DISPUTE_RESOLVED: {
    icon: "✓",
    category: "Payment",
    style: "success",
    actionType: "NONE",
  },


  /* =========================================================
     SECURITY
     ========================================================= */

  NEW_LOGIN_DETECTED: {
    icon: "🔐",
    category: "Security",
    style: "warning",
    actionType: "NONE",
  },

  SECURITY_ALERT: {
    icon: "🚨",
    category: "Security",
    style: "urgent",
    defaultAction: "Review",
    actionType: "VIEW_SECURITY",
  },

  PASSWORD_CHANGED: {
    icon: "🔐",
    category: "Security",
    style: "success",
    actionType: "NONE",
  },


  /* =========================================================
     SYSTEM
     ========================================================= */

  SYSTEM_ANNOUNCEMENT: {
    icon: "📢",
    category: "System",
    style: "neutral",
    actionType: "NONE",
  },

  SYSTEM_MAINTENANCE: {
    icon: "🔧",
    category: "System",
    style: "warning",
    actionType: "NONE",
  },

  TERMS_UPDATED: {
    icon: "📄",
    category: "System",
    style: "neutral",
    actionType: "NONE",
  },

  PRIVACY_POLICY_UPDATED: {
    icon: "📄",
    category: "System",
    style: "neutral",
    actionType: "NONE",
  },
};


/*
|--------------------------------------------------------------------------
| Fallback configuration
|--------------------------------------------------------------------------
*/

const DEFAULT_NOTIFICATION_CONFIG = {
  icon: "🔔",
  category: "General",
  style: "neutral",
  actionType: "NONE",
};


/*
|--------------------------------------------------------------------------
| Notification Page
|--------------------------------------------------------------------------
*/

function NotificationPage({ onBack }) {

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
  | Fetch current user's notifications
  |--------------------------------------------------------------------------
  */

  const fetchNotifications = async () => {

    try {

      setLoading(true);
      setError("");

      /*
       * Get authenticated user.
       */

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

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
       * IMPORTANT:
       *
       * Only notifications belonging to this
       * authenticated user are fetched.
       */

      const {
        data,
        error: notificationError,
      } =
        await supabase
          .from("notifications")
          .select("*")
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
  | Initial fetch + realtime notifications
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
       * Listen only for notifications belonging
       * to this user.
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
     * Optimistic update
     */

    setNotifications(
      (current) =>
        current.map((item) =>
          item.id ===
          notification.id
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
        )
        .eq(
          "user_id",
          notification.user_id
        );


    if (error) {

      console.error(
        "Mark notification read error:",
        error
      );


      /*
       * Revert optimistic update
       */

      setNotifications(
        (current) =>
          current.map((item) =>
            item.id ===
            notification.id
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

    if (
      markingAll ||
      unreadCount === 0
    ) {
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
  | Get notification configuration
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
  | Notification action
  |--------------------------------------------------------------------------
  |
  | We are intentionally NOT navigating here yet.
  |
  | Your teammates can connect these action types
  | to the appropriate pages later.
  |--------------------------------------------------------------------------
  */

  const handleAction = (
    notification
  ) => {

    markAsRead(
      notification
    );


    const config =
      getConfig(
        notification
      );


    console.log(
      "Notification action:",
      {
        type:
          notification.type,

        action:
          config.actionType,

        actionData:
          notification.action_data,

        relatedId:
          notification.related_id,
      }
    );


    /*
     * Future routing examples:
     *
     * VIEW_CYCLE
     *      → /cycle-details
     *
     * VIEW_RENTAL
     *      → /rental-details
     *
     * VIEW_REPORT
     *      → /report
     *
     * VIEW_ACCOUNT
     *      → /admin/user
     *
     * RETURN_CYCLE
     *      → /return
     */
  };


  /*
  |--------------------------------------------------------------------------
  | Extract OTP
  |--------------------------------------------------------------------------
  */

  const getOtp = (
    notification
  ) => {

    if (
      notification.action_data
        ?.otp
    ) {

      return notification
        .action_data
        .otp;

    }


    /*
     * Optional fallback if OTP is
     * stored directly in a column.
     */

    if (
      notification.otp
    ) {
      return notification.otp;
    }


    return null;

  };


  /*
  |--------------------------------------------------------------------------
  | Derived state
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
  | Loading state
  |--------------------------------------------------------------------------
  */

  if (loading) {

    return (
      <div className="notification-page">

        <div className="notification-loading">

          <div className="loading-spinner"></div>

          <h2>
            Loading notifications...
          </h2>

          <p>
            Please wait while we get your latest updates.
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

          <button
            className="mark-all-button"
            onClick={onBack}
          >
            ← Back
          </button>

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

                {unreadCount}

                {" "}

                unread

              </span>

            )}


            <button
              className="mark-all-button"
              onClick={
                markAllAsRead
              }
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


                  const otp =
                    notification.type ===
                    "RENTAL_OTP_GENERATED"
                      ? getOtp(
                          notification
                        )
                      : null;


                  /*
                   * Use action_type from database
                   * if provided, otherwise use the
                   * type configuration.
                   */

                  const actionType =
                    notification.action_type &&
                    notification.action_type !==
                      "NONE"
                      ? notification.action_type
                      : config.actionType;


                  const hasAction =
                    actionType &&
                    actionType !==
                      "NONE";


                  const actionLabel =
                    notification.action_label ||
                    config.defaultAction;


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
                            OTP
                            ================================================= */}

                        {otp && (

                          <div className="otp-container">

                            <span className="otp-label">
                              RENTAL OTP
                            </span>

                            <strong>
                              {otp}
                            </strong>

                            <span className="otp-info">
                              Show this OTP to the
                              owner to start the rental.
                            </span>

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

                      </div>


                      {/* =================================================
                          ACTION BUTTON
                          ================================================= */}

                      {hasAction && (

                        <button
                          className="notification-action"
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