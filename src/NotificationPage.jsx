// import { useEffect, useState } from "react";
// import { supabase } from "./supabase";
// import "./NotificationPage.css"

// function NotificationPage({onAction, onBack}) {
//   const [notifications, setNotifications] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     fetchNotifications();
//   }, []);

//   const fetchNotifications = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       // Get currently logged-in user
//       const {
//         data: { user },
//         error: userError,
//       } = await supabase.auth.getUser();

//       if (userError) throw userError;

//       if (!user) {
//         setError("User is not logged in.");
//         return;
//       }

//       // Fetch notifications belonging to this user
//       const { data, error: notificationError } = await supabase
//         .from("notifications")
//         .select("*")
//         .eq("user_id", user.id)
//         .order("created_at", { ascending: false });

//       if (notificationError) throw notificationError;

//       setNotifications(data || []);
//     } catch (err) {
//       console.error("Error fetching notifications:", err);
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return <div>Loading notifications...</div>;
//   }

//   if (error) {
//     return <div>Error: {error}</div>;
//   }

//   //   {notifications.length === 0 ? (
//   //   <p>No notifications.</p>
//   // ) : (
//   //   notifications.map((notification) => {
//   //     const isAction = notification.action !== null;

//   //     // Variable button text based on the action
//   //     let buttonText = "Action";

//   //     switch (notification.action) {
//   //       case "enter_rental_OTP":
//   //         buttonText = "Enter OTP";
//   //         break;

//   //       case "report_owner":
//   //         buttonText = "Report Owner";
//   //         break;

//   //       case "view_rental":
//   //         buttonText = "View Rental";
//   //         break;

//   //         case "view_extension":
//   //         buttonText = "View Extension";
//   //         break;

//   //       case "cycle_returned":
//   //         buttonText = "View";
//   //         break;

//   //       case "view_report":
//   //         buttonText = "View Report";
//   //         break;

//   //       case "view_account":
//   //         buttonText = "View Account";
//   //         break;

//   //       case "retry_payment":
//   //         buttonText = "Retry Payment";
//   //         break;

//   //       case "view_dispute":
//   //         buttonText = "View Dispute";
//   //         break;

//   //       case "view_security":
//   //         buttonText = "View Security";
//   //         break;

//   //       default:
//   //         buttonText = "Action";
//   //     }  

// //       return (
// //   <div
// //     key={notification.id}
// //   >
// //     {/* Notification Content */}
// //     <div>
// //       {/* Notification Title */}
// //       <h3>
// //         {notification.title
// //           ?.replace(/_/g, " ")
// //           .toLowerCase()
// //           .replace(/\b\w/g, (char) => char.toUpperCase())}
// //       </h3>

// //       {/* Notification Message */}
// //       <p>{notification.message}</p>

// //       {/* Created At */}
// //       <small>{notification.created_at}</small>
// //     </div>

// //     {/* Action Button */}
// //     {isAction && (
// //   <button
// //     onClick={() => onAction(notification.action, notification)}
// //   >
// //     {buttonText}
// //   </button>
// // )}
// //   </div>
// // );
// //     })
// //   )}
// // }

// // export default NotificationPage;




// return (
//   <div className="notification-page">

//     <main className="notification-container">

//       {/* HEADER */}
//       <header className="notification-header">

//         <div className="notification-header-left">

//           {onBack && (
//             <button
//               className="notification-back-button"
//               onClick={onBack}
//             >
//               ← Back
//             </button>
//           )}

//           <span className="notification-eyebrow">
//             UGO · CAMPUS CYCLE EXCHANGE
//           </span>

//           <h1>Notifications</h1>

//           <p>
//             Stay updated with your rentals,
//             cycle listings and important account activity.
//           </p>

//         </div>

//       </header>


//       {/* CONTENT */}
//       <section className="notification-content">

//         {notifications.length === 0 ? (

//           <div className="notification-empty">

//             <div className="notification-empty-icon">
//               🔔
//             </div>

//             <h2>No notifications</h2>

