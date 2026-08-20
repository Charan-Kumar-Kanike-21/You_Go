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



  // Local UI state for rental request decisions.
  // The parent/backend action connection remains unchanged.
  const [rentalDecisions, setRentalDecisions] = useState({});
  const [processingRentalId, setProcessingRentalId] = useState(null);
  // Notifications selected with the checkboxes.
  const [selectedNotificationIds, setSelectedNotificationIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  const getRentalCycleId = (notification) => {
    const data = notification?.action_data || {};

    return (
      data.cycle_id ||
      data.cycleId ||
      data.cycle_uuid ||
      data.cycle?.id ||
      notification?.cycle_id ||
      notification?.cycleId ||
      null
    );
  };

  const getRentalDecision = (notification) =>
    rentalDecisions[notification?.id] || null;

  const hasAcceptedRentalForCycle = (notification) => {
    const cycleId = getRentalCycleId(notification);

    if (!cycleId) return false;

    return Object.entries(rentalDecisions).some(
      ([notificationId, decision]) => {
        if (decision !== "accepted") return false;

        const acceptedNotification = notifications.find(
          (item) => String(item.id) === String(notificationId)
        );

        return (
          acceptedNotification &&
          String(getRentalCycleId(acceptedNotification)) ===
            String(cycleId)
        );
      }
    );
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (updateError) throw updateError;

      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
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

  const handleRentalDecision = async (notification, decision) => {
    if (!notification?.id || processingRentalId) return;

    const currentDecision = getRentalDecision(notification);
    if (currentDecision) return;

    if (
      decision === "accepted" &&
      hasAcceptedRentalForCycle(notification)
    ) {
      return;
    }

    const action =
      decision === "accepted"
        ? "accepted_rental_request"
        : "rejected_rental_request";

    setProcessingRentalId(notification.id);

    try {
      if (typeof onAction !== "function") {
        throw new Error(
          "Notification action handler is not provided."
        );
      }

      // Preserve the existing parent/backend connection.
      await onAction(action, notification);

      setRentalDecisions((previous) => ({
        ...previous,
        [notification.id]: decision,
      }));

      if (!notification.is_read) {
        await markNotificationAsRead(notification.id);
      }
    } catch (err) {
      console.error("Rental request action failed:", err);
    } finally {
      setProcessingRentalId(null);
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
       * Store fetched notifications as-is.
       * Read/unread status is controlled by the user now.
       */
      setNotifications(fetchedNotifications);

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
  | NOTIFICATION SELECTION / BULK ACTIONS
  |--------------------------------------------------------------------------
  */

  const toggleNotificationSelection = (notificationId) => {
    setSelectedNotificationIds((previous) =>
      previous.includes(notificationId)
        ? previous.filter((id) => id !== notificationId)
        : [...previous, notificationId]
    );
  };

  const markSelectedNotificationsAsRead = async () => {
    if (bulkProcessing || selectedNotificationIds.length === 0) return;

    setBulkProcessing(true);

    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", selectedNotificationIds);

      if (updateError) throw updateError;

      const selected = new Set(selectedNotificationIds);

      setNotifications((previous) =>
        previous.map((notification) =>
          selected.has(notification.id)
            ? { ...notification, is_read: true }
            : notification
        )
      );
      setSelectedNotificationIds([]);
      setSelectionMode(false);
    } catch (err) {
      console.error("Error marking selected notifications as read:", err);
      setError(err.message || "Unable to mark selected notifications as read.");
    } finally {
      setBulkProcessing(false);
    }
  };

  const deleteSelectedNotifications = async () => {
    if (bulkProcessing || selectedNotificationIds.length === 0) return;

    setBulkProcessing(true);

    try {
      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .in("id", selectedNotificationIds);

      if (deleteError) throw deleteError;

      const selected = new Set(selectedNotificationIds);

      setNotifications((previous) =>
        previous.filter((notification) => !selected.has(notification.id))
      );
      setSelectedNotificationIds([]);
      setSelectionMode(false);
    } catch (err) {
      console.error("Error deleting selected notifications:", err);
      setError(err.message || "Unable to delete selected notifications.");
    } finally {
      setBulkProcessing(false);
    }
  };

  const allNotificationsSelected =
    notifications.length > 0 &&
    selectedNotificationIds.length === notifications.length;

  const toggleSelectAllNotifications = () => {
    setSelectedNotificationIds(
      allNotificationsSelected
        ? []
        : notifications.map((notification) => notification.id)
    );
  };

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

        <section className={`notification-content ${selectionMode ? "notification-selection-mode" : ""}`}>

          {notifications.length > 0 && (
            <div className="notification-toolbar">
              <div className="notification-toolbar-left">
                {selectionMode ? (
                  <>
                    <label className="notification-select-all">
                      <input
                        type="checkbox"
                        checked={allNotificationsSelected}
                        onChange={toggleSelectAllNotifications}
                        disabled={bulkProcessing}
                      />
                      <span>Select all</span>
                    </label>

                    <span className="notification-count">
                      {selectedNotificationIds.length > 0
                        ? `${selectedNotificationIds.length} selected`
                        : `${notifications.length} notifications`}
                    </span>
                  </>
                ) : (
                  <span className="notification-count">
                    {notifications.length} notification{notifications.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              <div className="notification-toolbar-actions">
                {!selectionMode ? (
                  <>
                    <button
                      type="button"
                      className="notification-icon-action mark-read-icon-button"
                      onClick={() => {
                        setSelectionMode(true);
                        setSelectedNotificationIds([]);
                      }}
                      disabled={bulkProcessing}
                      aria-label="Select notifications to mark as read"
                      title="Mark notifications as read"
                    >
                      ✓
                    </button>

                    <button
                      type="button"
                      className="notification-icon-action delete-icon-button"
                      onClick={() => {
                        setSelectionMode(true);
                        setSelectedNotificationIds([]);
                      }}
                      disabled={bulkProcessing}
                      aria-label="Select notifications to delete"
                      title="Delete notifications"
                    >
                      🗑
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="notification-toolbar-button selected-mark-read-button"
                      onClick={markSelectedNotificationsAsRead}
                      disabled={
                        bulkProcessing ||
                        selectedNotificationIds.length === 0
                      }
                    >
                      ✓ Mark as read
                    </button>

                    <button
                      type="button"
                      className="notification-toolbar-button selected-delete-button"
                      onClick={deleteSelectedNotifications}
                      disabled={
                        bulkProcessing ||
                        selectedNotificationIds.length === 0
                      }
                    >
                      🗑 Delete
                    </button>

                    <button
                      type="button"
                      className="notification-cancel-selection"
                      onClick={() => {
                        setSelectedNotificationIds([]);
                        setSelectionMode(false);
                      }}
                      disabled={bulkProcessing}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}


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
                      } ${
                        selectedNotificationIds.includes(notification.id)
                          ? "notification-selected"
                          : ""
                      }`}
                    >


                      {selectionMode && (
                        <label
                          className="notification-item-checkbox"
                          aria-label={`Select ${notification.title || "notification"}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedNotificationIds.includes(
                              notification.id
                            )}
                            onChange={() =>
                              toggleNotificationSelection(
                                notification.id
                              )
                            }
                            disabled={bulkProcessing}
                          />
                          <span />
                        </label>
                      )}

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

                          {(() => {
                            const decision =
                              getRentalDecision(notification);

                            const anotherAccepted =
                              hasAcceptedRentalForCycle(
                                notification
                              );

                            const isProcessing =
                              processingRentalId ===
                              notification.id;

                            if (decision === "accepted") {
                              return (
                                <div className="rental-decision accepted-decision">
                                  <span>✓</span>
                                  Accepted
                                </div>
                              );
                            }

                            if (decision === "rejected") {
                              return (
                                <div className="rental-decision rejected-decision">
                                  <span>✕</span>
                                  Rejected
                                </div>
                              );
                            }

                            return (
                              <>
                                {/* ACCEPT */}
                                <button
                                  type="button"
                                  className="notification-action-button accept-button"
                                  disabled={
                                    isProcessing ||
                                    anotherAccepted
                                  }
                                  onClick={() =>
                                    handleRentalDecision(
                                      notification,
                                      "accepted"
                                    )
                                  }
                                  title={
                                    anotherAccepted
                                      ? "Another rental request for this cycle has already been accepted."
                                      : "Accept this rental request"
                                  }
                                >
                                  {isProcessing ? (
                                    <span className="rental-action-spinner" />
                                  ) : (
                                    <>
                                      Accept
                                      <span>✓</span>
                                    </>
                                  )}
                                </button>

                                {/* REJECT */}
                                <button
                                  type="button"
                                  className="notification-action-button reject-button"
                                  disabled={isProcessing}
                                  onClick={() =>
                                    handleRentalDecision(
                                      notification,
                                      "rejected"
                                    )
                                  }
                                  title="Reject this rental request"
                                >
                                  Reject
                                  <span>✕</span>
                                </button>
                              </>
                            );
                          })()}

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