//             <p>
//               New rental activity, cycle updates and
//               important announcements will appear here.
//             </p>

//           </div>

//         ) : (

//           <div className="notification-list">

//             {notifications.map((notification) => {

//               const isAction =
//                 notification.action_type !== null;

//               let buttonText = "Action";

//               switch (notification.action_type) {

//                 case "enter_rental_OTP":
//                   buttonText = "Enter OTP";
//                   break;

//                 case "report_owner":
//                   buttonText = "Report Owner";
//                   break;

//                 case "view_rental":
//                   buttonText = "View Rental";
//                   break;

//                 case "view_extension":
//                   buttonText = "View Extension";
//                   break;

//                 case "cycle_returned":
//                   buttonText = "View";
//                   break;

//                 case "view_cycle":
//                   buttonText = "View Cycle";
//                   break;

//                 case "view_report":
//                   buttonText = "View Report";
//                   break;

//                 case "view_account":
//                   buttonText = "View Account";
//                   break;

//                 case "retry_payment":
//                   buttonText = "Retry Payment";
//                   break;

//                 case "view_dispute":
//                   buttonText = "View Dispute";
//                   break;

//                 case "view_security":
//                   buttonText = "View Security";
//                   break;

//                 default:
//                   buttonText = "Action";
//               }

//               return (

//                 <article
//                   key={notification.id}
//                   className="notification-card"
//                 >

//                   <div className="notification-icon">
//                     🔔
//                   </div>

//                   <div className="notification-details">

//                     <div className="notification-title-row">

//                       <h3>
//                         {notification.title
//                           ?.replace(/_/g, " ")
//                           .toLowerCase()
//                           .replace(
//                             /\b\w/g,
//                             (char) => char.toUpperCase()
//                           )}
//                       </h3>

//                     </div>

//                     <p className="notification-message">
//                       {notification.message}
//                     </p>

//                     <small className="notification-time">
//                       {notification.created_at}
//                     </small>

//                   </div>


//                   {isAction && (

//                     <button
//                       className="notification-action-button"
//                       onClick={() =>
//                         onAction(
//                           notification.action_type,
//                           notification
//                         )
//                       }
//                     >
//                       {buttonText}

//                       <span>→</span>
//                     </button>

//                   )}

//                 </article>

//               );

//             })}

//           </div>

//         )}

//       </section>

//     </main>

//   </div>
// );
// }

// export default NotificationPage;

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./NotificationPage.css";

function NotificationPage({ onAction, onBack }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | CHECK WHETHER NOTIFICATION IS READ-ONLY
  |--------------------------------------------------------------------------
  |
  | We are treating:
  |
  | NONE
  | null
  | undefined
  | ""
  |
  | as read-only notifications.
  |
  */

  const isReadOnlyNotification = (notification) => {
    return (
      !notification.action_type ||
      notification.action_type === "NONE"
    );
  };


  /*
  |--------------------------------------------------------------------------
  | MARK ONE NOTIFICATION AS READ
  |--------------------------------------------------------------------------
  */

  const markNotificationAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("id", notificationId);

      if (error) {
        throw error;
      }

      /*
       * Update local state also.
       * This prevents the page from continuing to show
       * the notification as unread.
       */

      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );

    } catch (err) {
      console.error(
        "Error marking notification as read:",
        err
      );
    }
  };


  /*
  |--------------------------------------------------------------------------
  | MARK ALL READ-ONLY NOTIFICATIONS AS READ
  |--------------------------------------------------------------------------
  */

  const markReadOnlyNotificationsAsRead = async (
    notificationList
  ) => {
    try {
      const readOnlyUnread =
        notificationList.filter(
          (notification) =>
            !notification.is_read &&
            isReadOnlyNotification(notification)
        );

      if (readOnlyUnread.length === 0) {
        return notificationList;
      }


      /*
       * Update all read-only notifications.
       */

      await Promise.all(
        readOnlyUnread.map(async (notification) => {

          const { error } = await supabase
            .from("notifications")
            .update({
              is_read: true,
            })
            .eq("id", notification.id);

          if (error) {
            console.error(
              `Failed to mark notification ${notification.id} as read:`,
              error
            );

            return;
          }

          notification.is_read = true;

        })
      );


      return [...notificationList];

    } catch (err) {

      console.error(
        "Error marking read-only notifications:",
        err
      );

      return notificationList;
    }
  };


  /*
  |--------------------------------------------------------------------------
  | FETCH NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  const fetchNotifications = async () => {

    try {

      setLoading(true);
      setError(null);


      /*
       * Get currently logged-in user.
       */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();


      if (userError) {
        throw userError;
      }


      if (!user) {

        setError(
          "User is not logged in."
        );

        return;
      }


      console.log(
        "Fetching notifications for:",
        user.id
      );


      /*
       * Fetch notifications belonging
       * to the current user.
       */

      const {
        data,
        error: notificationError,
      } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });


      if (notificationError) {
        throw notificationError;
      }


      /*
       * Initially store fetched notifications.
       */

      const fetchedNotifications =
        data || [];


      /*
       * Mark read-only notifications as read.
       */

      const updatedNotifications =
        await markReadOnlyNotificationsAsRead(
          fetchedNotifications
        );


      /*
       * Store final state.
       */

      setNotifications(
        updatedNotifications
      );

    } catch (err) {

      console.error(
        "Error fetching notifications:",
        err
      );

      setError(
        err.message ||
        "Failed to load notifications."
      );

    } finally {

      setLoading(false);

    }
  };


  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    fetchNotifications();

  }, []);


  /*
  |--------------------------------------------------------------------------
  | GET ACTION BUTTON LABEL
  |--------------------------------------------------------------------------
  */

  const getActionButtonLabel = (
    actionType
  ) => {

    switch (actionType) {

      case "enter_rental_OTP":
        return "Enter OTP";


      case "report_owner":
        return "Report Owner";


      case "view_rental":
        return "View Rental";


      case "view_extension":
        return "View Extension";


      case "cycle_returned":
        return "View";


      case "view_cycle":
        return "View Cycle";


      case "view_report":
        return "View Report";


      case "view_account":
        return "View Account";


      case "retry_payment":
        return "Retry Payment";


      case "view_dispute":
        return "View Dispute";


      case "view_security":
        return "View Security";


      default:
        return "Action";
    }
  };


  /*
  |--------------------------------------------------------------------------
  | FORMAT TITLE
  |--------------------------------------------------------------------------
  */

  const formatNotificationTitle = (
    title
  ) => {

    if (!title) {
      return "Notification";
    }

    return title
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(
        /\b\w/g,
        (char) =>
          char.toUpperCase()
      );
  };


  /*
  |--------------------------------------------------------------------------
  | FORMAT DATE
  |--------------------------------------------------------------------------
  */

  const formatNotificationDate = (
    createdAt
  ) => {

    if (!createdAt) {
      return "";
    }

    try {

      return new Date(
        createdAt
      ).toLocaleString(
        "en-IN",
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      );

    } catch {

      return createdAt;

    }
  };


  /*
  |--------------------------------------------------------------------------
  | LOADING SCREEN
  |--------------------------------------------------------------------------
  */

  if (loading) {

    return (

      <div className="notification-page">

        <main className="notification-container">

          <div className="notification-empty">

            <div className="notification-empty-icon">
              🔔
            </div>

            <h2>
              Loading notifications...
            </h2>

            <p>
              Please wait while we fetch
              your notifications.
            </p>

          </div>

        </main>

      </div>

    );
  }


  /*
  |--------------------------------------------------------------------------
  | ERROR SCREEN
  |--------------------------------------------------------------------------
  */

  if (error) {

    return (

      <div className="notification-page">

        <main className="notification-container">

          <div className="notification-empty">

            <div className="notification-empty-icon">
              ⚠️
            </div>

            <h2>
              Unable to load notifications
            </h2>

            <p>
              {error}
            </p>

            <button
              className="notification-action-button"
              onClick={fetchNotifications}
            >
              Try Again
              <span>↻</span>
            </button>

          </div>

        </main>

      </div>

    );
  }


  /*
  |--------------------------------------------------------------------------
  | MAIN PAGE
  |--------------------------------------------------------------------------
  */

  return (

    <div className="notification-page">

      <main className="notification-container">


        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="notification-header">

          <div className="notification-header-left">

            {onBack && (

              <button
                className="notification-back-button"
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

        </header>


        {/* =====================================================
            CONTENT
        ====================================================== */}

        <section className="notification-content">


          {/* ===================================================
              NO NOTIFICATIONS
          ==================================================== */}

          {notifications.length === 0 ? (

            <div className="notification-empty">

              <div className="notification-empty-icon">
                🔔
              </div>


              <h2>
                No notifications
              </h2>


              <p>
                New rental activity,
                cycle updates and important
                announcements will appear here.
              </p>

            </div>

          ) : (


            /* =================================================
               NOTIFICATION LIST
            ================================================== */

            <div className="notification-list">

              {notifications.map(
                (notification) => {


                  /*
                   * Determine whether this notification
                   * is read-only.
                   */

                  const isReadOnly =
                    isReadOnlyNotification(
                      notification
                    );


                  /*
                   * Action notification means
                   * action_type is something other than NONE.
                   */

                  const isAction =
                    !isReadOnly;


                  /*
                   * Get appropriate button label.
                   */

                  const buttonText =
                    getActionButtonLabel(
                      notification.action_type
                    );


                  return (

                    <article
                      key={notification.id}
                      className={`notification-card ${
                        notification.is_read
                          ? "notification-read"
                          : "notification-unread"
                      }`}
                    >


                      {/* =======================================
                          NOTIFICATION ICON
                      ======================================== */}

                      <div className="notification-icon">
                        🔔
                      </div>


                      {/* =======================================
                          NOTIFICATION DETAILS
                      ======================================== */}

                      <div className="notification-details">


                        <div className="notification-title-row">


                          <h3>
                            {formatNotificationTitle(
                              notification.title
                            )}
                          </h3>


                          {/* Unread indicator */}

                          {!notification.is_read && (

                            <span
                              className="unread-dot"
                            ></span>

                          )}

                        </div>


                        {/* Message */}

                        <p className="notification-message">

                          {notification.message}

                        </p>


                        {/* Created time */}

                        <small className="notification-time">

                          {formatNotificationDate(
                            notification.created_at
                          )}

                        </small>

                      </div>


                      {/* =======================================
                          ACTION BUTTONS
                      ======================================= */}

                      {notification.action_type === "rental_request_received" ? (

                        <div className="rental-request-actions">

                          {/* ACCEPT */}
                          <button
                            className="notification-action-button accept-button"
                            onClick={() => {

                              if (onAction) {
                                onAction(
                                  "accepted_rental_request",
                                  notification
                                );
                              } else {
                                console.warn(
                                  "Notification action handler is not provided."
                                );
                              }

                            }}
                          >
                            Accept
                            <span>✓</span>
                          </button>


                          {/* REJECT */}
                          <button
                            className="notification-action-button reject-button"
                            onClick={() => {

                              if (onAction) {
                                onAction(
                                  "rejected_rental_request",
                                  notification
                                );
                              } else {
                                console.warn(
                                  "Notification action handler is not provided."
                                );
                              }

                            }}
                          >
                            Reject
                            <span>✕</span>
                          </button>

                        </div>

                      ) : (

                        /* =======================================
                          NORMAL SINGLE ACTION BUTTON
                        ======================================== */

                        isAction && (

                          <button
                            className="notification-action-button"

                            onClick={() => {

                              if (onAction) {

                                onAction(
                                  notification.action_type,
                                  notification
                                );

                              } else {

                                console.warn(
                                  "Notification action handler is not provided."
                                );

                              }

                            }}
                          >

                            {buttonText}

                            <span>
                              →
                            </span>

                          </button>

                        )

                      )}

                    </article>

                  );

                }
              )}

            </div>

          )}

        </section>

      </main>

    </div>

  );
}


export default NotificationPage;